import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { publish, subscribe, MessageContext, unsubscribe } from 'lightning/messageService';
import SYNC_CHANNEL from '@salesforce/messageChannel/SyncDashboardChannel__c';
import getRecentOperations from '@salesforce/apex/SyncDashboardController.getRecentOperations';

// ---------------------------------------------------------------------------
// Config: add new filter definitions here — UI renders them automatically.
// Each entry drives one filter row in the filter panel.
// ---------------------------------------------------------------------------
const FILTER_CONFIG = [
    {
        key: 'dateRange',
        label: 'Date range',
        type: 'select',
        default: 'TODAY',
        options: [
            { label: 'Today only', value: 'TODAY' },
            { label: 'Last 7 days', value: 'LAST_7_DAYS' },
            { label: 'All time', value: 'ALL' },
        ],
    },
    {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        default: '',
        options: [
            { label: 'All severities', value: '' },
            { label: 'INFO', value: 'INFO' },
            { label: 'WARN', value: 'WARN' },
            { label: 'ERROR', value: 'ERROR' },
        ],
    },
    {
        key: 'sourceSystem',
        label: 'Source system',
        type: 'select',
        default: '',
        options: [
            { label: 'All systems', value: '' },
            { label: 'Salesforce', value: 'Salesforce' },
            { label: 'MuleSoft', value: 'MuleSoft' },
            { label: 'Node.js', value: 'Node.js' },
        ],
    },
    // To add a new filter in the future, add one object here.
    // Example:
    // {
    //     key: 'operation',
    //     label: 'Operation (contains)',
    //     type: 'text',
    //     default: '',
    // },
];

const COLUMNS = [
    {
        label: 'Name',
        fieldName: 'name',
        type: 'text',
        initialWidth: 100,
    },
    {
        label: 'Severity',
        fieldName: 'severity',
        type: 'text',
        initialWidth: 72,
        cellAttributes: { class: { fieldName: 'severityClass' } },
    },
    {
        label: 'Source',
        fieldName: 'sourceSystem',
        type: 'text',
        initialWidth: 85,
    },
    {
        label: 'Category',
        fieldName: 'category',
        type: 'text',
        initialWidth: 135,
    },
    {
        label: 'Correlation ID',
        fieldName: 'correlationId',
        type: 'button',
        initialWidth: 110,
        typeAttributes: {
            // Wyświetlamy skróconą wersję, pełna wartość jest w row.correlationId
            label: { fieldName: 'correlationIdShort' },
            name: 'filter_correlation',
            variant: 'base',
            title: { fieldName: 'correlationId' }, // tooltip z pełnym UUID
        },
    },
    {
        // Brak initialWidth = wypełnia całą pozostałą przestrzeń
        label: 'Message',
        fieldName: 'message',
        type: 'text',
        wrapText: true,
        minColumnWidth: 250,
    },
    {
        label: 'Apex Class',
        fieldName: 'apexClass',
        type: 'text',
        initialWidth: 120,
    },
    {
        label: 'Created',
        fieldName: 'createdDate',
        type: 'date',
        initialWidth: 148,
        typeAttributes: {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        },
    },
];

// Build default filter state from config.
function buildDefaultFilters() {
    return FILTER_CONFIG.reduce((acc, f) => {
        acc[f.key] = f.default;
        return acc;
    }, { correlationId: '' }); // correlationId managed via LMS, not panel
}

export default class SyncOperationsTable extends LightningElement {
    columns = COLUMNS;
    operations = [];
    error;
    showFilterPanel = false;

    // Single source of truth for all filter state.
    _filters = buildDefaultFilters();

    // Serialized JSON — this is the reactive wire param.
    _filtersJson = JSON.stringify(buildDefaultFilters());

    _wiredResult;
    _subscription;

    @wire(MessageContext)
    messageContext;

    // Wire reacts to _filtersJson changes only (string = trackable by wire).
   @wire(getRecentOperations, { filtersJson: '$_filtersJson' })
wiredOperations(result) {
    this._wiredResult = result;
    if (result.data) {
        this.operations = result.data.map((row) => ({
            ...row,
            severityClass: this.severityToClass(row.severity),
            // Skrócona wersja tylko do wyświetlenia w kolumnie
            correlationIdShort: row.correlationId
                ? row.correlationId.slice(0, 8) + '…'
                : '',
        }));
        this.error = undefined;
    } else if (result.error) {
        this.error = this.reduceError(result.error);
    }
}

