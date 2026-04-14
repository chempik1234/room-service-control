// API Configuration
const API_CONFIG = {
    baseUrl: localStorage.getItem('apiBaseUrl') || 'https://roomservice-proxy.up.railway.app',
    adminApiKey: localStorage.getItem('adminApiKey') || ''
};

// API helper functions
const api = {
    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.adminApiKey}`,
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Tenant endpoints
    getTenants: () => api.request('/api/tenants'),
    getTenant: (id) => api.request(`/api/tenants/${id}`),
    createTenant: (data) => api.request('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTenant: (id, data) => api.request(`/api/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteTenant: (id) => api.request(`/api/tenants/${id}`, {
        method: 'DELETE'
    }),
    regenerateApiKey: (id) => api.request(`/api/tenants/${id}/regenerate-api-key`, {
        method: 'POST'
    }),

    // Stats and logs
    getStats: () => api.request('/api/stats'),
    getLogs: () => api.request('/api/logs')
};

// UI functions
const ui = {
    showLoader: (tableId) => {
        const table = document.getElementById(tableId);
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;
    },

    showError: (tableId, message) => {
        const table = document.getElementById(tableId);
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>${message}
                </td>
            </tr>
        `;
    },

    showEmpty: (tableId, message, colSpan = 7) => {
        const table = document.getElementById(tableId);
        table.innerHTML = `
            <tr>
                <td colspan="${colSpan}" class="text-center text-muted">
                    <i class="bi bi-inbox me-2"></i>${message}
                </td>
            </tr>
        `;
    },

    updateStats: (stats) => {
        document.getElementById('totalTenants').textContent = stats.totalTenants || 0;
        document.getElementById('activeTenants').textContent = stats.activeTenants || 0;
        document.getElementById('suspendedTenants').textContent = stats.suspendedTenants || 0;
        document.getElementById('totalRequests').textContent = (stats.totalRequests || 0).toLocaleString();
    },

    renderTenants: (tenants) => {
        const table = document.getElementById('tenantsTable');

        if (!tenants || tenants.length === 0) {
            ui.showEmpty('tenantsTable', 'No tenants found. Create your first tenant!');
            return;
        }

        table.innerHTML = tenants.map(tenant => `
            <tr class="fade-in">
                <td><code class="text-muted">${tenant.id.substring(0, 8)}...</code></td>
                <td><strong>${this.escapeHtml(tenant.name)}</strong></td>
                <td>${this.escapeHtml(tenant.email)}</td>
                <td><span class="badge plan-${tenant.plan}">${tenant.plan.toUpperCase()}</span></td>
                <td>
                    <span class="badge ${tenant.status === 'active' ? 'bg-success' : 'bg-warning'}">
                        ${tenant.status}
                    </span>
                </td>
                <td><small class="text-muted">${new Date(tenant.createdAt).toLocaleDateString()}</small></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.viewTenant('${tenant.id}')" title="View API Key">
                            <i class="bi bi-key"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="app.editTenant('${tenant.id}')" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.confirmDeleteTenant('${tenant.id}', '${this.escapeHtml(tenant.name)}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderLogs: (logs) => {
        const table = document.getElementById('logsTable');

        if (!logs || logs.length === 0) {
            ui.showEmpty('logsTable', 'No logs available', 5);
            return;
        }

        table.innerHTML = logs.map(log => `
            <tr class="fade-in">
                <td><small class="text-muted">${new Date(log.timestamp).toLocaleString()}</small></td>
                <td><code class="text-muted">${log.tenantId?.substring(0, 8) || 'N/A'}...</code></td>
                <td><span class="badge bg-secondary">${log.method}</span></td>
                <td>
                    <span class="badge ${log.statusCode >= 200 && log.statusCode < 300 ? 'bg-success' : 'bg-danger'}">
                        ${log.statusCode}
                    </span>
                </td>
                <td>${log.responseTime}ms</td>
            </tr>
        `).join('');
    },

    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showModal: (modalId) => {
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
        return modal;
    },

    hideModal: (modalId) => {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) modal.hide();
    },

    showAlert: (message, type = 'success') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.insertBefore(alertDiv, document.body.firstChild);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
};

