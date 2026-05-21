import React, { useEffect } from 'react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatCurrency';
import { getCartPricing } from '../utils/orderPricing';
import { productImageUrl } from '../utils/imageUrl';

export default function CartPanel({ onCheckout, onContinueShopping }) {
  const user = useAuthStore((state) => state.user);
  const cart = useCartStore((state) => state.cart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const deliveryFee = useCartStore((state) => state.deliveryFee);
  const error = useCartStore((state) => state.error);
  const loading = useCartStore((state) => state.loading);
  const loadCart = useCartStore((state) => state.loadCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const pricing = getCartPricing(cart, deliveryFee);

  useEffect(() => {
    if (user) {
      loadCart();
      return;
    }

    clearCart();
  }, [clearCart, loadCart, user]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-slate-950">Shopping cart</h1>
      {error && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {error}
        </div>
      )}
      {!user ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <ShoppingBag className="mx-auto text-slate-300" size={48} />
          <h2 className="mt-4 text-xl font-black">Login to view your cart</h2>
          <p className="mt-2 text-slate-500">Cart items are shown only after you sign in.</p>
        </div>
      ) : cart.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <ShoppingBag className="mx-auto text-slate-300" size={48} />
          <h2 className="mt-4 text-xl font-black">Your cart is empty</h2>
          <p className="mt-2 text-slate-500">Add products from the catalog to begin checkout.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {cart.map((item) => (
              <article
                className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[96px_1fr_auto]"
                key={item.id}
              >
                <img alt={item.name} className="h-24 w-24 rounded-md object-cover" src={productImageUrl(item)} />
                <div>
                  <h2 className="font-black text-slate-950">{item.name}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">{item.brand}</p>
                  {item.selectedOption && (
                    <p className="mt-1 text-xs font-black text-emerald-700">{item.selectedOption}</p>
                  )}
                  {item.summerSaleOffer && (
                    <p className="mt-2 inline-flex rounded-md bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">
                      Great Summer Sale | Max {item.summerSaleOffer.max_quantity_per_user} per user
                    </p>
                  )}
                  <p className="mt-2 text-lg font-black">{formatCurrency(item.lineTotal || item.price * item.quantity)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:justify-between">
                  <div className="inline-flex h-10 items-center rounded-md border border-slate-200">
                    <button
                      className="grid h-10 w-10 place-items-center text-slate-600 hover:bg-slate-100"
                      disabled={loading}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      type="button"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="grid h-10 min-w-10 place-items-center text-sm font-black">
                      {item.quantity}
                    </span>
                    <button
                      className="grid h-10 w-10 place-items-center text-slate-600 hover:bg-slate-100"
                      disabled={loading}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      type="button"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
                    disabled={loading}
                    onClick={() => removeFromCart(item.id)}
                    type="button"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Price details</h2>
            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Total Amount</span>
                <span>{formatCurrency(pricing.fullMrp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>{pricing.deliveryFee === 0 ? 'Free' : formatCurrency(pricing.deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (5%)</span>
                <span>{formatCurrency(pricing.tax)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>-{formatCurrency(pricing.discount)}</span>
              </div>
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                You saved {formatCurrency(pricing.discount)} on this order
              </p>
              <div className="flex justify-between">
                <span>Cash on Delivery</span>
                <span>Select at checkout</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-black text-slate-950">
                <span>Grand Total</span>
                <span>{formatCurrency(pricing.total)}</span>
              </div>
            </div>
            <button
              className="mt-5 h-11 w-full rounded-md bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
              disabled={loading}
              onClick={onCheckout}
              type="button"
            >
              Checkout
            </button>
            <button
              className="mt-3 h-11 w-full rounded-md bg-orange-500 text-sm font-black text-white hover:bg-orange-600"
              onClick={onContinueShopping}
              type="button"
            >
              Shop to Continue
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