    connectedCallback() {
        this._subscription = subscribe(
            this.messageContext,
            SYNC_CHANNEL,
            (msg) => this.handleIncomingMessage(msg),
        );
    }

    disconnectedCallback() {
        if (this._subscription) {
            unsubscribe(this._subscription);
            this._subscription = null;
        }
    }

    // ---------------------------------------------------------------------------
    // Computed properties for template
    // ---------------------------------------------------------------------------

    get filterButtonVariant() {
    return this.activeFilterCount ? 'brand' : 'border-filled';
}

    // Builds filter rows from FILTER_CONFIG for the panel template.
    get filterRows() {
        return FILTER_CONFIG.map((cfg) => ({
            ...cfg,
            value: this._filters[cfg.key],
        }));
    }

    get activeFilterCount() {
        return FILTER_CONFIG.filter((cfg) => {
            const val = this._filters[cfg.key];
            return val && val !== cfg.default;
        }).length + (this._filters.correlationId ? 1 : 0);
    }

    get filterBadgeLabel() {
        const n = this.activeFilterCount;
        return n > 0 ? `${n} active` : null;
    }

    get filterPanelIcon() {
        return this.showFilterPanel ? 'utility:filter' : 'utility:filterList';
    }

    get hasRows() {
        return this.operations && this.operations.length > 0;
    }

    get isCorrelationFiltered() {
        return !!this._filters.correlationId;
    }

    get activeSummary() {
        const parts = [];
        if (this._filters.dateRange === 'TODAY') parts.push('Today');
        if (this._filters.dateRange === 'LAST_7_DAYS') parts.push('Last 7 days');
        if (this._filters.severity) parts.push(this._filters.severity);
        if (this._filters.sourceSystem) parts.push(this._filters.sourceSystem);
        if (this._filters.correlationId)
            parts.push(`CID: ${this._filters.correlationId.slice(0, 8)}…`);
        return parts.length ? parts.join(' · ') : 'All operations';
    }

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------

    handleTogglePanel() {
        this.showFilterPanel = !this.showFilterPanel;
    }

    // Generic handler for all select/text filter changes in the panel.
    handleFilterChange(event) {
        const key = event.target.dataset.key;
        const value = event.target.value;
        this._applyFilter(key, value);
    }

    handleClearAllFilters() {
        this._filters = buildDefaultFilters();
        this._filtersJson = JSON.stringify(this._filters);
        // Also clear correlation ID via LMS so other components are in sync.
        publish(this.messageContext, SYNC_CHANNEL, {
            messageType: 'FILTER_BY_CORRELATION',
            correlationId: '',
        });
    }

    handleRowAction(event) {
        const { action, row } = event.detail;
        if (action.name === 'filter_correlation' && row.correlationId) {
            publish(this.messageContext, SYNC_CHANNEL, {
                messageType: 'FILTER_BY_CORRELATION',
                correlationId: row.correlationId,
            });
        }
    }

    @api
    async handleRefresh() {
        return refreshApex(this._wiredResult);
    }

    // ---------------------------------------------------------------------------
    // LMS
    // ---------------------------------------------------------------------------

    handleIncomingMessage(message) {
        if (message.messageType === 'FILTER_BY_CORRELATION') {
            this._applyFilter('correlationId', message.correlationId ?? '');
        } else if (message.messageType === 'REFRESH_ALL') {
            this.handleRefresh();
        }
    }

    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------

    _applyFilter(key, value) {
        // Spread into new object — LWC tracks by reference.
        this._filters = { ...this._filters, [key]: value };
        // Serialize — this triggers wire re-execution.
        this._filtersJson = JSON.stringify(this._filters);
    }

    severityToClass(severity) {
        if (severity === 'ERROR') return 'slds-text-color_error';
        if (severity === 'WARN') return 'slds-text-color_weak';
        return '';
    }

    reduceError(err) {
        if (Array.isArray(err?.body)) return err.body.map((e) => e.message).join(', ');
        if (typeof err?.body?.message === 'string') return err.body.message;
        return err?.message ?? 'Unknown error';
    }
}