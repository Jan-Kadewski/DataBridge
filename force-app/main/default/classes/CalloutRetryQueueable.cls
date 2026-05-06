/**
 * Asynchronous, retrying callout dispatcher.
 *
 * Usage:
 *   CalloutRetryQueueable.enqueue(
 *       'MuleSoft_Webhook', '/sync/accounts',
 *       jsonBody, correlationId
 *   );
 *
 * Behavior:
 *  - Attempt 1 runs as soon as the platform schedules the job.
 *  - On 5xx or callout exception, the job re-enqueues itself with
 *    a delay derived from the attempt number (exponential minute-scale).
 *  - On 2xx or 4xx, execution finishes (2xx = success, 4xx = non-retriable).
 *  - After the 3rd failed attempt, a final ERROR log is written.
 *
 * Delay schedule (minutes): attempt 2 → 1, attempt 3 → 2, attempt 4 → 4.
 * Platform minimum is 1 minute; sub-minute backoffs are not supported.
 *
 * Implements Database.AllowsCallouts because Queueable callouts require it.
 */
public with sharing class CalloutRetryQueueable
    implements Queueable, Database.AllowsCallouts {

    private static final String CLASS_NAME = 'CalloutRetryQueueable';
    @TestVisible private static final Integer MAX_ATTEMPTS = 3;

    private final String namedCredential;
    private final String path;
    private final String jsonBody;
    private final String correlationId;
    private final Integer attempt;

    private CalloutRetryQueueable(
        String namedCredential,
        String path,
        String jsonBody,
        String correlationId,
        Integer attempt
    ) {
        this.namedCredential = namedCredential;
        this.path = path;
        this.jsonBody = jsonBody;
        this.correlationId = correlationId;
        this.attempt = attempt;
    }

    public static Id enqueue(
        String namedCredential,
        String path,
        String jsonBody,
        String correlationId
    ) {
        CalloutRetryQueueable job = new CalloutRetryQueueable(
            namedCredential, path, jsonBody, correlationId, 1
        );
        return System.enqueueJob(job);
    }

    public void execute(QueueableContext context) {
        Logger.info(CLASS_NAME, 'INTEGRATION.OUTBOUND',
            'Callout attempt ' + attempt + '/' + MAX_ATTEMPTS
                + ' to ' + namedCredential + path,
            correlationId);

        ExternalSystemCallout.Response response;
        Exception calloutException;

        try {
            response = ExternalSystemCallout.postJson(
                namedCredential, path, jsonBody, correlationId);
        } catch (Exception ex) {
            calloutException = ex;
        }

        // Success path.
        if (response != null && response.success) {
            Logger.info(CLASS_NAME, 'INTEGRATION.OUTBOUND',
                'Callout succeeded on attempt ' + attempt,
                correlationId);
            Logger.flush();
            return;
        }

        // Non-retriable 4xx: log and stop.
        if (response != null && response.statusCode >= 400
                && response.statusCode < 500) {
            Logger.error(CLASS_NAME, 'INTEGRATION.OUTBOUND',
                'Non-retriable client error ' + response.statusCode
                    + ' — aborting. Body: ' + response.body,
                new CalloutRetryException(
                    'HTTP ' + response.statusCode),
                correlationId);
            Logger.flush();
            return;
        }

        // Retriable: either 5xx or exception.
        if (attempt >= MAX_ATTEMPTS) {
            String finalMsg = (response != null)
                ? 'Callout failed after ' + MAX_ATTEMPTS
                    + ' attempts, final status=' + response.statusCode
                : 'Callout failed after ' + MAX_ATTEMPTS
                    + ' attempts with exception';
            Logger.error(CLASS_NAME, 'INTEGRATION.OUTBOUND',
                finalMsg,
                calloutException != null
                    ? calloutException
                    : new CalloutRetryException(finalMsg),
                correlationId);
            Logger.flush();
            return;
        }

        // Schedule next attempt with exponential delay (minutes): 1, 2, 4.
        Integer nextAttempt = attempt + 1;
        Integer delayMinutes = (Integer) Math.pow(2, attempt - 1);

        Logger.warn(CLASS_NAME, 'INTEGRATION.OUTBOUND',
            'Attempt ' + attempt + ' failed — re-enqueuing attempt '
                + nextAttempt + ' in ' + delayMinutes + ' minute(s)'
                + ' correlationId=' + correlationId);
        Logger.flush();

        CalloutRetryQueueable next = new CalloutRetryQueueable(
            namedCredential, path, jsonBody, correlationId, nextAttempt
        );

        // Tests cannot chain queueables with a delay — guard it.
        if (Test.isRunningTest()) {
            // In tests, we simply don't chain; test assertions cover
            // the single-attempt behavior via dedicated cases.
            return;
        }
        System.enqueueJob(next, delayMinutes);
    }

    public class CalloutRetryException extends Exception {}
}