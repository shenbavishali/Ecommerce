const WARRANTY_CATEGORIES = ['electronics', 'laptop', 'ac', 'appliance', 'mobile', 'audio'];
const REPLACEMENT_CATEGORIES = ['electronics', 'laptop', 'ac', 'shoes', 'jeans', 't-shirt', 't-shirts', 'fashion', 'footwear'];
const NON_REPLACEMENT_CATEGORIES = ['grocery', 'dairy', 'staples', 'rice', 'cooking oil', 'salt'];

function productText(product) {
  return [
    product?.category,
    product?.subcategory,
    product?.name,
    product?.brand,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getProductPolicies(product, price, rating = product?.rating, reviewCount = 0) {
  const text = productText(product);
  const normalizedPrice = Number(price || product?.price || 0);
  const normalizedRating = Number(rating || product?.rating || 0);
  const configuredWarrantyMonths = Number(product?.warranty_months || 0);
  const hasWarranty = configuredWarrantyMonths > 0 || WARRANTY_CATEGORIES.some((category) => text.includes(category));
  const warrantyLabel = getWarrantyLabel(product);
  const isNonReplacement = NON_REPLACEMENT_CATEGORIES.some((category) => text.includes(category));
  const configuredReplacementDays = Number(product?.replacement_days || 0);
  const hasReplacement = configuredReplacementDays > 0 || (!isNonReplacement && REPLACEMENT_CATEGORIES.some((category) => text.includes(category)));

  return {
    freeDelivery: normalizedPrice > 1000,
    replacementLabel: hasReplacement ? `${configuredReplacementDays || 10} days Replacement` : '',
    warrantyLabel: hasWarranty ? warrantyLabel : '',
    topBrand:
      normalizedRating >= 4.2 &&
      Number(product?.inventory || 0) > 0 &&
      (reviewCount >= 3 || Number(product?.inventory || 0) >= 20),
  };
}

export function getWarrantyLabel(product) {
  const configuredMonths = Number(product?.warranty_months || 0);
  if (configuredMonths >= 12 && configuredMonths % 12 === 0) {
    return `${configuredMonths / 12} Year Warranty`;
  }
  if (configuredMonths > 0) {
    return `${configuredMonths} Month Warranty`;
  }
  const text = productText(product);
  if (text.includes('power bank') || text.includes('earbuds') || text.includes('headphones') || text.includes('smartwatch')) {
    return '6 Month Warranty';
  }
  if (text.includes('laptop') || text.includes('tv') || text.includes('ac') || text.includes('mobile')) {
    return '1 Year Warranty';
  }
  return 'Warranty';
}

export function getPolicyOverlay(product, policyKey) {
  const warrantyLabel = getWarrantyLabel(product);
  const category = String(product?.category || '').toLowerCase();
  const name = product?.name || 'this product';

  if (policyKey === 'topBrand') {
    return {
      title: 'Top Brand',
      message:
        'Top Brand indicates high quality, trusted brands based on verified ratings, return history, order history, and brand-level reliability.',
    };
  }

  if (policyKey === 'warranty') {
    return {
      title: warrantyLabel,
      message:
        `${warrantyLabel} covers eligible defects for ${name} with a genuine invoice. Physical damage, missing accessories, misuse, and consumables are not covered. Service or replacement depends on brand policy and stock availability.`,
    };
  }

  if (policyKey === 'replacement') {
    if (category.includes('grocery')) {
      return {
        title: 'No Replacement',
        message:
          'Grocery and daily essentials are not eligible for standard replacement. Damaged or incorrect items can be reported through order help after delivery.',
      };
    }

    return {
      title: '10 Days Replacement',
      message:
        `${name} is eligible for replacement within 10 days if it is damaged, defective, or different from what was ordered. Keep the invoice, original packaging, tags, and accessories ready for pickup verification.`,
    };
  }

  return null;
}

export function getProtectionPlans(product, basePrice = product?.price) {
  const text = productText(product);
  const price = Number(basePrice || product?.price || 0);

  if (!getWarrantyLabel(product) || text.includes('grocery') || text.includes('jeans') || text.includes('t-shirt') || text.includes('shoes')) {
    return [];
  }

  if (text.includes('laptop') || text.includes('tv') || text.includes('ac')) {
    return [
      ['1 Year Extended Warranty', Math.max(999, Math.round(price * 0.035))],
      ['2 Years Extended Warranty', Math.max(1699, Math.round(price * 0.06))],
      ['3 Years Total Protection', Math.max(2499, Math.round(price * 0.085))],
    ];
  }

  if (text.includes('mobile')) {
    return [
      ['1 Year Screen & Device Protection', Math.max(799, Math.round(price * 0.06))],
      ['2 Years Total Protection', Math.max(1299, Math.round(price * 0.095))],
    ];
  }

  if (text.includes('power bank') || text.includes('earbuds') || text.includes('headphones') || text.includes('smartwatch')) {
    return [
      ['1 Year Protection Plan', Math.max(299, Math.round(price * 0.08))],
    ];
  }

  return [];
}
