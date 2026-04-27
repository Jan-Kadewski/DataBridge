@IsTest
private class AccountSyncService_Test {

    private static final String CID = 'aaaa1111-2222-3333-4444-555566667777';

    @IsTest
    static void upsertAccounts_insertsNew() {
        List<AccountSyncService.AccountDTO> dtos = new List<AccountSyncService.AccountDTO>();
        AccountSyncService.AccountDTO dto = new AccountSyncService.AccountDTO();
        dto.externalId = 'uuid-ext-1';
        dto.name = 'Acme Test';
        dto.industry = 'Technology';
        dto.annualRevenue = 1000000;
        dto.billingCity = 'Warsaw';
        dtos.add(dto);

        Test.startTest();
        List<AccountSyncService.SyncResult> results =
            AccountSyncService.upsertAccounts(dtos, CID);
        Test.stopTest();

        System.assertEquals(1, results.size());
        System.assertEquals(true, results[0].success);
        System.assertNotEquals(null, results[0].salesforceId);

        Account created = [
            SELECT Id, Name, External_ID__c
            FROM Account
            WHERE External_ID__c = 'uuid-ext-1'
            LIMIT 1
        ];
        System.assertEquals('Acme Test', created.Name);
    }

    @IsTest
    static void upsertAccounts_updatesExistingByExternalId() {
        insert new Account(Name = 'Old', External_ID__c = 'uuid-ext-2');

        AccountSyncService.AccountDTO dto = new AccountSyncService.AccountDTO();
        dto.externalId = 'uuid-ext-2';
        dto.name = 'New Name';

        Test.startTest();
        List<AccountSyncService.SyncResult> results =
            AccountSyncService.upsertAccounts(
                new List<AccountSyncService.AccountDTO>{ dto }, CID);
        Test.stopTest();

        System.assertEquals(true, results[0].success);
        Account updated = [
            SELECT Name FROM Account WHERE External_ID__c = 'uuid-ext-2' LIMIT 1
        ];
        System.assertEquals('New Name', updated.Name);
    }

    @IsTest
    static void upsertAccounts_rejectsBlankName() {
        AccountSyncService.AccountDTO dto = new AccountSyncService.AccountDTO();
        dto.externalId = 'uuid-ext-3';
        dto.name = '';

        Test.startTest();
        List<AccountSyncService.SyncResult> results =
            AccountSyncService.upsertAccounts(
                new List<AccountSyncService.AccountDTO>{ dto }, CID);
        Test.stopTest();

        System.assertEquals(1, results.size());
        System.assertEquals(false, results[0].success);
        System.assert(results[0].errorMessage.contains('name'));
    }

    @IsTest
    static void upsertAccounts_emptyInput_returnsEmpty() {
        Test.startTest();
        List<AccountSyncService.SyncResult> results =
            AccountSyncService.upsertAccounts(
                new List<AccountSyncService.AccountDTO>(), CID);
        Test.stopTest();
        System.assertEquals(0, results.size());
    }
}