/**
 * Synchronous HTTP callout wrapper that routes through a Named Credential.
 * No retry logic here — retries are orchestrated by CalloutRetryQueueable.
 *
 * Use directly for fire-once, response-required flows (e.g. synchronous
 * status checks from LWC). For fire-and-forget with retry on 5xx / network
 * errors, enqueue a CalloutRetryQueueable instead.
 */
public inherited sharing class ExternalSystemCallout {

    private static final String CLASS_NAME = 'ExternalSystemCallout';

    public class CalloutException extends Exception {}

    public class Response {
        public Integer statusCode;
        public String body;
        public Boolean success;

        public Response(Integer statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
            this.success = statusCode >= 200 && statusCode < 300;
        }
    }

    /**
     * POST a JSON body to a Named Credential endpoint. Single attempt.
     *
     * @param namedCredential Named Credential developer name
     * @param path            Path appended to the Named Credential endpoint
     * @param jsonBody        Request body (already serialized)
     * @param correlationId   Correlation ID, sent as X-Correlation-ID header
     * @return                Response wrapping status + body. Never null on
     *                        HTTP-level response; throws only on network /
     *                        unexpected errors (DNS, TLS, timeout).
     */
    public static Response postJson(
        String namedCredential,
        String path,
        String jsonBody,
        String correlationId
    ) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + namedCredential + path);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');
        req.setHeader('X-Correlation-ID', correlationId);
        req.setTimeout(60000);
        req.setBody(jsonBody);

        HttpResponse res = new Http().send(req);
        Response out = new Response(res.getStatusCode(), res.getBody());

        if (out.success) {
            Logger.info(CLASS_NAME, 'INTEGRATION.OUTBOUND',
                'Callout OK ' + namedCredential + path
                    + ' status=' + out.statusCode,
                correlationId);
        } else if (out.statusCode < 500) {
            // Non-retriable client error — log at WARN and let the caller
            // decide what to do.
            Logger.warn(CLASS_NAME, 'INTEGRATION.OUTBOUND',
                'Client error ' + out.statusCode + ' from '
                    + namedCredential + path
                    + ' body=' + truncate(out.body, 500));
        } else {
            // 5xx — retriable by caller (CalloutRetryQueueable).
            Logger.warn(CLASS_NAME, 'INTEGRATION.OUTBOUND',
                'Server error ' + out.statusCode + ' from '
                    + namedCredential + path);
        }
        return out;
    }

    private static String truncate(String s, Integer max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}