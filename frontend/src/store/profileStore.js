import { create } from 'zustand';

const storageKey = 'customerProfileData';

function readData() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '{}');
  } catch {
    return {};
  }
}

function writeData(data) {
  window.localStorage.setItem(storageKey, JSON.stringify(data));
}

function userKeys(user) {
  const keys = [];
  if (user?.id) {
    keys.push(`user-${user.id}`);
  }
  if (user?.email) {
    keys.push(`email-${String(user.email).toLowerCase()}`);
  }
  return keys.length > 0 ? keys : ['guest'];
}

const emptyProfile = {
  addresses: [],
  checkoutDeliveryAddress: '',
  checkoutBillingAddress: '',
  billingSameAsDelivery: true,
  pan: { number: '', name: '', imageName: '' },
  upis: [],
  cards: [],
  walletBalance: 0,
  walletTransactions: [],
  appliedCouponId: '',
  redeemedCouponIds: [],
  pointsRedeemed: 0,
  pointsTransactions: [],
  wishlist: [],
  reviews: [],
  helpRequests: [],
  recurringTemplates: {},
};

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(key = monthKey()) {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return monthKey(date);
}

function templateItemsFromProducts(products = []) {
  return products.map((product) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: product.name,
    quantity: product.quantity || 1,
    unit: product.unit || 'pcs',
    amount: Number(product.amount || product.price || 0),
    checked: true,
    productId: product.productId || product.id || null,
    category: product.category || 'Grocery',
    notes: product.notes || '',
    source: product.source || 'manual',
  }));
}

function deriveTemplate(profile, key = monthKey()) {
  const templates = profile.recurringTemplates || {};
  if (templates[key]) {
    return templates[key];
  }

  const previousKey = previousMonthKey(key);
  const previousTemplate = templates[previousKey];
  if (previousTemplate) {
    return {
      month: key,
      derivedFrom: previousKey,
      savedAt: '',
      items: templateItemsFromProducts(previousTemplate.items || []),
    };
  }

  const latestKey = Object.keys(templates).filter((item) => item < key).sort().pop();
  if (latestKey) {
    return {
      month: key,
      derivedFrom: latestKey,
      savedAt: '',
      items: templateItemsFromProducts(templates[latestKey].items || []),
    };
  }

  return {
    month: key,
    derivedFrom: '',
    savedAt: '',
    items: [],
  };
}

function walletTransaction(type, amount, description) {
  return {
    id: Date.now(),
    type,
    amount: Number(amount || 0),
    description,
    createdAt: new Date().toISOString(),
  };
}

function pointsTransaction(type, points, description) {
  return {
    id: Date.now(),
    type,
    points: Number(points || 0),
    description,
    createdAt: new Date().toISOString(),
  };
}

