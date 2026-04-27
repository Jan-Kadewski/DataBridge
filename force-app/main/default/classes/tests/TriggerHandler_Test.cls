@IsTest
private class TriggerHandler_Test {

    @IsTest
    static void bypass_globalFlagPreventsRun() {
        TriggerHandler.bypassAll();
        System.assert(TriggerHandler.isBypassed('AnyHandler'),
            'global bypass should affect every handler name');
        TriggerHandler.clearAllBypasses();
        System.assert(!TriggerHandler.isBypassed('AnyHandler'),
            'clearAllBypasses should reset global flag');
    }

    @IsTest
    static void bypass_perHandler() {
        TriggerHandler.bypass('AccountTriggerHandler');
        System.assert(TriggerHandler.isBypassed('AccountTriggerHandler'));
        System.assert(!TriggerHandler.isBypassed('ContactTriggerHandler'));
        TriggerHandler.clearBypass('AccountTriggerHandler');
        System.assert(!TriggerHandler.isBypassed('AccountTriggerHandler'));
    }

    @IsTest
    static void run_outsideTriggerContext_throws() {
        // The Logger tests also exercise run() via the Log_Event__e trigger — this
        // test covers the guard that forbids synthetic invocation.
        SampleHandler h = new SampleHandler();
        h.isTriggerExecuting = false;

        Boolean threw = false;
        try {
            h.run();
        } catch (TriggerHandler.TriggerHandlerException e) {
            threw = true;
        }
        System.assert(threw, 'run() outside trigger context must throw');
    }

    // Minimal concrete handler used only by the guard test above.
    public class SampleHandler extends TriggerHandler {
        protected override void beforeInsert() {}
    }
}