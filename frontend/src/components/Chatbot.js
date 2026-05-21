import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  ExternalLink,
  Info,
  MessageCircle,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { addCartItem, fetchMonthlyGroceryTemplate, fetchProducts } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { formatCurrency } from '../utils/formatCurrency';
import { findHelpFaqAnswer } from '../utils/helpFaqs';
import { productImageUrl } from '../utils/imageUrl';

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function templateEstimate(items = []) {
  return items.reduce(
    (total, item) => total + (item.is_required ? Number(item.price || 0) * Number(item.qty || 0) : 0),
    0
  );
}

function makeBotMessage(text, actions = [], extra = {}) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sender: 'bot',
    text,
    actions,
    ...extra,
  };
}

function makeUserMessage(text) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sender: 'user',
    text,
  };
}

const CHAT_STORAGE_KEY = 'jioBasketChatbotHistory';
const CHAT_DETAILS_STORAGE_KEY = 'jioBasketChatbotExpandedDetails';

function defaultChatMessages() {
  return [
    makeBotMessage('Hi, I am JioBasket Assistant. I can help with products, cart, orders, offers, and your recurring purchase template.'),
  ];
}

function savedChatMessages(storageKey) {
  if (!storageKey) {
    return defaultChatMessages();
  }

  try {
    const savedMessages = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(savedMessages) && savedMessages.length > 0) {
      return savedMessages;
    }
  } catch {
    // Fall back to the default greeting if saved chat data is unavailable.
  }

  return defaultChatMessages();
}

function savedExpandedDetails(storageKey) {
  if (!storageKey) {
    return {};
  }

  try {
    const savedDetails = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    if (savedDetails && typeof savedDetails === 'object' && !Array.isArray(savedDetails)) {
      return savedDetails;
    }
  } catch {
    // Ignore malformed detail state and start collapsed.
  }

  return {};
}

