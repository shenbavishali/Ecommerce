import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Award, PackageCheck, RotateCcw, ShieldCheck, Star, Truck, Wrench, X } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../utils/formatCurrency';
import { getProductRatingFromData, getProductReviewsFromData, getProfileFromData, useProfileStore } from '../store/profileStore';
import { useAuthStore } from '../store/authStore';
import { fetchDeliveryEstimate, fetchProductReviews, fetchProducts } from '../services/api';
import { extractPincode, getSavedDeliveryAddress } from '../utils/delivery';
import { productImageUrl } from '../utils/imageUrl';
import { getPolicyOverlay, getProductPolicies, getProtectionPlans } from '../utils/productPolicies';
import ProductCard from './ProductCard';

function productOptions(product) {
  const name = String(product.name || '').toLowerCase();
  const subcategory = String(product.subcategory || '').toLowerCase();
  const category = String(product.category || '').toLowerCase();
  if (name.includes('power bank')) {
    return [
      ['Black', Number(product.price)],
      ['Green', Number(product.price)],
      ['Purple', Number(product.price)],
    ];
  }
  if (name.includes('tv') || subcategory.includes('television')) {
    return [
      ['55 inch', Number(product.price)],
      ['65 inch', Math.round(Number(product.price) * 1.28)],
      ['75 inch', Math.round(Number(product.price) * 1.72)],
    ];
  }
  if (category === 'ac' || name.includes('air conditioner') || subcategory.includes('split ac') || subcategory.includes('inverter ac')) {
    return [
      ['1 Ton', Math.round(Number(product.price) * 0.85)],
      ['1.5 Ton', Number(product.price)],
      ['2 Ton', Math.round(Number(product.price) * 1.22)],
    ];
  }
  if (category.includes('laptop')) {
    return [
      ['8 GB / 512 GB', Number(product.price)],
      ['16 GB / 512 GB', Math.round(Number(product.price) * 1.12)],
      ['16 GB / 1 TB', Math.round(Number(product.price) * 1.24)],
    ];
  }
  return [
    [product.size || 'Standard', Number(product.price)],
    ['Value pack', Math.round(Number(product.price) * 1.08)],
    ['Premium pack', Math.round(Number(product.price) * 1.18)],
  ];
}

