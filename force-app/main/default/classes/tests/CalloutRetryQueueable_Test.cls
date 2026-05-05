@IsTest
private class CalloutRetryQueueable_Test {

    private class MockOk implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"ok":true}');
            return res;
        }
    }

    private class Mock5xx implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(503);
            res.setBody('service unavailable');
            return res;
        }
    }

    private class Mock4xx implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(400);
            res.setBody('{"error":"validation"}');
            return res;
        }
    }

    @IsTest
    static void enqueue_success_logsSuccess() {
        Test.setMock(HttpCalloutMock.class, new MockOk());

        Test.startTest();
        CalloutRetryQueueable.enqueue(
            'MuleSoft_Webhook', '/sync/accounts', '{}', 'cid-q-ok');
        Test.stopTest();

        List<Log__c> logs = [
            SELECT Severity__c, Message__c
            FROM Log__c
            WHERE Correlation_ID__c = 'cid-q-ok'
            ORDER BY CreatedDate ASC
        ];
        System.assert(!logs.isEmpty(), 'Expected at least one log entry');

        Boolean hasSuccess = false;
        for (Log__c l : logs) {
            if (l.Severity__c == 'INFO'
                    && l.Message__c.contains('succeeded on attempt 1')) {
                hasSuccess = true;
            }
        }
        System.assert(hasSuccess, 'Expected success log');
    }

    @IsTest
    static void enqueue_4xx_abortsWithoutRetry() {
        Test.setMock(HttpCalloutMock.class, new Mock4xx());

        Test.startTest();
        CalloutRetryQueueable.enqueue(
            'MuleSoft_Webhook', '/sync/accounts', '{}', 'cid-q-4xx');
        Test.stopTest();

        List<Log__c> errors = [
            SELECT Message__c
            FROM Log__c
            WHERE Correlation_ID__c = 'cid-q-4xx'
              AND Severity__c = 'ERROR'
        ];
        System.assertEquals(1, errors.size(),
            'Expected one ERROR log for non-retriable 4xx');
        System.assert(errors[0].Message__c.contains('Non-retriable'));
    }

}