import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { loadScript } from 'lightning/platformResourceLoader';
import chartJsResource from '@salesforce/resourceUrl/chartJs';
import getErrorsByCategory from '@salesforce/apex/SyncDashboardController.getErrorsByCategory';

const PALETTE = [
    '#C23934',
    '#FFB75D',
    '#2E844A',
    '#0070D2',
    '#5867E8',
    '#B67D11',
    '#706E6B'
];

export default class SyncErrorChart extends LightningElement {
    buckets = [];
    error;
    _chart;
    _chartJsLoaded = false;
    _wiredResult;

    @wire(getErrorsByCategory)
    wiredBuckets(result) {
        this._wiredResult = result;
        if (result.data) {
            this.buckets = result.data;
            this.error = undefined;
            this.renderChartWhenReady();
        } else if (result.error) {
            this.error = this.reduceError(result.error);
        }
    }

    async renderedCallback() {
        if (this._chartJsLoaded) return;
        try {
            await loadScript(this, chartJsResource);
            this._chartJsLoaded = true;
            this.renderChartWhenReady();
        } catch (err) {
            this.error = `Failed to load chart.js: ${err?.message ?? err}`;
        }
    }

    renderChartWhenReady() {
        if (!this._chartJsLoaded) return;
        if (!this.hasData) {
            this.destroyChart();
            return;
        }
        // Wait one microtask so the <canvas> exists after hasData flipped true.
        Promise.resolve().then(() => this.drawChart());
    }

    drawChart() {
        const canvas = this.refs.canvas;
        if (!canvas) return;
        this.destroyChart();

        const labels = this.buckets.map((b) => b.category);
        const data   = this.buckets.map((b) => b.count);
        const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

        // eslint-disable-next-line no-undef
        this._chart = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor: colors,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    destroyChart() {
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    }

    disconnectedCallback() {
        this.destroyChart();
    }

    @api
    async handleRefresh() {
        return refreshApex(this._wiredResult);
    }

    get hasData() {
        return this.buckets && this.buckets.length > 0;
    }

    reduceError(err) {
        if (Array.isArray(err?.body)) return err.body.map((e) => e.message).join(', ');
        if (typeof err?.body?.message === 'string') return err.body.message;
        return err?.message ?? 'Unknown error';
    }
}