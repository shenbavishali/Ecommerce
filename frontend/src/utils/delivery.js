const regionalDeliveryDays = {
  1: 2,
  2: 3,
  3: 2,
  4: 1,
  5: 2,
  6: 3,
  7: 4,
  8: 5,
  9: 5,
};

const fasterCategories = ['grocery', 'fruits', 'vegetables', 'dairy', 'bakery', 'personal care'];
const slowerCategories = ['electronics', 'fashion', 'furniture', 'books'];

export function extractPincode(value = '') {
  const match = String(value).match(/\b\d{6}\b/);
  return match ? match[0] : '';
}

export function getSavedDeliveryAddress(profile = {}) {
  const savedAddress = (profile.addresses || []).find((address) => extractPincode(address.pincode || address.line || ''));
  if (savedAddress) {
    return {
      label: [savedAddress.name, savedAddress.line, savedAddress.city].filter(Boolean).join(', '),
      pincode: extractPincode(savedAddress.pincode || savedAddress.line),
    };
  }

  const checkoutPincode = extractPincode(profile.checkoutDeliveryAddress);
  if (checkoutPincode) {
    return {
      label: profile.checkoutDeliveryAddress,
      pincode: checkoutPincode,
    };
  }

  return { label: '', pincode: '' };
}

export function getDeliveryEstimate(product, pincode) {
  const cleanPincode = extractPincode(pincode);

  if (!cleanPincode) {
    return {
      available: false,
      pincode: '',
      message: 'Enter a valid 6 digit pincode',
    };
  }

  if (Number(product?.inventory || 0) <= 0) {
    return {
      available: false,
      pincode: cleanPincode,
      message: 'Currently unavailable for delivery',
    };
  }

  const firstDigit = cleanPincode.charAt(0);
  const category = String(product?.category || '').toLowerCase();
  const baseDays = regionalDeliveryDays[firstDigit] || 4;
  const categoryAdjustment = fasterCategories.some((item) => category.includes(item))
    ? -1
    : slowerCategories.some((item) => category.includes(item))
      ? 1
      : 0;
  const deliveryDays = Math.max(1, Math.min(7, baseDays + categoryAdjustment));
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

  return {
    available: true,
    pincode: cleanPincode,
    deliveryDays,
    deliveryDate,
    label: deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    message: deliveryDays === 1 ? 'Delivery by tomorrow' : `Delivery in ${deliveryDays} days`,
  };
}
