export const TAX_RATE = 0.05;
export const COD_CHARGE = 40;

export function getCartPricing(cart = [], deliveryFee = 0, paymentMethod = '', extraDiscount = 0) {
  const fullMrp = cart.reduce(
    (total, item) => total + Number(item.mrp || item.price || 0) * Number(item.quantity || 0),
    0
  );
  const productCost = cart.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const discount = Math.max(0, fullMrp - productCost);
  const tax = productCost * TAX_RATE;
  const cashOnDeliveryCharge = paymentMethod === 'cod' ? COD_CHARGE : 0;
  const orderDiscount = Math.min(
    Number(extraDiscount || 0),
    Math.max(0, productCost + Number(deliveryFee || 0) + tax + cashOnDeliveryCharge)
  );
  const total = fullMrp + Number(deliveryFee || 0) + tax + cashOnDeliveryCharge - discount - orderDiscount;

  return {
    fullMrp,
    productCost,
    deliveryFee: Number(deliveryFee || 0),
    tax,
    discount,
    orderDiscount,
    cashOnDeliveryCharge,
    total,
  };
}
