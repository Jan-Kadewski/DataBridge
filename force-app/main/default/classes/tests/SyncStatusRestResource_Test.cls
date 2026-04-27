@IsTest
private class SyncStatusRestResource_Test {

    @IsTest
    static void doGet_accountFound_returnsStatus() {
        Account a = new Account(Name = 'X', External_ID__c = 'ext-get-1');
        insert a;

        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/sync/status/' + a.Id;
        req.httpMethod = 'GET';
        req.headers.put('X-Correlation-ID', 'cid-1');
        RestContext.request = req;
        RestContext.response = new RestResponse();

        Test.startTest();
        SyncStatusRestResource.StatusResponse response =
            SyncStatusRestResource.doGet();
        Test.stopTest();

        System.assertNotEquals(null, response);
        System.assertEquals(a.Id, response.salesforceId);
        System.assertEquals('Account', response.objectType);
        System.assertEquals('SYNCED', response.syncState);
    }

    @IsTest
    static void doGet_invalidId_returns400() {
        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/sync/status/not-an-id';
        req.httpMethod = 'GET';
        RestContext.request = req;
        RestContext.response = new RestResponse();

        Test.startTest();
        SyncStatusRestResource.doGet();
        Test.stopTest();

        System.assertEquals(400, RestContext.response.statusCode);
    }

    @IsTest
    static void doPost_accountsRoute_upsertsSuccessfully() {
        String body = '{"accounts":[{"externalId":"post-ext-1","name":"POST Test"}]}';

        RestRequest req = new RestRequest();
        req.requestURI = '/services/apexrest/sync/accounts';
        req.httpMethod = 'POST';
        req.requestBody = Blob.valueOf(body);
        req.headers.put('X-Correlation-ID', 'cid-post');
        RestContext.request = req;
        RestContext.response = new RestResponse();

        Test.startTest();
        SyncStatusRestResource.BulkResponse response =
            SyncStatusRestResource.doPost();
        Test.stopTest();

        System.assertNotEquals(null, response.accountResults);
        System.assertEquals(1, response.accountResults.size());
        System.assertEquals(true, response.accountResults[0].success);
    }
}