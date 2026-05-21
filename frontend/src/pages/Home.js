import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import Filters from '../components/Filters';
import ProductCard from '../components/ProductCard';
import { useAuthStore } from '../store/authStore';

const preferredCategories = [
  {
    name: 'Grocery',
    label: 'Grocery',
    subtitle: 'Fresh daily needs',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=85',
    color: 'bg-emerald-50',
  },
  {
    name: 'AC',
    label: 'AC',
    subtitle: 'Cooling picks',
    image: 'https://cdn.jiostore.online/v2/jmd-asp/jdprod/wrkr/products/pictures/item/free/resize-w:450/daikin/581112220/0/Y8JDoqIpKT-GaYQCwzCm-Daikin-AC-581112220-i-1.jpg',
    color: 'bg-sky-50',
  },
  {
    name: 'Laptop',
    label: 'Laptop',
    subtitle: 'Work and study',
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85',
    color: 'bg-violet-50',
  },
  {
    name: 'Electronics',
    label: 'Electronics',
    subtitle: 'Smart devices',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=700&q=85',
    color: 'bg-orange-50',
  },
  {
    name: 'Shoes',
    label: 'Shoes',
    subtitle: 'Sneakers and formals',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=85',
    color: 'bg-rose-50',
  },
  {
    name: 'Jeans',
    label: 'Jeans',
    subtitle: 'Denim fits',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=700&q=85',
    color: 'bg-blue-50',
  },
  {
    name: 'T-shirts',
    label: 'T-shirts',
    subtitle: 'Daily cotton styles',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85',
    color: 'bg-amber-50',
  },
];

