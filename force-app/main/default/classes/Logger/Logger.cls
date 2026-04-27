public inherited sharing class Logger {

    private static final String DEFAULT_LEVEL = 'INFO';
    private static final Map<String, Integer> LEVEL_RANK = new Map<String, Integer>{
        'DEBUG' => 10,
        'INFO'  => 20,
        'WARN'  => 30,
        'ERROR' => 40
    };

    private static List<Log_Event__e> buffer = new List<Log_Event__e>();

    // --- Public fluent API ---

    public static void debug(String apexClass, String message, String correlationId) {
        add('DEBUG', apexClass, null, message, null, correlationId);
    }

    public static void info(String apexClass, String message, String correlationId) {
        add('INFO', apexClass, null, message, null, correlationId);
    }

    public static void warn(String apexClass, String message, String correlationId) {
        add('WARN', apexClass, null, message, null, correlationId);
    }

    public static void error(String apexClass, String message, Exception ex, String correlationId) {
        String stack = ex == null ? null : ex.getStackTraceString();
        String fullMessage = ex == null
            ? message
            : message + ' | ' + ex.getTypeName() + ': ' + ex.getMessage();
        add('ERROR', apexClass, null, fullMessage, stack, correlationId);
    }

    // Overload with explicit category (e.g. 'INTEGRATION.INBOUND')
    public static void info(String apexClass, String category, String message, String correlationId) {
        add('INFO', apexClass, category, message, null, correlationId);
    }

    public static void error(String apexClass, String category, String message, Exception ex, String correlationId) {
        String stack = ex == null ? null : ex.getStackTraceString();
        String fullMessage = ex == null
            ? message
            : message + ' | ' + ex.getTypeName() + ': ' + ex.getMessage();
        add('ERROR', apexClass, category, fullMessage, stack, correlationId);
    }

    /**
     * Publishes the buffered events. Should be called at the end of every
     * entry point (controller action, batch execute, queueable, REST method, trigger).
     */
    public static void flush() {
        if (buffer.isEmpty()) {
            return;
        }
        List<Database.SaveResult> results = EventBus.publish(buffer);
        // Surface publication failures to the debug log; do not rethrow —
        // failing to log should never break business logic.
        for (Integer i = 0; i < results.size(); i++) {
            if (!results[i].isSuccess()) {
                System.debug(LoggingLevel.ERROR,
                    'Log_Event__e publish failed: ' + results[i].getErrors());
            }
        }
        buffer.clear();
    }

    @TestVisible
    private static Integer bufferSize() {
        return buffer.size();
    }

    @TestVisible
    private static void clearBuffer() {
        buffer.clear();
    }

    // --- Internal ---

    private static void add(String severity, String apexClass, String category,
                            String message, String stackTrace, String correlationId) {
        if (!shouldLog(apexClass, severity)) {
            return;
        }
        Log_Event__e evt = new Log_Event__e(
            Severity__c       = severity,
            Apex_Class__c     = apexClass,
            Category__c       = category,
            Message__c        = truncate(message, 32768),
            Stack_Trace__c    = truncate(stackTrace, 32768),
            Correlation_ID__c = correlationId,
            Source_System__c  = 'Salesforce'
        );
        buffer.add(evt);
    }

    private static Boolean shouldLog(String apexClass, String severity) {
        String configuredLevel = getConfiguredLevel(apexClass);
        return LEVEL_RANK.get(severity) >= LEVEL_RANK.get(configuredLevel);
    }

    private static String getConfiguredLevel(String apexClass) {
        if (String.isBlank(apexClass)) {
            return DEFAULT_LEVEL;
        }
        Logger_Config__mdt cfg = Logger_Config__mdt.getInstance(apexClass);
        if (cfg != null && String.isNotBlank(cfg.Log_Level__c)) {
            return cfg.Log_Level__c;
        }
        return DEFAULT_LEVEL;
    }

    private static String truncate(String value, Integer maxLen) {
        if (value == null) return null;
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }
}