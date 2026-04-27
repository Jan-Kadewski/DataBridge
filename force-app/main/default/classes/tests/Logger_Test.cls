@IsTest
private class Logger_Test {

    private static final String CORRELATION_ID = '12345678-1234-1234-1234-123456789012';

    @IsTest
    static void info_bufferedAndPublished() {
        Test.startTest();
        Logger.info('TestClass', 'hello world', CORRELATION_ID);
        System.assertEquals(1, Logger.bufferSize(),
            'entry should be buffered before flush');
        Logger.flush();
        System.assertEquals(0, Logger.bufferSize(),
            'buffer should be empty after flush');
        Test.stopTest(); // platform events fire here

        List<Log__c> logs = [
            SELECT Id, Severity__c, Message__c, Correlation_ID__c, Apex_Class__c
            FROM Log__c
            WHERE Correlation_ID__c = :CORRELATION_ID
        ];
        System.assertEquals(1, logs.size(), 'one persisted log expected');
        System.assertEquals('INFO', logs[0].Severity__c);
        System.assertEquals('hello world', logs[0].Message__c);
        System.assertEquals('TestClass', logs[0].Apex_Class__c);
    }

    @IsTest
    static void error_includesStackTrace() {
        Test.startTest();
        try {
            Integer x = 1 / 0;
        } catch (Exception ex) {
            Logger.error('TestClass', 'boom', ex, CORRELATION_ID);
        }
        Logger.flush();
        Test.stopTest();

        List<Log__c> logs = [
            SELECT Severity__c, Message__c, Stack_Trace__c
            FROM Log__c
            WHERE Correlation_ID__c = :CORRELATION_ID
        ];
        System.assertEquals(1, logs.size());
        System.assertEquals('ERROR', logs[0].Severity__c);
        System.assert(logs[0].Message__c.contains('boom'),
            'message should include developer-provided text');
        System.assert(logs[0].Message__c.contains('DivideByZero') ||
                      logs[0].Message__c.contains('MathException') ||
                      logs[0].Message__c.contains('System.'),
            'message should include exception type info');
    }

    @IsTest
    static void flush_emptyBuffer_noOp() {
        Logger.clearBuffer();
        Test.startTest();
        Logger.flush(); // should not throw
        Test.stopTest();
        System.assertEquals(0, [SELECT COUNT() FROM Log__c]);
    }

    @IsTest
    static void debug_filteredByDefaultInfoLevel() {
        // Default config level is INFO, so DEBUG entries are dropped.
        Test.startTest();
        Logger.debug('TestClass', 'should be filtered', CORRELATION_ID);
        System.assertEquals(0, Logger.bufferSize(),
            'DEBUG entry should be filtered at default INFO level');
        Logger.flush();
        Test.stopTest();
    }

    @IsTest
    static void warn_buffered() {
        Test.startTest();
        Logger.warn('TestClass', 'careful', CORRELATION_ID);
        Logger.flush();
        Test.stopTest();

        List<Log__c> logs = [
            SELECT Severity__c FROM Log__c WHERE Correlation_ID__c = :CORRELATION_ID
        ];
        System.assertEquals(1, logs.size());
        System.assertEquals('WARN', logs[0].Severity__c);
    }

    @IsTest
    static void categorizedOverload_persistsCategory() {
        Test.startTest();
        Logger.info('TestClass', 'INTEGRATION.INBOUND', 'payload received', CORRELATION_ID);
        Logger.flush();
        Test.stopTest();

        Log__c log = [
            SELECT Category__c FROM Log__c WHERE Correlation_ID__c = :CORRELATION_ID LIMIT 1
        ];
        System.assertEquals('INTEGRATION.INBOUND', log.Category__c);
    }
}