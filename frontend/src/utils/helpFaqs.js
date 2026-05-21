export const helpFaqTopics = [
  {
    id: 'loyalty',
    title: 'Loyalty Rewards',
    questions: [
      {
        id: 'earn-points',
        question: 'How do I earn loyalty rewards?',
        answer: 'You earn reward points on eligible orders after they are delivered. Points may vary by product, offer, and order value.',
      },
      {
        id: 'redeem-points',
        question: 'How can I redeem my reward points?',
        answer: 'Open Loyalty Rewards from your account, check your available balance, and apply eligible points during checkout.',
      },
      {
        id: 'points-expiry',
        question: 'Do loyalty points expire?',
        answer: 'Reward points can expire based on campaign rules. Check the expiry details in the Loyalty Rewards section before checkout.',
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping FAQs',
    questions: [
      {
        id: 'delivery-time',
        question: 'When will my order be delivered?',
        answer: 'Delivery time depends on your pincode, product availability, and selected delivery slot. You can see the estimate on the product page and checkout.',
      },
      {
        id: 'change-address',
        question: 'Can I change my delivery address after placing an order?',
        answer: 'Address changes are usually allowed only before the order is packed. Open Orders or Help & Support to request a change.',
      },
      {
        id: 'shipping-fee',
        question: 'Why am I seeing a delivery charge?',
        answer: 'Delivery charges may apply based on order value, delivery slot, location, or offer eligibility. The final fee is shown before payment.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Shopping',
    questions: [
      {
        id: 'create-account',
        question: 'How do I create an account?',
        answer: 'Tap Login, choose signup, enter your details, and complete email verification if prompted.',
      },
      {
        id: 'search-products',
        question: 'How do I search for products?',
        answer: 'Use the search bar or ask the assistant for a product name or brand, such as Amul or Paneer. Matching products will appear from the catalog.',
      },
      {
        id: 'add-cart',
        question: 'How do I add products to cart?',
        answer: 'Open a product and choose Add to Cart. You can update quantity, remove items, and proceed to checkout from Cart.',
      },
    ],
  },
  {
    id: 'wallet',
    title: 'JioBasket Wallet',
    questions: [
      {
        id: 'wallet-use',
        question: 'How can I use wallet balance?',
        answer: 'Wallet balance can be applied during checkout when it is available for your account and order type.',
      },
      {
        id: 'wallet-refund',
        question: 'Where will my wallet refund appear?',
        answer: 'Eligible refunds are credited to your wallet or original payment method based on the order payment mode and refund rules.',
      },
    ],
  },
  {
    id: 'gift-card',
    title: 'Gift Card',
    questions: [
      {
        id: 'gift-card-use',
        question: 'How do I use a gift card?',
        answer: 'Enter the gift card code during checkout if gift cards are enabled for your order. The eligible amount is deducted from the total.',
      },
      {
        id: 'gift-card-balance',
        question: 'How can I check gift card balance?',
        answer: 'Open Gift Card in your account or contact support with the gift card code details.',
      },
    ],
  },
  {
    id: 'cancellation',
    title: 'Cancellation FAQs',
    questions: [
      {
        id: 'cancel-order',
        question: 'How do I cancel an order?',
        answer: 'Open Orders, select the order, choose Cancel Order, pick a reason, and submit. Cancellation is usually available before packing or shipping.',
      },
      {
        id: 'cancel-refund',
        question: 'When will I get a refund for a cancelled order?',
        answer: 'Refund timelines depend on the payment method. The expected refund status is shown on the cancelled order.',
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns FAQs',
    questions: [
      {
        id: 'return-item',
        question: 'How do I return an item?',
        answer: 'Open Orders, select a delivered order, choose Return for the eligible item, add the reason, and submit the request.',
      },
      {
        id: 'return-eligible',
        question: 'Why is my product not eligible for return?',
        answer: 'Some products may be non-returnable, outside the return window, or already used beyond policy limits. Check the product policy on the order.',
      },
      {
        id: 'pickup-status',
        question: 'How can I track return pickup?',
        answer: 'Return pickup status appears inside Orders. If the pickup is delayed, raise a Help & Support request from the order.',
      },
    ],
  },
  {
    id: 'payment',
    title: 'Payment FAQs',
    questions: [
      {
        id: 'cod',
        question: 'What does opting for Cash on Delivery mean?',
        answer: 'Cash on Delivery lets you pay when the order reaches you. Availability depends on your pincode, cart value, and product eligibility.',
      },
      {
        id: 'debited-no-order',
        question: 'What if the amount got debited but I did not receive an Order ID?',
        answer: 'If payment is debited and no order is created, wait a few minutes and check Orders. If it still does not appear, contact support with your payment reference.',
      },
      {
        id: 'hidden-costs',
        question: 'Will I have to pay hidden costs like sales tax or other charges?',
        answer: 'No hidden charges are collected after checkout. Product price, delivery fee, discount, and applicable taxes are shown before you place the order.',
      },
      {
        id: 'payment-modes',
        question: 'What are the various modes of payment?',
        answer: 'You can pay using credit card, debit card, net banking, UPI, wallets, wallet balance, or Cash on Delivery where available. Payment options may vary by pincode and order value.',
      },
      {
        id: 'check-package',
        question: 'For Cash-on-Delivery orders, can I check the package before payment?',
        answer: 'You can check the package condition at delivery, but opening the product before payment may not be available for all orders.',
      },
      {
        id: 'international-currency',
        question: 'Can I pay using international currency?',
        answer: 'Orders are billed in Indian Rupees. International cards may work only if supported by the payment provider.',
      },
      {
        id: 'convenience-fee',
        question: 'What does convenience fee mean?',
        answer: 'A convenience fee is an additional charge applied for selected services, payment modes, or order types. It is shown before payment.',
      },
    ],
  },
  {
    id: 'gst',
    title: 'GST FAQs',
    questions: [
      {
        id: 'gst-invoice',
        question: 'Can I get a GST invoice?',
        answer: 'GST invoice availability depends on seller and product eligibility. Invoice details are available after order placement.',
      },
      {
        id: 'gst-details',
        question: 'Can I add GST details after placing an order?',
        answer: 'GST details should be added before placing the order. Post-order changes may not be supported.',
      },
    ],
  },
];

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'are',
  'can',
  'do',
  'does',
  'for',
  'how',
  'i',
  'is',
  'me',
  'my',
  'of',
  'on',
  'the',
  'to',
  'what',
  'when',
  'where',
  'why',
  'will',
]);

export function findHelpFaqAnswer(query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return null;
  }

  const queryWords = normalizedQuery.split(' ').filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  let bestMatch = null;
  let bestScore = 0;

  helpFaqTopics.forEach((topic) => {
    topic.questions.forEach((item) => {
      const searchable = normalize(`${topic.title} ${item.question} ${item.answer}`);
      const exactScore = searchable.includes(normalizedQuery) ? 5 : 0;
      const wordScore = queryWords.reduce((score, word) => score + (searchable.includes(word) ? 1 : 0), 0);
      const score = exactScore + wordScore;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { topic, ...item };
      }
    });
  });

  return bestScore > 0 ? bestMatch : null;
}
