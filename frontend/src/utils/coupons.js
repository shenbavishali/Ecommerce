export const fallbackCoupons = [
  {
    id: 'FRESH50',
    title: 'Fresh Saver',
    code: 'FRESH50',
    discount: 50,
    minOrder: 499,
    description: 'Save Rs.50 on fruits, vegetables, and daily essentials.',
  },
  {
    id: 'BASKET100',
    title: 'Basket Bonus',
    code: 'BASKET100',
    discount: 100,
    minOrder: 999,
    description: 'Save Rs.100 on grocery baskets above Rs.999.',
  },
  {
    id: 'MONTHLY150',
    title: 'Monthly Stock-Up',
    code: 'MONTHLY150',
    discount: 150,
    minOrder: 1499,
    description: 'Save Rs.150 on large pantry orders.',
  },
  {
    id: 'DAIRY40',
    title: 'Dairy Deal',
    code: 'DAIRY40',
    discount: 40,
    minOrder: 399,
    description: 'Save Rs.40 on milk, curd, paneer, and breakfast staples.',
  },
  {
    id: 'SNACKS75',
    title: 'Snack Time',
    code: 'SNACKS75',
    discount: 75,
    minOrder: 699,
    description: 'Save Rs.75 on snacks, beverages, and treats.',
  },
  {
    id: 'HOMECARE120',
    title: 'Home Care',
    code: 'HOMECARE120',
    discount: 120,
    minOrder: 1199,
    description: 'Save Rs.120 on cleaning and household care.',
  },
  {
    id: 'FIRSTBUY80',
    title: 'Welcome Saver',
    code: 'FIRSTBUY80',
    discount: 80,
    minOrder: 799,
    description: 'Save Rs.80 on your next checkout.',
  },
  {
    id: 'WEEKEND200',
    title: 'Weekend Cart',
    code: 'WEEKEND200',
    discount: 200,
    minOrder: 2499,
    description: 'Save Rs.200 on weekend family shopping.',
  },
];

export function getCouponById(couponId, coupons = fallbackCoupons) {
  return coupons.find((coupon) => coupon.id === couponId || coupon.code === couponId) || null;
}

export function getCouponDiscount(coupon, productCost) {
  if (!coupon || Number(productCost || 0) < Number(coupon.minOrder || 0)) {
    return 0;
  }

  return Number(coupon.discount || 0);
}
