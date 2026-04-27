public inherited sharing class ContactSyncService {

    private static final String CLASS_NAME = 'ContactSyncService';
    private static final Integer BATCH_LIMIT = 200;

    public class ContactDTO {
        public String externalId;
        public String accountExternalId; // Link to Account via its External_ID__c
        public String firstName;
        public String lastName;
        public String email;
    }

    public class SyncResult {
        public String externalId;
        public String salesforceId;
        public Boolean success;
        public String errorMessage;

        public SyncResult(String externalId) {
            this.externalId = externalId;
            this.success = false;
        }
    }

    public static List<SyncResult> upsertContacts(
        List<ContactDTO> payloads,
        String correlationId
    ) {
        if (payloads == null || payloads.isEmpty()) {
            return new List<SyncResult>();
        }
        if (payloads.size() > BATCH_LIMIT) {
            throw new SyncException(
                'Batch exceeds maximum size of ' + BATCH_LIMIT +
                ' records (received ' + payloads.size() + ').'
            );
        }

        // Collect all referenced account external IDs to resolve in one SOQL.
        Set<String> accountExternalIds = new Set<String>();
        for (ContactDTO dto : payloads) {
            if (String.isNotBlank(dto.accountExternalId)) {
                accountExternalIds.add(dto.accountExternalId);
            }
        }

        Map<String, Id> accountIdByExternalId = new Map<String, Id>();
        if (!accountExternalIds.isEmpty()) {
            for (Account a : [
                SELECT Id, External_ID__c
                FROM Account
                WHERE External_ID__c IN :accountExternalIds
            ]) {
                accountIdByExternalId.put(a.External_ID__c, a.Id);
            }
        }

        List<SyncResult> results = new List<SyncResult>();
        List<Contact> toUpsert = new List<Contact>();
        Map<Integer, SyncResult> indexToResult = new Map<Integer, SyncResult>();

        for (ContactDTO dto : payloads) {
            SyncResult result = new SyncResult(dto.externalId);

            if (String.isBlank(dto.lastName)) {
                result.errorMessage = 'Missing required field: lastName';
                results.add(result);
                continue;
            }
            if (String.isBlank(dto.externalId)) {
                result.errorMessage = 'Missing required field: externalId';
                results.add(result);
                continue;
            }

            Contact c = new Contact(
                FirstName = dto.firstName,
                LastName = dto.lastName,
                Email = dto.email,
                External_ID__c = dto.externalId
            );
            if (String.isNotBlank(dto.accountExternalId)) {
                Id parentId = accountIdByExternalId.get(dto.accountExternalId);
                if (parentId != null) {
                    c.AccountId = parentId;
                } else {
                    Logger.warn(CLASS_NAME,
                        'Parent Account not found for externalId='
                            + dto.accountExternalId
                            + ' — contact will be orphaned.',
                        correlationId);
                }
            }

            toUpsert.add(c);
            indexToResult.put(toUpsert.size() - 1, result);
            results.add(result);
        }

        if (toUpsert.isEmpty()) {
            Logger.flush();
            return results;
        }

        Schema.SObjectField extField = Contact.External_ID__c;
        Database.UpsertResult[] urs = Database.upsert(toUpsert, extField, false);

        for (Integer i = 0; i < urs.size(); i++) {
            Database.UpsertResult ur = urs[i];
            SyncResult result = indexToResult.get(i);

            if (ur.isSuccess()) {
                result.success = true;
                result.salesforceId = ur.getId();
                Logger.info(CLASS_NAME, 'INTEGRATION.INBOUND',
                    (ur.isCreated() ? 'Contact created: ' : 'Contact updated: ')
                        + ur.getId(),
                    correlationId);
            } else {
                result.success = false;
                result.errorMessage = serializeErrors(ur.getErrors());
                Logger.error(CLASS_NAME, 'INTEGRATION.INBOUND',
                    'Contact sync failed for externalId=' + result.externalId,
                    new SyncException(result.errorMessage),
                    correlationId);
            }
        }

        Logger.flush();
        return results;
    }

    private static String serializeErrors(List<Database.Error> errors) {
        List<String> parts = new List<String>();
        for (Database.Error e : errors) {
            parts.add(e.getStatusCode() + ': ' + e.getMessage());
        }
        return String.join(parts, ' | ');
    }

    public class SyncException extends Exception {}
}