function helpRequest(order, issueType, message) {
  return {
    id: `TKT-${Date.now()}`,
    orderId: order?.id || null,
    orderNumber: order?.order_number || '',
    issueType,
    message,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}

export function getProfileFromData(data, user) {
  return userKeys(user).reduce(
    (profile, key) => ({
      ...profile,
      ...(data[key] || {}),
    }),
    { ...emptyProfile }
  );
}

export function getAllReviewsFromData(data) {
  const globalReviews = (data.__reviews || []).map((review) => ({ ...review, owner: review.owner || 'global' }));
  const profileReviews = Object.entries(data)
    .filter(([owner]) => owner !== '__reviews')
    .flatMap(([owner, profile]) => (profile?.reviews || []).map((review) => ({ ...review, owner })));
  const reviewMap = new Map();

  [...globalReviews, ...profileReviews].forEach((review) => {
    const reviewKey = `${review.customerEmail || review.owner}-${review.id}`;
    const existingReview = reviewMap.get(reviewKey);

    if (!existingReview) {
      reviewMap.set(reviewKey, review);
      return;
    }

    reviewMap.set(reviewKey, {
      ...existingReview,
      ...review,
      owner: existingReview.owner === 'global' ? review.owner : existingReview.owner,
      adminResponse: review.adminResponse || existingReview.adminResponse || '',
      respondedAt: review.respondedAt || existingReview.respondedAt,
    });
  });

  return Array.from(reviewMap.values()).sort(
    (first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
  );
}

function normalizeReviewInbox(data) {
  return {
    ...data,
    __reviews: getAllReviewsFromData(data).map((review) => ({
      ...review,
      owner: review.owner === 'global' ? review.owner || 'global' : review.owner,
    })),
  };
}

export function getProductReviewsFromData(data, productId) {
  return getAllReviewsFromData(data).filter((review) => String(review.productId) === String(productId));
}

export function getProductRatingFromData(data, product) {
  const reviews = getProductReviewsFromData(data, product.id);
  if (reviews.length === 0) {
    return Number(product.rating || 0);
  }

  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Number((total / reviews.length).toFixed(1));
}

export const useProfileStore = create((set, get) => ({
  data: normalizeReviewInbox(readData()),
  hydrate: () => {
    const data = normalizeReviewInbox(readData());
    writeData(data);
    set({ data });
  },
  getProfile: (user) => getProfileFromData(get().data, user),
  saveProfile: (user, patch) => {
    const keys = userKeys(user);
    const currentProfile = getProfileFromData(get().data, user);
    const nextProfile = {
      ...currentProfile,
      ...patch,
    };
    const nextData = {
      ...get().data,
    };
    keys.forEach((key) => {
      nextData[key] = nextProfile;
    });
    writeData(nextData);
    set({ data: nextData });
  },
  addAddress: (user, address) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      addresses: [{ ...address, id: Date.now() }, ...profile.addresses],
    });
  },
  updateAddress: (user, addressId, address) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      addresses: profile.addresses.map((item) => (item.id === addressId ? { ...item, ...address } : item)),
    });
  },
  deleteAddress: (user, addressId) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      addresses: profile.addresses.filter((item) => item.id !== addressId),
    });
  },
  saveCheckoutAddresses: (user, patch) => {
    get().saveProfile(user, patch);
  },
  savePan: (user, pan) => get().saveProfile(user, { pan }),
  addUpi: (user, upi) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      upis: [{ id: Date.now(), upiId: upi }, ...profile.upis],
    });
  },
  deleteUpi: (user, upiId) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      upis: profile.upis.filter((item) => item.id !== upiId),
    });
  },
  addCard: (user, card) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      cards: [{ ...card, id: Date.now() }, ...profile.cards],
    });
  },
  deleteCard: (user, cardId) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      cards: profile.cards.filter((item) => item.id !== cardId),
    });
  },
  addWalletMoney: (user, amount, description = 'Money added to Pay Balance') => {
    const profile = get().getProfile(user);
    const value = Number(amount || 0);
    if (value <= 0) {
      return;
    }
    get().saveProfile(user, {
      walletBalance: Number(profile.walletBalance || 0) + value,
      walletTransactions: [walletTransaction('credit', value, description), ...(profile.walletTransactions || [])],
    });
  },
  debitWallet: (user, amount, description = 'Paid using Pay Balance') => {
    const profile = get().getProfile(user);
    const value = Number(amount || 0);
    if (value <= 0) {
      return;
    }
    get().saveProfile(user, {
      walletBalance: Math.max(0, Number(profile.walletBalance || 0) - value),
      walletTransactions: [walletTransaction('debit', value, description), ...(profile.walletTransactions || [])],
    });
  },
  creditWallet: (user, amount, description = 'Refund credited to Pay Balance') => {
    const profile = get().getProfile(user);
    const value = Number(amount || 0);
    if (value <= 0) {
      return;
    }
    get().saveProfile(user, {
      walletBalance: Number(profile.walletBalance || 0) + value,
      walletTransactions: [walletTransaction('credit', value, description), ...(profile.walletTransactions || [])],
    });
  },
  applyCoupon: (user, couponId) => {
    const profile = get().getProfile(user);
    if ((profile.redeemedCouponIds || []).includes(couponId)) {
      return;
    }
    get().saveProfile(user, { appliedCouponId: couponId });
  },
  clearAppliedCoupon: (user) => get().saveProfile(user, { appliedCouponId: '' }),
  markCouponRedeemed: (user, couponId) => {
    if (!couponId) {
      return;
    }
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      appliedCouponId: '',
      redeemedCouponIds: Array.from(new Set([couponId, ...(profile.redeemedCouponIds || [])])),
    });
  },
  redeemPoints: (user, points, description = 'Points redeemed during checkout') => {
    const profile = get().getProfile(user);
    const value = Number(points || 0);
    if (value <= 0) {
      return;
    }
    get().saveProfile(user, {
      pointsRedeemed: Number(profile.pointsRedeemed || 0) + value,
      pointsTransactions: [pointsTransaction('debit', value, description), ...(profile.pointsTransactions || [])],
    });
  },
  getWishlist: (user) => get().getProfile(user).wishlist || [],
  isWishlisted: (user, productId) =>
    (get().getProfile(user).wishlist || []).some((item) => String(item.id) === String(productId)),
  addToWishlist: (user, product) => {
    const profile = get().getProfile(user);
    const wishlist = profile.wishlist || [];
    if (wishlist.some((item) => String(item.id) === String(product.id))) {
      return;
    }
    get().saveProfile(user, {
      wishlist: [{ ...product, addedAt: new Date().toISOString() }, ...wishlist],
    });
  },
  removeFromWishlist: (user, productId) => {
    const profile = get().getProfile(user);
    get().saveProfile(user, {
      wishlist: (profile.wishlist || []).filter((item) => String(item.id) !== String(productId)),
    });
  },
  getReviews: (user) => get().getProfile(user).reviews || [],
  getAllReviews: () => getAllReviewsFromData(get().data),
  addReview: (user, review) => {
    const profile = get().getProfile(user);
    const reviews = profile.reviews || [];
    const reviewId = Date.now();
    const savedReview = {
      ...review,
      id: reviewId,
      owner: userKeys(user)[0],
      createdAt: new Date().toISOString(),
      adminResponse: '',
      status: 'pending',
    };
    get().saveProfile(user, {
      reviews: [savedReview, ...reviews],
    });
    const nextData = normalizeReviewInbox(get().data);
    writeData(nextData);
    set({ data: nextData });
  },
  getHelpRequests: (user) => get().getProfile(user).helpRequests || [],
  addHelpRequest: (user, order, issueType, message) => {
    const profile = get().getProfile(user);
    const request = helpRequest(order, issueType, message);
    get().saveProfile(user, {
      helpRequests: [request, ...(profile.helpRequests || [])],
    });
    return request;
  },
  getRecurringTemplate: (user, key = monthKey()) => deriveTemplate(get().getProfile(user), key),
  saveRecurringTemplate: (user, template, key = monthKey()) => {
    const profile = get().getProfile(user);
    const currentTemplate = deriveTemplate(profile, key);
    const nextTemplate = {
      ...currentTemplate,
      ...template,
      month: key,
      savedAt: new Date().toISOString(),
      items: (template.items || []).map((item) => ({
        ...item,
        id: item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      })),
    };
    get().saveProfile(user, {
      recurringTemplates: {
        ...(profile.recurringTemplates || {}),
        [key]: nextTemplate,
      },
    });
    return nextTemplate;
  },
  respondToReview: (owner, reviewId, adminResponse) => {
    const targetReview =
      (get().data.__reviews || []).find((review) => review.id === reviewId) ||
      (get().data[owner]?.reviews || []).find((review) => review.id === reviewId);
    const nextData = {
      ...get().data,
      __reviews: (get().data.__reviews || []).map((review) =>
        review.id === reviewId ||
        (targetReview?.customerEmail && review.customerEmail === targetReview.customerEmail && review.id === targetReview.id)
          ? { ...review, adminResponse, respondedAt: new Date().toISOString() }
          : review
      ),
    };
    Object.entries(nextData).forEach(([key, profile]) => {
      if (key === '__reviews') {
        return;
      }
      const reviews = profile.reviews || [];
      const hasMatch = reviews.some(
        (review) =>
          review.id === reviewId ||
          (targetReview?.customerEmail && review.customerEmail === targetReview.customerEmail && review.id === targetReview.id)
      );
      if (hasMatch) {
        nextData[key] = {
          ...emptyProfile,
          ...profile,
          reviews: reviews.map((review) =>
            review.id === reviewId ||
            (targetReview?.customerEmail && review.customerEmail === targetReview.customerEmail && review.id === targetReview.id)
              ? { ...review, adminResponse, respondedAt: new Date().toISOString() }
              : review
          ),
        };
      }
    });
    const normalizedData = normalizeReviewInbox(nextData);
    writeData(normalizedData);
    set({ data: normalizedData });
  },
}));
