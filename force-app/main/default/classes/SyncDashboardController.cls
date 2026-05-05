/**
 * Apex controller for the Sync Dashboard LWC suite.
 *
 * Every method is @AuraEnabled(cacheable=true) where possible — that enables
 * the LWC wire adapter, which caches results client-side and auto-refreshes
 * when the underlying @AuraEnabled data is invalidated (via refreshApex()).
 *
 * Metrics aggregate today's Log__c entries. Dates are in UTC to match
 * the Salesforce server — the UI adjusts to user TZ via toLocaleString().
 */
public with sharing class SyncDashboardController {

    /**
     * KPI tile values for the top row of the dashboard.
     */
    public class Metrics {
        @AuraEnabled public Integer totalToday;
        @AuraEnabled public Integer successToday;
        @AuraEnabled public Integer errorsToday;
        @AuraEnabled public Integer successRatePct;
        @AuraEnabled public Integer warningsToday;
    }

    /**
     * Single row for the recent operations table.
     */
    public class Operation {
        @AuraEnabled public Id      recordId;
        @AuraEnabled public String  name;
        @AuraEnabled public String  severity;
        @AuraEnabled public String  category;
        @AuraEnabled public String  message;
        @AuraEnabled public String  apexClass;
        @AuraEnabled public String  correlationId;
        @AuraEnabled public String  sourceSystem;
        @AuraEnabled public Datetime createdDate;
    }

    /**
     * Error count grouped by category (input for the donut chart).
     */
    public class ErrorBucket {
        @AuraEnabled public String  category;
        @AuraEnabled public Integer count;
    }

    @AuraEnabled(cacheable=true)
    public static Metrics getMetrics() {
        Metrics m = new Metrics();

        AggregateResult[] results = [
            SELECT Severity__c severity, COUNT(Id) cnt
            FROM Log__c
            WHERE CreatedDate = TODAY
            GROUP BY Severity__c
        ];

        Integer total = 0;
        Integer info = 0;
        Integer warn = 0;
        Integer err = 0;

        for (AggregateResult ar : results) {
            String sev = (String) ar.get('severity');
            Integer cnt = (Integer) ar.get('cnt');
            total += cnt;
            if (sev == 'INFO')  info  = cnt;
            if (sev == 'WARN')  warn  = cnt;
            if (sev == 'ERROR') err   = cnt;
        }

        m.totalToday     = total;
        m.warningsToday  = warn;
        m.errorsToday    = err;
        m.successToday   = info;
Integer nonError  = total - err;  // INFO + WARN = nie-błędy
m.successRatePct  = total == 0 ? 100 :
    Integer.valueOf(Math.round((Double) nonError / total * 100));
        return m;
    }




/**
 * Generic filter wrapper. Adding a new filter in the future =
 * add one field here + handle in buildWhereClause().
 */
public class LogFilter {
    public String correlationId;  // exact match
    public String dateRange;      // 'TODAY' | 'LAST_7_DAYS' | 'ALL'
    public String severity;       // 'ERROR' | 'WARN' | 'INFO' | null = all
    public String sourceSystem;   // 'Salesforce' | 'MuleSoft' | 'Node.js' | null = all
    public String operation;      // partial match | null = all
}

@AuraEnabled(cacheable=true)
public static List<Operation> getRecentOperations(String filtersJson) {
    LogFilter f = String.isBlank(filtersJson)
        ? new LogFilter()
        : (LogFilter) JSON.deserialize(filtersJson, LogFilter.class);

    List<String> conditions = buildConditions(f);
    String whereClause = conditions.isEmpty()
        ? ''
        : 'WHERE ' + String.join(conditions, ' AND ');

    String soql =
        'SELECT Id, Name, Severity__c, Category__c, Message__c, ' +
        '       Apex_Class__c, Correlation_ID__c, Source_System__c, CreatedDate ' +
        'FROM Log__c ' +
        whereClause +
        ' ORDER BY CreatedDate DESC LIMIT 50';

    List<Operation> out = new List<Operation>();
    for (Log__c log : Database.query(soql)) {
        Operation op     = new Operation();
        op.recordId      = log.Id;
        op.name          = log.Name;
        op.severity      = log.Severity__c;
        op.category      = log.Category__c;
        op.message       = log.Message__c;
        op.apexClass     = log.Apex_Class__c;
        op.correlationId = log.Correlation_ID__c;
        op.sourceSystem  = log.Source_System__c;
        op.createdDate   = log.CreatedDate;
        out.add(op);
    }
    return out;
}
/**
 * Builds SOQL conditions from filter. Adding a new filter =
 * add one condition block here.
 */
private static List<String> buildConditions(LogFilter f) {
    List<String> c = new List<String>();

    // Date range
    if (f.dateRange == 'TODAY') {
        c.add('CreatedDate = TODAY');
    } else if (f.dateRange == 'LAST_7_DAYS') {
        c.add('CreatedDate = LAST_N_DAYS:7');
    }
    // 'ALL' or null = no date condition

    // Severity — exact match
    if (String.isNotBlank(f.severity)) {
        c.add('Severity__c = \'' + String.escapeSingleQuotes(f.severity) + '\'');
    }

    // Source system — exact match
    if (String.isNotBlank(f.sourceSystem)) {
        c.add('Source_System__c = \'' + String.escapeSingleQuotes(f.sourceSystem) + '\'');
    }

    // Correlation ID — exact match
    if (String.isNotBlank(f.correlationId)) {
        c.add('Correlation_ID__c = \'' + String.escapeSingleQuotes(f.correlationId) + '\'');
    }

    // Operation — partial match (LIKE)
    if (String.isNotBlank(f.operation)) {
        c.add('Name LIKE \'%' + String.escapeSingleQuotes(f.operation) + '%\'');
    }

    return c;
}




    @AuraEnabled(cacheable=true)
    public static List<ErrorBucket> getErrorsByCategory() {
        AggregateResult[] results = [
            SELECT Category__c category, COUNT(Id) cnt
            FROM Log__c
            WHERE CreatedDate = TODAY
              AND Severity__c IN ('ERROR', 'WARN')
            GROUP BY Category__c
            ORDER BY COUNT(Id) DESC
        ];

        List<ErrorBucket> out = new List<ErrorBucket>();
        for (AggregateResult ar : results) {
            ErrorBucket b = new ErrorBucket();
            b.category = (String) ar.get('category');
            if (String.isBlank(b.category)) b.category = '(uncategorized)';
            b.count = (Integer) ar.get('cnt');
            out.add(b);
        }
        return out;
    }
}