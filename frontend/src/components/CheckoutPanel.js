import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, LocateFixed, MapPin, Save } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { formatCurrency } from '../utils/formatCurrency';
import { getCartPricing } from '../utils/orderPricing';
import { fetchDeliverySlots } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getProfileFromData, useProfileStore } from '../store/profileStore';
import { getCouponById, getCouponDiscount } from '../utils/coupons';

const cardBrandLogos = [
  { name: 'Visa', fill: '#1434CB', text: 'VISA' },
  { name: 'Mastercard', fill: '#EB001B', text: 'MC' },
  { name: 'Maestro', fill: '#009DDD', text: 'Maestro' },
  { name: 'RuPay', fill: '#0B8F3A', text: 'RuPay' },
];

function cardBrandImage({ name, fill, text }) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="92" height="56" viewBox="0 0 92 56">
      <rect width="92" height="56" rx="8" fill="white"/>
      <rect x="1" y="1" width="90" height="54" rx="7" fill="none" stroke="#dbe3ee"/>
      <text x="46" y="34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" fill="${fill}">${text}</text>
    </svg>
  `)}`;
}

async function getReadableAddress(latitude, longitude) {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
  );
  if (!response.ok) {
    throw new Error('Reverse geocoding failed');
  }

  const data = await response.json();
  return [
    data.locality || data.city,
    data.principalSubdivision,
    data.postcode,
    data.countryName,
  ]
    .filter(Boolean)
    .join(', ');
}

