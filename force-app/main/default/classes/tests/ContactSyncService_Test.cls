@IsTest
private class ContactSyncService_Test {

    private static final String CID = 'bbbb1111-2222-3333-4444-555566667777';

    @IsTest
    static void upsertContacts_insertsWithAccountLink() {
        Account parent = new Account(Name = 'Parent', External_ID__c = 'parent-ext');
        insert parent;

        ContactSyncService.ContactDTO dto = new ContactSyncService.ContactDTO();
        dto.externalId = 'c-ext-1';
        dto.lastName = 'Kowalski';
        dto.firstName = 'Jan';
        dto.email = 'jan@example.com';
        dto.accountExternalId = 'parent-ext';

        Test.startTest();
        List<ContactSyncService.SyncResult> results =
            ContactSyncService.upsertContacts(
                new List<ContactSyncService.ContactDTO>{ dto }, CID);
        Test.stopTest();

        System.assertEquals(true, results[0].success);

        Contact c = [
            SELECT AccountId, LastName FROM Contact WHERE External_ID__c = 'c-ext-1'
        ];
        System.assertEquals(parent.Id, c.AccountId);
    }

    @IsTest
    static void upsertContacts_rejectsBlankLastName() {
        ContactSyncService.ContactDTO dto = new ContactSyncService.ContactDTO();
        dto.externalId = 'c-ext-2';
        dto.lastName = '';

        Test.startTest();
        List<ContactSyncService.SyncResult> results =
            ContactSyncService.upsertContacts(
                new List<ContactSyncService.ContactDTO>{ dto }, CID);
        Test.stopTest();

        System.assertEquals(false, results[0].success);
    }
}