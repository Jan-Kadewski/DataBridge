import { LightningElement } from 'lwc';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';

const LOG_EVENT_CHANNEL = '/event/Log__e';

export default class SyncDashboard extends LightningElement {
    subscribed = false;
    _empSubscription;
    _refreshDebounce;

    connectedCallback() {
        this.registerEmpErrorHandler();
        this.subscribeToLogEvents();
    }

    disconnectedCallback() {
        if (this._empSubscription) {
            unsubscribe(this._empSubscription, () => {
                /* no-op */
            });
            this._empSubscription = null;
            this.subscribed = false;
        }
    }

    registerEmpErrorHandler() {
        onError((err) => {
            // Log but don't crash — dashboard still works without streaming.
            console.error('empApi error', err);
        });
    }

    async subscribeToLogEvents() {
        try {
            // Replay -1 = only new events (ignore history buffer).
            this._empSubscription = await subscribe(
                LOG_EVENT_CHANNEL,
                -1,
                () => this.debouncedRefresh()
            );
            this.subscribed = true;
        } catch (err) {
            console.error('Failed to subscribe to Log__e', err);
            this.subscribed = false;
        }
    }

    // Refresh children at most every 500ms, regardless of event volume.
    debouncedRefresh() {
        if (this._refreshDebounce) clearTimeout(this._refreshDebounce);
        this._refreshDebounce = setTimeout(() => this.refreshAll(), 500);
    }

    refreshAll() {
        this.refs.metrics?.refresh();
        this.refs.table?.handleRefresh();
        this.refs.chart?.handleRefresh();
    }
}