import React from 'react';
import { Heart, Plus, Star } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../utils/formatCurrency';
import { productImageUrl } from '../utils/imageUrl';
import { getProductRatingFromData, useProfileStore } from '../store/profileStore';
import { useAuthStore } from '../store/authStore';

export default function ProductCard({ product, onOpen }) {
  const addToCart = useCartStore((state) => state.addToCart);
  const loading = useCartStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const profileData = useProfileStore((state) => state.data);
  const addToWishlist = useProfileStore((state) => state.addToWishlist);
  const removeFromWishlist = useProfileStore((state) => state.removeFromWishlist);
  const discountPercent = Number(product.discount_percent || 0);
  const saleOffer = product.summerSaleOffer;
  const saleDiscountPrice = saleOffer?.discount_percent
    ? Number(product.price) * (1 - Number(saleOffer.discount_percent) / 100)
    : null;
  const displayPrice = saleOffer?.offer_price || saleDiscountPrice || product.price;
  const dynamicRating = getProductRatingFromData(profileData, product);
  const isWishlisted = useProfileStore((state) => (user ? state.isWishlisted(user, product.id) : false));

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button className="relative text-left" onClick={() => onOpen(product)} type="button">
        {saleOffer ? (
          <span className="absolute left-3 top-3 rounded-md bg-orange-600 px-2.5 py-1 text-xs font-black text-white shadow-sm">
            SUMMER SALE
          </span>
        ) : discountPercent > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-black text-white shadow-sm">
            {discountPercent}% OFF
          </span>
        )}
        <img alt={product.name} className="h-44 w-full object-cover" src={productImageUrl(product)} />
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700">
              {product.category}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
              <Star size={14} fill="currentColor" /> {dynamicRating}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <button
              className="line-clamp-2 flex-1 text-left text-base font-bold leading-5 text-slate-950 hover:text-emerald-700"
              onClick={() => onOpen(product)}
              type="button"
            >
              {product.name}
            </button>
            <button
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${
                isWishlisted
                  ? 'border-rose-100 bg-rose-50 text-rose-600'
                  : 'border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
              }`}
              onClick={() => {
                if (!user) {
                  return;
                }
                if (isWishlisted) {
                  removeFromWishlist(user, product.id);
                } else {
                  addToWishlist(user, product);
                }
              }}
              title={user ? (isWishlisted ? 'Remove from wishlist' : 'Add to wishlist') : 'Login to add wishlist'}
              type="button"
            >
              <Heart size={17} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500">{product.brand}</p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">{formatCurrency(displayPrice)}</div>
            <div className="text-xs font-semibold text-slate-400 line-through">{formatCurrency(product.mrp || product.price)}</div>
            {saleOffer?.rule_description && (
              <div className="mt-1 text-xs font-black text-orange-700">{saleOffer.rule_description}</div>
            )}
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700"
            disabled={loading}
            onClick={() => addToCart(product)}
            type="button"
          >
            <Plus size={16} />
            {loading ? 'Adding' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}
