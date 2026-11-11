/**
 * DAUDSONS ARMOURY (PVT.) LTD. — ENTERPRISE API CLIENT
 * Handles asynchronous REST API communication with the Express/SQLite backend.
 */

const API_BASE = '/api';

class ApiClient {
  async _request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = {
      'Accept': 'application/json'
    };

    if (options.body && !(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const config = {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (err) {
      console.error(`[DSA API] Error at ${options.method || 'GET'} ${url}:`, err);
      throw err;
    }
  }

  // Health & Stats
  async getHealth() {
    return this._request('/health');
  }

  async getStats() {
    return this._request('/stats');
  }

  // -------------------------------------------------------------
  // AUTHENTICATION & SECURITY
  // -------------------------------------------------------------
  async login(email, password, totpCode) {
    return this._request('/auth/login', {
      method: 'POST',
      body: { email, password, totpCode }
    });
  }

  async logout() {
    return this._request('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this._request('/auth/me');
  }

  async setup2FA() {
    return this._request('/auth/2fa/setup', { method: 'POST' });
  }

  async verify2FA(token) {
    return this._request('/auth/2fa/verify', {
      method: 'POST',
      body: { token }
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this._request('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
  }

  // -------------------------------------------------------------
  // PAGE BUILDER & SECTIONS
  // -------------------------------------------------------------
  async getSections(page = 'home') {
    return this._request(`/sections?page=${encodeURIComponent(page)}`);
  }

  async getAllAdminSections() {
    return this._request('/admin/sections');
  }

  async updateSection(id, updates) {
    return this._request(`/admin/sections/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: updates
    });
  }

  // -------------------------------------------------------------
  // SITE SETTINGS
  // -------------------------------------------------------------
  async getSettings() {
    return this._request('/settings');
  }

  async updateSettings(settings) {
    return this._request('/admin/settings', {
      method: 'PUT',
      body: settings
    });
  }

  // -------------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------------
  async getProducts(params = {}) {
    const qs = new URLSearchParams();
    if (params.division && params.division !== 'all') qs.set('division', params.division);
    if (params.category && params.category !== 'all') qs.set('category', params.category);
    if (params.search) qs.set('search', params.search);
    if (params.sort) qs.set('sort', params.sort);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this._request(`/products${query}`);
  }

  async getProductBySlug(slug) {
    return this._request(`/products/${encodeURIComponent(slug)}`);
  }

  async createProduct(product) {
    return this._request('/products', { method: 'POST', body: product });
  }

  async updateProduct(id, updates) {
    return this._request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: updates });
  }

  async deleteProduct(id) {
    return this._request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // -------------------------------------------------------------
  // SHOP & MERCHANDISE (PKR ₨)
  // -------------------------------------------------------------
  async getShopItems(category = 'all') {
    const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return this._request(`/shop${qs}`);
  }

  async getShopItem(id) {
    return this._request(`/shop/${encodeURIComponent(id)}`);
  }

  async updateShopItem(id, updates) {
    return this._request(`/shop/${encodeURIComponent(id)}`, { method: 'PUT', body: updates });
  }

  // -------------------------------------------------------------
  // ORDERS (Strict Statutory Checkout)
  // -------------------------------------------------------------
  async getOrders() {
    return this._request('/orders');
  }

  async createOrder(orderData) {
    return this._request('/orders', { method: 'POST', body: orderData });
  }

  async updateOrderStatus(id, status) {
    return this._request(`/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status }
    });
  }

  // -------------------------------------------------------------
  // SUBMISSIONS & RFQS
  // -------------------------------------------------------------
  async getEnquiries(type) {
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return this._request(`/enquiries${qs}`);
  }

  async createEnquiry(enquiryData) {
    return this._request('/enquiries', { method: 'POST', body: enquiryData });
  }

  async updateEnquiryStatus(id, status) {
    return this._request(`/enquiries/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status }
    });
  }

  // -------------------------------------------------------------
  // DEALERS
  // -------------------------------------------------------------
  async getDealers(search = '') {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return this._request(`/dealers${qs}`);
  }

  async createDealer(dealer) {
    return this._request('/dealers', { method: 'POST', body: dealer });
  }

  async deleteDealer(id) {
    return this._request(`/dealers/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // -------------------------------------------------------------
  // NEWS & EVENTS
  // -------------------------------------------------------------
  async getNews() {
    return this._request('/news');
  }

  async createNews(newsItem) {
    return this._request('/news', { method: 'POST', body: newsItem });
  }

  async deleteNews(id) {
    return this._request(`/news/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // -------------------------------------------------------------
  // CORPORATE CREDENTIALS: CERTS, TIMELINE, CLIENTS, FOUNDATION
  // -------------------------------------------------------------
  async getCertificates() {
    return this._request('/certificates');
  }

  async updateCertificate(id, data) {
    return this._request(`/certificates/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
  }

  async getTimeline() {
    return this._request('/timeline');
  }

  async getClientsPartners(type) {
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return this._request(`/clients-partners${qs}`);
  }

  async getFoundation() {
    return this._request('/foundation');
  }

  // -------------------------------------------------------------
  // DOWNLOADS & FAQS
  // -------------------------------------------------------------
  async getDownloads() {
    return this._request('/downloads');
  }

  async getFaqs(category) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return this._request(`/faqs${qs}`);
  }

  // -------------------------------------------------------------
  // ADMIN USERS & AUDIT LOGS
  // -------------------------------------------------------------
  async getAdminUsers() {
    return this._request('/admin/users');
  }

  async createAdminUser(userData) {
    return this._request('/admin/users', { method: 'POST', body: userData });
  }

  async updateAdminUser(id, updates) {
    return this._request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: updates });
  }

  async deleteAdminUser(id) {
    return this._request(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getAuditLogs(limit = 100) {
    return this._request(`/admin/audit-logs?limit=${limit}`);
  }

  // Media Library
  async getMediaAssets() {
    return this._request('/admin/media');
  }

  async uploadMedia(originalName, mimeType, dataBase64, altText) {
    return this._request('/admin/media', {
      method: 'POST',
      body: { originalName, mimeType, dataBase64, altText }
    });
  }

  async deleteMedia(id) {
    return this._request(`/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getLogs(limit = 50) {
    return this._request(`/admin/logs?limit=${limit}`);
  }

  async resetDatabase() {
    return this._request('/admin/reset-db', { method: 'POST' });
  }

  getExportDbUrl() {
    return `${API_BASE}/admin/export-db`;
  }

  getExportCsvUrl(type) {
    return `${API_BASE}/admin/export-csv/${encodeURIComponent(type)}`;
  }
}

// Global singleton instance
window.dsaApi = new ApiClient();
