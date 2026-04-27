@IsTest
private class ExternalSystemCallout_Test {

    private class MockOk implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"ok":true}');
            return res;
        }
    }

    private class Mock4xx implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(400);
            res.setBody('{"error":"bad payload"}');
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

    @IsTest
    static void postJson_success_returnsSuccessResponse() {
        Test.setMock(HttpCalloutMock.class, new MockOk());

        Test.startTest();
        ExternalSystemCallout.Response r = ExternalSystemCallout.postJson(
            'MuleSoft_Webhook', '/sync/accounts', '{}', 'cid-ok');
        Test.stopTest();

        System.assertEquals(200, r.statusCode);
        System.assertEquals(true, r.success);
    }

    @IsTest
    static void postJson_4xx_returnsFailureButNoException() {
        Test.setMock(HttpCalloutMock.class, new Mock4xx());

        Test.startTest();
        ExternalSystemCallout.Response r = ExternalSystemCallout.postJson(
            'MuleSoft_Webhook', '/sync/accounts', '{}', 'cid-4xx');
        Test.stopTest();

        System.assertEquals(400, r.statusCode);
        System.assertEquals(false, r.success);
    }

    @IsTest
    static void postJson_5xx_returnsFailureButNoException() {
        Test.setMock(HttpCalloutMock.class, new Mock5xx());

        Test.startTest();
        ExternalSystemCallout.Response r = ExternalSystemCallout.postJson(
            'MuleSoft_Webhook', '/sync/accounts', '{}', 'cid-5xx');
        Test.stopTest();

        System.assertEquals(503, r.statusCode);
        System.assertEquals(false, r.success);
    }
}