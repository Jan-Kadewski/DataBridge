import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getMetrics from '@salesforce/apex/SyncDashboardController.getMetrics';

export default class SyncMetricsCards extends LightningElement {
    metrics = {
        totalToday: 0,
        successToday: 0,
        warningsToday: 0,
        errorsToday: 0,
        successRatePct: 100
    };
    error;
    _wiredResult;

    @wire(getMetrics)
    wiredMetrics(result) {
        this._wiredResult = result;
        if (result.data) {
            this.metrics = result.data;
            this.error = undefined;
        } else if (result.error) {
            this.error = this.reduceError(result.error);
        }
    }

    // Public API so the parent can trigger a refresh on empApi event.
    @api
    async refresh() {
        return refreshApex(this._wiredResult);
    }

    reduceError(err) {
        if (Array.isArray(err?.body)) return err.body.map((e) => e.message).join(', ');
        if (typeof err?.body?.message === 'string') return err.body.message;
        return err?.message ?? 'Unknown error';
    }
}