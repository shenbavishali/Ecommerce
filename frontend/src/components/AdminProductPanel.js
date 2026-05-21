import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Image as ImageIcon, PackagePlus, Plus, RefreshCw, Save, Trash2, Upload, UsersRound, X } from 'lucide-react';
import {
  addAdminProductStock,
  assignAdminOrderDeliveryBoy,
  createAdminDeliveryBoy,
  createAdminDeliveryHub,
  createAdminCoupon,
  createAdminProduct,
  createAdminSeasonalBanner,
  createAdminSummerSaleOffer,
  deleteAdminDeliveryBoy,
  deleteAdminDeliveryHub,
  deleteAdminCoupon,
  deleteAdminProduct,
  fetchAdminCoupons,
  fetchAdminDashboard,
  fetchAdminDeliveryBoys,
  fetchAdminDeliveryHubs,
  fetchAdminHelpRequests,
  fetchAdminOrders,
  fetchAdminProductHubStock,
  fetchAdminProducts,
  fetchAdminSeasonalBanners,
  fetchAdminSummerSaleOffers,
  fetchAdminReturns,
  fetchAdminUsers,
  updateAdminOrderCancellation,
  updateAdminReturn,
  updateAdminCoupon,
  updateAdminDeliveryBoy,
  updateAdminDeliveryHub,
  updateAdminOrderStatus,
  updateAdminProductHubStock,
  updateAdminProduct,
  uploadAdminProductImage,
  updateAdminSeasonalBanner,
  updateAdminSummerSaleOffer,
  uploadAdminSeasonalBannerImage,
  fetchAllReviews,
  respondAdminHelpRequest,
  respondProductReview,
} from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { getAllReviewsFromData, useProfileStore } from '../store/profileStore';

const initialProduct = {
  sku: '',
  name: '',
  brand: '',
  category: '',
  subcategory: '',
  gender: 'unisex',
  color: '',
  size: '',
  price: '',
  mrp: '',
  discount_percent: 0,
  rating: 0,
  inventory: 0,
  image_url: '',
  description: '',
  is_active: true,
  warranty_months: 0,
  warranty_terms: '',
  replacement_days: 0,
  warranty_card_enabled: false,
};

const adminCategorySuggestions = [
  'Grocery',
  'AC',
  'Laptop',
  'Electronics',
  'Appliances',
  'Mobiles',
  'Fashion',
  'Home Care',
];

const initialDeliveryBoy = {
  name: '',
  phone: '',
  area: '',
  category_scope: '',
};

const deliveryBoyCategoryPresets = [
  ['Grocery route', 'Grocery, Groceries, Fruits, Vegetables, Dairy, Home Care'],
  ['Fashion route', 'Fashion, Dresses, Dress, Clothing, Apparel, Footwear'],
  ['Electronics route', 'Electronics, TV, AC, Laptop, Appliances, Mobiles, Audio, Refrigerator, Washing Machine'],
  ['General route', 'General, Other, Household'],
];

const initialDeliveryHub = {
  name: '',
  city: '',
  state: 'Tamilnadu',
  pincode_prefixes: '',
  region: 'west',
  base_delivery_days: 3,
  fallback_extra_days: 2,
  express_available: false,
  is_active: true,
};

const tabs = [
  ['products', 'Products'],
  ['coupons', 'Coupons'],
  ['summer-sale', 'Summer Sale'],
  ['users', 'Users'],
  ['orders', 'Orders'],
  ['delivery-hubs', 'Delivery Hubs'],
  ['hub-stock', 'Hub Stock'],
  ['delivery-boys', 'Courier Providers'],
  ['help-requests', 'Help'],
  ['revenue', 'Revenue'],
  ['returns', 'Returns'],
  ['cancelled-products', 'Cancelled Products'],
  ['feedback', 'Feedback'],
];

const dashboardCardStyles = {
  products: 'border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300 focus:ring-sky-500',
  'active-products': 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300 focus:ring-emerald-500',
  'low-stock': 'border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300 focus:ring-amber-500',
  users: 'border-violet-200 bg-violet-50 text-violet-950 hover:border-violet-300 focus:ring-violet-500',
  'help-requests': 'border-cyan-200 bg-cyan-50 text-cyan-950 hover:border-cyan-300 focus:ring-cyan-500',
  returns: 'border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300 focus:ring-rose-500',
  revenue: 'border-lime-200 bg-lime-50 text-lime-950 hover:border-lime-300 focus:ring-lime-500',
};

const initialSummerSaleForm = {
  product_id: '',
  offer_price: '',
  discount_percent: 0,
  max_quantity_per_user: 2,
  min_quantity: 1,
  bundle_price: '',
  rule_description: '',
  is_active: true,
};

const offerTypes = [
  ['summer', 'Summer Offer'],
  ['diwali', 'Diwali Offer'],
  ['pongal', 'Pongal Offer'],
];

const initialSeasonalBannerForm = {
  offer_type: 'summer',
  title: 'Great Summer Sale',
  subtitle: 'Cool savings for sunny days',
  image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  accent_color: '#f97316',
  is_active: true,
};

const initialCouponForm = {
  code: '',
  title: '',
  description: '',
  discount: '',
  min_order: '',
  expires_at: '',
  is_active: true,
};

