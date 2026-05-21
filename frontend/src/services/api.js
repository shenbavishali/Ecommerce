import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export async function fetchProducts(params = {}) {
  const response = await api.get('/api/v1/products', { params });
  return unwrap(response);
}

export async function fetchGroceryMaster() {
  const response = await api.get('/api/v1/grocery/master');
  return unwrap(response);
}

export async function addGroceryMasterItem(payload) {
  const response = await api.post('/api/v1/grocery/master', payload);
  return unwrap(response);
}

export async function updateGroceryMasterItem(masterId, payload) {
  const response = await api.patch(`/api/v1/grocery/master/${masterId}`, payload);
  return unwrap(response);
}

export async function deleteGroceryMasterItem(masterId) {
  const response = await api.delete(`/api/v1/grocery/master/${masterId}`);
  return unwrap(response);
}

export async function fetchMonthlyGroceryTemplate(month) {
  const response = await api.get('/api/v1/grocery/template', { params: { month } });
  return unwrap(response);
}

export async function addMonthlyGroceryTemplateItem(payload) {
  const response = await api.post('/api/v1/grocery/template/items', payload);
  return unwrap(response);
}

export async function saveMonthlyGroceryTemplate(payload) {
  const response = await api.put('/api/v1/grocery/template', payload);
  return unwrap(response);
}

export async function fetchFacets() {
  const response = await api.get('/api/v1/products/facets');
  return unwrap(response);
}

export async function fetchSummerSaleOffers() {
  const response = await api.get('/api/v1/offers/summer-sale');
  return unwrap(response);
}

export async function fetchSeasonalBanner() {
  const response = await api.get('/api/v1/offers/seasonal-banner');
  return unwrap(response);
}

export async function fetchCoupons() {
  const response = await api.get('/api/v1/coupons');
  return unwrap(response);
}

export async function fetchProduct(productId) {
  const response = await api.get(`/api/v1/products/${productId}`);
  return unwrap(response);
}

export async function loginUser({ email, password }) {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);
  const response = await api.post('/api/v1/auth/login', body);
  return unwrap(response);
}

export async function registerUser({ name, email, password }) {
  const response = await api.post('/api/v1/auth/register', {
    full_name: name,
    email,
    password,
  });
  return unwrap(response);
}

export async function verifyOtp({ email, otp }) {
  const response = await api.post('/api/v1/auth/verify-otp', { email, otp });
  return unwrap(response);
}

export async function fetchMe() {
  const response = await api.get('/api/v1/auth/me');
  return unwrap(response);
}

export async function fetchCart() {
  const response = await api.get('/api/v1/cart');
  return unwrap(response);
}

export async function addCartItem(productId, quantity = 1, selectedOption = null) {
  const response = await api.post('/api/v1/cart/items', {
    product_id: productId,
    quantity,
    selected_option: selectedOption?.label || null,
    selected_price: selectedOption?.price || null,
  });
  return unwrap(response);
}

export async function updateCartItem(productId, quantity) {
  const response = await api.patch(`/api/v1/cart/items/${productId}`, { quantity });
  return unwrap(response);
}

export async function deleteCartItem(productId) {
  const response = await api.delete(`/api/v1/cart/items/${productId}`);
  return unwrap(response);
}

export async function fetchOrders() {
  const response = await api.get('/api/v1/orders');
  return unwrap(response);
}

export async function createOrder(payload) {
  const response = await api.post('/api/v1/orders', payload);
  return unwrap(response);
}

export async function cancelOrder(orderId, reason) {
  const response = await api.post(`/api/v1/orders/${orderId}/cancel`, { reason });
  return unwrap(response);
}

export async function createReturnRequest(payload) {
  const response = await api.post('/api/v1/orders/returns', payload);
  return unwrap(response);
}

export async function fetchProductReviews(productId) {
  const response = await api.get('/api/v1/reviews', { params: { product_id: productId } });
  return unwrap(response);
}

export async function fetchAllReviews() {
  const response = await api.get('/api/v1/reviews');
  return unwrap(response);
}

export async function createProductReview(payload) {
  const response = await api.post('/api/v1/reviews', payload);
  return unwrap(response);
}

export async function respondProductReview(reviewId, adminResponse) {
  const response = await api.patch(`/api/v1/reviews/${reviewId}/response`, { admin_response: adminResponse });
  return unwrap(response);
}

export async function confirmReturnAmountReceived(requestId) {
  const response = await api.patch(`/api/v1/orders/returns/${requestId}/amount-received`);
  return unwrap(response);
}

export async function fetchDeliverySlots() {
  const response = await api.get('/api/v1/slots');
  return unwrap(response);
}

export async function fetchDeliveryEstimate(productId, pincode) {
  const response = await api.post('/api/v1/delivery/estimate', {
    product_id: productId,
    pincode,
  });
  return unwrap(response);
}

export async function fetchHelpRequests() {
  const response = await api.get('/api/v1/help');
  return unwrap(response);
}

export async function createHelpRequest(payload) {
  const response = await api.post('/api/v1/help', payload);
  return unwrap(response);
}

export async function createAdminProduct(payload) {
  const response = await api.post('/api/v1/admin/products', payload);
  return unwrap(response);
}

export async function fetchAdminDashboard() {
  const response = await api.get('/api/v1/admin/dashboard');
  return unwrap(response);
}

export async function fetchAdminProducts(params = {}) {
  const response = await api.get('/api/v1/admin/products', { params });
  return unwrap(response);
}