export default function ProductDetails({ product, onBack, onOpenProduct, onBuyNow }) {
  const addToCart = useCartStore((state) => state.addToCart);
  const user = useAuthStore((state) => state.user);
  const profileData = useProfileStore((state) => state.data);
  const [sharedReviews, setSharedReviews] = useState([]);
  const [pincodeInput, setPincodeInput] = useState('');
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [activePolicy, setActivePolicy] = useState(null);
  const [selectedComboIds, setSelectedComboIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const addToWishlist = useProfileStore((state) => state.addToWishlist);
  const removeFromWishlist = useProfileStore((state) => state.removeFromWishlist);
  const profile = useMemo(() => getProfileFromData(profileData, user), [profileData, user]);
  const savedDeliveryAddress = useMemo(() => getSavedDeliveryAddress(profile), [profile]);
  const activePincode = pincodeInput || savedDeliveryAddress.pincode;
  const saleOffer = product.summerSaleOffer;
  const saleDiscountPrice = saleOffer?.discount_percent
    ? Number(product.price) * (1 - Number(saleOffer.discount_percent) / 100)
    : null;
  const displayPrice = saleOffer?.offer_price || saleDiscountPrice || product.price;
  const localProductReviews = useMemo(() => getProductReviewsFromData(profileData, product.id), [profileData, product.id]);
  const productReviews = useMemo(() => {
    const reviewMap = new Map();
    [...sharedReviews, ...localProductReviews].forEach((review) => {
      const key = `${review.customerEmail || review.owner}-${review.orderId || review.order_id}-${review.productId || review.product_id}`;
      if (!reviewMap.has(key)) {
        reviewMap.set(key, review);
      }
    });
    return Array.from(reviewMap.values()).sort(
      (first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
    );
  }, [localProductReviews, sharedReviews]);
  const dynamicRating = useMemo(() => {
    if (productReviews.length === 0) {
      return getProductRatingFromData(profileData, product);
    }
    const total = productReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return Number((total / productReviews.length).toFixed(1));
  }, [productReviews, profileData, product]);
  const isWishlisted = useProfileStore((state) => (user ? state.isWishlisted(user, product.id) : false));
  const options = useMemo(() => productOptions(product), [product]);
  const selectedOption = options[selectedOptionIndex] || options[0];
  const selectedOptionLabel = selectedOption?.[0] || '';
  const selectedOptionPrice = Number(selectedOption?.[1] || displayPrice);
  const productPolicies = useMemo(
    () => getProductPolicies(product, selectedOptionPrice, dynamicRating, productReviews.length),
    [dynamicRating, product, productReviews.length, selectedOptionPrice]
  );
  const protectionPlans = useMemo(() => getProtectionPlans(product, selectedOptionPrice), [product, selectedOptionPrice]);
  const selectedProtectionPlan = protectionPlans.find(([label]) => label === selectedPlan);
  const selectedProtectionPlanPrice = Number(selectedProtectionPlan?.[1] || 0);
  const payableProductPrice = selectedOptionPrice + selectedProtectionPlanPrice;
  const selectedCartOptionLabel = [
    selectedOptionLabel,
    selectedProtectionPlan ? selectedProtectionPlan[0] : '',
  ]
    .filter(Boolean)
    .join(' + ');
  const featureBadges = [
    productPolicies.freeDelivery
      ? { icon: Truck, label: 'Free Delivery', help: 'Eligible above Rs.1000', enabled: true, key: 'freeDelivery' }
      : { icon: Truck, label: 'Free Delivery', help: 'Available above Rs.1000', enabled: false, key: 'freeDelivery' },
    productPolicies.replacementLabel
      ? { icon: RotateCcw, label: productPolicies.replacementLabel, help: 'Eligible item', enabled: true, key: 'replacement' }
      : null,
    productPolicies.warrantyLabel
      ? { icon: ShieldCheck, label: productPolicies.warrantyLabel, help: 'Manufacturer warranty', enabled: true, key: 'warranty' }
      : null,
    productPolicies.topBrand
      ? { icon: Award, label: 'Top Brand', help: 'Highly rated brand', enabled: true, key: 'topBrand' }
      : null,
  ].filter(Boolean);
  const activePolicyOverlay = activePolicy ? getPolicyOverlay(product, activePolicy) : null;
  const comboProducts = useMemo(() => relatedProducts.slice(0, 2), [relatedProducts]);
  const selectedComboProducts = useMemo(
    () => comboProducts.filter((item) => selectedComboIds.includes(item.id)),
    [comboProducts, selectedComboIds]
  );
  const comboTotal = payableProductPrice + selectedComboProducts.reduce((total, item) => total + Number(item.price || 0), 0);

  useEffect(() => {
    setSelectedOptionIndex(0);
    setActivePolicy(null);
  }, [product.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadSharedReviews() {
      try {
        const reviews = await fetchProductReviews(product.id);
        if (isMounted) {
          setSharedReviews(reviews || []);
        }
      } catch {
        if (isMounted) {
          setSharedReviews([]);
        }
      }
    }

    loadSharedReviews();

    return () => {
      isMounted = false;
    };
  }, [product.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadRelatedProducts() {
      try {
        const response = await fetchProducts({ category: product.category, page_size: 8 });
        if (isMounted) {
          setRelatedProducts((response.items || []).filter((item) => item.id !== product.id));
        }
      } catch {
        if (isMounted) {
          setRelatedProducts([]);
        }
      }
    }

    loadRelatedProducts();

    return () => {
      isMounted = false;
    };
  }, [product.category, product.id]);

  useEffect(() => {
    setSelectedComboIds(comboProducts.map((item) => item.id));
  }, [comboProducts]);

  useEffect(() => {
    const key = 'recentlyViewedProducts';
    let current = [];
    try {
      current = JSON.parse(window.localStorage.getItem(key) || '[]');
    } catch {
      current = [];
    }
    const nextProduct = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      mrp: product.mrp,
      image: productImageUrl(product),
      image_url: productImageUrl(product),
      rating: product.rating,
      inventory: product.inventory,
      description: product.description,
    };
    const next = [nextProduct, ...current.filter((item) => item.id !== product.id)].slice(0, 8);
    window.localStorage.setItem(key, JSON.stringify(next));
    setRecentlyViewed(next.filter((item) => item.id !== product.id));
  }, [product]);

  useEffect(() => {
    let isMounted = true;
    const pincode = extractPincode(activePincode);

    async function loadDeliveryEstimate() {
      if (!pincode) {
        setDeliveryEstimate({ available: false, message: 'Enter a valid 6 digit pincode' });
        return;
      }

      setDeliveryLoading(true);
      try {
        const estimate = await fetchDeliveryEstimate(product.id, pincode);
        if (isMounted) {
          setDeliveryEstimate(estimate);
        }
      } catch (error) {
        if (isMounted) {
          setDeliveryEstimate({
            available: false,
            message: error.response?.data?.message || error.response?.data?.detail || 'Delivery estimate is unavailable',
          });
        }
      } finally {
        if (isMounted) {
          setDeliveryLoading(false);
        }
      }
    }

    loadDeliveryEstimate();

    return () => {
      isMounted = false;
    };
  }, [activePincode, product.id]);

  const deliveryDateLabel = deliveryEstimate?.delivery_date
    ? new Date(`${deliveryEstimate.delivery_date}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  const addComboToCart = async () => {
    await addToCart({
      ...product,
      price: payableProductPrice,
      selectedOption: selectedCartOptionLabel,
    });

    for (const comboProduct of selectedComboProducts) {
      await addToCart(comboProduct);
    }
  };
  const selectedCartProduct = {
    ...product,
    price: payableProductPrice,
    selectedOption: selectedCartOptionLabel,
  };

  const addSelectedToCart = async () => {
    for (let index = 0; index < quantity; index += 1) {
      await addToCart(selectedCartProduct);
    }
  };

  const buyNow = async () => {
    await addSelectedToCart();
    onBuyNow?.();
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        className="mb-5 inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft size={18} />
        Back to products
      </button>

      <div className="grid gap-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 md:p-6">
        <img
          alt={product.name}
          className="h-full max-h-[520px] w-full rounded-lg object-cover"
          src={productImageUrl(product)}
        />
        <div className="flex flex-col justify-center">
          <p className="text-sm font-black uppercase tracking-wide text-emerald-700">{product.category}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{product.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">
              <Star size={16} fill="currentColor" /> {dynamicRating}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">
              <PackageCheck size={16} /> {product.inventory} in stock
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
              <Truck size={16} /> Same-day delivery
            </span>
          </div>

          <div className="relative mt-5">
            <div className="grid gap-3 sm:grid-cols-4">
              {featureBadges.map(({ icon: Icon, label, help, enabled, key }) => (
                <button
                  className={`rounded-lg border p-3 text-center text-xs font-black shadow-sm ${
                    enabled
                      ? 'border-slate-200 bg-white text-sky-700'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                  disabled={!enabled || key === 'freeDelivery'}
                  key={label}
                  onClick={() => setActivePolicy(activePolicy === key ? null : key)}
                  type="button"
                >
                  <Icon className="mx-auto mb-2 text-slate-500" size={22} />
                  {label}
                  <span className="mt-1 block text-[11px] font-bold normal-case">{help}</span>
                </button>
              ))}
            </div>
            {activePolicyOverlay && (
              <div className="absolute left-0 right-0 top-full z-20 mt-3 rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-700 shadow-xl">
                <span
                  className="absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-slate-300 bg-white"
                  style={{ left: activePolicy === 'topBrand' ? '82%' : activePolicy === 'warranty' ? '58%' : '31%' }}
                />
                <button
                  aria-label="Close"
                  className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-slate-700 hover:bg-slate-100"
                  onClick={() => setActivePolicy(null)}
                  type="button"
                >
                  <X size={20} />
                </button>
                <h3 className="pr-10 text-base font-black text-slate-950">{activePolicyOverlay.title}</h3>
                <p className="mt-3 max-w-3xl leading-6">{activePolicyOverlay.message}</p>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-base font-black text-slate-950">Available options</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {options.map(([label, price], index) => (
                <button
                  className={`rounded-md border p-3 text-left text-sm font-bold ${
                    selectedOptionIndex === index ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  key={label}
                  onClick={() => setSelectedOptionIndex(index)}
                  type="button"
                >
                  <span className="block">{label}</span>
                  <span className="mt-1 block font-black text-slate-950">{formatCurrency(price)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8">
            {saleOffer && (
              <div className="mb-2 inline-flex w-fit rounded-md bg-orange-100 px-3 py-2 text-sm font-black text-orange-700">
                Great Summer Sale | {saleOffer.rule_description || `Max ${saleOffer.max_quantity_per_user} per user`}
              </div>
            )}
            <div className="text-4xl font-black">{formatCurrency(payableProductPrice)}</div>
            <p className="mt-1 text-sm font-bold text-slate-500">{selectedOptionLabel}</p>
            {selectedProtectionPlan && (
              <p className="mt-1 text-sm font-black text-emerald-700">
                Includes {selectedProtectionPlan[0]} ({formatCurrency(selectedProtectionPlanPrice)})
              </p>
            )}
            <div className="mt-1 text-sm font-semibold text-slate-400 line-through">
              {formatCurrency(product.mrp || product.price)}
            </div>
          </div>

          {protectionPlans.length > 0 && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Wrench className="text-emerald-600" size={19} />
                <h2 className="text-base font-black text-slate-950">Add a Protection Plan</h2>
              </div>
              <div className="mt-3 space-y-2">
                {protectionPlans.map(([label, price]) => (
                  <label className="flex items-start gap-2 text-sm font-semibold text-slate-700" key={label}>
                    <input
                      checked={selectedPlan === label}
                      className="mt-1"
                      onChange={() => setSelectedPlan(selectedPlan === label ? '' : label)}
                      type="checkbox"
                    />
                    <span>
                      {label} by Warranty Care for <span className="font-black text-rose-600">{formatCurrency(price)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">Delivery estimate</h2>
                {savedDeliveryAddress.pincode && !pincodeInput ? (
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Based on saved address {savedDeliveryAddress.pincode}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-500">Check availability by pincode</p>
                )}
              </div>
              {deliveryEstimate?.available ? (
                <span className="rounded-md bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-700">
                  {deliveryDateLabel}
                </span>
              ) : (
                <span className="rounded-md bg-amber-100 px-3 py-2 text-sm font-black text-amber-700">
                  Check PIN
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                className="h-11 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setPincodeInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={savedDeliveryAddress.pincode || 'Enter pincode'}
                value={pincodeInput}
              />
              {pincodeInput && (
                <button
                  className="h-11 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-white"
                  onClick={() => setPincodeInput('')}
                  type="button"
                >
                  Use Saved
                </button>
              )}
            </div>
            <p className={`mt-3 text-sm font-black ${deliveryEstimate?.available ? 'text-emerald-700' : 'text-amber-700'}`}>
              {deliveryEstimate?.available
                ? `${deliveryEstimate.message} to ${deliveryEstimate.pincode}`
                : deliveryEstimate?.message || 'Enter pincode to check delivery'}
            </p>
            {deliveryEstimate?.hub && (
              <p className="mt-1 text-xs font-bold text-slate-500">
                Fulfilled by {deliveryEstimate.hub.name}
              </p>
            )}
            {deliveryLoading && <p className="mt-1 text-xs font-bold text-slate-400">Checking delivery hub...</p>}
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <label className="block">
              <span className="sr-only">Quantity</span>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-500"
                onChange={(event) => setQuantity(Number(event.target.value))}
                value={quantity}
              >
                {Array.from({ length: Math.min(10, Number(product.inventory || 1)) }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    Quantity: {value}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-yellow-400 px-5 text-sm font-black text-slate-950 hover:bg-yellow-300"
              onClick={addSelectedToCart}
              type="button"
            >
              Add to cart
            </button>
            <button
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full bg-orange-400 px-5 text-sm font-black text-slate-950 hover:bg-orange-300"
              onClick={buyNow}
              type="button"
            >
              Buy Now
            </button>
            <div className="my-3 border-t border-slate-200" />
            <button
              className={`inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-semibold ${
                isWishlisted
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-slate-300 bg-white text-slate-950 hover:bg-slate-50'
              }`}
              onClick={() => {
                if (!user) {
                  return;
                }
                if (isWishlisted) {
                  removeFromWishlist(user, product.id);
                } else {
                  addToWishlist(user, product);
                }
              }}
              type="button"
            >
              {isWishlisted ? 'Wishlisted' : 'Add to Wish List'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Ratings & Reviews</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Customer feedback and admin replies</p>
          </div>
          <span className="rounded-md bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">
            {productReviews.length} reviews
          </span>
        </div>
        <div className="divide-y divide-slate-200">
          {productReviews.map((review) => (
            <div className="py-4" key={review.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-black text-white">
                  {review.rating} <Star size={12} className="inline" fill="currentColor" />
                </span>
                <h3 className="font-black text-slate-950">{review.feedback}</h3>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-600">{review.review}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">
                {review.customerName} | {new Date(review.createdAt).toLocaleDateString('en-IN')}
              </p>
              {review.adminResponse && (
                <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  <span className="font-black text-slate-950">Admin reply:</span> {review.adminResponse}
                </div>
              )}
            </div>
          ))}
          {productReviews.length === 0 && (
            <p className="py-6 text-sm font-semibold text-slate-500">No reviews yet. Delivered-order reviews will appear here.</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {comboProducts.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Frequently bought together</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[
                  {
                    ...product,
                    comboName: `This item: ${product.name}`,
                    comboPrice: payableProductPrice,
                    comboSelected: true,
                    comboLocked: true,
                  },
                  ...comboProducts.map((item) => ({
                    ...item,
                    comboName: item.name,
                    comboPrice: Number(item.price || 0),
                    comboSelected: selectedComboIds.includes(item.id),
                    comboLocked: false,
                  })),
                ].map((item, index, items) => (
                  <React.Fragment key={`${item.id}-${index}`}>
                    <article className="w-48 shrink-0">
                      <div className="relative h-40 overflow-hidden rounded-lg bg-slate-50">
                        <img
                          alt={item.name}
                          className="h-full w-full object-cover"
                          src={productImageUrl(item)}
                        />
                        <label className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded bg-white shadow-sm">
                          <input
                            checked={item.comboSelected}
                            disabled={item.comboLocked}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedComboIds((currentIds) => [...new Set([...currentIds, item.id])]);
                              } else {
                                setSelectedComboIds((currentIds) => currentIds.filter((id) => id !== item.id));
                              }
                            }}
                            type="checkbox"
                          />
                        </label>
                      </div>
                      <button
                        className="mt-3 line-clamp-3 text-left text-sm font-bold leading-6 text-slate-950 hover:text-emerald-700"
                        onClick={() => (item.comboLocked ? undefined : onOpenProduct?.(item))}
                        type="button"
                      >
                        {item.comboName}
                      </button>
                      {item.comboLocked && selectedCartOptionLabel && (
                        <p className="mt-1 text-xs font-black text-emerald-700">{selectedCartOptionLabel}</p>
                      )}
                      <p className="mt-2 text-lg font-black text-slate-950">{formatCurrency(item.comboPrice)}</p>
                    </article>
                    {index < items.length - 1 && (
                      <div className="flex shrink-0 items-center text-3xl font-black text-slate-700">+</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <aside className="flex h-fit flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-600">
                  Total price: <span className="text-lg font-black text-slate-950">{formatCurrency(comboTotal)}</span>
                </p>
                <button
                  className="mt-3 h-11 rounded-full bg-yellow-400 px-5 text-sm font-black text-slate-950 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  disabled={selectedComboProducts.length === 0}
                  onClick={addComboToCart}
                  type="button"
                >
                  Add selected to Cart
                </button>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Includes this item plus {selectedComboProducts.length} selected related product{selectedComboProducts.length === 1 ? '' : 's'}.
                </p>
              </aside>
            </div>
          </section>
        )}

        {[
          ['Featured items you may like', relatedProducts.slice(2, 6)],
          ['Recently viewed products', recentlyViewed],
        ].map(([title, items]) => (
          items.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={title}>
              <h2 className="text-xl font-black text-slate-950">{title}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((item) => (
                  <ProductCard key={item.id} onOpen={onOpenProduct || (() => {})} product={item} />
                ))}
              </div>
            </section>
          )
        ))}
      </div>
    </section>
  );
}
