// API Configuration
const API_CONFIG = {
    baseUrl: localStorage.getItem('apiBaseUrl') || 'https://roomservice-proxy-production.up.railway.app',
    adminApiKey: localStorage.getItem('adminApiKey') || '',
    authToken: localStorage.getItem('authToken') || '',
    currentUser: JSON.parse(localStorage.getItem('currentUser') || 'null')
};

// API helper functions
const api = {
    getAuthHeader() {
        if (API_CONFIG.authToken) {
            return `Bearer ${API_CONFIG.authToken}`;
        } else if (API_CONFIG.adminApiKey) {
            return API_CONFIG.adminApiKey;
        }
        return '';
    },

    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.getAuthHeader(),
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });

            // Handle 401 - unauthorized
            if (response.status === 401) {
                // Clear auth data and redirect to login
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                API_CONFIG.authToken = '';
                API_CONFIG.currentUser = null;
                app.showLoginModal();
                throw new Error('Authentication required');
            }

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

    // Authentication endpoints
    signup: (data) => api.request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    login: (data) => api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    logout: () => api.request('/api/auth/logout', {
        method: 'POST'
    }),

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
                        <button class="btn btn-sm btn-outline-primary" data-action="view-tenant" data-id="${tenant.id}" title="View API Key">
                            <i class="bi bi-key"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" data-action="edit-tenant" data-id="${tenant.id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" data-action="delete-tenant" data-id="${tenant.id}" data-name="${this.escapeHtml(tenant.name)}" title="Delete">
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
        // Check if user is authenticated
        if (API_CONFIG.authToken && API_CONFIG.currentUser) {
            // User is logged in
            app.updateUIForLoggedInUser();
            // Load initial data
            await Promise.all([
                app.loadTenants(),
                app.loadStats(),
                app.loadLogs()
            ]);
            // Set up auto-refresh for stats
            setInterval(app.loadStats, 30000); // Every 30 seconds
        } else if (API_CONFIG.adminApiKey) {
            // Admin mode
            app.updateUIForAdminMode();
            // Load initial data
            await Promise.all([
                app.loadTenants(),
                app.loadStats(),
                app.loadLogs()
            ]);
            // Set up auto-refresh for stats
            setInterval(app.loadStats, 30000); // Every 30 seconds
        } else {
            // Not configured - show login
            app.showLoginModal();
        }
    },

    updateUIForLoggedInUser() {
        // Update navbar for logged-in user
        const navbar = document.querySelector('.navbar-nav.ms-auto');
        navbar.innerHTML = `
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle me-1"></i>${API_CONFIG.currentUser.name}
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" onclick="app.showApiConfigModal()">
                        <i class="bi bi-gear me-2"></i>API Config
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="app.logout()">
                        <i class="bi bi-box-arrow-right me-2"></i>Logout
                    </a></li>
                </ul>
            </li>
        `;
    },

    updateUIForAdminMode() {
        // Update navbar for admin mode
        const navbar = document.querySelector('.navbar-nav.ms-auto');
        navbar.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="app.showApiConfigModal()">
                    <i class="bi bi-gear me-1"></i>API Config
                </a>
            </li>
            <li class="nav-item">
                <span class="nav-link text-warning">
                    <i class="bi bi-shield-lock me-1"></i>Admin Mode
                </span>
            </li>
        `;
    },

    showLoginModal() {
        // Check if user came from landing page with signup data
        const signupName = sessionStorage.getItem('signupName');
        const signupEmail = sessionStorage.getItem('signupEmail');

        if (signupName && signupEmail) {
            // Switch to signup tab and pre-fill data
            document.getElementById('signup-tab').click();
            document.getElementById('signupName').value = signupName;
            document.getElementById('signupEmail').value = signupEmail;

            // Clear session storage
            sessionStorage.removeItem('signupName');
            sessionStorage.removeItem('signupEmail');
        }

        // Set default API URL if not already configured
        if (!localStorage.getItem('apiBaseUrl')) {
            document.getElementById('authApiUrl').value = 'https://roomservice-proxy-production.up.railway.app';
        } else {
            document.getElementById('authApiUrl').value = API_CONFIG.baseUrl;
        }

        ui.showModal('loginModal');
    },

    switchToAdminMode() {
        // Hide login modal and show admin config modal
        ui.hideModal('loginModal');

        // Pre-fill admin config if available
        document.getElementById('adminApiBaseUrl').value = API_CONFIG.baseUrl || 'https://roomservice-proxy-production.up.railway.app';
        document.getElementById('adminApiKeyInput').value = API_CONFIG.adminApiKey || '';

        ui.showModal('adminConfigModal');
    },

    async saveAdminConfig() {
        const baseUrl = document.getElementById('adminApiBaseUrl').value.trim();
        const adminApiKey = document.getElementById('adminApiKeyInput').value.trim();

        if (!baseUrl || !adminApiKey) {
            ui.showAlert('Please fill in all fields', 'danger');
            return;
        }

        // Save admin config
        localStorage.setItem('apiBaseUrl', baseUrl);
        localStorage.setItem('adminApiKey', adminApiKey);

        API_CONFIG.baseUrl = baseUrl;
        API_CONFIG.adminApiKey = adminApiKey;

        // Clear user auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        API_CONFIG.authToken = '';
        API_CONFIG.currentUser = null;

        ui.showAlert('Admin mode activated! You now have full access. 🔓');
        ui.hideModal('adminConfigModal');

        // Initialize app in admin mode
        await app.init();
    },

    signup: async () => {
        const apiUrl = document.getElementById('authApiUrl').value.trim();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!apiUrl || !name || !email || !password) {
            ui.showAlert('Please fill in all fields', 'danger');
            return;
        }

        if (password.length < 8) {
            ui.showAlert('Password must be at least 8 characters', 'danger');
            return;
        }

        // Save API URL
        localStorage.setItem('apiBaseUrl', apiUrl);
        API_CONFIG.baseUrl = apiUrl;

        try {
            const response = await api.signup({ name, email, password });

            // Store auth data
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            API_CONFIG.authToken = response.token;
            API_CONFIG.currentUser = response.user;

            ui.showAlert('Account created successfully! Welcome to RoomService 🎉');
            ui.hideModal('loginModal');

            // Initialize app
            await app.init();
        } catch (error) {
            ui.showAlert(`Signup failed: ${error.message}`, 'danger');
        }
    },

    login: async () => {
        const apiUrl = document.getElementById('authApiUrl').value.trim();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!apiUrl || !email || !password) {
            ui.showAlert('Please fill in all fields', 'danger');
            return;
        }

        // Save API URL
        localStorage.setItem('apiBaseUrl', apiUrl);
        API_CONFIG.baseUrl = apiUrl;

        try {
            const response = await api.login({ email, password });

            // Store auth data
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            API_CONFIG.authToken = response.token;
            API_CONFIG.currentUser = response.user;

            ui.showAlert('Login successful! Welcome back 👋');
            ui.hideModal('loginModal');

            // Initialize app
            await app.init();
        } catch (error) {
            ui.showAlert(`Login failed: ${error.message}`, 'danger');
        }
    },

    logout: async () => {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }

        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        API_CONFIG.authToken = '';
        API_CONFIG.currentUser = null;

        ui.showAlert('Logged out successfully!');
        location.reload();
    },

    showApiConfigModal() {
        // Show different config modal based on auth type
        if (API_CONFIG.authToken) {
            // User mode - show API config only
            document.getElementById('apiBaseUrl').value = API_CONFIG.baseUrl;
            // Hide admin API key field for users
            document.getElementById('adminKeyField').classList.add('d-none');
            ui.showModal('apiConfigModal');
        } else {
            // Admin mode - redirect to admin config modal
            document.getElementById('adminApiBaseUrl').value = API_CONFIG.baseUrl;
            document.getElementById('adminApiKeyInput').value = API_CONFIG.adminApiKey;
            ui.showModal('adminConfigModal');
        }
    },

    loadTenants: async () => {
        try {
            ui.showLoader('tenantsTable');
            const response = await api.getTenants();
            app.tenants = response.tenants || []; // Extract tenants array from response
            ui.renderTenants(app.tenants);
        } catch (error) {
            ui.showError('tenantsTable', error.message);
        }
    },

    loadStats: async () => {
        try {
            const stats = await api.getStats();
            ui.updateStats({
                totalTenants: stats.totalTenants || 0,
                activeTenants: stats.activeTenants || 0,
                suspendedTenants: stats.suspendedTenants || 0,
                totalRequests: stats.totalRequests || 0
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },

    loadLogs: async () => {
        try {
            ui.showLoader('logsTable');
            const logs = await api.getLogs();
            ui.renderLogs(logs || []); // Ensure logs is an array
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
            const response = await api.createTenant({ name, email, plan });
            const tenant = response.tenant || response; // Handle different response formats
            ui.showAlert(`Tenant "${name}" created successfully!`);
            ui.hideModal('createTenantModal');
            document.getElementById('createTenantForm').reset();

            // Show API key
            document.getElementById('apiKeyTenantName').textContent = `API Key for ${name}:`;
            document.getElementById('apiKeyValue').value = tenant.api_key || tenant.apiKey || 'Loading...';
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
        document.getElementById('apiKeyValue').value = tenant.api_key || tenant.apiKey || 'Loading...';
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
        const adminApiKey = document.getElementById('adminApiKey')?.value.trim() || '';

        if (!baseUrl) {
            ui.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        localStorage.setItem('apiBaseUrl', baseUrl);

        if (adminApiKey) {
            localStorage.setItem('adminApiKey', adminApiKey);
            API_CONFIG.adminApiKey = adminApiKey;
        }

        API_CONFIG.baseUrl = baseUrl;

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

    // Admin config modal
    document.getElementById('saveAdminConfigBtn').addEventListener('click', app.saveAdminConfig);

    // API config modal (only exists in admin mode)
    const apiConfigBtn = document.getElementById('apiConfigBtn');
    if (apiConfigBtn) {
        apiConfigBtn.addEventListener('click', () => {
            document.getElementById('apiBaseUrl').value = API_CONFIG.baseUrl;
            document.getElementById('adminApiKey').value = API_CONFIG.adminApiKey;
            ui.showModal('apiConfigModal');
        });
    }

    document.getElementById('saveApiConfig').addEventListener('click', app.saveApiConfig);

    // Refresh logs button
    document.getElementById('refreshLogsBtn').addEventListener('click', app.loadLogs);

    // Tab switching - load logs when logs tab is clicked
    document.getElementById('logs-tab').addEventListener('click', () => {
        app.loadLogs();
    });

    // Login/Signup tab switching
    document.getElementById('login-tab').addEventListener('click', () => {
        document.getElementById('loginBtn').classList.remove('d-none');
        document.getElementById('signupBtn').classList.add('d-none');
    });

    document.getElementById('signup-tab').addEventListener('click', () => {
        document.getElementById('loginBtn').classList.add('d-none');
        document.getElementById('signupBtn').classList.remove('d-none');
    });

    // Login and Signup buttons
    document.getElementById('loginBtn').addEventListener('click', app.login);
    document.getElementById('signupBtn').addEventListener('click', app.signup);

    // Admin mode button
    document.getElementById('admin-tab').addEventListener('click', app.switchToAdminMode);

    // Event delegation for dynamically added tenant action buttons
    document.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const name = button.dataset.name;

        switch (action) {
            case 'view-tenant':
                app.viewTenant(id);
                break;
            case 'edit-tenant':
                app.editTenant(id);
                break;
            case 'delete-tenant':
                app.confirmDeleteTenant(id, name);
                break;
        }
    });
});
