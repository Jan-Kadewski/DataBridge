/**
 * REST endpoint for external systems to:
 *  - query the current sync state of a record (GET)
 *  - push Account/Contact upserts (POST to sub-paths)
 *
 * Base URL: /services/apexrest/sync/*
 *
 * Authentication: handled by the calling user's session / OAuth token.
 * The connected app / user must have DataBridge_Admin permission set.
 */
@RestResource(urlMapping='/sync/*')
global with sharing class SyncStatusRestResource {

    private static final String CLASS_NAME = 'SyncStatusRestResource';

    // -----------------------------------------------------------------------
    // GET /sync/status/{recordId}
    // -----------------------------------------------------------------------
    global class StatusResponse {
        public String salesforceId;
        public String externalId;
        public String objectType;
        public Datetime lastModified;
        public String syncState;
    }

    @HttpGet
    global static StatusResponse doGet() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        String correlationId = req.headers.get('X-Correlation-ID');
        if (String.isBlank(correlationId)) {
            correlationId = System.UUID.randomUUID().toString();
        }

        String uri = req.requestURI;
        // Expected: /services/apexrest/sync/status/{id}
        List<String> segments = uri.split('/');
        String recordId = segments.isEmpty() ? null : segments[segments.size() - 1];

        if (String.isBlank(recordId) || !Pattern.matches('[a-zA-Z0-9]{15,18}', recordId)) {
            res.statusCode = 400;
            Logger.warn(CLASS_NAME, 'GET with invalid id: ' + recordId, correlationId);
            Logger.flush();
            return null;
        }

        try {
            Schema.DescribeSObjectResult describe = ((Id) recordId).getSobjectType().getDescribe();
            String objectName = describe.getName();

            if (objectName == 'Account') {
                List<Account> records = [
                    SELECT Id, External_ID__c, LastModifiedDate
                    FROM Account
                    WHERE Id = :recordId
                    LIMIT 1
                ];
                if (records.isEmpty()) {
                    res.statusCode = 404;
                    Logger.flush();
                    return null;
                }
                return toResponse(records[0].Id, records[0].External_ID__c,
                    'Account', records[0].LastModifiedDate);
            } else if (objectName == 'Contact') {
                List<Contact> records = [
                    SELECT Id, External_ID__c, LastModifiedDate
                    FROM Contact
                    WHERE Id = :recordId
                    LIMIT 1
                ];
                if (records.isEmpty()) {
                    res.statusCode = 404;
                    Logger.flush();
                    return null;
                }
                return toResponse(records[0].Id, records[0].External_ID__c,
                    'Contact', records[0].LastModifiedDate);
            } else {
                res.statusCode = 400;
                Logger.warn(CLASS_NAME,
                    'Unsupported object type for status query: ' + objectName,
                    correlationId);
                Logger.flush();
                return null;
            }
        } catch (Exception ex) {
            res.statusCode = 500;
            Logger.error(CLASS_NAME, 'doGet failed for id=' + recordId,
                ex, correlationId);
            Logger.flush();
            return null;
        }
    }

    private static StatusResponse toResponse(
        Id sfId, String extId, String objectType, Datetime lastModified
    ) {
        StatusResponse r = new StatusResponse();
        r.salesforceId = sfId;
        r.externalId = extId;
        r.objectType = objectType;
        r.lastModified = lastModified;
        r.syncState = String.isBlank(extId) ? 'NOT_SYNCED' : 'SYNCED';
        return r;
    }

    // -----------------------------------------------------------------------
    // POST /sync/accounts
    // POST /sync/contacts
    // -----------------------------------------------------------------------
    global class BulkRequest {
        public List<AccountSyncService.AccountDTO> accounts;
        public List<ContactSyncService.ContactDTO> contacts;
    }

    global class BulkResponse {
        public List<AccountSyncService.SyncResult> accountResults;
        public List<ContactSyncService.SyncResult> contactResults;
    }

    @HttpPost
    global static BulkResponse doPost() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        String correlationId = req.headers.get('X-Correlation-ID');
        if (String.isBlank(correlationId)) {
            correlationId = System.UUID.randomUUID().toString();
        }

        String uri = req.requestURI;
        // Route based on last URI segment.
        List<String> segments = uri.split('/');
        String route = segments.isEmpty() ? null : segments[segments.size() - 1];

        BulkResponse response = new BulkResponse();

        try {
            String body = req.requestBody != null
                ? req.requestBody.toString()
                : '{}';
            BulkRequest parsed = (BulkRequest) JSON.deserialize(body, BulkRequest.class);

            if (route == 'accounts') {
                response.accountResults = AccountSyncService.upsertAccounts(
                    parsed.accounts, correlationId);
            } else if (route == 'contacts') {
                response.contactResults = ContactSyncService.upsertContacts(
                    parsed.contacts, correlationId);
            } else {
                res.statusCode = 404;
                Logger.warn(CLASS_NAME, 'Unknown route: ' + route, correlationId);
                Logger.flush();
                return null;
            }
        } catch (Exception ex) {
            res.statusCode = 500;
            Logger.error(CLASS_NAME,
                'doPost failed on route=' + route,
                ex, correlationId);
            Logger.flush();
            throw ex;
        }

        res.statusCode = 200;
        return response;
    }
}

// 13:16:01:064 USER_DEBUG [4]|DEBUG|Correlation ID: bed1da32-4c8f-43c6-b3de-839c0ceaf60d