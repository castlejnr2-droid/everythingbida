const BASE = import.meta.env.VITE_API_URL;

export const getToken = () => sessionStorage.getItem('eb_admin_token');
export const clearToken = () => sessionStorage.removeItem('eb_admin_token');
export const setToken = (t) => sessionStorage.setItem('eb_admin_token', t);
export const imageUrl = (id) => `${BASE}/api/images/${id}`;

async function req(method, path, body, useAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body != null) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    if (useAuth) {
      clearToken();
      window.dispatchEvent(new Event('eb:logout'));
    }
    const err = await res.json().catch(() => ({ error: 'Unauthorized' }));
    throw Object.assign(new Error(err.error || 'Unauthorized'), { status: 401 });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status });
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- Public ---
export const getProducts = () => req('GET', '/api/products');
export const getCategories = () => req('GET', '/api/categories');
export const getLocations = () => req('GET', '/api/locations');
export const getBank = () => req('GET', '/api/bank');

export const postOrder = (body) => req('POST', '/api/orders', body);
export const getOrder = (id) => req('GET', `/api/orders/${id}`);
export const getOrderMessages = (id) => req('GET', `/api/orders/${id}/messages`);
// Always include token if available — server auto-detects sender role from it
export const postOrderMessage = (orderId, body) => req('POST', `/api/orders/${orderId}/messages`, body, true);
// Receipt / chat image upload (public; no admin token required)
export const postReceiptImage = (orderId, body) => req('POST', `/api/orders/${orderId}/receipt-image`, body);

// --- Admin ---
export const adminLogin = (password) => req('POST', '/api/admin/login', { password });
export const getAdminOrders = () => req('GET', '/api/admin/orders', null, true);
export const putOrderStatus = (id, status) => req('PUT', `/api/admin/orders/${id}/status`, { status }, true);
export const putOrderPaid = (id, paid) => req('PUT', `/api/admin/orders/${id}/paid`, { paid }, true);

export const uploadImage = (mime, data) => req('POST', '/api/admin/images', { mime, data }, true);
export const createProduct = (body) => req('POST', '/api/admin/products', body, true);
export const updateProduct = (id, body) => req('PUT', `/api/admin/products/${id}`, body, true);
export const deleteProduct = (id) => req('DELETE', `/api/admin/products/${id}`, null, true);

export const createCategory = (body) => req('POST', '/api/admin/categories', body, true);
export const updateCategory = (id, body) => req('PUT', `/api/admin/categories/${id}`, body, true);
export const deleteCategory = (id) => req('DELETE', `/api/admin/categories/${id}`, null, true);

export const getAdminLocations = () => req('GET', '/api/admin/locations', null, true);
export const createLocation = (body) => req('POST', '/api/admin/locations', body, true);
export const updateLocation = (id, body) => req('PUT', `/api/admin/locations/${id}`, body, true);
export const deleteLocation = (id) => req('DELETE', `/api/admin/locations/${id}`, null, true);

export const putBank = (body) => req('PUT', '/api/admin/bank', body, true);