export async function fetchAdminCoupons() {
  const response = await api.get('/api/v1/coupons/admin');
  return unwrap(response);
}

export async function createAdminCoupon(payload) {
  const response = await api.post('/api/v1/coupons/admin', payload);
  return unwrap(response);
}

export async function updateAdminCoupon(couponId, payload) {
  const response = await api.patch(`/api/v1/coupons/admin/${couponId}`, payload);
  return unwrap(response);
}

export async function deleteAdminCoupon(couponId) {
  const response = await api.delete(`/api/v1/coupons/admin/${couponId}`);
  return unwrap(response);
}

export async function fetchAdminSummerSaleOffers() {
  const response = await api.get('/api/v1/offers/admin/summer-sale');
  return unwrap(response);
}

export async function fetchAdminSeasonalBanners() {
  const response = await api.get('/api/v1/offers/admin/seasonal-banners');
  return unwrap(response);
}

export async function createAdminSeasonalBanner(payload) {
  const response = await api.post('/api/v1/offers/admin/seasonal-banners', payload);
  return unwrap(response);
}

export async function updateAdminSeasonalBanner(bannerId, payload) {
  const response = await api.patch(`/api/v1/offers/admin/seasonal-banners/${bannerId}`, payload);
  return unwrap(response);
}

export async function uploadAdminSeasonalBannerImage(bannerId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post(`/api/v1/offers/admin/seasonal-banners/${bannerId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
}

export async function createAdminSummerSaleOffer(payload) {
  const response = await api.post('/api/v1/offers/admin/summer-sale', payload);
  return unwrap(response);
}

export async function updateAdminSummerSaleOffer(offerId, payload) {
  const response = await api.patch(`/api/v1/offers/admin/summer-sale/${offerId}`, payload);
  return unwrap(response);
}

export async function updateAdminProduct(productId, payload) {
  const response = await api.patch(`/api/v1/admin/products/${productId}`, payload);
  return unwrap(response);
}

export async function uploadAdminProductImage(productId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post(`/api/v1/admin/products/${productId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
}

export async function deleteAdminProduct(productId) {
  const response = await api.delete(`/api/v1/admin/products/${productId}`);
  return unwrap(response);
}

export async function addAdminProductStock(productId, quantity) {
  const response = await api.post(`/api/v1/admin/products/${productId}/stock`, { quantity });
  return unwrap(response);
}

export async function fetchAdminUsers() {
  const response = await api.get('/api/v1/admin/users');
  return unwrap(response);
}

export async function fetchAdminOrders() {
  const response = await api.get('/api/v1/admin/orders');
  return unwrap(response);
}

export async function fetchAdminDeliveryHubs() {
  const response = await api.get('/api/v1/admin/delivery-hubs');
  return unwrap(response);
}

export async function createAdminDeliveryHub(payload) {
  const response = await api.post('/api/v1/admin/delivery-hubs', payload);
  return unwrap(response);
}

export async function updateAdminDeliveryHub(hubId, payload) {
  const response = await api.patch(`/api/v1/admin/delivery-hubs/${hubId}`, payload);
  return unwrap(response);
}

export async function deleteAdminDeliveryHub(hubId) {
  const response = await api.delete(`/api/v1/admin/delivery-hubs/${hubId}`);
  return unwrap(response);
}

export async function fetchAdminProductHubStock() {
  const response = await api.get('/api/v1/admin/product-hub-stock');
  return unwrap(response);
}

export async function updateAdminProductHubStock(payload) {
  const response = await api.patch('/api/v1/admin/product-hub-stock', payload);
  return unwrap(response);
}

export async function fetchAdminHelpRequests() {
  const response = await api.get('/api/v1/admin/help-requests');
  return unwrap(response);
}

export async function respondAdminHelpRequest(requestId, payload) {
  const response = await api.patch(`/api/v1/admin/help-requests/${requestId}`, payload);
  return unwrap(response);
}

export async function updateAdminOrderStatus(orderId, status) {
  const response = await api.patch(`/api/v1/admin/orders/${orderId}/status`, { status });
  return unwrap(response);
}

export async function updateAdminOrderCancellation(orderId, payload) {
  const response = await api.patch(`/api/v1/admin/orders/${orderId}/cancellation`, payload);
  return unwrap(response);
}

export async function fetchAdminDeliveryBoys() {
  const response = await api.get('/api/v1/admin/delivery-boys');
  return unwrap(response);
}

export async function createAdminDeliveryBoy(payload) {
  const response = await api.post('/api/v1/admin/delivery-boys', payload);
  return unwrap(response);
}

export async function updateAdminDeliveryBoy(deliveryBoyId, payload) {
  const response = await api.patch(`/api/v1/admin/delivery-boys/${deliveryBoyId}`, payload);
  return unwrap(response);
}

export async function deleteAdminDeliveryBoy(deliveryBoyId) {
  const response = await api.delete(`/api/v1/admin/delivery-boys/${deliveryBoyId}`);
  return unwrap(response);
}

export async function assignAdminOrderDeliveryBoy(orderId, deliveryBoyId) {
  const response = await api.patch(`/api/v1/admin/orders/${orderId}/delivery-boy`, {
    delivery_boy_id: deliveryBoyId ? Number(deliveryBoyId) : null,
  });
  return unwrap(response);
}

export async function fetchAdminReturns() {
  const response = await api.get('/api/v1/admin/returns');
  return unwrap(response);
}

export async function updateAdminReturn(requestId, payload) {
  const response = await api.patch(`/api/v1/admin/returns/${requestId}`, payload);
  return unwrap(response);
}
