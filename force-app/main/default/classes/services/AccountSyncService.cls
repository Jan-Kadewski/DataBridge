/**
 * Handles inbound Account sync operations from the external system.
 * Invoked by SyncStatusRestResource / dedicated REST endpoint.
 *
 * Bulk-safe: a single call can process up to 200 records.
 */
public inherited sharing class AccountSyncService {

    private static final String CLASS_NAME = 'AccountSyncService';
    private static final Integer BATCH_LIMIT = 200;

    public class AccountDTO {
        public String externalId;   // UUID from legacy_accounts.id
        public String name;
        public String industry;
        public Decimal annualRevenue;
        public String billingCity;
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

    public static List<SyncResult> upsertAccounts(
        List<AccountDTO> payloads,
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

        List<SyncResult> results = new List<SyncResult>();
        List<Account> toUpsert = new List<Account>();
        Map<Integer, SyncResult> indexToResult = new Map<Integer, SyncResult>();

        for (Integer i = 0; i < payloads.size(); i++) {
            AccountDTO dto = payloads[i];
            SyncResult result = new SyncResult(dto.externalId);

            if (String.isBlank(dto.name)) {
                result.errorMessage = 'Missing required field: name';
                Logger.warn(CLASS_NAME,
                    'Skipping record with blank name, externalId=' + dto.externalId,
                    correlationId);
                results.add(result);
                continue;
            }
            if (String.isBlank(dto.externalId)) {
                result.errorMessage = 'Missing required field: externalId';
                Logger.warn(CLASS_NAME,
                    'Skipping record with blank externalId',
                    correlationId);
                results.add(result);
                continue;
            }

            Account acc = new Account(
                Name = dto.name,
                Industry = dto.industry,
                AnnualRevenue = dto.annualRevenue,
                BillingCity = dto.billingCity,
                External_ID__c = dto.externalId
            );

            toUpsert.add(acc);
            indexToResult.put(toUpsert.size() - 1, result);
            results.add(result);
        }

        if (toUpsert.isEmpty()) {
            Logger.flush();
            return results;
        }

        Schema.SObjectField extField = Account.External_ID__c;
        Database.UpsertResult[] urs = Database.upsert(toUpsert, extField, false);

        for (Integer i = 0; i < urs.size(); i++) {
            Database.UpsertResult ur = urs[i];
            SyncResult result = indexToResult.get(i);

            if (ur.isSuccess()) {
                result.success = true;
                result.salesforceId = ur.getId();
                Logger.info(CLASS_NAME, 'INTEGRATION.INBOUND',
                    (ur.isCreated() ? 'Account created: ' : 'Account updated: ')
                        + ur.getId(),
                    correlationId);
            } else {
                result.success = false;
                result.errorMessage = serializeErrors(ur.getErrors());
                Logger.error(CLASS_NAME, 'INTEGRATION.INBOUND',
                    'Account sync failed for externalId=' + result.externalId,
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