@IsTest
private class SyncDashboardController_Test {

    @TestSetup
    static void seedLogs() {
        List<Log__c> logs = new List<Log__c>();
        for (Integer i = 0; i < 3; i++) {
            logs.add(new Log__c(
                Severity__c      = 'INFO',
                Category__c      = 'INTEGRATION.INBOUND',
                Message__c       = 'Test info ' + i,
                Correlation_ID__c = 'cid-info-' + i,
                Source_System__c = 'Salesforce'
            ));
        }
        for (Integer i = 0; i < 2; i++) {
            logs.add(new Log__c(
                Severity__c      = 'ERROR',
                Category__c      = 'INTEGRATION.OUTBOUND',
                Message__c       = 'Test err ' + i,
                Correlation_ID__c = 'cid-err-' + i,
                Source_System__c = 'MuleSoft'
            ));
        }
        logs.add(new Log__c(
            Severity__c = 'WARN',
            Category__c = 'INTEGRATION.INBOUND',
            Message__c  = 'Test warn',
            Source_System__c = 'Salesforce',
            Correlation_ID__c = 'cid-warn-1'
        ));
        insert logs;
    }

    @IsTest
    static void getMetrics_aggregatesCorrectly() {
        Test.startTest();
        SyncDashboardController.Metrics m = SyncDashboardController.getMetrics();
        Test.stopTest();

        System.assertEquals(6, m.totalToday);
        System.assertEquals(3, m.successToday);
        System.assertEquals(1, m.warningsToday);
        System.assertEquals(2, m.errorsToday);
        System.assertEquals(50, m.successRatePct);
    }

   @IsTest
static void getRecentOperations_allFilters_unfiltered_returnsAll() {
    Test.startTest();
    List<SyncDashboardController.Operation> ops =
        SyncDashboardController.getRecentOperations('{}');
    Test.stopTest();
    System.assertEquals(6, ops.size());
}

@IsTest
static void getRecentOperations_filterByToday_returnsSameInTest() {
    Test.startTest();
    List<SyncDashboardController.Operation> ops =
        SyncDashboardController.getRecentOperations(
            '{"dateRange":"TODAY"}'
        );
    Test.stopTest();
    // TestSetup inserts today, so count matches.
    System.assertEquals(6, ops.size());
}

@IsTest
static void getRecentOperations_filterBySeverity_returnsOnlyErrors() {
    Test.startTest();
    List<SyncDashboardController.Operation> ops =
        SyncDashboardController.getRecentOperations(
            '{"severity":"ERROR"}'
        );
    Test.stopTest();
    System.assertEquals(2, ops.size());
}

@IsTest
static void getRecentOperations_filterByCorrelation_returnsOne() {
    Test.startTest();
    List<SyncDashboardController.Operation> ops =
        SyncDashboardController.getRecentOperations(
            '{"correlationId":"cid-err-0"}'
        );
    Test.stopTest();
    System.assertEquals(1, ops.size());
}

@IsTest
static void getRecentOperations_multipleFilters_narrowsResults() {
    Test.startTest();
    List<SyncDashboardController.Operation> ops =
        SyncDashboardController.getRecentOperations(
            '{"severity":"ERROR","sourceSystem":"MuleSoft"}'
        );
    Test.stopTest();
    // 2 errors exist, both are from MuleSoft in seed data.
    System.assertEquals(2, ops.size());
}
}