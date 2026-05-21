import React, { useEffect, useMemo, useState } from 'react';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getProfileFromData, useProfileStore } from '../store/profileStore';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../utils/formatCurrency';
import { fetchProduct } from '../services/api';
import { productImageUrl } from '../utils/imageUrl';

export default function WishlistPanel({ onOpenProduct, onShop }) {
  const user = useAuthStore((state) => state.user);
  const profileData = useProfileStore((state) => state.data);
  const profile = useMemo(() => getProfileFromData(profileData, user), [profileData, user]);
  const [liveProducts, setLiveProducts] = useState({});
  const removeFromWishlist = useProfileStore((state) => state.removeFromWishlist);
  const addToCart = useCartStore((state) => state.addToCart);
  const loading = useCartStore((state) => state.loading);
  const wishlist = useMemo(() => profile.wishlist || [], [profile.wishlist]);
  const productIds = useMemo(() => wishlist.map((product) => product.id).join(','), [wishlist]);
  const displayedWishlist = useMemo(
    () => wishlist.map((product) => ({ ...product, ...(liveProducts[String(product.id)] || {}) })),
    [liveProducts, wishlist]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadLiveProducts() {
      if (wishlist.length === 0) {
        setLiveProducts({});
        return;
      }

      const responses = await Promise.allSettled(wishlist.map((product) => fetchProduct(product.id)));
      if (!isMounted) {
        return;
      }

      setLiveProducts(
        responses.reduce((products, response) => {
          if (response.status === 'fulfilled' && response.value?.id) {
            products[String(response.value.id)] = response.value;
          }
          return products;
        }, {})
      );
    }

    loadLiveProducts();

    return () => {
      isMounted = false;
    };
  }, [productIds, wishlist]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Wishlist</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{displayedWishlist.length} saved products</p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-orange-500 px-4 text-sm font-black text-white hover:bg-orange-600"
          onClick={onShop}
          type="button"
        >
          <ShoppingBag size={18} />
          Shop to Continue
        </button>
      </div>

      {displayedWishlist.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Heart className="mx-auto text-slate-300" size={48} />
          <h2 className="mt-4 text-xl font-black">Your wishlist is empty</h2>
          <p className="mt-2 text-slate-500">Save products you like and find them here later.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedWishlist.map((product) => (
            <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" key={product.id}>
              <button className="block w-full text-left" onClick={() => onOpenProduct(product)} type="button">
                <img alt={product.name} className="h-48 w-full object-cover" src={productImageUrl(product)} />
              </button>
              <div className="p-4">
                <button
                  className="line-clamp-2 text-left text-base font-black text-slate-950 hover:text-emerald-700"
                  onClick={() => onOpenProduct(product)}
                  type="button"
                >
                  {product.name}
                </button>
                <p className="mt-1 text-sm font-semibold text-slate-500">{product.brand}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">{formatCurrency(product.price)}</p>
                    <p className="text-xs font-semibold text-slate-400 line-through">{formatCurrency(product.mrp)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="grid h-10 w-10 place-items-center rounded-md border border-rose-100 text-rose-600 hover:bg-rose-50"
                      onClick={() => removeFromWishlist(user, product.id)}
                      type="button"
                    >
                      <Trash2 size={17} />
                    </button>
                    <button
                      className="h-10 rounded-md bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
                      disabled={loading}
                      onClick={() => addToCart(product)}
                      type="button"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
