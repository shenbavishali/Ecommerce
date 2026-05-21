import { create } from 'zustand';
import { addCartItem, deleteCartItem, fetchCart, updateCartItem } from '../services/api';

function normalizeCart(apiCart) {
  const items = apiCart?.items || [];
  return {
    cart: items.map((item) => ({
      ...item.product,
      price: item.unit_price || item.product.price,
      originalPrice: item.product.price,
      selectedOption: item.selected_option,
      selectedPrice: item.selected_price,
      summerSaleOffer: item.offer,
      cartItemId: item.id,
      quantity: item.quantity,
      lineTotal: item.line_total,
    })),
    subtotal: apiCart?.subtotal || 0,
    deliveryFee: apiCart?.delivery_fee || 0,
    total: apiCart?.total || 0,
  };
}

export const useCartStore = create((set, get) => ({
  cart: [],
  subtotal: 0,
  deliveryFee: 0,
  total: 0,
  loading: false,
  error: '',
  success: '',
  loadCart: async () => {
    if (!window.localStorage.getItem('token')) {
      set({ cart: [], subtotal: 0, deliveryFee: 0, total: 0, loading: false, error: '' });
      return;
    }

    set({ loading: true, error: '' });
    try {
      const cart = await fetchCart();
      set({ ...normalizeCart(cart), loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.response?.data?.detail || 'Cart requires login and backend access',
      });
    }
  },
  addToCart: async (item) => {
    if (!window.localStorage.getItem('token')) {
      set({ cart: [], subtotal: 0, deliveryFee: 0, total: 0, loading: false, error: 'Login required to add items' });
      return;
    }

    set({ loading: true, error: '', success: '' });
    try {
      await addCartItem(item.id, 1, item.selectedOption ? { label: item.selectedOption, price: item.price } : null);
      await get().loadCart();
      set({ loading: false, success: 'Cart updated' });
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.response?.data?.detail || 'Login required to add items',
      });
    }
  },
  removeFromCart: async (id) => {
    set({ loading: true, error: '', success: '' });
    try {
      await deleteCartItem(id);
      await get().loadCart();
      set({ loading: false, success: 'Cart updated' });
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || 'Could not remove item' });
    }
  },
  updateQuantity: async (id, quantity) => {
    set({ loading: true, error: '', success: '' });
    try {
      if (quantity < 1) {
        await deleteCartItem(id);
      } else {
        await updateCartItem(id, quantity);
      }
      await get().loadCart();
      set({ loading: false, success: 'Cart updated' });
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || 'Could not update cart' });
    }
  },
  clearCart: () => set({ cart: [], subtotal: 0, deliveryFee: 0, total: 0, error: '', success: '' }),
  totalItems: () => get().cart.reduce((total, item) => total + item.quantity, 0),
  totalAmount: () => get().subtotal,
}));
