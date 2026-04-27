public abstract inherited sharing class TriggerHandler {

    // Global kill-switch for ALL handlers, e.g. set before a large data load.
    private static Boolean globalBypass = false;

    // Per-handler bypass, keyed by concrete class name.
    private static Set<String> bypassedHandlers = new Set<String>();

    // Recursion guard: tracks which handler+context combinations already ran.
    private static Set<String> executedContexts = new Set<String>();

    // Allows tests to force a context when not in a real trigger.
    @TestVisible
    private System.TriggerOperation triggerContext;

    @TestVisible
    private Boolean isTriggerExecuting;

    public TriggerHandler() {
        this.isTriggerExecuting = Trigger.isExecuting;
        this.triggerContext = Trigger.operationType;
    }

    // --- Public API ---

    public void run() {
        if (!validateRun()) {
            return;
        }

        String handlerName = String.valueOf(this).substringBefore(':');
        String contextKey = handlerName + '.' + this.triggerContext;

        if (executedContexts.contains(contextKey)) {
            // Recursion guard hit — skip.
            return;
        }
        executedContexts.add(contextKey);

        switch on this.triggerContext {
            when BEFORE_INSERT { beforeInsert(); }
            when BEFORE_UPDATE { beforeUpdate(); }
            when BEFORE_DELETE { beforeDelete(); }
            when AFTER_INSERT  { afterInsert();  }
            when AFTER_UPDATE  { afterUpdate();  }
            when AFTER_DELETE  { afterDelete();  }
            when AFTER_UNDELETE{ afterUndelete();}
            when else {}
        }
    }

    // --- Static bypass controls ---

    public static void bypass(String handlerName) {
        bypassedHandlers.add(handlerName);
    }

    public static void clearBypass(String handlerName) {
        bypassedHandlers.remove(handlerName);
    }

    public static void clearAllBypasses() {
        bypassedHandlers.clear();
        globalBypass = false;
    }

    public static void bypassAll() {
        globalBypass = true;
    }

    public static Boolean isBypassed(String handlerName) {
        return globalBypass || bypassedHandlers.contains(handlerName);
    }

    // --- Overridable hooks (no-ops by default) ---

    protected virtual void beforeInsert() {}
    protected virtual void beforeUpdate() {}
    protected virtual void beforeDelete() {}
    protected virtual void afterInsert()  {}
    protected virtual void afterUpdate()  {}
    protected virtual void afterDelete()  {}
    protected virtual void afterUndelete(){}

    // --- Internal ---

    private Boolean validateRun() {
        if (!this.isTriggerExecuting) {
            throw new TriggerHandlerException(
                'TriggerHandler.run() must be invoked from a trigger context.'
            );
        }
        String handlerName = String.valueOf(this).substringBefore(':');
        return !isBypassed(handlerName);
    }

    public class TriggerHandlerException extends Exception {}
}