export default function CheckoutPanel({ coupons = [], onContinueShopping, onOrderPlaced }) {
  const [address, setAddress] = useState('221B Green Market Road, Mumbai');
  const [billingAddress, setBillingAddress] = useState('221B Green Market Road, Mumbai');
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true);
  const [addressesHydrated, setAddressesHydrated] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotError, setSlotError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiOption, setUpiOption] = useState('phonepe');
  const [upiId, setUpiId] = useState('');
  const [saveUpi, setSaveUpi] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [saveCard, setSaveCard] = useState(false);
  const [bank, setBank] = useState('hdfc');
  const [bankDetails, setBankDetails] = useState({ customerId: '', password: '' });
  const [walletTopUp, setWalletTopUp] = useState('');
  const [cashbackAccepted, setCashbackAccepted] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const user = useAuthStore((state) => state.user);
  const profileData = useProfileStore((state) => state.data);
  const profile = useMemo(() => getProfileFromData(profileData, user), [profileData, user]);
  const addUpi = useProfileStore((state) => state.addUpi);
  const addCard = useProfileStore((state) => state.addCard);
  const addAddress = useProfileStore((state) => state.addAddress);
  const addWalletMoney = useProfileStore((state) => state.addWalletMoney);
  const debitWallet = useProfileStore((state) => state.debitWallet);
  const saveCheckoutAddresses = useProfileStore((state) => state.saveCheckoutAddresses);
  const markCouponRedeemed = useProfileStore((state) => state.markCouponRedeemed);
  const redeemPoints = useProfileStore((state) => state.redeemPoints);
  const cart = useCartStore((state) => state.cart);
  const deliveryFee = useCartStore((state) => state.deliveryFee);
  const loadCart = useCartStore((state) => state.loadCart);
  const addOrder = useOrderStore((state) => state.addOrder);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const orderLoading = useOrderStore((state) => state.loading);
  const orderError = useOrderStore((state) => state.error);
  const basePricing = getCartPricing(cart, deliveryFee, paymentMethod);
  const appliedCoupon = getCouponById(profile.appliedCouponId, coupons);
  const couponDiscount = getCouponDiscount(appliedCoupon, basePricing.productCost);
  const earnedPoints = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((points, order) => points + Math.floor(Number(order.total || 0) / 100), 0);
  const availablePoints = Math.max(0, earnedPoints - Number(profile.pointsRedeemed || 0));
  const pointDiscount = usePoints && availablePoints >= 50 ? 50 : 0;
  const pricing = getCartPricing(cart, deliveryFee, paymentMethod, couponDiscount + pointDiscount);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (addressesHydrated) {
      return;
    }

    const savedDeliveryAddress = profile.checkoutDeliveryAddress || address;
    const savedBillingSameAsDelivery = profile.billingSameAsDelivery ?? true;
    const savedBillingAddress = savedBillingSameAsDelivery
      ? savedDeliveryAddress
      : profile.checkoutBillingAddress || savedDeliveryAddress;

    setAddress(savedDeliveryAddress);
    setBillingSameAsDelivery(savedBillingSameAsDelivery);
    setBillingAddress(savedBillingAddress);
    setAddressesHydrated(true);
  }, [address, addressesHydrated, profile]);

  useEffect(() => {
    if (availablePoints < 50 && usePoints) {
      setUsePoints(false);
    }
  }, [availablePoints, usePoints]);

  useEffect(() => {
    let isMounted = true;

    async function loadSlots() {
      try {
        const response = await fetchDeliverySlots();
        if (isMounted) {
          setSlots(response || []);
          setSelectedSlot(response?.[0]?.id ? String(response[0].id) : '');
          setSlotError('');
        }
      } catch (error) {
        if (isMounted) {
          setSlotError(error.response?.data?.message || 'Delivery slots require backend and MySQL data');
        }
      }
    }

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, []);

  const placeOrder = async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    try {
      saveCheckoutAddresses(user, {
        checkoutDeliveryAddress: address,
        checkoutBillingAddress: billingSameAsDelivery ? address : billingAddress,
        billingSameAsDelivery,
      });
      await addOrder({
        shipping_address: address,
        payment_method: paymentMethod,
        delivery_slot_id: Number(selectedSlot),
        discount_amount: couponDiscount + pointDiscount,
        coupon_code: couponDiscount > 0 ? appliedCoupon.code : null,
      });
      if (saveUpi && upiId.trim()) {
        addUpi(user, upiId.trim());
      }
      if (saveCard && cardDetails.number.trim()) {
        addCard(user, { ...cardDetails, last4: cardDetails.number.slice(-4) });
      }
      if (paymentMethod === 'wallet') {
        debitWallet(user, pricing.total, 'Order paid using Pay Balance');
      }
      if (couponDiscount > 0) {
        markCouponRedeemed(user, appliedCoupon.id);
      }
      if (pointDiscount > 0) {
        redeemPoints(user, 50, 'Redeemed 50 points for Rs.50 order discount');
      }
      await loadCart();
      await loadOrders();
      onOrderPlaced();
    } catch {
      return;
    }
  };

  const updateCardDetails = (key, value) => {
    setCardDetails({ ...cardDetails, [key]: value });
    setPaymentConfirmed(false);
  };

  const isCardPayment = paymentMethod === 'credit_card' || paymentMethod === 'debit_card';
  const canApprovePayment =
    paymentMethod === 'upi'
      ? Boolean(upiOption && upiId.trim())
      : isCardPayment
      ? Boolean(
          cardDetails.number.trim() &&
            cardDetails.name.trim() &&
            cardDetails.expiry.trim() &&
            cardDetails.cvv.trim()
        )
      : paymentMethod === 'netbanking'
      ? Boolean(bank && bankDetails.customerId.trim() && bankDetails.password.trim())
      : paymentMethod === 'wallet'
      ? Number(profile.walletBalance || 0) >= pricing.total
      : true;

  const savedAddressText = (savedAddress) =>
    [savedAddress.name && `${savedAddress.name}${savedAddress.phone ? ` | ${savedAddress.phone}` : ''}`, savedAddress.line, savedAddress.city, savedAddress.pincode]
      .filter(Boolean)
      .join(', ');

  const persistCheckoutAddress = (nextDeliveryAddress, nextBillingAddress = billingAddress, nextSameAsDelivery = billingSameAsDelivery) => {
    saveCheckoutAddresses(user, {
      checkoutDeliveryAddress: nextDeliveryAddress,
      checkoutBillingAddress: nextSameAsDelivery ? nextDeliveryAddress : nextBillingAddress,
      billingSameAsDelivery: nextSameAsDelivery,
    });
  };

  const selectSavedDeliveryAddress = (addressId) => {
    const savedAddress = profile.addresses.find((item) => String(item.id) === String(addressId));
    if (!savedAddress) {
      return;
    }
    const nextAddress = savedAddressText(savedAddress);
    setAddress(nextAddress);
    if (billingSameAsDelivery) {
      setBillingAddress(nextAddress);
    }
    persistCheckoutAddress(nextAddress, billingSameAsDelivery ? nextAddress : billingAddress, billingSameAsDelivery);
  };

  const selectSavedBillingAddress = (addressId) => {
    const savedAddress = profile.addresses.find((item) => String(item.id) === String(addressId));
    if (!savedAddress) {
      return;
    }
    const nextAddress = savedAddressText(savedAddress);
    setBillingAddress(nextAddress);
    persistCheckoutAddress(address, nextAddress, false);
  };

  const saveManualAddress = (addressText, label = 'Checkout Address') => {
    if (!addressText.trim()) {
      return;
    }
    addAddress(user, {
      name: user?.full_name || label,
      phone: user?.phone || '',
      line: addressText.trim(),
      city: '',
      pincode: '',
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Current location is not supported in this browser.');
      return;
    }

    setLocationStatus('Fetching your current location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let nextAddress = '';
        try {
          nextAddress = await getReadableAddress(latitude, longitude);
        } catch {
          nextAddress = '';
        }
        if (!nextAddress) {
          nextAddress = `Current Location near ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
        setAddress(nextAddress);
        if (billingSameAsDelivery) {
          setBillingAddress(nextAddress);
        }
        persistCheckoutAddress(nextAddress, billingSameAsDelivery ? nextAddress : billingAddress, billingSameAsDelivery);
        setLocationStatus('Current location selected.');
      },
      () => {
        setLocationStatus('Location permission was denied. Choose a saved address or type one manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-slate-950">Checkout</h1>
      <form className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={placeOrder}>
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="text-emerald-600" size={20} />
                <h2 className="text-lg font-black">Delivery Address</h2>
              </div>
              <div className="mb-3 grid gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
                  onClick={useCurrentLocation}
                  type="button"
                >
                  <LocateFixed size={17} />
                  Use Current Location
                </button>
                {profile.addresses.length > 0 && (
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
                    defaultValue=""
                    onChange={(event) => {
                      selectSavedDeliveryAddress(event.target.value);
                      event.target.value = '';
                    }}
                  >
                    <option value="">Choose saved address</option>
                    {profile.addresses.map((savedAddress) => (
                      <option key={savedAddress.id} value={savedAddress.id}>
                        {savedAddressText(savedAddress)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm font-medium outline-none focus:border-emerald-500"
                onChange={(event) => {
                  const nextAddress = event.target.value;
                  setAddress(nextAddress);
                  if (billingSameAsDelivery) {
                    setBillingAddress(nextAddress);
                  }
                  persistCheckoutAddress(nextAddress, billingSameAsDelivery ? nextAddress : billingAddress, billingSameAsDelivery);
                }}
                required
                value={address}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                  onClick={() => saveManualAddress(address, 'Delivery Address')}
                  type="button"
                >
                  <Save size={16} />
                  Save Address
                </button>
                {locationStatus && <span className="text-xs font-bold text-slate-500">{locationStatus}</span>}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="text-emerald-600" size={20} />
                  <h2 className="text-lg font-black">Billing Address</h2>
                </div>
                <label className="flex items-center gap-2 text-xs font-black text-slate-600">
                  <input
                    checked={billingSameAsDelivery}
                    onChange={(event) => {
                      const nextSameAsDelivery = event.target.checked;
                      setBillingSameAsDelivery(nextSameAsDelivery);
                      if (nextSameAsDelivery) {
                        setBillingAddress(address);
                      }
                      persistCheckoutAddress(address, nextSameAsDelivery ? address : billingAddress, nextSameAsDelivery);
                    }}
                    type="checkbox"
                  />
                  Same as delivery
                </label>
              </div>
              {!billingSameAsDelivery && profile.addresses.length > 0 && (
                <select
                  className="mb-3 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
                  defaultValue=""
                  onChange={(event) => {
                    selectSavedBillingAddress(event.target.value);
                    event.target.value = '';
                  }}
                >
                  <option value="">Choose saved billing address</option>
                  {profile.addresses.map((savedAddress) => (
                    <option key={savedAddress.id} value={savedAddress.id}>
                      {savedAddressText(savedAddress)}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm font-medium outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
                disabled={billingSameAsDelivery}
                onChange={(event) => {
                  setBillingAddress(event.target.value);
                  persistCheckoutAddress(address, event.target.value, billingSameAsDelivery);
                }}
                required
                value={billingAddress}
              />
              {!billingSameAsDelivery && (
                <button
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                  onClick={() => saveManualAddress(billingAddress, 'Billing Address')}
                  type="button"
                >
                  <Save size={16} />
                  Save Billing Address
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="text-emerald-600" size={20} />
              <h2 className="text-lg font-black">Payment</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['upi', 'UPI', 'Approve the mock UPI collect request'],
                ['credit_card', 'Credit Card', 'Visa, Mastercard, Maestro, RuPay accepted'],
                ['debit_card', 'Debit Card', 'Visa, Mastercard, Maestro, RuPay accepted'],
                ['cod', 'Cash on delivery', 'Pay at doorstep'],
                ['netbanking', 'Net Banking', 'Pay through selected banks'],
                ['wallet', 'Pay Balance', 'Use wallet balance for this order'],
                ['cashback', 'Cashback', 'Apply available cashback'],
              ].map(([value, label, help]) => (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${
                  paymentMethod === value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                }`}
                key={value}
              >
                <input
                  checked={paymentMethod === value}
                  name="payment"
                  onChange={() => {
                    setPaymentMethod(value);
                    setPaymentConfirmed(value === 'cod');
                  }}
                  type="radio"
                />
                <span>
                  <span className="block font-black text-slate-950">{label}</span>
                  <span className="block text-sm text-slate-500">{help}</span>
                  {(value === 'credit_card' || value === 'debit_card') && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {cardBrandLogos.map((brand) => (
                        <img
                          alt={brand.name}
                          className="h-7 w-12 rounded border border-slate-200 bg-white object-contain"
                          key={brand.name}
                          src={cardBrandImage(brand)}
                        />
                      ))}
                    </span>
                  )}
                </span>
              </label>
              ))}
            </div>
            {paymentMethod === 'upi' && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">Select UPI app</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {['phonepe', 'gpay', 'paytm'].map((option) => (
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold ${
                        upiOption === option ? 'border-emerald-500 bg-white text-emerald-700' : 'border-slate-200 text-slate-600'
                      }`}
                      key={option}
                    >
                      <input
                        checked={upiOption === option}
                        name="upiOption"
                        onChange={() => {
                          setUpiOption(option);
                          setPaymentConfirmed(false);
                        }}
                        type="radio"
                      />
                      {option === 'phonepe' ? 'PhonePe' : option === 'gpay' ? 'Google Pay' : 'Paytm'}
                    </label>
                  ))}
                </div>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">UPI ID</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                    onChange={(event) => {
                      setUpiId(event.target.value);
                      setPaymentConfirmed(false);
                    }}
                    placeholder="name@bank"
                    required={paymentMethod === 'upi'}
                    value={upiId}
                  />
                </label>
                <button
                  className="mt-3 h-10 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!canApprovePayment}
                  onClick={() => setPaymentConfirmed(true)}
                  type="button"
                >
                  {paymentConfirmed ? 'UPI approved' : 'Approve UPI payment'}
                </button>
                <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input checked={saveUpi} onChange={(event) => setSaveUpi(event.target.checked)} type="checkbox" />
                  Save this UPI ID
                </label>
              </div>
            )}
            {isCardPayment && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-700">
                    {paymentMethod === 'credit_card' ? 'Credit Card details' : 'Debit Card details'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cardBrandLogos.map((brand) => (
                      <img
                        alt={brand.name}
                        className="h-8 w-14 rounded border border-slate-200 bg-white object-contain"
                        key={brand.name}
                        src={cardBrandImage(brand)}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Card number</span>
                    <input
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                      inputMode="numeric"
                      onChange={(event) => updateCardDetails('number', event.target.value)}
                      placeholder="4111 1111 1111 1111"
                      required={isCardPayment}
                      value={cardDetails.number}
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Name on card</span>
                    <input
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                      onChange={(event) => updateCardDetails('name', event.target.value)}
                      required={isCardPayment}
                      value={cardDetails.name}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">Expiry</span>
                    <input
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                      onChange={(event) => updateCardDetails('expiry', event.target.value)}
                      placeholder="MM/YY"
                      required={isCardPayment}
                      value={cardDetails.expiry}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">CVV</span>
                    <input
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                      inputMode="numeric"
                      maxLength="4"
                      onChange={(event) => updateCardDetails('cvv', event.target.value)}
                      required={isCardPayment}
                      type="password"
                      value={cardDetails.cvv}
                    />
                  </label>
                </div>
                <button
                  className="mt-3 h-10 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!canApprovePayment}
                  onClick={() => setPaymentConfirmed(true)}
                  type="button"
                >
                  {paymentConfirmed ? 'Card approved' : 'Approve card payment'}
                </button>
                <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input checked={saveCard} onChange={(event) => setSaveCard(event.target.checked)} type="checkbox" />
                  Save this card
                </label>
              </div>
            )}
            {paymentMethod === 'netbanking' && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">Select bank</p>
                <select
                  className="mt-3 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                  onChange={(event) => {
                    setBank(event.target.value);
                    setPaymentConfirmed(false);
                  }}
                  value={bank}
                >
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="sbi">State Bank of India</option>
                  <option value="axis">Axis Bank</option>
                  <option value="kotak">Kotak Mahindra Bank</option>
                </select>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">Customer ID / User ID</span>
                    <input
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                      onChange={(event) => {
                        setBankDetails({ ...bankDetails, customerId: event.target.value });
                        setPaymentConfirmed(false);
                      }}
                      value={bankDetails.customerId}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-bold text-slate-700">Password / OTP</span>
                    <input
                      className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                      onChange={(event) => {
                        setBankDetails({ ...bankDetails, password: event.target.value });
                        setPaymentConfirmed(false);
                      }}
                      type="password"
                      value={bankDetails.password}
                    />
                  </label>
                </div>
                <button
                  className="mt-3 h-10 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
                  disabled={!canApprovePayment}
                  onClick={() => setPaymentConfirmed(true)}
                  type="button"
                >
                  {paymentConfirmed ? 'Net banking approved' : 'Approve net banking'}
                </button>
              </div>
            )}
            {paymentMethod === 'wallet' && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-700">Pay Balance</p>
                  <span className="text-lg font-black text-emerald-700">{formatCurrency(profile.walletBalance || 0)}</span>
                </div>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Add money to wallet</span>
                  <input
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                    inputMode="numeric"
                    onChange={(event) => setWalletTopUp(event.target.value)}
                    placeholder="Amount"
                    value={walletTopUp}
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={Number(walletTopUp) <= 0}
                    onClick={() => {
                      addWalletMoney(user, Number(walletTopUp), 'Money added during checkout');
                      setWalletTopUp('');
                      setPaymentConfirmed(false);
                    }}
                    type="button"
                  >
                    Add Money
                  </button>
                  <span className="self-center text-sm font-semibold text-slate-500">
                    Order total: {formatCurrency(pricing.total)}
                  </span>
                </div>
                <button
                  className="mt-3 h-10 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!canApprovePayment}
                  onClick={() => setPaymentConfirmed(true)}
                  type="button"
                >
                  {paymentConfirmed ? 'Pay Balance approved' : 'Use Pay Balance'}
                </button>
              </div>
            )}
            {paymentMethod === 'cashback' && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">Cashback</p>
                <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    checked={cashbackAccepted}
                    onChange={(event) => {
                      setCashbackAccepted(event.target.checked);
                      setPaymentConfirmed(event.target.checked);
                    }}
                    type="checkbox"
                  />
                  Apply available cashback and continue
                </label>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Delivery slot</h2>
            {slotError && <p className="mt-2 text-sm font-semibold text-amber-700">{slotError}</p>}
            <select
              className="mt-4 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
              onChange={(event) => setSelectedSlot(event.target.value)}
              required
              value={selectedSlot}
            >
              <option value="">Select a slot</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.day_label} {slot.start_time}-{slot.end_time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Order summary</h2>
          <div className="mt-4 space-y-3">
            {cart.map((item) => (
              <div className="flex justify-between gap-3 text-sm" key={item.id}>
                <span className="font-semibold text-slate-600">
                  {item.name} x {item.quantity}
                  {item.selectedOption && <span className="block text-xs font-black text-emerald-700">{item.selectedOption}</span>}
                </span>
                <span className="font-black">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-600">
              <span>Total Amount</span>
              <span>{formatCurrency(pricing.fullMrp)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-slate-600">
              <span>Delivery Charge</span>
              <span>{pricing.deliveryFee === 0 ? 'Free' : formatCurrency(pricing.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-slate-600">
              <span>Tax (5%)</span>
              <span>{formatCurrency(pricing.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-emerald-700">
              <span>Discount</span>
              <span>-{formatCurrency(pricing.discount)}</span>
            </div>
            {appliedCoupon && (
              <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm">
                <div className="flex justify-between gap-3 font-black text-emerald-700">
                  <span>Coupon {appliedCoupon.code}</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
                {couponDiscount === 0 && (
                  <p className="mt-1 font-semibold text-amber-700">
                    Add items worth {formatCurrency(Math.max(0, appliedCoupon.minOrder - basePricing.productCost))} more to use it.
                  </p>
                )}
              </div>
            )}
            {availablePoints >= 50 && (
              <label className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                <input
                  checked={usePoints}
                  onChange={(event) => setUsePoints(event.target.checked)}
                  type="checkbox"
                />
                Redeem 50 points for Rs.50 off this order
              </label>
            )}
            {pointDiscount > 0 && (
              <div className="flex justify-between text-sm font-semibold text-amber-700">
                <span>Points redeemed</span>
                <span>-{formatCurrency(pointDiscount)}</span>
              </div>
            )}
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
              You saved {formatCurrency(pricing.discount + pricing.orderDiscount)} on this order
            </p>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-600">
              <span>Cash on Delivery</span>
              <span>{pricing.cashOnDeliveryCharge === 0 ? 'No charge' : formatCurrency(pricing.cashOnDeliveryCharge)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-950">
              <span>Grand Total</span>
              <span>{formatCurrency(pricing.total)}</span>
            </div>
          </div>
          <button
            className="mt-5 h-11 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={cart.length === 0 || !selectedSlot || orderLoading || !paymentConfirmed}
            type="submit"
          >
            {orderLoading ? 'Placing order...' : 'Place order'}
          </button>
          <button
            className="mt-3 h-11 w-full rounded-md bg-orange-500 text-sm font-black text-white hover:bg-orange-600"
            onClick={onContinueShopping}
            type="button"
          >
            Shop to Continue
          </button>
          {orderError && <p className="mt-3 text-sm font-semibold text-rose-600">{orderError}</p>}
        </aside>
      </form>
    </section>
  );
}