const fallbackCategoryStyles = [
  ['Shoes', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=85', 'bg-rose-50'],
  ['Jeans', 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=700&q=85', 'bg-blue-50'],
  ['T-shirts', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85', 'bg-amber-50'],
  ['Footwear', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85', 'bg-rose-50'],
  ['Men', 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=700&q=85', 'bg-blue-50'],
  ['Fashion', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=85', 'bg-pink-50'],
  ['Appliances', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=700&q=85', 'bg-cyan-50'],
  ['Default', 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=700&q=85', 'bg-slate-50'],
];

function getCategoryCard(category) {
  const preferred = preferredCategories.find((item) => item.name.toLowerCase() === category.toLowerCase());
  if (preferred) {
    return preferred;
  }

  const matched = fallbackCategoryStyles.find(([keyword]) => category.toLowerCase().includes(keyword.toLowerCase()));
  const [, image, color] = matched || fallbackCategoryStyles[fallbackCategoryStyles.length - 1];
  return {
    name: category,
    label: category,
    subtitle: 'Shop category',
    image,
    color,
  };
}

export default function Home({
  products,
  summerSaleOffers = [],
  seasonalBanner,
  facets,
  filters,
  status,
  searchTerm,
  onFiltersChange,
  onSearchChange,
  onCategorySelect,
  onOpenProduct,
  onOpenCart,
  onOpenCheckout,
}) {
  const user = useAuthStore((state) => state.user);
  const [activeCategorySlide, setActiveCategorySlide] = useState(0);
  const categoryTrackRef = useRef(null);
  const bannerImage = seasonalBanner?.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80';
  const bannerImageUrl = bannerImage.startsWith('/static')
    ? `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}${bannerImage}`
    : bannerImage;
  const shouldShowSeasonalBanner = seasonalBanner?.is_active || summerSaleOffers.length > 0;
  const selectedCategory = filters.category;
  const categories = Array.from(
    new Set([...preferredCategories.map((category) => category.name), ...(facets?.categories || [])])
  );
  const categoryCards = categories.map((category) => getCategoryCard(category));
  const maxCategoryIndex = Math.max(0, categoryCards.length - 1);

  useEffect(() => {
    if (!user || categoryCards.length < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveCategorySlide((currentSlide) => (currentSlide >= maxCategoryIndex ? 0 : currentSlide + 1));
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, [categoryCards.length, maxCategoryIndex, user]);

  useEffect(() => {
    const track = categoryTrackRef.current;
    const nextCard = track?.children?.[activeCategorySlide];
    if (!track || !nextCard) {
      return;
    }

    track.scrollTo({
      left: nextCard.offsetLeft,
      behavior: 'smooth',
    });
  }, [activeCategorySlide]);

  const moveCategorySlide = (direction) => {
    setActiveCategorySlide((currentSlide) => {
      if (direction === 'previous') {
        return currentSlide === 0 ? maxCategoryIndex : currentSlide - 1;
      }

      return currentSlide >= maxCategoryIndex ? 0 : currentSlide + 1;
    });
  };

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-10">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
              <Sparkles size={16} />
              Everyday essentials delivered today
            </span>
            <h1 className="max-w-2xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Groceries, staples, and home care in one fast cart.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
              Shop a JioMart-inspired catalog with smart filters, cart quantity controls, checkout,
              and order tracking.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={onOpenCheckout}
                type="button"
              >
                <Truck className="text-emerald-600" size={19} />
                2-hour slots
              </button>
              <button
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={onOpenCheckout}
                type="button"
              >
                <ShieldCheck className="text-emerald-600" size={19} />
                Mock payment
              </button>
              <button
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={onOpenCart}
                type="button"
              >
                <ChevronRight className="text-emerald-600" size={19} />
                Live cart
              </button>
            </div>
          </div>
          <div className="min-h-[280px] overflow-hidden rounded-lg">
            <img
              alt="Fresh groceries arranged for online shopping"
              className="h-full max-h-[420px] w-full object-cover"
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80"
            />
          </div>
        </div>
      </section>

      {shouldShowSeasonalBanner && (
        <section className="bg-orange-50">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="relative min-h-[260px] overflow-hidden rounded-lg bg-slate-950 text-white shadow-lg">
              <img
                alt={`${seasonalBanner?.title || 'Great Summer Sale'} promotional banner`}
                className="absolute inset-0 h-full w-full object-cover"
                src={bannerImageUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-transparent" />
              <div className="relative max-w-2xl p-5 md:p-8">
                <span
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-black text-white"
                  style={{ backgroundColor: seasonalBanner?.accent_color || '#f97316' }}
                >
                    <Flame size={17} />
                  {seasonalBanner?.title || 'Great Summer Sale'}
                </span>
                <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                  {seasonalBanner?.subtitle || 'Cool summer savings with fresh seasonal picks'}
                </h2>
                <p className="mt-3 max-w-xl text-sm font-semibold text-orange-50">
                  Fresh seasonal essentials, bright festival picks, and limited-time savings.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Shop by category</h2>
              <p className="text-sm font-semibold text-slate-500">Browse clean image cards and open a focused product page.</p>
            </div>
            {selectedCategory !== 'All' && (
              <button
                className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => onCategorySelect('All')}
                type="button"
              >
                View all products
              </button>
            )}
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-lg">
              <div className="flex gap-4 overflow-x-hidden scroll-smooth" ref={categoryTrackRef}>
                {categoryCards.map(({ name, label, subtitle, image, color }, index) => {
                  const isSelected = selectedCategory === name;
                  return (
                    <button
                      className={`h-52 w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-3rem)/4)] ${color || 'bg-slate-50'} ${
                        isSelected ? 'ring-4 ring-emerald-200' : ''
                      }`}
                      key={name}
                      onClick={() => {
                        setActiveCategorySlide(index);
                        onCategorySelect(name);
                      }}
                      type="button"
                    >
                      <span className="block h-36 p-4">
                        <img alt={`${label} category`} className="h-full w-full object-contain" src={image} />
                      </span>
                      <span className="block bg-white/80 px-4 py-3">
                        <span className="block text-lg font-black leading-none text-slate-950">{label}</span>
                        <span className="mt-2 block text-sm font-bold text-slate-500">{subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {categoryCards.length > 1 && (
              <>
                <button
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-md hover:bg-slate-50"
                  onClick={() => moveCategorySlide('previous')}
                  type="button"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-md hover:bg-slate-50"
                  onClick={() => moveCategorySlide('next')}
                  type="button"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="mt-4 flex justify-center gap-2">
                  {categoryCards.map((category, index) => (
                    <button
                      aria-label={`Show ${category.label}`}
                      className={`h-2.5 rounded-full transition-all ${
                        activeCategorySlide === index ? 'w-8 bg-emerald-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                      }`}
                      key={category.name}
                      onClick={() => setActiveCategorySlide(index)}
                      type="button"
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <Filters
          facets={facets}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          searchTerm={searchTerm}
        />
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                {selectedCategory === 'All' ? 'Products' : `${selectedCategory} products`}
              </h2>
              <p className="text-sm font-medium text-slate-500">
                {products.length} items {selectedCategory === 'All' ? 'match your search' : `available in ${selectedCategory}`}
              </p>
            </div>
          </div>
          {status.error && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              {status.error}
            </div>
          )}
          {status.loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
              Loading products from MySQL...
            </div>
          ) : products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} onOpen={onOpenProduct} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-black text-slate-950">No products found</h3>
              <p className="mt-2 text-sm text-slate-500">Try a broader search or reset the filters.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
