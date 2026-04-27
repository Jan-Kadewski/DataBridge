/**
 * Consumes Log_Event__e platform events and persists them as Log__c records.
 * Runs in a separate transaction from the publisher, so records survive
 * even if the publishing transaction rolled back.
 */
public inherited sharing class LogEventTriggerHandler extends TriggerHandler {

    protected override void afterInsert() {
        List<Log_Event__e> events = (List<Log_Event__e>) Trigger.new;
        List<Log__c> logs = new List<Log__c>();

        for (Log_Event__e evt : events) {
            logs.add(new Log__c(
                Severity__c       = evt.Severity__c,
                Apex_Class__c     = evt.Apex_Class__c,
                Category__c       = evt.Category__c,
                Message__c        = evt.Message__c,
                Stack_Trace__c    = evt.Stack_Trace__c,
                Correlation_ID__c = evt.Correlation_ID__c,
                Source_System__c  = evt.Source_System__c
            ));
        }

        if (!logs.isEmpty()) {
            // allOrNone=false: one bad record shouldn't block the rest.
            Database.insert(logs, false);
        }
    }
}