const orderStatusOptions = [
  ['in_progress', 'In Progress'],
  ['packed', 'Packed'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivery'],
];

function toProductForm(product) {
  return {
    ...initialProduct,
    ...product,
    price: String(product.price ?? ''),
    mrp: String(product.mrp ?? ''),
    discount_percent: String(product.discount_percent ?? 0),
    rating: String(product.rating ?? 0),
    inventory: String(product.inventory ?? 0),
    warranty_months: String(product.warranty_months ?? 0),
    replacement_days: String(product.replacement_days ?? 0),
    warranty_terms: product.warranty_terms || '',
    warranty_card_enabled: Boolean(product.warranty_card_enabled),
  };
}

function productPayload(product) {
  return {
    ...product,
    price: Number(product.price),
    mrp: Number(product.mrp),
    discount_percent: Number(product.discount_percent),
    rating: Number(product.rating),
    inventory: Number(product.inventory),
    warranty_months: Number(product.warranty_months || 0),
    replacement_days: Number(product.replacement_days || 0),
    warranty_terms: product.warranty_terms || '',
    warranty_card_enabled: Boolean(product.warranty_card_enabled),
  };
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

function normalizeOrderStatus(status) {
  return status === 'placed' || !status ? 'in_progress' : status;
}

function statusText(status) {
  const normalized = normalizeOrderStatus(status);
  const matched = orderStatusOptions.find(([value]) => value === normalized);
  return matched ? matched[1] : String(normalized).replaceAll('_', ' ');
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return '';
  }
  return imageUrl.startsWith('/static')
    ? `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}${imageUrl}`
    : imageUrl;
}

export default function AdminProductPanel({ compact = false, initialTab = 'products', onCreated }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [deliveryHubs, setDeliveryHubs] = useState([]);
  const [hubStockData, setHubStockData] = useState({ hubs: [], products: [] });
  const [helpRequests, setHelpRequests] = useState([]);
  const [summerSaleOffers, setSummerSaleOffers] = useState([]);
  const [seasonalBanners, setSeasonalBanners] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [product, setProduct] = useState(initialProduct);
  const [deliveryBoyForm, setDeliveryBoyForm] = useState(initialDeliveryBoy);
  const [deliveryHubForm, setDeliveryHubForm] = useState(initialDeliveryHub);
  const [summerSaleForm, setSummerSaleForm] = useState(initialSummerSaleForm);
  const [seasonalBannerForm, setSeasonalBannerForm] = useState(initialSeasonalBannerForm);
  const [couponForm, setCouponForm] = useState(initialCouponForm);
  const [productImageFile, setProductImageFile] = useState(null);
  const [seasonalBannerFile, setSeasonalBannerFile] = useState(null);
  const [editingDeliveryBoyId, setEditingDeliveryBoyId] = useState(null);
  const [editingDeliveryHubId, setEditingDeliveryHubId] = useState(null);
  const [editingSummerSaleId, setEditingSummerSaleId] = useState(null);
  const [editingSeasonalBannerId, setEditingSeasonalBannerId] = useState(null);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [restock, setRestock] = useState({});
  const [productScope, setProductScope] = useState('all');
  const [userScope, setUserScope] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveredOrder, setDeliveredOrder] = useState(null);
  const [revenueModal, setRevenueModal] = useState(null);
  const [orderFilters, setOrderFilters] = useState({ q: '', status: 'all', deliveryBoy: 'all' });
  const [returnFilters, setReturnFilters] = useState({ q: '', status: 'all' });
  const [reviewResponses, setReviewResponses] = useState({});
  const [helpResponses, setHelpResponses] = useState({});
  const [hubStockDrafts, setHubStockDrafts] = useState({});
  const [backendReviews, setBackendReviews] = useState([]);
  const [status, setStatus] = useState({ loading: false, message: '', error: '' });
  const [loading, setLoading] = useState(true);
  const profileData = useProfileStore((state) => state.data);
  const hydrateProfiles = useProfileStore((state) => state.hydrate);
  const respondToReview = useProfileStore((state) => state.respondToReview);
  const localReviews = useMemo(() => getAllReviewsFromData(profileData), [profileData]);
  const reviews = useMemo(() => {
    const reviewMap = new Map();
    [...backendReviews, ...localReviews].forEach((review) => {
      const reviewKey = `${review.customerEmail || review.owner}-${review.orderId || review.order_id}-${review.productId || review.product_id}`;
      if (!reviewMap.has(reviewKey)) {
        reviewMap.set(reviewKey, review);
      }
    });
    return Array.from(reviewMap.values()).sort(
      (first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
    );
  }, [backendReviews, localReviews]);

  const loadAdminData = async () => {
    setLoading(true);
    setStatus((current) => ({ ...current, error: '' }));
    try {
      const [
        summary,
        productResponse,
        userResponse,
        orderResponse,
        deliveryBoyResponse,
        deliveryHubResponse,
        returnResponse,
        helpResponse,
        hubStockResponse,
        summerSaleResponse,
        seasonalBannerResponse,
        couponResponse,
      ] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminProducts({ page_size: 100 }),
        fetchAdminUsers(),
        fetchAdminOrders(),
        fetchAdminDeliveryBoys(),
        fetchAdminDeliveryHubs(),
        fetchAdminReturns(),
        fetchAdminHelpRequests(),
        fetchAdminProductHubStock(),
        fetchAdminSummerSaleOffers(),
        fetchAdminSeasonalBanners(),
        fetchAdminCoupons(),
      ]);
      setDashboard(summary);
      setProducts(productResponse.items || []);
      setUsers(userResponse || []);
      setOrders(orderResponse || []);
      setDeliveryBoys(deliveryBoyResponse || []);
      setDeliveryHubs(deliveryHubResponse || []);
      setReturns(returnResponse || []);
      setHelpRequests(helpResponse || []);
      setHubStockData(hubStockResponse || { hubs: [], products: [] });
      setSummerSaleOffers(summerSaleResponse || []);
      setSeasonalBanners(seasonalBannerResponse || []);
      setCoupons(couponResponse || []);
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Admin dashboard failed to load',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrateProfiles();
    loadAdminData();
  }, [hydrateProfiles]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === 'feedback') {
      hydrateProfiles();
      fetchAllReviews()
        .then((response) => setBackendReviews(response || []))
        .catch(() => setBackendReviews([]));
    }
  }, [activeTab, hydrateProfiles]);

  const updateProduct = (key, value) => {
    setProduct({ ...product, [key]: value });
  };

  const resetForm = () => {
    setProduct(initialProduct);
    setProductImageFile(null);
    setEditingId(null);
  };

  const resetDeliveryBoyForm = () => {
    setDeliveryBoyForm(initialDeliveryBoy);
    setEditingDeliveryBoyId(null);
  };

  const resetDeliveryHubForm = () => {
    setDeliveryHubForm(initialDeliveryHub);
    setEditingDeliveryHubId(null);
  };

  const resetSummerSaleForm = () => {
    setSummerSaleForm(initialSummerSaleForm);
    setEditingSummerSaleId(null);
  };

  const resetSeasonalBannerForm = () => {
    setSeasonalBannerForm(initialSeasonalBannerForm);
    setSeasonalBannerFile(null);
    setEditingSeasonalBannerId(null);
  };

  const resetCouponForm = () => {
    setCouponForm(initialCouponForm);
    setEditingCouponId(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });

    try {
      let savedProduct = editingId
        ? await updateAdminProduct(editingId, productPayload(product))
        : await createAdminProduct(productPayload(product));
      if (productImageFile) {
        savedProduct = await uploadAdminProductImage(savedProduct.id, productImageFile);
      }
      resetForm();
      setStatus({
        loading: false,
        message: productImageFile ? 'Product saved with uploaded image.' : editingId ? 'Product updated.' : 'Product added to MySQL.',
        error: '',
      });
      onCreated?.(savedProduct);
      await loadAdminData();
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Product save failed',
      });
    }
  };

  const startEdit = (item) => {
    setProduct(toProductForm(item));
    setProductImageFile(null);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeProduct = async (productId) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      await deleteAdminProduct(productId);
      setStatus({ loading: false, message: 'Product deleted.', error: '' });
      await loadAdminData();
      onCreated?.();
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Product delete failed',
      });
    }
  };

  const addStock = async (productId) => {
    const quantity = Number(restock[productId]);
    if (!quantity || quantity < 1) {
      return;
    }

    setStatus({ loading: true, message: '', error: '' });
    try {
      await addAdminProductStock(productId, quantity);
      setRestock({ ...restock, [productId]: '' });
      setStatus({ loading: false, message: `Stock increased by ${quantity}.`, error: '' });
      await loadAdminData();
      onCreated?.();
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Stock update failed',
      });
    }
  };

  const changeOrderStatus = async (orderId, nextStatus) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, nextStatus);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order))
      );
      setSelectedOrder((currentOrder) =>
        currentOrder?.id === updatedOrder.id ? { ...currentOrder, ...updatedOrder } : currentOrder
      );
      if (nextStatus === 'delivered' && updatedOrder.delivery_boy) {
        setDeliveredOrder(updatedOrder);
      }
      setStatus({ loading: false, message: 'Order status updated.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Order status update failed',
      });
    }
  };

  const changeOrderDeliveryBoy = async (orderId, deliveryBoyId) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const updatedOrder = await assignAdminOrderDeliveryBoy(orderId, deliveryBoyId);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order))
      );
      setStatus({ loading: false, message: 'Courier provider assigned.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Courier assignment failed',
      });
    }
  };

  const saveReturn = async (requestId, payload) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const updatedReturn = await updateAdminReturn(requestId, payload);
      setReturns((currentReturns) =>
        currentReturns.map((request) => (request.id === updatedReturn.id ? { ...request, ...updatedReturn } : request))
      );
      setStatus({ loading: false, message: 'Return request updated.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Return update failed',
      });
    }
  };

  const saveCancellation = async (orderId, payload) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const updatedOrder = await updateAdminOrderCancellation(orderId, payload);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order))
      );
      setStatus({ loading: false, message: 'Cancellation refund details updated.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Cancellation update failed',
      });
    }
  };

  const submitDeliveryBoy = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });
    try {
      const savedDeliveryBoy = editingDeliveryBoyId
        ? await updateAdminDeliveryBoy(editingDeliveryBoyId, deliveryBoyForm)
        : await createAdminDeliveryBoy(deliveryBoyForm);
      setDeliveryBoys((currentDeliveryBoys) => [
        savedDeliveryBoy,
        ...currentDeliveryBoys.filter((deliveryBoy) => deliveryBoy.id !== savedDeliveryBoy.id),
      ]);
      resetDeliveryBoyForm();
      setStatus({ loading: false, message: 'Courier provider saved.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Courier provider save failed',
      });
    }
  };

  const startDeliveryBoyEdit = (deliveryBoy) => {
    setDeliveryBoyForm({
      name: deliveryBoy.name || '',
      phone: deliveryBoy.phone || '',
      area: deliveryBoy.area || '',
      category_scope: deliveryBoy.category_scope || '',
    });
    setEditingDeliveryBoyId(deliveryBoy.id);
  };

  const removeDeliveryBoy = async (deliveryBoyId) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const deletedDeliveryBoy = await deleteAdminDeliveryBoy(deliveryBoyId);
      setDeliveryBoys((currentDeliveryBoys) =>
        currentDeliveryBoys.map((deliveryBoy) =>
          deliveryBoy.id === deletedDeliveryBoy.id ? deletedDeliveryBoy : deliveryBoy
        )
      );
      setStatus({ loading: false, message: 'Courier provider deleted.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Courier provider delete failed',
      });
    }
  };

  const submitDeliveryHub = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });
    const payload = {
      ...deliveryHubForm,
      base_delivery_days: Number(deliveryHubForm.base_delivery_days),
      pincode_prefix: String(deliveryHubForm.pincode_prefix),
    };
    try {
      const savedHub = editingDeliveryHubId
        ? await updateAdminDeliveryHub(editingDeliveryHubId, payload)
        : await createAdminDeliveryHub(payload);
      setDeliveryHubs((currentHubs) => [savedHub, ...currentHubs.filter((hub) => hub.id !== savedHub.id)]);
      resetDeliveryHubForm();
      setStatus({ loading: false, message: 'Delivery hub saved.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Delivery hub save failed',
      });
    }
  };

  const submitSummerSaleOffer = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });
    const payload = {
      product_id: Number(summerSaleForm.product_id),
      offer_price: summerSaleForm.offer_price ? Number(summerSaleForm.offer_price) : null,
      discount_percent: Number(summerSaleForm.discount_percent || 0),
      max_quantity_per_user: Number(summerSaleForm.max_quantity_per_user || 2),
      min_quantity: Number(summerSaleForm.min_quantity || 1),
      bundle_price: summerSaleForm.bundle_price ? Number(summerSaleForm.bundle_price) : null,
      rule_description: summerSaleForm.rule_description,
      is_active: summerSaleForm.is_active,
    };
    try {
      const savedOffer = editingSummerSaleId
        ? await updateAdminSummerSaleOffer(editingSummerSaleId, payload)
        : await createAdminSummerSaleOffer(payload);
      setSummerSaleOffers((currentOffers) => [savedOffer, ...currentOffers.filter((offer) => offer.id !== savedOffer.id)]);
      resetSummerSaleForm();
      setStatus({ loading: false, message: 'Summer Sale offer saved.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Summer Sale offer save failed',
      });
    }
  };

  const startSummerSaleEdit = (offer) => {
    setSummerSaleForm({
      product_id: String(offer.product_id || ''),
      offer_price: offer.offer_price ?? '',
      discount_percent: offer.discount_percent ?? 0,
      max_quantity_per_user: offer.max_quantity_per_user ?? 2,
      min_quantity: offer.min_quantity ?? 1,
      bundle_price: offer.bundle_price ?? '',
      rule_description: offer.rule_description || '',
      is_active: Boolean(offer.is_active),
    });
    setEditingSummerSaleId(offer.id);
  };

  const submitSeasonalBanner = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });
    try {
      const savedBanner = editingSeasonalBannerId
        ? await updateAdminSeasonalBanner(editingSeasonalBannerId, seasonalBannerForm)
        : await createAdminSeasonalBanner(seasonalBannerForm);
      const bannerWithImage = seasonalBannerFile
        ? await uploadAdminSeasonalBannerImage(savedBanner.id, seasonalBannerFile)
        : savedBanner;
      setSeasonalBanners((currentBanners) => [
        bannerWithImage,
        ...currentBanners.filter((banner) => banner.id !== bannerWithImage.id),
      ]);
      resetSeasonalBannerForm();
      setStatus({ loading: false, message: 'Seasonal banner saved.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Seasonal banner save failed',
      });
    }
  };

  const startSeasonalBannerEdit = (banner) => {
    setSeasonalBannerForm({
      offer_type: banner.offer_type || 'summer',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      accent_color: banner.accent_color || '#f97316',
      is_active: Boolean(banner.is_active),
    });
    setSeasonalBannerFile(null);
    setEditingSeasonalBannerId(banner.id);
  };

  const submitCoupon = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, message: '', error: '' });
    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      title: couponForm.title.trim(),
      description: couponForm.description.trim(),
      discount: Number(couponForm.discount),
      min_order: Number(couponForm.min_order),
      expires_at: new Date(couponForm.expires_at).toISOString(),
      is_active: couponForm.is_active,
    };
    try {
      const savedCoupon = editingCouponId
        ? await updateAdminCoupon(editingCouponId, payload)
        : await createAdminCoupon(payload);
      setCoupons((currentCoupons) => [
        savedCoupon,
        ...currentCoupons.filter((coupon) => coupon.db_id !== savedCoupon.db_id),
      ]);
      resetCouponForm();
      setStatus({ loading: false, message: 'Coupon saved.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Coupon save failed',
      });
    }
  };

  const startCouponEdit = (coupon) => {
    setCouponForm({
      code: coupon.code || '',
      title: coupon.title || '',
      description: coupon.description || '',
      discount: String(coupon.discount ?? ''),
      min_order: String(coupon.min_order ?? coupon.minOrder ?? ''),
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 10) : '',
      is_active: Boolean(coupon.is_active),
    });
    setEditingCouponId(coupon.db_id);
  };

  const removeCoupon = async (couponId) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const disabledCoupon = await deleteAdminCoupon(couponId);
      setCoupons((currentCoupons) =>
        currentCoupons.map((coupon) => (coupon.db_id === disabledCoupon.db_id ? disabledCoupon : coupon))
      );
      setStatus({ loading: false, message: 'Coupon disabled.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Coupon delete failed',
      });
    }
  };

  const startDeliveryHubEdit = (hub) => {
    setDeliveryHubForm({
      name: hub.name || '',
      city: hub.city || '',
      state: hub.state || 'Tamilnadu',
      region: hub.region || 'west',
      pincode_prefixes: hub.pincode_prefixes || '',
      base_delivery_days: hub.base_delivery_days || 3,
      fallback_extra_days: hub.fallback_extra_days || 2,
      express_available: Boolean(hub.express_available),
      is_active: Boolean(hub.is_active),
    });
    setEditingDeliveryHubId(hub.id);
  };

  const removeDeliveryHub = async (hubId) => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const deletedHub = await deleteAdminDeliveryHub(hubId);
      setDeliveryHubs((currentHubs) => currentHubs.map((hub) => (hub.id === deletedHub.id ? deletedHub : hub)));
      setStatus({ loading: false, message: 'Delivery hub disabled.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Delivery hub update failed',
      });
    }
  };

  const respondHelpRequest = async (requestId) => {
    const responseText = helpResponses[requestId] || '';
    if (!responseText.trim()) {
      return;
    }
    setStatus({ loading: true, message: '', error: '' });
    try {
      const updatedRequest = await respondAdminHelpRequest(requestId, {
        admin_response: responseText,
        status: 'answered',
      });
      setHelpRequests((currentRequests) =>
        currentRequests.map((request) => (request.id === updatedRequest.id ? updatedRequest : request))
      );
      setStatus({ loading: false, message: 'Help response sent to customer.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Help response failed',
      });
    }
  };

  const saveHubStock = async (productId, hubId, currentQuantity) => {
    const key = `${productId}-${hubId}`;
    const quantity = Number(hubStockDrafts[key] ?? currentQuantity ?? 0);
    setStatus({ loading: true, message: '', error: '' });
    try {
      await updateAdminProductHubStock({ product_id: productId, hub_id: hubId, quantity });
      const hubStockResponse = await fetchAdminProductHubStock();
      setHubStockData(hubStockResponse || { hubs: [], products: [] });
      setHubStockDrafts((currentDrafts) => ({ ...currentDrafts, [key]: '' }));
      setStatus({ loading: false, message: 'Hub stock updated.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Hub stock update failed',
      });
    }
  };

  const openDashboardLink = (target) => {
    setProductScope('all');
    setUserScope('all');
    setSelectedOrder(null);

    if (target === 'low-stock') {
      setProductScope('low-stock');
      setActiveTab('products');
      return;
    }

    if (target === 'active-products') {
      setProductScope('active');
      setActiveTab('products');
      return;
    }

    setActiveTab(target);
  };

  const displayedProducts =
    productScope === 'low-stock'
      ? products.filter((item) => item.is_active && Number(item.inventory) <= 5)
      : productScope === 'active'
      ? products.filter((item) => item.is_active)
      : products;
  const displayedUsers = userScope === 'active' ? users.filter((user) => user.is_active) : users;
  const dashboardLinks = dashboard
    ? [
        ['Products', dashboard.products, 'products'],
        ['Active Products', dashboard.active_products ?? 0, 'active-products'],
        ['Low stock', dashboard.low_stock, 'low-stock'],
        ['Users', dashboard.users, 'users'],
        ['Help', dashboard.help_requests ?? 0, 'help-requests'],
        ['Returns', dashboard.returns ?? 0, 'returns'],
        ['Revenue', formatCurrency(dashboard.revenue), 'revenue'],
      ]
    : [];
  const requestedReturnCount = returns.filter(
    (request) => !['refund_completed', 'amount_received'].includes(request.status)
  ).length;
  const filteredOrders = orders.filter((order) => {
    if (order.status === 'cancelled') {
      return false;
    }

    const query = orderFilters.q.trim().toLowerCase();
    const matchesQuery =
      !query ||
      order.order_number?.toLowerCase().includes(query) ||
      order.user.full_name?.toLowerCase().includes(query) ||
      order.user.email?.toLowerCase().includes(query);
    const matchesStatus = orderFilters.status === 'all' || normalizeOrderStatus(order.status) === orderFilters.status;
    const matchesDeliveryBoy =
      orderFilters.deliveryBoy === 'all' || String(order.delivery_boy_id || '') === String(orderFilters.deliveryBoy);

    return matchesQuery && matchesStatus && matchesDeliveryBoy;
  });
  const filteredReturns = returns.filter((request) => {
    const query = returnFilters.q.trim().toLowerCase();
    const matchesQuery =
      !query ||
      request.order_number?.toLowerCase().includes(query) ||
      request.product_name?.toLowerCase().includes(query) ||
      request.customer?.full_name?.toLowerCase().includes(query) ||
      request.customer?.email?.toLowerCase().includes(query);
    const matchesStatus = returnFilters.status === 'all' || request.status === returnFilters.status;

    return matchesQuery && matchesStatus;
  });
  const returnStatusOptions = Array.from(new Set(returns.map((request) => request.status).filter(Boolean)));
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled');

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-950">
            {compact && activeTab === 'orders' ? 'Orders' : compact && activeTab === 'returns' ? 'Returns' : 'Admin dashboard'}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {compact && activeTab === 'orders'
              ? 'Customer order details and delivery assignment.'
              : compact && activeTab === 'returns'
              ? 'Customer return requests and refund status.'
              : 'Manage products, stock, users, returns, and summary details.'}
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            hydrateProfiles();
            loadAdminData();
          }}
          type="button"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {dashboard && !compact && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {dashboardLinks.map(([label, value, target]) => (
            <button
              className={`rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 ${dashboardCardStyles[target] || 'border-slate-200 bg-white text-slate-950 hover:border-emerald-300 focus:ring-emerald-500'}`}
              key={label}
              onClick={() => openDashboardLink(target)}
              type="button"
            >
              <p className="text-xs font-black uppercase opacity-70">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </button>
          ))}
        </div>
      )}

      {!compact && <div className="mt-6 inline-flex rounded-md bg-slate-100 p-1">
        {tabs.map(([id, label]) => (
          <button
            className={`h-10 rounded-md px-4 text-sm font-black ${
              activeTab === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
            }`}
            key={id}
            onClick={() => {
              setProductScope('all');
              setUserScope('all');
              setActiveTab(id);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>}

      {(status.error || status.message) && (
        <div
          className={`mt-4 rounded-md p-3 text-sm font-semibold ${
            status.error ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {status.error || status.message}
        </div>
      )}

      {activeTab === 'products' && (
        <>
          <form className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" onSubmit={submit}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">{editingId ? 'Edit product' : 'Add product'}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Keep core details, pricing, and stock aligned before saving.</p>
              </div>
              {editingId && (
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  onClick={resetForm}
                  type="button"
                >
                  <X size={16} />
                  Cancel
                </button>
              )}
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                <h3 className="text-sm font-black uppercase text-slate-500">Product Identity</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[
                    ['sku', 'SKU'],
                    ['name', 'Name'],
                    ['brand', 'Brand'],
                    ['category', 'Category'],
                    ['subcategory', 'Subcategory'],
                    ['gender', 'Gender'],
                    ['color', 'Color'],
                    ['size', 'Size'],
                    ['image_url', 'Image URL'],
                  ].map(([key, label]) => (
                    <label className={key === 'image_url' ? 'sm:col-span-2' : ''} key={key}>
                      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        list={key === 'category' ? 'admin-category-suggestions' : undefined}
                        onChange={(event) => updateProduct(key, event.target.value)}
                        required={key === 'image_url' ? !productImageFile : ['sku', 'name', 'brand', 'category'].includes(key)}
                        value={product[key] || ''}
                      />
                      {key === 'image_url' && (
                        <div className="mt-3 grid gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div>
                            <span className="block text-xs font-black uppercase text-slate-500">Upload Image</span>
                            <span className="mt-1 block text-sm font-semibold text-slate-600">
                              {productImageFile ? productImageFile.name : 'Choose a JPG, PNG, or WEBP file instead of using a URL.'}
                            </span>
                          </div>
                          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800">
                            <Upload size={16} />
                            Upload Image
                            <input
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(event) => setProductImageFile(event.target.files?.[0] || null)}
                              type="file"
                            />
                          </label>
                        </div>
                      )}
                      {key === 'category' && (
                        <>
                          <datalist id="admin-category-suggestions">
                            {adminCategorySuggestions.map((category) => (
                              <option key={category} value={category} />
                            ))}
                          </datalist>
                          <span className="mt-1 block text-xs font-semibold text-slate-500">
                            Use Grocery, AC, Laptop, or Electronics to place products in the home slider pages.
                          </span>
                        </>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid content-start gap-4 p-5 sm:grid-cols-2">
                <h3 className="sm:col-span-2 text-sm font-black uppercase text-slate-500">Pricing & Policy</h3>
                {[
                  ['price', 'Price'],
                  ['mrp', 'MRP'],
                  ['discount_percent', 'Discount %'],
                  ['rating', 'Rating'],
                  ['inventory', 'Inventory'],
                ].map(([key, label]) => (
                  <label key={key}>
                    <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                    <input
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      min="0"
                      onChange={(event) => updateProduct(key, event.target.value)}
                      required
                      step={key === 'rating' ? '0.1' : '1'}
                      type="number"
                      value={product[key]}
                    />
                  </label>
                ))}
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Description</span>
                  <textarea
                    className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) => updateProduct('description', event.target.value)}
                    required
                    value={product.description}
                  />
                </label>
                <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-black uppercase text-slate-500">Warranty & Replacement</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-sm font-bold text-slate-700">Warranty months</span>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        min="0"
                        onChange={(event) => updateProduct('warranty_months', event.target.value)}
                        type="number"
                        value={product.warranty_months}
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-sm font-bold text-slate-700">Replacement days</span>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        min="0"
                        onChange={(event) => updateProduct('replacement_days', event.target.value)}
                        type="number"
                        value={product.replacement_days}
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      checked={product.warranty_card_enabled}
                      onChange={(event) => updateProduct('warranty_card_enabled', event.target.checked)}
                      type="checkbox"
                    />
                    Generate and email warranty cards after delivery
                  </label>
                  <label className="mt-3 block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Warranty terms</span>
                    <textarea
                      className="min-h-20 w-full rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      onChange={(event) => updateProduct('warranty_terms', event.target.value)}
                      placeholder="Coverage, exclusions, support process, required invoice details..."
                      value={product.warranty_terms}
                    />
                  </label>
                </div>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300 sm:col-span-2"
                  disabled={status.loading}
                  type="submit"
                >
                  {editingId ? <Save size={18} /> : <Plus size={18} />}
                  {status.loading ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4">
              <PackagePlus className="text-emerald-600" size={20} />
              <h2 className="text-lg font-black">Product control</h2>
              <span className="ml-auto text-sm font-bold text-slate-500">{displayedProducts.length} shown</span>
            </div>
            {loading ? (
              <p className="p-5 text-sm font-semibold text-slate-500">Loading admin products...</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {displayedProducts.map((item) => (
                  <div className="grid gap-4 p-4 lg:grid-cols-[1fr_180px_260px]" key={item.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-950">{item.name}</h3>
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {item.is_active ? 'Active' : 'Deleted'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {item.sku} | {item.brand} | {item.category}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {formatCurrency(item.price)} | Stock {item.inventory}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Warranty {Number(item.warranty_months || 0)} month{Number(item.warranty_months || 0) === 1 ? '' : 's'} |
                        Replacement {Number(item.replacement_days || 0)} day{Number(item.replacement_days || 0) === 1 ? '' : 's'} |
                        Cards {item.warranty_card_enabled ? 'enabled' : 'off'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className="h-10 w-24 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                        min="1"
                        onChange={(event) => setRestock({ ...restock, [item.id]: event.target.value })}
                        placeholder="Qty"
                        type="number"
                        value={restock[item.id] || ''}
                      />
                      <button
                        className="h-10 rounded-md bg-slate-950 px-3 text-sm font-black text-white hover:bg-slate-800"
                        onClick={() => addStock(item.id)}
                        type="button"
                      >
                        Restock
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={() => startEdit(item)}
                        type="button"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!item.is_active}
                        onClick={() => removeProduct(item.id)}
                        type="button"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {displayedProducts.length === 0 && (
                  <p className="p-5 text-sm font-semibold text-slate-500">No products match this view.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'coupons' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitCoupon}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{editingCouponId ? 'Edit coupon' : 'Add coupon'}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Set the code, discount, minimum order, and expiry date.</p>
              </div>
              {editingCouponId && (
                <button className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100" onClick={resetCouponForm} type="button">
                  Cancel
                </button>
              )}
            </div>
            {[
              ['code', 'Coupon code', 'text'],
              ['title', 'Title', 'text'],
              ['discount', 'Discount amount', 'number'],
              ['min_order', 'Minimum order', 'number'],
              ['expires_at', 'Expiry date', 'date'],
            ].map(([key, label, type]) => (
              <label className="mt-4 block" key={key}>
                <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                <input
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                  min={type === 'number' ? '0' : undefined}
                  onChange={(event) => setCouponForm({ ...couponForm, [key]: event.target.value })}
                  required
                  step={type === 'number' ? '1' : undefined}
                  type={type}
                  value={couponForm[key]}
                />
              </label>
            ))}
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Description</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setCouponForm({ ...couponForm, description: event.target.value })}
                required
                value={couponForm.description}
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input checked={couponForm.is_active} onChange={(event) => setCouponForm({ ...couponForm, is_active: event.target.checked })} type="checkbox" />
              Active coupon
            </label>
            <button className="mt-5 h-11 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300" disabled={status.loading} type="submit">
              {editingCouponId ? 'Save coupon' : 'Add coupon'}
            </button>
          </form>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <h2 className="text-lg font-black text-slate-950">Coupon control</h2>
              <span className="text-sm font-bold text-slate-500">{coupons.length} coupons</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Coupon</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {coupons.map((coupon) => {
                    const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                    return (
                      <tr className="align-top" key={coupon.db_id}>
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-950">{coupon.code}</div>
                          <div className="mt-1 font-bold text-slate-700">{coupon.title}</div>
                          <div className="mt-1 max-w-sm text-xs font-semibold text-slate-500">{coupon.description}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-black text-emerald-700">{formatCurrency(coupon.discount)} off</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Min {formatCurrency(coupon.min_order ?? coupon.minOrder)}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{formatDate(coupon.expires_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-black ${coupon.is_active && !isExpired ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {isExpired ? 'Expired' : coupon.is_active ? 'Active' : 'Disabled'}
                          </span>
                          {coupon.is_used && (
                            <div className="mt-2 text-xs font-semibold text-slate-500">
                              Used {coupon.used_count} time{coupon.used_count === 1 ? '' : 's'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => startCouponEdit(coupon)} type="button">
                              <Edit3 size={15} />
                              Edit
                            </button>
                            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 px-3 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!coupon.is_active} onClick={() => removeCoupon(coupon.db_id)} type="button">
                              <Trash2 size={15} />
                              Disable
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {coupons.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan="5">
                        No coupons added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summer-sale' && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <form className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitSeasonalBanner}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">{editingSeasonalBannerId ? 'Edit seasonal offer' : 'Manage seasonal offer'}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Choose the occasion and set the banner visual.</p>
                </div>
                {editingSeasonalBannerId && (
                  <button className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100" onClick={resetSeasonalBannerForm} type="button">
                    Cancel
                  </button>
                )}
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Offer type</span>
                <select
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                  onChange={(event) => {
                    const selectedType = event.target.value;
                    const selectedLabel = offerTypes.find(([value]) => value === selectedType)?.[1] || 'Seasonal Offer';
                    setSeasonalBannerForm({ ...seasonalBannerForm, offer_type: selectedType, title: selectedLabel });
                  }}
                  value={seasonalBannerForm.offer_type}
                >
                  {offerTypes.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              {[
                ['title', 'Banner title'],
                ['subtitle', 'Theme line'],
                ['image_url', 'Image URL'],
                ['accent_color', 'Theme color'],
              ].map(([key, label]) => (
                <label className="mt-4 block" key={key}>
                  <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                    onChange={(event) => setSeasonalBannerForm({ ...seasonalBannerForm, [key]: event.target.value })}
                    required={key !== 'subtitle'}
                    type={key === 'accent_color' ? 'color' : 'text'}
                    value={seasonalBannerForm[key]}
                  />
                </label>
              ))}
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Upload banner image</span>
                <span className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 text-sm font-bold text-slate-600 hover:border-emerald-400 hover:bg-emerald-50">
                  <Upload size={16} />
                  {seasonalBannerFile?.name || 'Choose JPG, PNG, or WEBP'}
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => setSeasonalBannerFile(event.target.files?.[0] || null)}
                  type="file"
                />
              </label>
              <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                <input checked={seasonalBannerForm.is_active} onChange={(event) => setSeasonalBannerForm({ ...seasonalBannerForm, is_active: event.target.checked })} type="checkbox" />
                Active banner theme
              </label>
              <button className="mt-5 h-11 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300" disabled={status.loading} type="submit">
                {editingSeasonalBannerId ? 'Save theme' : 'Add theme'}
              </button>
            </form>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 p-4">
                <ImageIcon className="text-emerald-600" size={20} />
                <h2 className="text-lg font-black text-slate-950">Seasonal banner themes</h2>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {seasonalBanners.map((banner) => (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50" key={banner.id}>
                    <img alt={banner.title} className="h-36 w-full object-cover" src={resolveImageUrl(banner.image_url)} />
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-950">{banner.title}</h3>
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${banner.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{banner.subtitle || 'No theme line added'}</p>
                      <button className="mt-3 h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => startSeasonalBannerEdit(banner)} type="button">
                        Edit theme
                      </button>
                    </div>
                  </div>
                ))}
                {seasonalBanners.length === 0 && (
                  <p className="p-5 text-sm font-semibold text-slate-500">No seasonal banner themes added yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitSummerSaleOffer}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{editingSummerSaleId ? 'Edit Summer Sale' : 'Add Summer Sale product'}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Select products and define festival purchase rules.</p>
              </div>
              {editingSummerSaleId && (
                <button className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100" onClick={resetSummerSaleForm} type="button">
                  Cancel
                </button>
              )}
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Product</span>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setSummerSaleForm({ ...summerSaleForm, product_id: event.target.value })}
                required
                value={summerSaleForm.product_id}
              >
                <option value="">Select product</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            {[
              ['offer_price', 'Offer price'],
              ['discount_percent', 'Discount percent'],
              ['max_quantity_per_user', 'Max quantity per user'],
              ['min_quantity', 'Bundle quantity'],
              ['bundle_price', 'Bundle price'],
            ].map(([key, label]) => (
              <label className="mt-4 block" key={key}>
                <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                <input
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                  min="0"
                  onChange={(event) => setSummerSaleForm({ ...summerSaleForm, [key]: event.target.value })}
                  type="number"
                  value={summerSaleForm[key]}
                />
              </label>
            ))}
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Purchase rule text</span>
              <input
                className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setSummerSaleForm({ ...summerSaleForm, rule_description: event.target.value })}
                placeholder="Buy 2 T-shirts for Rs.1400"
                value={summerSaleForm.rule_description}
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input checked={summerSaleForm.is_active} onChange={(event) => setSummerSaleForm({ ...summerSaleForm, is_active: event.target.checked })} type="checkbox" />
              Active in Great Summer Sale
            </label>
            <button className="mt-5 h-11 w-full rounded-md bg-orange-600 text-sm font-black text-white hover:bg-orange-700 disabled:bg-slate-300" disabled={status.loading} type="submit">
              {editingSummerSaleId ? 'Save offer' : 'Add offer'}
            </button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-lg font-black text-slate-950">Great Summer Sale products</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {summerSaleOffers.map((offer) => (
                <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]" key={offer.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{offer.product?.name}</h3>
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${offer.is_active ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                        {offer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {offer.offer_price ? `Offer ${formatCurrency(offer.offer_price)}` : `${offer.discount_percent}% discount`} | Max {offer.max_quantity_per_user} per user
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{offer.rule_description || 'No rule text added'}</p>
                  </div>
                  <button className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => startSummerSaleEdit(offer)} type="button">
                    Edit
                  </button>
                </div>
              ))}
              {summerSaleOffers.length === 0 && (
                <p className="p-5 text-sm font-semibold text-slate-500">No Summer Sale products selected yet.</p>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <UsersRound className="text-emerald-600" size={20} />
            <h2 className="text-lg font-black">Users and order activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-950">{user.full_name}</div>
                      <div className="text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{user.role}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{user.is_verified ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.last_login)}</td>
                    <td className="px-4 py-3 font-black text-slate-950">{user.order_count}</td>
                    <td className="px-4 py-3 font-black text-slate-950">{formatCurrency(user.total_spent)}</td>
                  </tr>
                ))}
                {displayedUsers.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center font-semibold text-slate-500" colSpan="6">
                      No users match this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_180px_220px]">
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Search orders</span>
              <input
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setOrderFilters({ ...orderFilters, q: event.target.value })}
                placeholder="Order number, customer, email"
                value={orderFilters.q}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Status</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setOrderFilters({ ...orderFilters, status: event.target.value })}
                value={orderFilters.status}
              >
                <option value="all">All statuses</option>
                {orderStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Courier provider</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setOrderFilters({ ...orderFilters, deliveryBoy: event.target.value })}
                value={orderFilters.deliveryBoy}
              >
                <option value="all">All courier providers</option>
                <option value="">Unassigned</option>
                {deliveryBoys.filter((deliveryBoy) => deliveryBoy.is_active).map((deliveryBoy) => (
                  <option key={deliveryBoy.id} value={deliveryBoy.id}>
                    {deliveryBoy.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer & Address</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Courier provider</th>
                  <th className="px-4 py-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order) => (
                  <tr className="align-top" key={order.id}>
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-950">{order.order_number}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{formatDate(order.created_at)}</div>
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <div className="font-bold text-slate-950">{order.user.full_name}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{order.user.email}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-600">{order.shipping_address}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                        onClick={() => setSelectedOrder(order)}
                        type="button"
                      >
                        <PackagePlus size={15} />
                        Products
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-950">{formatCurrency(order.total)}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Items {formatCurrency(order.subtotal)}</div>
                      <div className="text-xs font-semibold text-slate-500">Delivery {formatCurrency(order.delivery_fee)}</div>
                      {order.status === 'cancelled' && (
                        <div className="mt-2 rounded-md bg-rose-50 p-2 text-xs font-bold text-rose-700">
                          <div>Cancelled: {order.cancel_reason}</div>
                          <div>Refund {formatCurrency(order.refund_amount || 0)}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-10 w-36 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold capitalize text-slate-700 outline-none focus:border-emerald-500"
                        disabled={['delivered', 'cancelled'].includes(order.status)}
                        onChange={(event) => changeOrderStatus(order.id, event.target.value)}
                        value={normalizeOrderStatus(order.status)}
                      >
                        {orderStatusOptions.map(([value, label]) => (
                          <option key={value} value={value} disabled={(value === 'delivered' && !order.delivery_boy_id) || value === 'cancelled'}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {order.status === 'cancelled' && Number(order.refund_amount || 0) > 0 && (
                        <div className="mt-2 grid gap-2">
                          <input
                            className="h-9 w-36 rounded-md border border-slate-200 px-2 text-xs font-bold outline-none focus:border-emerald-500"
                            defaultValue={order.refund_days || 5}
                            min="1"
                            onBlur={(event) =>
                              saveCancellation(order.id, {
                                refund_days: Number(event.target.value),
                                cancellation_message: `Refund will be processed in ${event.target.value} days.`,
                              })
                            }
                            type="number"
                          />
                          <div className="text-xs font-semibold text-slate-500">
                            {order.cancellation_message || 'Set refund processing days'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-10 w-44 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
                        disabled={['delivered', 'cancelled'].includes(order.status)}
                        onChange={(event) => changeOrderDeliveryBoy(order.id, event.target.value)}
                        value={order.delivery_boy_id || ''}
                      >
                        <option value="">Assign courier provider</option>
                        {deliveryBoys.filter((deliveryBoy) => deliveryBoy.is_active).map((deliveryBoy) => (
                          <option key={deliveryBoy.id} value={deliveryBoy.id}>
                            {deliveryBoy.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs font-black uppercase text-slate-500">{order.payment_method}</td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan="7">
                      No orders found. Try changing the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'delivery-hubs' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitDeliveryHub}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {editingDeliveryHubId ? 'Edit delivery hub' : 'Add delivery hub'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Maintain 8 hub serviceability rules for pincode ETA.</p>
              </div>
              {editingDeliveryHubId && (
                <button className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100" onClick={resetDeliveryHubForm} type="button">
                  Cancel
                </button>
              )}
            </div>
            {[
              ['name', 'Hub name'],
              ['city', 'City'],
              ['state', 'State'],
              ['pincode_prefixes', 'Pincode prefixes'],
              ['base_delivery_days', 'Base delivery days'],
              ['fallback_extra_days', 'Fallback extra days'],
            ].map(([key, label]) => (
              <label className="mt-4 block" key={key}>
                <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                <input
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                  maxLength={key === 'pincode_prefixes' ? 500 : undefined}
                  min={key.includes('days') ? 1 : undefined}
                  onChange={(event) => setDeliveryHubForm({ ...deliveryHubForm, [key]: event.target.value })}
                  required
                  type={key.includes('days') ? 'number' : 'text'}
                  value={deliveryHubForm[key]}
                />
              </label>
            ))}
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Region</span>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setDeliveryHubForm({ ...deliveryHubForm, region: event.target.value })}
                value={deliveryHubForm.region}
              >
                {['east', 'north', 'south', 'west'].map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                checked={deliveryHubForm.express_available}
                onChange={(event) => setDeliveryHubForm({ ...deliveryHubForm, express_available: event.target.checked })}
                type="checkbox"
              />
              Express delivery available
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                checked={deliveryHubForm.is_active}
                onChange={(event) => setDeliveryHubForm({ ...deliveryHubForm, is_active: event.target.checked })}
                type="checkbox"
              />
              Active
            </label>
            <button className="mt-5 h-11 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300" disabled={status.loading} type="submit">
              {editingDeliveryHubId ? 'Save delivery hub' : 'Add delivery hub'}
            </button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
              <h2 className="text-lg font-black text-slate-950">Delivery hubs</h2>
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">{deliveryHubs.filter((hub) => hub.is_active).length}/4 active hubs</span>
            </div>
            <div className="divide-y divide-slate-200">
              {deliveryHubs.map((hub) => (
                <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]" key={hub.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{hub.name}</h3>
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${hub.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {hub.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{hub.city}, {hub.state} | {hub.region}</p>
                    <p className="mt-1 text-sm text-slate-500">PIN prefixes {hub.pincode_prefixes} | {hub.base_delivery_days} base days | +{hub.fallback_extra_days} fallback days | {hub.express_available ? 'Express' : 'Standard'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => startDeliveryHubEdit(hub)} type="button">
                      Edit
                    </button>
                    <button className="h-10 rounded-md border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50" disabled={!hub.is_active} onClick={() => removeDeliveryHub(hub.id)} type="button">
                      Disable
                    </button>
                  </div>
                </div>
              ))}
              {deliveryHubs.length === 0 && (
                <p className="p-5 text-sm font-semibold text-slate-500">No delivery hubs configured.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hub-stock' && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-black text-slate-950">Hub-wise product stock</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Each product is linked to all four Tamil Nadu regional hubs.</p>
          </div>
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                {hubStockData.hubs.map((hub) => (
                  <th className="px-4 py-3" key={hub.id}>{hub.region}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {hubStockData.products.map((item) => (
                <tr className="align-top" key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-950">{item.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{item.sku}</div>
                    <div className="mt-1 text-xs font-black text-slate-400">Total {item.inventory}</div>
                  </td>
                  {hubStockData.hubs.map((hub) => {
                    const stock = item.hub_stock.find((row) => row.hub_id === hub.id);
                    const key = `${item.id}-${hub.id}`;
                    return (
                      <td className="px-4 py-3" key={hub.id}>
                        <div className="text-xs font-bold text-slate-500">{hub.name}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            className="h-10 w-24 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500"
                            min="0"
                            onChange={(event) => setHubStockDrafts({ ...hubStockDrafts, [key]: event.target.value })}
                            type="number"
                            value={hubStockDrafts[key] ?? stock?.quantity ?? 0}
                          />
                          <button
                            className="h-10 rounded-md bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700"
                            onClick={() => saveHubStock(item.id, hub.id, stock?.quantity)}
                            type="button"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {hubStockData.products.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan={Math.max(1, hubStockData.hubs.length + 1)}>
                    No products available for hub stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'delivery-boys' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitDeliveryBoy}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {editingDeliveryBoyId ? 'Edit courier provider' : 'Add courier provider'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Maintain four category-based courier services.</p>
              </div>
              {editingDeliveryBoyId && (
                <button
                  className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
                  onClick={resetDeliveryBoyForm}
                  type="button"
                >
                  Cancel
                </button>
              )}
            </div>
            {[
              ['name', 'Name'],
              ['phone', 'Phone no'],
              ['area', 'Address / Area'],
            ].map(([key, label]) => (
              <label className="mt-4 block" key={key}>
                <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                <input
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                  onChange={(event) => setDeliveryBoyForm({ ...deliveryBoyForm, [key]: event.target.value })}
                  required
                  value={deliveryBoyForm[key]}
                />
              </label>
            ))}
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Category assignment</span>
              <select
                className="mb-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setDeliveryBoyForm({ ...deliveryBoyForm, category_scope: event.target.value })}
                value=""
              >
                <option value="">Use preset</option>
                {deliveryBoyCategoryPresets.map(([label, value]) => (
                  <option key={label} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setDeliveryBoyForm({ ...deliveryBoyForm, category_scope: event.target.value })}
                placeholder="Grocery, Dresses, TV, AC, Electronics"
                required
                value={deliveryBoyForm.category_scope}
              />
            </label>
            <button
              className="mt-5 h-11 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
              disabled={status.loading || (!editingDeliveryBoyId && deliveryBoys.filter((deliveryBoy) => deliveryBoy.is_active).length >= 4)}
              type="submit"
            >
              {editingDeliveryBoyId
                ? 'Save courier provider'
                : deliveryBoys.filter((deliveryBoy) => deliveryBoy.is_active).length >= 4
                ? '4 Active Providers Added'
                : 'Add courier provider'}
            </button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-lg font-black text-slate-950">Courier provider master list</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {deliveryBoys.filter((deliveryBoy) => deliveryBoy.is_active).length}/4 active providers. Orders are auto-assigned by the dominant product category.
              </p>
            </div>
            <div className="divide-y divide-slate-200">
              {deliveryBoys.map((deliveryBoy) => (
                <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]" key={deliveryBoy.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{deliveryBoy.name}</h3>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-black ${
                          deliveryBoy.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {deliveryBoy.is_active ? 'Active' : 'Deleted'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{deliveryBoy.phone}</p>
                    <p className="mt-1 text-sm text-slate-500">{deliveryBoy.area}</p>
                    <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                      {deliveryBoy.category_scope || 'General'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      onClick={() => startDeliveryBoyEdit(deliveryBoy)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="h-10 rounded-md border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      disabled={!deliveryBoy.is_active}
                      onClick={() => removeDeliveryBoy(deliveryBoy.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {deliveryBoys.length === 0 && (
                <p className="p-5 text-sm font-semibold text-slate-500">No courier providers added yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'help-requests' && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Admin Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {helpRequests.map((request) => (
                <tr className="align-top" key={request.id}>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-950">{request.ticket_number}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{formatDate(request.created_at)}</div>
                    <div className="mt-2 text-xs font-black uppercase text-emerald-700">{request.status}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-950">{request.customer?.full_name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{request.customer?.email}</div>
                    {request.order_number && <div className="mt-2 text-xs font-semibold text-slate-400">{request.order_number}</div>}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">{request.issue_type}</td>
                  <td className="max-w-md px-4 py-3 font-semibold text-slate-600">{request.message}</td>
                  <td className="px-4 py-3">
                    {request.admin_response && (
                      <p className="mb-2 rounded-md bg-emerald-50 p-2 text-xs font-bold text-emerald-700">
                        {request.admin_response}
                      </p>
                    )}
                    <textarea
                      className="min-h-20 w-full rounded-md border border-slate-200 p-2 text-sm font-semibold outline-none focus:border-emerald-500"
                      onChange={(event) => setHelpResponses({ ...helpResponses, [request.id]: event.target.value })}
                      placeholder="Respond to customer"
                      value={helpResponses[request.id] ?? request.admin_response ?? ''}
                    />
                    <button
                      className="mt-2 h-9 rounded-md bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700"
                      onClick={() => respondHelpRequest(request.id)}
                      type="button"
                    >
                      Send Response
                    </button>
                  </td>
                </tr>
              ))}
              {helpRequests.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan="5">
                    No help requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={() => setRevenueModal('orders')}
            type="button"
          >
            <p className="text-xs font-black uppercase text-slate-500">Total Order Amount</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(dashboard?.gross_revenue ?? 0)}</p>
          </button>
          <button
            className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-rose-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            onClick={() => setRevenueModal('returns')}
            type="button"
          >
            <p className="text-xs font-black uppercase text-slate-500">Total Return Amount</p>
            <p className="mt-3 text-3xl font-black text-rose-700">{formatCurrency(dashboard?.refunded_amount ?? 0)}</p>
          </button>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:col-span-2">
            <p className="text-xs font-black uppercase text-emerald-700">Net Revenue</p>
            <p className="mt-3 text-3xl font-black text-emerald-800">{formatCurrency(dashboard?.revenue ?? 0)}</p>
          </div>
        </div>
      )}

      {activeTab === 'returns' && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_180px]">
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Search returns</span>
              <input
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setReturnFilters({ ...returnFilters, q: event.target.value })}
                placeholder="Order, customer, email, product"
                value={returnFilters.q}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Status</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold capitalize outline-none focus:border-emerald-500"
                onChange={(event) => setReturnFilters({ ...returnFilters, status: event.target.value })}
                value={returnFilters.status}
              >
                <option value="all">All statuses</option>
                {returnStatusOptions.map((returnStatus) => (
                  <option key={returnStatus} value={returnStatus}>
                    {String(returnStatus).replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Requested returns</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{requestedReturnCount}</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[1160px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order & Customer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Refund</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReturns.map((request) => (
                  <tr className="align-top" key={request.id}>
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-950">{request.order_number}</div>
                      <div className="mt-1 font-bold text-slate-950">{request.customer.full_name}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{request.customer.email}</div>
                      <div className="mt-2 text-xs font-semibold text-slate-400">{formatDate(request.created_at)}</div>
                    </td>
                    <td className="max-w-xs px-4 py-3 font-semibold text-slate-700">{request.product_name}</td>
                    <td className="max-w-xs px-4 py-3">
                      <div className="font-bold text-slate-700">{request.reason}</div>
                      <textarea
                        className="mt-3 min-h-16 w-full rounded-md border border-slate-200 p-2 text-xs font-semibold outline-none focus:border-emerald-500"
                        disabled={['refund_completed', 'amount_received'].includes(request.status)}
                        defaultValue={
                          request.admin_message ||
                          `Refund of ${formatCurrency(request.refund_amount)} will be processed in ${request.refund_days} days.`
                        }
                        onBlur={(event) =>
                          saveReturn(request.id, {
                            admin_message: event.target.value,
                            refund_days: request.refund_days,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3 font-black text-slate-950">{formatCurrency(request.refund_amount)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-black uppercase text-amber-700">
                        {String(request.status).replaceAll('_', ' ')}
                      </span>
                      {request.replacement && (
                        <div className={`mt-2 text-xs font-black ${request.replacement.eligible ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {request.replacement.message}
                        </div>
                      )}
                      {request.status === 'refund_completed' && (
                        <div className="mt-2 text-xs font-black text-rose-700">Amount Sent</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-10 w-48 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                        disabled={['refund_completed', 'amount_received'].includes(request.status)}
                        onChange={(event) =>
                          saveReturn(request.id, {
                            pickup_delivery_boy_id: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        value={request.pickup_delivery_boy_id || ''}
                      >
                        <option value="">Assign pickup</option>
                        {deliveryBoys.filter((deliveryBoy) => deliveryBoy.is_active).map((deliveryBoy) => (
                          <option key={deliveryBoy.id} value={deliveryBoy.id}>
                            {deliveryBoy.name} - {deliveryBoy.area}
                          </option>
                        ))}
                      </select>
                      {request.pickup_delivery_boy && (
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {request.pickup_delivery_boy.name} | {request.pickup_delivery_boy.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-2">
                        <button
                          className="h-9 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                          disabled={['return_completed', 'refund_completed', 'amount_received'].includes(request.status)}
                          onClick={() => saveReturn(request.id, { status: 'return_completed' })}
                          type="button"
                        >
                          Return completed
                        </button>
                        <button
                          className="h-9 rounded-md bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
                          disabled={['refund_completed', 'amount_received'].includes(request.status)}
                          onClick={() => saveReturn(request.id, { status: 'refund_completed' })}
                          type="button"
                        >
                          Refund completed
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReturns.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan="7">
                      No return requests found. Try changing the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cancelled-products' && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order & Customer</th>
                <th className="px-4 py-3">Cancelled Products</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cancelledOrders.map((order) => (
                <tr className="align-top" key={order.id}>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-950">{order.order_number}</div>
                    <div className="mt-1 font-bold text-slate-950">{order.user.full_name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{order.user.email}</div>
                    <div className="mt-2 text-xs font-semibold text-slate-400">{formatDate(order.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div className="rounded-md bg-slate-50 p-2" key={item.id}>
                          <div className="font-bold text-slate-950">{item.product_name}</div>
                          <div className="text-xs font-semibold text-slate-500">
                            Qty {item.quantity} | {formatCurrency(item.line_total)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 font-semibold text-slate-600">{order.cancel_reason || 'Not specified'}</td>
                  <td className="px-4 py-3 text-xs font-black uppercase text-slate-500">{order.payment_method}</td>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-950">{formatCurrency(order.refund_amount || 0)}</div>
                    {Number(order.refund_amount || 0) > 0 ? (
                      <div className="mt-2 grid gap-2">
                        <label>
                          <span className="mb-1 block text-xs font-black uppercase text-slate-500">Processing days</span>
                          <input
                            className="h-9 w-28 rounded-md border border-slate-200 px-2 text-sm font-bold outline-none focus:border-emerald-500"
                            defaultValue={order.refund_days || 5}
                            disabled={order.cancellation_message === 'Amount Refunded'}
                            min="1"
                            onBlur={(event) =>
                              saveCancellation(order.id, {
                                refund_days: Number(event.target.value),
                                cancellation_message: `Refund of ${formatCurrency(order.refund_amount || 0)} will be processed in ${event.target.value} days.`,
                              })
                            }
                            type="number"
                          />
                        </label>
                        <p className="text-xs font-semibold text-slate-500">
                          {order.cancellation_message === 'Amount Refunded'
                            ? 'Amount Refunded'
                            : `Refund of ${formatCurrency(order.refund_amount || 0)} will be processed in ${order.refund_days || 5} days.`}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-slate-500">COD order: no refund required.</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="h-10 rounded-md bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
                      disabled={Number(order.refund_amount || 0) <= 0 || order.cancellation_message === 'Amount Refunded'}
                      onClick={() =>
                        saveCancellation(order.id, {
                          refund_days: order.refund_days || 5,
                          cancellation_message: 'Amount Refunded',
                        })
                      }
                      type="button"
                    >
                      Refund Amount
                    </button>
                  </td>
                </tr>
              ))}
              {cancelledOrders.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan="6">
                    No cancelled products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Feedback & Review</th>
                <th className="px-4 py-3">Admin Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reviews.map((review) => (
                <tr className="align-top" key={`${review.owner}-${review.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-950">{review.customerName}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{review.customerEmail}</div>
                    <div className="mt-2 text-xs font-semibold text-slate-400">{review.orderNumber}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">{review.productName}</td>
                  <td className="px-4 py-3 font-black text-amber-700">{review.rating}/5</td>
                  <td className="max-w-md px-4 py-3">
                    <div className="font-bold text-slate-800">{review.feedback}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">{review.review}</div>
                  </td>
                  <td className="px-4 py-3">
                    {review.adminResponse && (
                      <p className="mb-2 rounded-md bg-emerald-50 p-2 text-xs font-bold text-emerald-700">
                        {review.adminResponse}
                      </p>
                    )}
                    <textarea
                      className="min-h-20 w-full rounded-md border border-slate-200 p-2 text-sm font-semibold outline-none focus:border-emerald-500"
                      onChange={(event) =>
                        setReviewResponses({
                          ...reviewResponses,
                          [`${review.owner}-${review.id}`]: event.target.value,
                        })
                      }
                      placeholder="Respond to customer"
                      value={reviewResponses[`${review.owner}-${review.id}`] ?? review.adminResponse ?? ''}
                    />
                    <button
                      className="mt-2 h-9 rounded-md bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700"
                      onClick={() =>
                        {
                          const responseText = reviewResponses[`${review.owner}-${review.id}`] ?? review.adminResponse ?? '';
                          respondToReview(review.owner, review.id, responseText);
                          respondProductReview(review.id, responseText)
                            .then((updatedReview) =>
                              setBackendReviews((currentReviews) =>
                                currentReviews.map((item) => (item.id === updatedReview.id ? updatedReview : item))
                              )
                            )
                            .catch(() => {});
                        }
                      }
                      type="button"
                    >
                      Send Response
                    </button>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan="5">
                    No customer reviews yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {revenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {revenueModal === 'orders' ? 'Total Order Amount' : 'Total Return Amount'}
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  {revenueModal === 'orders'
                    ? `Gross order amount ${formatCurrency(dashboard?.gross_revenue ?? 0)}`
                    : `Refunded return amount ${formatCurrency(dashboard?.refunded_amount ?? 0)}`}
                </p>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setRevenueModal(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {revenueModal === 'orders' ? (
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-950">{order.order_number}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{formatDate(order.created_at)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-950">{order.user.full_name}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{order.user.email}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{statusText(order.status)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{order.items.length}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-950">{formatCurrency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Return Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {returns.map((request) => (
                      <tr key={request.id}>
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-950">{request.order_number}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{formatDate(request.created_at)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-950">{request.customer.full_name}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{request.customer.email}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{request.product_name}</td>
                        <td className="px-4 py-3 font-bold capitalize text-slate-700">
                          {String(request.status).replaceAll('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-rose-700">
                          {formatCurrency(request.refund_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Ordered products</h2>
                <p className="text-sm font-semibold text-slate-500">{selectedOrder.order_number}</p>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setSelectedOrder(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-200">
              {selectedOrder.items.map((item) => (
                <div className="grid gap-3 p-4 sm:grid-cols-[1fr_190px_90px_130px]" key={item.id}>
                  <div>
                    <div className="font-black text-slate-950">{item.product_name}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">Product ID: {item.product_id}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">
                    <div className="font-black text-slate-950">{item.delivery_partner || 'Assigning soon'}</div>
                    <div className="mt-1 text-xs font-black text-slate-700">{item.estimated_delivery_label}</div>
                    {item.delivery_message && (
                      <div className="mt-1 text-xs text-slate-500">
                        {item.delivery_message}
                        {item.delivery_pincode ? ` to ${item.delivery_pincode}` : ''}
                      </div>
                    )}
                    <div className="mt-1 text-xs">Tracking ID {item.tracking_id || 'Not generated'}</div>
                    {item.tracking_url && (
                      <a className="mt-1 inline-flex text-xs font-black text-emerald-700" href={item.tracking_url} rel="noreferrer" target="_blank">
                        View Tracking Details
                      </a>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-700">Qty {item.quantity}</div>
                  <div className="font-black text-slate-950 sm:text-right">{formatCurrency(item.line_total)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <span className="text-sm font-bold text-slate-600">Only products included in this order are shown.</span>
              <span className="text-lg font-black text-slate-950">{formatCurrency(selectedOrder.total)}</span>
            </div>
          </div>
        </div>
      )}

      {deliveredOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-black text-slate-950">Courier provider details</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{deliveredOrder.order_number} is marked delivered.</p>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <p>{deliveredOrder.delivery_boy.name}</p>
              <p>{deliveredOrder.delivery_boy.phone}</p>
              <p>{deliveredOrder.delivery_boy.area}</p>
            </div>
            <button
              className="mt-4 h-10 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
              onClick={() => setDeliveredOrder(null)}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