function userStorageSuffix(user) {
  if (!user) {
    return '';
  }

  return String(user.id || user.email || 'unknown').replace(/[^a-zA-Z0-9@._-]/g, '_');
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function cleanProductQuery(text) {
  return normalizeText(text)
    .replace(/[?.,!]/g, ' ')
    .replace(/\b(is|are|available|availability|do|you|have|has|stock|in|the|a|an|please|show|me|find|search|product|products)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PRODUCT_QUERY_TERMS = [
  'soap',
  'liquid',
  'liquids',
  'handwash',
  'detergent',
  'oil',
  'milk',
  'paneer',
  'butter',
  'curd',
  'cheese',
  'rice',
  'atta',
  'dal',
  'shampoo',
  'beverage',
  'juice',
  'cleaner',
  'grocery',
  'groceries',
  'junk food',
  'junk',
  'snack',
  'snacks',
  'chips',
  'biscuit',
  'biscuits',
  'noodles',
  'chocolate',
  'namkeen',
];

function singularizeTerm(term) {
  if (term.endsWith('ies') && term.length > 3) {
    return `${term.slice(0, -3)}y`;
  }
  if (term.endsWith('s') && term.length > 3) {
    return term.slice(0, -1);
  }
  return term;
}

function termMatchesProduct(term, haystack) {
  const normalizedTerm = singularizeTerm(term);
  const synonyms = {
    soap: ['soap', 'handwash', 'hand wash'],
    liquid: ['liquid', 'handwash', 'hand wash'],
    handwash: ['handwash', 'hand wash', 'soap'],
    hand: ['handwash', 'hand wash', 'hand'],
    junk: ['snack', 'snacks', 'chips', 'biscuit', 'biscuits', 'noodles', 'chocolate', 'namkeen'],
    snack: ['snack', 'snacks', 'chips', 'biscuit', 'biscuits', 'namkeen'],
  };
  const options = synonyms[normalizedTerm] || [normalizedTerm];
  return options.some((option) => haystack.includes(option));
}

function expandProductSearchQueries(searchText) {
  const queries = [searchText];
  if (searchText.includes('soap')) {
    queries.push(searchText.replace(/\bsoap\b/g, 'handwash'));
  }
  if (searchText.includes('handwash')) {
    queries.push(searchText.replace(/\bhandwash\b/g, 'soap'));
  }
  if (searchText.includes('junk')) {
    queries.push('snacks', 'chips', 'biscuits', 'noodles', 'chocolate', 'namkeen');
  }
  return Array.from(new Set(queries.filter(Boolean)));
}

function isHowToQuestion(text) {
  return hasAny(text, ['how do i', 'how can i', 'how to', 'where can i', 'where do i', 'what is the process', 'steps']);
}


export default function Chatbot({
  products = [],
  catalogStatus,
  coupons = [],
  onNavigate,
  onSearch,
  onOpenProduct,
  summerSaleOffers = [],
}) {
  const user = useAuthStore((state) => state.user);
  const loadCart = useCartStore((state) => state.loadCart);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const storageSuffix = userStorageSuffix(user);
  const chatStorageKey = storageSuffix ? `${CHAT_STORAGE_KEY}:${storageSuffix}` : '';
  const chatDetailsStorageKey = storageSuffix ? `${CHAT_DETAILS_STORAGE_KEY}:${storageSuffix}` : '';
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(defaultChatMessages);
  const [isThinking, setIsThinking] = useState(false);
  const [templateStatus, setTemplateStatus] = useState({ loading: false, error: '' });
  const [expandedDetails, setExpandedDetails] = useState({});
  const scrollRef = useRef(null);
  const messageCountRef = useRef(messages.length);

  useEffect(() => {
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
    window.localStorage.removeItem(CHAT_DETAILS_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const scopedMessages = savedChatMessages(chatStorageKey);
    setMessages(scopedMessages);
    setExpandedDetails(savedExpandedDetails(chatDetailsStorageKey));
    messageCountRef.current = scopedMessages.length;
  }, [chatDetailsStorageKey, chatStorageKey]);

  useEffect(() => {
    if (chatStorageKey) {
      window.localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    }
  }, [chatStorageKey, messages]);

  useEffect(() => {
    if (chatDetailsStorageKey) {
      window.localStorage.setItem(chatDetailsStorageKey, JSON.stringify(expandedDetails));
    }
  }, [chatDetailsStorageKey, expandedDetails]);

  useEffect(() => {
    const hasNewMessages = messages.length !== messageCountRef.current;
    messageCountRef.current = messages.length;

    if (!isOpen || (!hasNewMessages && !isThinking)) {
      return;
    }

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isOpen, isThinking]);

  useEffect(() => {
    if (isOpen && user) {
      loadOrders();
      loadCart();
    }
  }, [isOpen, loadCart, loadOrders, user]);

  const addBotResponse = (message) => {
    setMessages((currentMessages) => [...currentMessages, message]);
  };

  const clearChatHistory = () => {
    const clearedMessage = makeBotMessage('Chat history cleared. How can I help you now?');
    if (chatStorageKey) {
      window.localStorage.removeItem(chatStorageKey);
    }
    if (chatDetailsStorageKey) {
      window.localStorage.removeItem(chatDetailsStorageKey);
    }
    setExpandedDetails({});
    setMessages([clearedMessage]);
  };

  const requireLogin = () => {
    if (user) {
      return false;
    }

    addBotResponse(
      makeBotMessage('Please login first so I can access your cart, orders, and monthly grocery template.', [
        { label: 'Login', value: 'login' },
      ])
    );
    return true;
  };

  const loadTemplate = async () => {
    setTemplateStatus({ loading: true, error: '' });
    try {
      const template = await fetchMonthlyGroceryTemplate(currentMonthKey());
      setTemplateStatus({ loading: false, error: '' });
      return template || { items: [] };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        'I could not load your monthly template. Please check the backend connection.';
      setTemplateStatus({ loading: false, error: message });
      throw new Error(message);
    }
  };

  const showTemplate = async () => {
    if (requireLogin()) {
      return;
    }

    try {
      const template = await loadTemplate();
      const items = template.items || [];
      const requiredItems = items.filter((item) => item.is_required);
      const preview = requiredItems
        .slice(0, 4)
        .map((item) => `${item.product_name} x ${item.qty || 1}`)
        .join(', ');
      const estimate = templateEstimate(items);
      addBotResponse(
        makeBotMessage(
          requiredItems.length
            ? `${monthLabel(currentMonthKey())} template has ${requiredItems.length} selected items worth about ${formatCurrency(estimate)}. ${preview}${requiredItems.length > 4 ? '...' : ''}`
            : `Your ${monthLabel(currentMonthKey())} template is empty. Add grocery master items to build your monthly basket.`,
          [
            { label: 'Open template', value: 'open recurring template' },
            ...(requiredItems.length ? [{ label: 'Add template to cart', value: 'add template to cart' }] : []),
          ]
        )
      );
    } catch (error) {
      addBotResponse(makeBotMessage(error.message));
    }
  };

  const addTemplateToCart = async () => {
    if (requireLogin()) {
      return;
    }

    try {
      const template = await loadTemplate();
      const selectedItems = (template.items || []).filter((item) => item.is_required);
      if (selectedItems.length === 0) {
        addBotResponse(
          makeBotMessage('Your monthly template does not have selected items yet.', [
            { label: 'Open template', value: 'open recurring template' },
          ])
        );
        return;
      }

      for (const item of selectedItems) {
        const productId = item.product?.id || item.product_id;
        if (productId) {
          await addCartItem(productId, Math.max(1, Math.round(Number(item.qty || 1))));
        }
      }
      await loadCart();
      addBotResponse(
        makeBotMessage(`${selectedItems.length} recurring template items were added to your cart.`, [
          { label: 'View cart', value: 'open cart' },
          { label: 'Checkout', value: 'checkout' },
        ])
      );
    } catch (error) {
      addBotResponse(makeBotMessage(error.message || 'I could not add template items to the cart.'));
    }
  };

  const searchProducts = async (query) => {
    const searchText = query.replace(/^search\s+/i, '').replace(/^find\s+/i, '').trim();
    if (!searchText) {
      addBotResponse(makeBotMessage('Tell me what you want to search for, like "search rice" or "find shampoo".'));
      return;
    }

    await showProductAvailability(searchText);
  };

  const productSearchMatches = (query) => {
    const searchText = cleanProductQuery(query);
    if (!searchText) {
      return [];
    }

    const terms = searchText.split(' ').filter(Boolean);
    return products
      .filter((product) => {
        const haystack = normalizeText(`${product.name} ${product.brand} ${product.category} ${product.subcategory} ${product.description}`);
        return terms.every((term) => termMatchesProduct(term, haystack)) || haystack.includes(searchText);
      })
      .slice(0, 8);
  };

  const showProductAvailability = async (query) => {
    const searchText = cleanProductQuery(query);
    let matches = productSearchMatches(query);

    if (searchText) {
      onSearch?.(searchText);
      onNavigate?.('home');
    }

    try {
      const searchQueries = expandProductSearchQueries(searchText).filter(Boolean);
      const responses = await Promise.all(
        searchQueries.map((search) => fetchProducts({ search, page_size: 48 }))
      );
      const apiMatches = responses.flatMap((response) => response.items || []);
      const dedupedProducts = new Map();

      apiMatches.forEach((product) => {
        dedupedProducts.set(String(product.id), product);
      });

      matches.forEach((product) => {
        const haystack = normalizeText(`${product.name} ${product.brand} ${product.category} ${product.subcategory} ${product.description}`);
        const terms = searchText.split(' ').filter(Boolean);
        if (terms.every((term) => termMatchesProduct(term, haystack)) || haystack.includes(searchText)) {
          dedupedProducts.set(String(product.id), product);
        }
      });
      matches = Array.from(dedupedProducts.values()).slice(0, 8);
    } catch {
      matches = matches.slice(0, 8);
    }

    if (matches.length === 0) {
      addBotResponse(
        makeBotMessage(`No matching products found for "${searchText || query}".`, [])
      );
      return;
    }

    addBotResponse(
      makeBotMessage(`Available products for "${searchText}":`, [], {
        products: matches.map((product) => ({
          product,
          offer: product.summerSaleOffer || {},
          offerText: `${formatCurrency(product.summerSaleOffer?.offer_price || product.price)}${Number(product.inventory || 0) > 0 ? ' | In stock' : ' | Stock limited'}`,
          actions: ['details', 'view'],
        })),
      })
    );
  };

  const showCart = async () => {
    if (requireLogin()) {
      return;
    }

    await loadCart();
    const currentCartState = useCartStore.getState();
    const currentCartCount = currentCartState.cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
    const currentCartTotal = currentCartState.total;

    addBotResponse(
      makeBotMessage(
        currentCartCount > 0
          ? `Your cart has ${currentCartCount} item${currentCartCount === 1 ? '' : 's'} worth ${formatCurrency(currentCartTotal)}.`
          : 'Your cart is empty right now.',
        [
          { label: 'Open cart', value: 'open cart' },
          ...(currentCartCount > 0 ? [{ label: 'Checkout', value: 'checkout' }] : []),
        ]
      )
    );
  };

  const showOrders = async () => {
    if (requireLogin()) {
      return;
    }

    await loadOrders();
    const currentOrders = useOrderStore.getState().orders;
    const currentLatestOrder = currentOrders[0];
    addBotResponse(
      makeBotMessage(
        currentLatestOrder
          ? `Latest order ${currentLatestOrder.order_number || currentLatestOrder.id} is ${String(currentLatestOrder.status || 'placed').replaceAll('_', ' ')}.`
          : 'I do not see any orders yet.',
        [
          { label: 'Open orders', value: 'open orders' },
          { label: 'Need help', value: 'help' },
        ]
      )
    );
  };

  const showCancelOrderHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To cancel an order: open Orders, select the order you want to cancel, choose Cancel Order, pick a reason, and submit. Cancellation is usually available while the order is still placed. If it is packed, shipped, or delivered, use Help & Support for return, refund, or delivery assistance.',
        [
          { label: 'Open orders', value: 'open orders' },
          { label: 'Help & Support', value: 'help' },
        ]
      )
    );
  };

  const showOrderGroceryHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To order grocery items: search or browse a grocery category, open a product if you want to check details, tap Add to Cart, review quantities in Cart, continue to Checkout, choose address and delivery slot, select payment method, and place the order.',
        [
          { label: 'Browse groceries', value: 'search grocery' },
          { label: 'Open cart', value: 'open cart' },
        ]
      )
    );
  };

  const showPhoneNumberHelp = () => {
    addBotResponse(
      makeBotMessage(
        'You can change your phone number by going to My Profile, choosing Edit Profile, updating the Phone Number field, and saving the changes.',
        [
          { label: 'Open Profile', value: 'open profile' },
        ]
      )
    );
  };

  const showEmailChangeHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To change your email ID, go to My Profile, open Account Settings, choose Edit Email ID, enter the new email address, and save the changes.',
        [
          { label: 'Open Profile', value: 'open profile' },
        ]
      )
    );
  };

  const showAddressHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To change or add a delivery address, go to My Profile, open Manage Address, enter the address details, and save it. You can select the saved address during checkout.',
        [
          { label: 'Open Profile', value: 'open profile' },
        ]
      )
    );
  };

  const showPaymentHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To manage payment methods, go to My Profile, open Saved UPI & Saved Cards, add your UPI ID or card details, and save. During checkout, choose your preferred payment method.',
        [
          { label: 'Open Profile', value: 'open profile' },
          { label: 'Checkout', value: 'checkout' },
        ]
      )
    );
  };

  const showDeliveryHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To check delivery availability, open a product page and enter your pincode in the Delivery estimate section. During checkout, select your saved address and preferred delivery slot.',
        [
          { label: 'Browse products', value: 'search grocery' },
          { label: 'Checkout', value: 'checkout' },
        ]
      )
    );
  };

  const showReturnHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To return an item, open Orders, select a delivered order, choose Return, pick the item and reason, then submit the request. Return eligibility depends on the product policy and order status.',
        [
          { label: 'Open orders', value: 'open orders' },
          { label: 'Help & Support', value: 'help' },
        ]
      )
    );
  };

  const showRefundHelp = () => {
    addBotResponse(
      makeBotMessage(
        'Refunds are processed after cancellation or approved return. Online-payment refunds show on the cancelled/returned order, while COD-related refunds can be handled through Pay Balance or support depending on the case.',
        [
          { label: 'Open orders', value: 'open orders' },
          { label: 'Help & Support', value: 'help' },
        ]
      )
    );
  };

  const showReviewHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To rate or review a product, open Orders, find a delivered order, and use the Rate button next to the product. Your reviews are also visible in My Profile under My Reviews & Ratings.',
        [
          { label: 'Open orders', value: 'open orders' },
          { label: 'Open Profile', value: 'open profile' },
        ]
      )
    );
  };

  const showCouponHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To use a coupon, open Coupons to see available offers, then apply an eligible coupon during checkout before placing the order.',
        [
          { label: 'Open coupons', value: 'open coupons' },
          { label: 'Checkout', value: 'checkout' },
        ]
      )
    );
  };

  const showCouponCount = () => {
    const activeCoupons = coupons.filter((coupon) => coupon.is_active !== false);
    addBotResponse(
      makeBotMessage(
        activeCoupons.length
          ? `There ${activeCoupons.length === 1 ? 'is' : 'are'} ${activeCoupons.length} available coupon${activeCoupons.length === 1 ? '' : 's'} right now.`
          : 'There are no available coupons right now.'
      )
    );
  };

  const showLoginHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To login or create an account, tap Login, enter your email and password, and complete the verification flow if prompted. After login you can access cart, orders, profile, coupons, and recurring templates.',
        [
          { label: 'Login', value: 'login' },
        ]
      )
    );
  };

  const showWishlistHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To add an item to your wishlist, login first, then tap the heart icon on a product card or product page. You can open saved items from the profile menu under Wishlist.',
        [
          { label: 'Open wishlist', value: 'open wishlist' },
        ]
      )
    );
  };

  const showCustomerCareHelp = () => {
    addBotResponse(
      makeBotMessage(
        'You can contact customer care from Help & Support in the app. You can also use WhatsApp 70003 70003, call 1800 890 1222 between 8:00 AM and 8:00 PM, or email cs@jiobasket.example.',
        [
          { label: 'Help & Support', value: 'help' },
        ]
      )
    );
  };

  const showGenericOrderingHelp = () => {
    addBotResponse(
      makeBotMessage(
        'To place an order, browse or search products, add items to Cart, review quantities, continue to Checkout, choose address, delivery slot, and payment method, then place the order.',
        [
          { label: 'Browse products', value: 'search grocery' },
          { label: 'Open cart', value: 'open cart' },
        ]
      )
    );
  };

  const activeSummerOffers = () => {
    const productOfferMap = new Map();
    const productNameKeys = new Set();

    products
      .filter((product) => product.summerSaleOffer)
      .forEach((product) => {
        const nameKey = normalizeText(product.name);
        if (productNameKeys.has(nameKey)) {
          return;
        }
        productNameKeys.add(nameKey);
        productOfferMap.set(String(product.id), {
          ...product.summerSaleOffer,
          product,
        });
      });

    summerSaleOffers
      .filter((offer) => offer.is_active !== false)
      .forEach((offer) => {
        const product = offer.product || products.find((item) => String(item.id) === String(offer.product_id));
        const nameKey = normalizeText(product?.name);
        const key = String(product?.id || offer.product_id || offer.id);
        if (nameKey && productNameKeys.has(nameKey) && !productOfferMap.has(key)) {
          return;
        }
        if (nameKey) {
          productNameKeys.add(nameKey);
        }
        productOfferMap.set(key, {
          ...productOfferMap.get(key),
          ...offer,
          product,
        });
      });

    return Array.from(productOfferMap.values()).filter((offer) => offer.is_active !== false && offer.product);
  };

  const offerText = (offer) => {
    const discountText = offer.offer_price
      ? `${formatCurrency(offer.offer_price)} offer price`
      : `${Number(offer.discount_percent || 0)}% off`;
    const limitText = offer.max_quantity_per_user ? `, max ${offer.max_quantity_per_user} per user` : '';
    return `${discountText}${limitText}`;
  };

  const makeSummerOfferMessage = (offers) => {
    const preview = offers
      .slice(0, 3)
      .map((offer) => `${offer.product.name} - ${offerText(offer)}`)
      .join('; ');

    return makeBotMessage(`Great Summer Sale has ${offers.length} active offer product${offers.length === 1 ? '' : 's'}. ${preview}`, [], {
      products: offers.slice(0, 8).map((offer) => ({
        offer,
        product: offer.product,
        offerText: offerText(offer),
      })),
    });
  };

  const showSummerOfferSummary = () => {
    const offers = activeSummerOffers();
    if (offers.length === 0) {
      addBotResponse(
        makeBotMessage('There are no active summer offers loaded right now. Please check again after the catalog refreshes.', [
          { label: 'Search offers', value: 'search offers' },
          { label: 'Coupons', value: 'coupons' },
        ])
      );
      return;
    }

    addBotResponse(
      makeSummerOfferMessage(offers)
    );
  };

  const showSummerOfferProducts = () => {
    const offers = activeSummerOffers();
    if (offers.length === 0) {
      addBotResponse(makeBotMessage('I could not find active summer-offer products in the current catalog.'));
      return;
    }

    addBotResponse(
      makeSummerOfferMessage(offers)
    );
  };

  const showOffers = () => {
    const activeCoupons = coupons.filter((coupon) => coupon.is_active !== false);
    addBotResponse(
      makeBotMessage(
        activeCoupons.length
          ? `There are ${activeCoupons.length} coupon${activeCoupons.length === 1 ? '' : 's'} available. Best one here: ${activeCoupons[0].code || activeCoupons[0].title}.`
          : 'I do not see active coupons loaded right now.',
        [
          { label: 'Open coupons', value: 'open coupons' },
          { label: 'Search offers', value: 'search offers' },
        ]
      )
    );
  };

  const handleAction = async (value) => {
    const action = normalizeText(value);

    if (action.startsWith('add-product:')) {
      if (requireLogin()) {
        return;
      }
      const productId = value.split(':')[1];
      const product = products.find((item) => String(item.id) === String(productId));
      if (product) {
        await useCartStore.getState().addToCart(product);
        addBotResponse(makeBotMessage(`${product.name} was added to your cart.`, [
          { label: 'View cart', value: 'open cart' },
        ]));
      }
      return;
    }

    if (action.startsWith('open-product:')) {
      const productId = value.split(':')[1];
      const product = products.find((item) => String(item.id) === String(productId));
      if (product) {
        onOpenProduct?.(product);
      }
      return;
    }

    if (action === 'login') {
      onNavigate?.('auth');
      return;
    }

    if (['open cart', 'cart'].includes(action)) {
      onNavigate?.('cart');
      return;
    }

    if (['checkout', 'open checkout'].includes(action)) {
      onNavigate?.('checkout');
      return;
    }

    if (['open orders', 'orders'].includes(action)) {
      onNavigate?.('orders');
      return;
    }

    if (['help', 'support'].includes(action)) {
      onNavigate?.('help');
      return;
    }

    if (['open coupons', 'coupons'].includes(action)) {
      onNavigate?.('coupons');
      return;
    }

    if (['open profile', 'profile'].includes(action)) {
      onNavigate?.('profile');
      return;
    }

    if (['open wishlist', 'wishlist'].includes(action)) {
      onNavigate?.('wishlist');
      return;
    }

    if (['open recurring template', 'template'].includes(action)) {
      onNavigate?.('recurring-template');
      return;
    }

    await handleUserRequest(value, false);
  };

  const addProductResultToCart = async (product) => {
    if (requireLogin()) {
      return;
    }

    await useCartStore.getState().addToCart(product);
    const cartError = useCartStore.getState().error;
    addBotResponse(
      makeBotMessage(
        cartError || `${product.name} was added to your cart.`,
        cartError ? [{ label: 'Login', value: 'login' }] : [{ label: 'View cart', value: 'open cart' }]
      )
    );
  };

  const handleUserRequest = async (rawText, shouldEcho = true) => {
    const text = rawText.trim();
    if (!text || isThinking) {
      return;
    }

    if (shouldEcho) {
      setMessages((currentMessages) => [...currentMessages, makeUserMessage(text)]);
    }
    setInput('');
    setIsThinking(true);

    try {
      const lowerText = normalizeText(text);
      const howToQuestion = isHowToQuestion(lowerText);
      const asksCancelOrder =
        lowerText.includes('cancel') &&
        (lowerText.includes('order') || lowerText.includes('purchase'));
      const asksHowToOrder =
        howToQuestion &&
        lowerText.includes('order') &&
        hasAny(lowerText, ['grocery', 'groceries', 'item', 'items', 'product', 'products']);
      const asksGenericOrderProcedure =
        howToQuestion &&
        lowerText.includes('order') &&
        !hasAny(lowerText, ['track', 'status', 'cancel', 'return', 'refund']);
      const asksPhoneNumberChange =
        (lowerText.includes('phone') || lowerText.includes('mobile') || lowerText.includes('number')) &&
        (lowerText.includes('change') || lowerText.includes('update') || lowerText.includes('edit'));
      const asksEmailChange =
        (lowerText.includes('email') || lowerText.includes('email id') || lowerText.includes('mail id')) &&
        (lowerText.includes('change') || lowerText.includes('update') || lowerText.includes('edit'));
      const asksProfileChange =
        hasAny(lowerText, ['profile', 'name', 'personal information', 'account details']) &&
        hasAny(lowerText, ['change', 'update', 'edit', 'manage']);
      const asksSummerOffer =
        hasAny(lowerText, ['summer', 'great summer sale', 'summer sale']) &&
        (lowerText.includes('offer') || lowerText.includes('sale') || lowerText.includes('discount'));
      const asksSummerProducts =
        asksSummerOffer &&
        (lowerText.includes('which') ||
          lowerText.includes('product') ||
          lowerText.includes('item') ||
          lowerText.includes('list') ||
          lowerText.includes('in the summer'));
      const asksCouponCount =
        lowerText.includes('coupon') &&
        hasAny(lowerText, ['how many', 'available', 'unused', 'left', 'count', 'number']);
      const asksProductAvailability =
        hasAny(lowerText, ['available', 'availability', 'do you have', 'in stock', 'stock']);
      const cleanedProductQuery = cleanProductQuery(lowerText);
      const asksExplicitProductSearch =
        lowerText.startsWith('search ') ||
        lowerText.startsWith('find ') ||
        hasAny(lowerText, ['product', 'products', 'item', 'items']);
      const asksShortProductSearch =
        cleanedProductQuery &&
        cleanedProductQuery.split(' ').length <= 4 &&
        !howToQuestion &&
        !hasAny(lowerText, [
          'hello',
          'thanks',
          'thank you',
          'cart',
          'checkout',
          'order',
          'track',
          'coupon',
          'offer',
          'discount',
          'help',
          'support',
          'profile',
          'wishlist',
          'template',
          'monthly',
          'recurring',
          'payment',
          'address',
          'delivery',
          'account',
          'login',
          'signup',
          'register',
          'create',
        ]);
      const asksProductBrowse =
        (hasAny(lowerText, PRODUCT_QUERY_TERMS) || asksExplicitProductSearch || asksShortProductSearch) &&
        !asksSummerOffer &&
        !asksCancelOrder &&
        !asksHowToOrder &&
        !asksPhoneNumberChange &&
        !asksEmailChange &&
        !asksProfileChange;
      const asksAddress =
        hasAny(lowerText, ['address', 'delivery location', 'shipping location']) &&
        hasAny(lowerText, ['change', 'update', 'edit', 'add', 'manage', 'how', 'where']);
      const asksPayment =
        hasAny(lowerText, ['payment', 'upi', 'card', 'cod', 'cash on delivery', 'pay']) &&
        hasAny(lowerText, ['add', 'save', 'change', 'update', 'method', 'how', 'where']);
      const asksDelivery =
        hasAny(lowerText, ['delivery', 'pincode', 'slot', 'shipping']) &&
        hasAny(lowerText, ['check', 'available', 'availability', 'estimate', 'slot', 'how', 'where']);
      const asksReturn =
        lowerText.includes('return') &&
        (lowerText.includes('order') || lowerText.includes('item') || lowerText.includes('product') || howToQuestion);
      const asksRefund =
        lowerText.includes('refund') || lowerText.includes('money back') || lowerText.includes('amount received');
      const asksReview =
        hasAny(lowerText, ['review', 'rating', 'rate']) &&
        (lowerText.includes('product') || lowerText.includes('order') || howToQuestion);
      const asksLogin =
        hasAny(lowerText, ['login', 'sign in', 'signup', 'sign up', 'register', 'account create']);
      const asksWishlist =
        lowerText.includes('wishlist') || (lowerText.includes('heart') && lowerText.includes('product'));
      const asksCustomerCare =
        hasAny(lowerText, ['customer care', 'customer support', 'contact support', 'contact customer', 'support number', 'helpline', 'contact us']) ||
        (lowerText.includes('contact') && hasAny(lowerText, ['care', 'support', 'help']));
      const asksClearChat =
        hasAny(lowerText, ['clear chat', 'clear the chat', 'clear chat history', 'delete chat', 'reset chat']);
      const matchedHelpFaq = findHelpFaqAnswer(lowerText);

      if (asksClearChat) {
        clearChatHistory();
      } else if (asksSummerProducts) {
        showSummerOfferProducts();
      } else if (asksSummerOffer) {
        showSummerOfferSummary();
      } else if (asksCouponCount) {
        showCouponCount();
      } else if (asksCancelOrder) {
        showCancelOrderHelp();
      } else if (asksPhoneNumberChange) {
        showPhoneNumberHelp();
      } else if (asksEmailChange) {
        showEmailChangeHelp();
      } else if (matchedHelpFaq && (howToQuestion || hasAny(lowerText, ['faq', 'help', 'support', 'payment', 'shipping', 'return', 'refund', 'gift card', 'wallet', 'loyalty', 'gst', 'cancel', 'account', 'login', 'signup', 'register']))) {
        addBotResponse(makeBotMessage(`${matchedHelpFaq.question}\n\n${matchedHelpFaq.answer}`));
      } else if (asksProfileChange) {
        addBotResponse(
          makeBotMessage(
            'To update your profile details, go to My Profile, use Edit beside the field you want to change, enter the new value, and save it.',
            [
              { label: 'Open Profile', value: 'open profile' },
            ]
          )
        );
      } else if (asksHowToOrder) {
        showOrderGroceryHelp();
      } else if (asksGenericOrderProcedure) {
        showGenericOrderingHelp();
      } else if (asksAddress) {
        showAddressHelp();
      } else if (asksPayment) {
        showPaymentHelp();
      } else if (asksDelivery) {
        showDeliveryHelp();
      } else if (asksReturn) {
        showReturnHelp();
      } else if (asksRefund) {
        showRefundHelp();
      } else if (asksReview) {
        showReviewHelp();
      } else if (asksLogin) {
        showLoginHelp();
      } else if (asksWishlist) {
        showWishlistHelp();
      } else if (asksCustomerCare) {
        showCustomerCareHelp();
      } else if (lowerText.includes('template') || lowerText.includes('monthly') || lowerText.includes('recurring')) {
        if (lowerText.includes('add') || lowerText.includes('cart')) {
          await addTemplateToCart();
        } else {
          await showTemplate();
        }
      } else if (lowerText.startsWith('search ') || lowerText.startsWith('find ')) {
        await searchProducts(text);
      } else if (asksProductAvailability || asksProductBrowse) {
        await showProductAvailability(text);
      } else if (lowerText.includes('cart')) {
        await showCart();
      } else if (lowerText.includes('order') || lowerText.includes('track')) {
        await showOrders();
      } else if (lowerText.includes('coupon') || lowerText.includes('offer') || lowerText.includes('discount')) {
        if (asksSummerOffer) {
          showSummerOfferSummary();
        } else if (lowerText.includes('coupon')) {
          showCouponHelp();
        } else {
          showOffers();
        }
      } else if (lowerText.includes('help') || lowerText.includes('support') || lowerText.includes('return')) {
        addBotResponse(
          makeBotMessage('I can take you to Help & Support where your order context can be attached to a ticket.', [
            { label: 'Open help', value: 'help' },
            { label: 'Track order', value: 'track my order' },
          ])
        );
      } else {
        addBotResponse(
          makeBotMessage('Oops! I am having a bit of trouble fetching that right now. Please try again later.')
        );
      }
    } finally {
      setIsThinking(false);
    }
  };

  const submitMessage = (event) => {
    event.preventDefault();
    handleUserRequest(input);
  };

  const toggleProductDetails = (messageId, productId) => {
    const key = `${messageId}-${productId}`;
    setExpandedDetails((currentDetails) => ({
      ...currentDetails,
      [key]: !currentDetails[key],
    }));
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className="mb-3 flex h-[min(680px,calc(100vh-120px))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-500">
                <Bot size={22} />
              </span>
              <div>
                <h2 className="text-sm font-black">JioBasket Assistant</h2>
                <p className="text-xs font-semibold text-emerald-100">Products, orders, support</p>
              </div>
            </div>
            <button
              aria-label="Close chatbot"
              className="grid h-9 w-9 place-items-center rounded-md text-slate-200 hover:bg-white/10"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X size={19} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4" ref={scrollRef}>
            {messages.map((message) => (
              <div
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                key={message.id}
              >
                <div
                  className={`max-w-[86%] rounded-lg px-3 py-2 text-sm font-semibold leading-6 ${
                    message.sender === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p>{message.text}</p>
                  {message.actions?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        <button
                          className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                          key={`${message.id}-${action.value}`}
                          onClick={() => handleAction(action.value)}
                          type="button"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.products?.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {message.products.map(({ product, offer, offerText: productOfferText, actions: productActions = ['details', 'view'] }) => {
                        const detailsKey = `${message.id}-${product.id}`;
                        const isExpanded = Boolean(expandedDetails[detailsKey]);
                        const displayPrice = offer.offer_price || (
                          offer.discount_percent
                            ? Number(product.price) * (1 - Number(offer.discount_percent) / 100)
                            : product.price
                        );

                        return (
                          <div className="rounded-md border border-slate-200 bg-white p-2.5" key={product.id}>
                            <div className="flex gap-2.5">
                              <img
                                alt={product.name}
                                className="h-16 w-16 shrink-0 rounded-md object-cover"
                                src={productImageUrl(product)}
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">
                                  {product.name}
                                </h3>
                                <p className="mt-1 text-xs font-bold text-orange-700">{productOfferText}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{product.brand}</p>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs font-semibold leading-5 text-slate-600">
                                <p><span className="font-black text-slate-800">Category:</span> {product.category}</p>
                                <p><span className="font-black text-slate-800">Offer price:</span> {formatCurrency(displayPrice)}</p>
                                <p><span className="font-black text-slate-800">MRP:</span> {formatCurrency(product.mrp || product.price)}</p>
                                {offer.rule_description && (
                                  <p><span className="font-black text-slate-800">Offer:</span> {offer.rule_description}</p>
                                )}
                              </div>
                            )}

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {productActions.includes('details') && (
                                <button
                                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-sky-50 px-2 text-xs font-black text-sky-700 hover:bg-sky-100"
                                  onClick={() => toggleProductDetails(message.id, product.id)}
                                  type="button"
                                >
                                  <Info size={14} />
                                  Show Details
                                </button>
                              )}
                              {productActions.includes('view') && (
                                <button
                                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-sky-50 px-2 text-xs font-black text-sky-700 hover:bg-sky-100"
                                  onClick={() => onOpenProduct?.(product)}
                                  type="button"
                                >
                                  <ExternalLink size={14} />
                                  View
                                </button>
                              )}
                              {productActions.includes('add') && (
                                <button
                                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-emerald-50 px-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                                  onClick={() => addProductResultToCart(product)}
                                  type="button"
                                >
                                  <ShoppingCart size={14} />
                                  Add to Cart
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-500">
                  <Sparkles size={16} className="text-emerald-600" />
                  Checking...
                </div>
              </div>
            )}
            {templateStatus.error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{templateStatus.error}</p>
            )}
            {catalogStatus?.error && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                Catalog API note: {catalogStatus.error}
              </p>
            )}
          </div>

          <form className="border-t border-slate-200 bg-white p-3" onSubmit={submitMessage}>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-emerald-500">
              <Search size={17} className="text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about products, cart, orders..."
                value={input}
              />
              <button
                aria-label="Send message"
                className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300"
                disabled={!input.trim() || isThinking}
                type="submit"
              >
                <Send size={17} />
              </button>
            </label>
          </form>
        </div>
      )}

      <button
        className="ml-auto flex h-14 items-center gap-3 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-xl hover:bg-slate-800"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        {isOpen ? <ChevronDown size={20} /> : <MessageCircle size={20} />}
        <span className="hidden sm:inline">Assistant</span>
      </button>
    </div>
  );
}

