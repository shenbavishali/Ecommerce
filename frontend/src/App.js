import React, { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import AuthPanel from './components/AuthPanel';
import CartPanel from './components/CartPanel';
import CheckoutPanel from './components/CheckoutPanel';
import OrdersPanel from './components/OrdersPanel';
import ProductDetails from './components/ProductDetails';
import AdminProductPanel from './components/AdminProductPanel';
import ProfilePanel from './components/ProfilePanel';
import WishlistPanel from './components/WishlistPanel';
import PointsPanel from './components/PointsPanel';
import PayBalancePanel from './components/PayBalancePanel';
import CouponsPanel from './components/CouponsPanel';
import HelpPanel from './components/HelpPanel';
import RecurringTemplatePanel from './components/RecurringTemplatePanel';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import useDebounce from './hooks/useDebounce';
import { fetchCoupons, fetchFacets, fetchProducts, fetchSeasonalBanner, fetchSummerSaleOffers } from './services/api';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { useProfileStore } from './store/profileStore';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedHelpOrder, setSelectedHelpOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [summerSaleOffers, setSummerSaleOffers] = useState([]);
  const [seasonalBanner, setSeasonalBanner] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [facets, setFacets] = useState({ categories: [], brands: [] });
  const [catalogStatus, setCatalogStatus] = useState({ loading: true, error: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'All',
    brand: 'All',
    maxPrice: 200000,
  });
  const debouncedSearch = useDebounce(searchTerm, 250);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const loadCart = useCartStore((state) => state.loadCart);
  const hydrateProfiles = useProfileStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (token) {
      hydrateProfiles();
      loadCart();
    }
  }, [hydrateProfiles, loadCart, token]);

  const loadCatalog = useCallback(
    async (shouldUpdate = () => true) => {
      setCatalogStatus({ loading: true, error: '' });
      try {
        const params = {
          search: debouncedSearch || undefined,
          category: filters.category === 'All' ? undefined : filters.category,
          brand: filters.brand === 'All' ? undefined : filters.brand,
          max_price: filters.maxPrice,
          page_size: 48,
        };
        const [productResponse, facetResponse, offerResponse, bannerResponse, couponResponse] = await Promise.all([
          fetchProducts(params),
          fetchFacets(),
          fetchSummerSaleOffers(),
          fetchSeasonalBanner(),
          fetchCoupons(),
        ]);

        if (shouldUpdate()) {
          const offers = offerResponse || [];
          const offerMap = new Map(offers.map((offer) => [String(offer.product_id), offer]));
          setSummerSaleOffers(offers);
          setSeasonalBanner(bannerResponse || null);
          setCoupons(couponResponse || []);
          setProducts(
            (productResponse.items || []).map((product) => ({
              ...product,
              summerSaleOffer: offerMap.get(String(product.id)) || null,
            }))
          );
          setFacets(facetResponse);
          setCatalogStatus({ loading: false, error: '' });
        }
      } catch (error) {
        if (shouldUpdate()) {
          setProducts([]);
          setCoupons([]);
          setCatalogStatus({
            loading: false,
            error:
              error.response?.data?.message ||
              error.response?.data?.detail ||
              'Connect the FastAPI backend and MySQL database to load products.',
          });
        }
      }
    },
    [debouncedSearch, filters]
  );

  useEffect(() => {
    let isMounted = true;
    loadCatalog(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [loadCatalog]);

  const openProduct = (product) => {
    setSelectedProduct(product);
    setActiveView('product');
  };

  const renderView = () => {
    if (activeView === 'auth') {
      return <AuthPanel onDone={(user) => setActiveView(user?.role === 'admin' ? 'admin' : 'home')} />;
    }

    if (activeView === 'cart') {
      return <CartPanel onCheckout={() => setActiveView('checkout')} onContinueShopping={() => setActiveView('home')} />;
    }

    if (activeView === 'checkout') {
      return (
        <CheckoutPanel
          coupons={coupons}
          onContinueShopping={() => setActiveView('home')}
          onOrderPlaced={() => setActiveView('orders')}
        />
      );
    }

    if (activeView === 'orders') {
      if (user?.role === 'admin') {
        return <AdminProductPanel compact initialTab="orders" />;
      }

      return <OrdersPanel onHelpOrder={(order) => {
        setSelectedHelpOrder(order);
        setActiveView('help');
      }} />;
    }

    if (activeView === 'help') {
      if (!user || user.role === 'admin') {
        return <AuthPanel onDone={() => setActiveView('help')} />;
      }

      return <HelpPanel initialOrder={selectedHelpOrder} />;
    }

    if (activeView === 'returns') {
      if (user?.role !== 'admin') {
        return <AuthPanel onDone={(loggedInUser) => setActiveView(loggedInUser?.role === 'admin' ? 'returns' : 'home')} />;
      }

      return <AdminProductPanel compact initialTab="returns" />;
    }

    if (activeView === 'profile') {
      if (!user || user.role === 'admin') {
        return <AuthPanel onDone={() => setActiveView('profile')} />;
      }

      return <ProfilePanel />;
    }

    if (activeView === 'wishlist') {
      if (!user || user.role === 'admin') {
        return <AuthPanel onDone={() => setActiveView('wishlist')} />;
      }

      return (
        <WishlistPanel
          onOpenProduct={openProduct}
          onShop={() => setActiveView('home')}
        />
      );
    }

    if (activeView === 'recurring-template') {
      if (!user || user.role === 'admin') {
        return <AuthPanel onDone={() => setActiveView('recurring-template')} />;
      }

      return <RecurringTemplatePanel onBuyNow={() => setActiveView('checkout')} />;
    }

    if (activeView === 'points') {
      if (!user || user.role === 'admin') {
        return <AuthPanel onDone={() => setActiveView('points')} />;
      }

      return <PointsPanel />;
    }

    if (activeView === 'coupons') {
      if (!user || user.role === 'admin') {
        return <AuthPanel onDone={() => setActiveView('coupons')} />;
      }

      return <CouponsPanel coupons={coupons} status={catalogStatus} />;
    }

    if (activeView === 'pay-balance') {
      if (!user || user.role === 'admin') {
        return <AuthPanel onDone={() => setActiveView('pay-balance')} />;
      }

      return <PayBalancePanel />;
    }

    if (activeView === 'admin') {
      if (user?.role !== 'admin') {
        return <AuthPanel onDone={(loggedInUser) => setActiveView(loggedInUser?.role === 'admin' ? 'orders' : 'home')} />;
      }

      return (
        <AdminProductPanel
          initialTab="products"
          onCreated={(product) => {
            if (product?.id) {
              setProducts((currentProducts) => [product, ...currentProducts.filter((item) => item.id !== product.id)]);
            }
            loadCatalog();
          }}
        />
      );
    }

    if (activeView === 'product' && selectedProduct) {
      return (
        <ProductDetails
          product={selectedProduct}
          onBack={() => setActiveView('home')}
          onBuyNow={() => setActiveView('checkout')}
          onOpenProduct={openProduct}
        />
      );
    }

    return (
      <Home
        products={products}
        summerSaleOffers={summerSaleOffers}
        seasonalBanner={seasonalBanner}
        facets={facets}
        filters={filters}
        status={catalogStatus}
        searchTerm={searchTerm}
        onFiltersChange={setFilters}
        onSearchChange={setSearchTerm}
        onCategorySelect={(category) => {
          setSearchTerm('');
          setFilters((currentFilters) => ({
            ...currentFilters,
            category,
            brand: 'All',
          }));
        }}
        onOpenProduct={openProduct}
        onOpenCart={() => setActiveView('cart')}
        onOpenCheckout={() => setActiveView('checkout')}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Header
        activeView={activeView}
        onNavigate={(view) => {
          if (view !== 'help') {
            setSelectedHelpOrder(null);
          }
          setActiveView(view);
        }}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
      />
      <main>{renderView()}</main>
      {user?.role !== 'admin' && (
        <Chatbot
          catalogStatus={catalogStatus}
          coupons={coupons}
          onNavigate={(view) => {
            if (view !== 'help') {
              setSelectedHelpOrder(null);
            }
            setActiveView(view);
          }}
          onOpenProduct={openProduct}
          onSearch={(query) => {
            setSearchTerm(query);
            setFilters((currentFilters) => ({
              ...currentFilters,
              category: 'All',
              brand: 'All',
            }));
          }}
          products={products}
          summerSaleOffers={summerSaleOffers}
        />
      )}
    </div>
  );
}

export default App;