// Application logic
const app = {
    tenants: [],
    deleteTenantId: null,

    init: async () => {
        // Check API configuration
        if (!API_CONFIG.adminApiKey) {
            ui.showModal('apiConfigModal');
            return;
        }

        // Load initial data
        await Promise.all([
            app.loadTenants(),
            app.loadStats(),
            app.loadLogs()
        ]);

        // Set up auto-refresh for stats
        setInterval(app.loadStats, 30000); // Every 30 seconds
    },

    loadTenants: async () => {
        try {
            ui.showLoader('tenantsTable');
            app.tenants = await api.getTenants();
            ui.renderTenants(app.tenants);
        } catch (error) {
            ui.showError('tenantsTable', error.message);
        }
    },

    loadStats: async () => {
        try {
            const stats = await api.getStats();
            ui.updateStats(stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },

    loadLogs: async () => {
        try {
            ui.showLoader('logsTable');
            const logs = await api.getLogs();
            ui.renderLogs(logs);
        } catch (error) {
            ui.showError('logsTable', error.message);
        }
    },

    createTenant: async () => {
        const name = document.getElementById('tenantName').value.trim();
        const email = document.getElementById('tenantEmail').value.trim();
        const plan = document.getElementById('tenantPlan').value;

        if (!name || !email) {
            ui.showAlert('Please fill in all fields', 'danger');
            return;
        }

        try {
            const tenant = await api.createTenant({ name, email, plan });
            ui.showAlert(`Tenant "${name}" created successfully!`);
            ui.hideModal('createTenantModal');
            document.getElementById('createTenantForm').reset();

            // Show API key
            document.getElementById('apiKeyTenantName').textContent = `API Key for ${name}:`;
            document.getElementById('apiKeyValue').value = tenant.apiKey;
            ui.showModal('apiKeyModal');

            await app.loadTenants();
            await app.loadStats();
        } catch (error) {
            ui.showAlert(`Failed to create tenant: ${error.message}`, 'danger');
        }
    },

    editTenant: async (id) => {
        const tenant = app.tenants.find(t => t.id === id);
        if (!tenant) return;

        document.getElementById('editTenantId').value = tenant.id;
        document.getElementById('editTenantName').value = tenant.name;
        document.getElementById('editTenantEmail').value = tenant.email;
        document.getElementById('editTenantPlan').value = tenant.plan;
        document.getElementById('editTenantStatus').value = tenant.status;

        ui.showModal('editTenantModal');
    },

    saveTenant: async () => {
        const id = document.getElementById('editTenantId').value;
        const name = document.getElementById('editTenantName').value.trim();
        const email = document.getElementById('editTenantEmail').value.trim();
        const plan = document.getElementById('editTenantPlan').value;
        const status = document.getElementById('editTenantStatus').value;

        if (!name || !email) {
            ui.showAlert('Please fill in all fields', 'danger');
            return;
        }

        try {
            await api.updateTenant(id, { name, email, plan, status });
            ui.showAlert(`Tenant "${name}" updated successfully!`);
            ui.hideModal('editTenantModal');
            await app.loadTenants();
            await app.loadStats();
        } catch (error) {
            ui.showAlert(`Failed to update tenant: ${error.message}`, 'danger');
        }
    },

    confirmDeleteTenant: (id, name) => {
        app.deleteTenantId = id;
        document.getElementById('deleteTenantName').textContent = name;
        ui.showModal('deleteConfirmModal');
    },

    deleteTenant: async () => {
        if (!app.deleteTenantId) return;

        try {
            await api.deleteTenant(app.deleteTenantId);
            ui.showAlert('Tenant deleted successfully!');
            ui.hideModal('deleteConfirmModal');
            app.deleteTenantId = null;
            await app.loadTenants();
            await app.loadStats();
        } catch (error) {
            ui.showAlert(`Failed to delete tenant: ${error.message}`, 'danger');
        }
    },

    viewTenant: async (id) => {
        const tenant = app.tenants.find(t => t.id === id);
        if (!tenant) return;

        document.getElementById('apiKeyTenantName').textContent = `API Key for ${tenant.name}:`;
        document.getElementById('apiKeyValue').value = tenant.apiKey || 'Loading...';
        ui.showModal('apiKeyModal');
    },

    copyApiKey: () => {
        const apiKeyInput = document.getElementById('apiKeyValue');
        apiKeyInput.select();
        document.execCommand('copy');
        ui.showAlert('API key copied to clipboard!');
    },

    saveApiConfig: () => {
        const baseUrl = document.getElementById('apiBaseUrl').value.trim();
        const adminApiKey = document.getElementById('adminApiKey').value.trim();

        if (!baseUrl || !adminApiKey) {
            ui.showAlert('Please fill in all fields', 'danger');
            return;
        }

        localStorage.setItem('apiBaseUrl', baseUrl);
        localStorage.setItem('adminApiKey', adminApiKey);

        API_CONFIG.baseUrl = baseUrl;
        API_CONFIG.adminApiKey = adminApiKey;

        ui.showAlert('API configuration saved!');
        ui.hideModal('apiConfigModal');

        // Reload data
        app.init();
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    app.init();

    // Create tenant modal
    document.getElementById('createTenantBtn').addEventListener('click', () => {
        ui.showModal('createTenantModal');
    });

    document.getElementById('submitCreateTenant').addEventListener('click', app.createTenant);

    // Edit tenant modal
    document.getElementById('submitEditTenant').addEventListener('click', app.saveTenant);

    // Delete confirm modal
    document.getElementById('confirmDelete').addEventListener('click', app.deleteTenant);

    // API key modal
    document.getElementById('copyApiKeyBtn').addEventListener('click', app.copyApiKey);

    // API config modal
    document.getElementById('apiConfigBtn').addEventListener('click', () => {
        document.getElementById('apiBaseUrl').value = API_CONFIG.baseUrl;
        document.getElementById('adminApiKey').value = API_CONFIG.adminApiKey;
        ui.showModal('apiConfigModal');
    });

    document.getElementById('saveApiConfig').addEventListener('click', app.saveApiConfig);

    // Refresh logs button
    document.getElementById('refreshLogsBtn').addEventListener('click', app.loadLogs);

    // Tab switching - load logs when logs tab is clicked
    document.getElementById('logs-tab').addEventListener('click', () => {
        app.loadLogs();
    });
});
