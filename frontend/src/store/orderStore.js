import { create } from 'zustand';
import { cancelOrder, createOrder, fetchOrders } from '../services/api';

export const useOrderStore = create((set) => ({
  orders: [],
  loading: false,
  error: '',
  success: '',
  loadOrders: async () => {
    if (!window.localStorage.getItem('token')) {
      set({ orders: [], loading: false, error: '', success: '' });
      return;
    }

    set({ loading: true, error: '' });
    try {
      const orders = await fetchOrders();
      set({ orders, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.response?.data?.detail || 'Orders require login and backend access',
      });
    }
  },
  addOrder: async (order) => {
    set({ loading: true, error: '', success: '' });
    try {
      const createdOrder = await createOrder(order);
      set((state) => ({ orders: [createdOrder, ...state.orders], loading: false, success: 'Order placed' }));
      return createdOrder;
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || error.response?.data?.detail || 'Order failed' });
      throw error;
    }
  },
  cancelOrder: async (orderId, reason) => {
    set({ loading: true, error: '', success: '' });
    try {
      const cancelledOrder = await cancelOrder(orderId, reason);
      set((state) => ({
        orders: state.orders.map((order) => (order.id === cancelledOrder.id ? { ...order, ...cancelledOrder } : order)),
        loading: false,
        success: 'Order cancelled',
      }));
      return cancelledOrder;
    } catch (error) {
      set({ loading: false, error: error.response?.data?.message || error.response?.data?.detail || 'Order cancellation failed' });
      throw error;
    }
  },
}));
