import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Coins, Headphones, Heart, History, Home, LayoutDashboard, LogIn, PackageCheck, Search, ShoppingCart, TicketPercent, UserRound, WalletCards } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { fetchAdminReturns } from '../services/api';

function logoUrl(logo) {
  if (!logo) {
    return '';
  }
  return logo.startsWith('/static')
    ? `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}${logo}`
    : logo;
}

export default function Header({ activeView, branding = { company_name: 'JioBasket', logo_url: '' }, onNavigate, searchTerm, onSearchChange }) {
  const totalItems = useCartStore((state) => state.totalItems());
  const loadCart = useCartStore((state) => state.loadCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [returnCount, setReturnCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const companyName = branding.company_name || 'JioBasket';
  const resolvedLogoUrl = logoUrl(branding.logo_url);

  useEffect(() => {
    let isMounted = true;

    async function loadReturnCount() {
      if (user?.role !== 'admin') {
        setReturnCount(0);
        return;
      }

      try {
        const requests = await fetchAdminReturns();
        if (isMounted) {
          setReturnCount(
            (requests || []).filter((request) => !['refund_completed', 'amount_received'].includes(request.status)).length
          );
        }
      } catch {
        if (isMounted) {
          setReturnCount(0);
        }
      }
    }

    loadReturnCount();

    return () => {
      isMounted = false;
    };
  }, [activeView, user]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    clearCart();
    onNavigate('home');
  };

  const openProfile = () => {
    setProfileMenuOpen(false);
    onNavigate('profile');
  };

  const openWishlist = () => {
    setProfileMenuOpen(false);
    onNavigate('wishlist');
  };

  const openRecurringTemplate = () => {
    setProfileMenuOpen(false);
    onNavigate('recurring-template');
  };

  const openCoupons = () => {
    setProfileMenuOpen(false);
    onNavigate('coupons');
  };

  const openPoints = () => {
    setProfileMenuOpen(false);
    onNavigate('points');
  };

  const openPayBalance = () => {
    setProfileMenuOpen(false);
    onNavigate('pay-balance');
  };

  const navItems = user
    ? user.role === 'admin'
      ? [
          { id: 'home', label: 'Home', icon: Home },
          { id: 'admin', label: 'Admin Dashboard', icon: LayoutDashboard },
          { id: 'orders', label: 'Orders', icon: History },
          { id: 'returns', label: 'Returns', icon: PackageCheck },
        ]
      : [
          { id: 'home', label: 'Home', icon: Home },
          { id: 'orders', label: 'Orders', icon: History },
          { id: 'help', label: 'Help', icon: Headphones },
        ]
    : [{ id: 'home', label: 'Home', icon: Home }];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          className="flex min-w-fit items-center gap-2 rounded-md text-left"
          onClick={() => onNavigate('home')}
          type="button"
        >
          <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-600 text-lg font-black text-white">
            {resolvedLogoUrl ? (
              <img alt={`${companyName} logo`} className="h-9 w-9 rounded object-cover" src={resolvedLogoUrl} />
            ) : (
              companyName.charAt(0).toUpperCase()
            )}
          </span>
          <span>
            <span className="block text-lg font-black leading-5 text-slate-950">{companyName}</span>
            <span className="block text-xs font-medium text-slate-500">Fresh groceries fast</span>
          </span>
        </button>

        {user && (
          <label className="hidden flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 md:flex">
            <Search size={18} />
            <input
              className="w-full bg-transparent text-sm font-medium outline-none"
              onChange={(event) => {
                onSearchChange(event.target.value);
                onNavigate('home');
              }}
              placeholder="Search products"
              value={searchTerm}
            />
          </label>
        )}

        <nav className="ml-auto flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  activeView === item.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{item.label}</span>
                {item.id === 'returns' && returnCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-black text-white">
                    {returnCount}
                  </span>
                )}
              </button>
            );
          })}
          {user?.role !== 'admin' && (
            <button
              className={`relative inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                activeView === 'cart'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
              onClick={async () => {
                if (!user) {
                  clearCart();
                  onNavigate('cart');
                  return;
                }

                await loadCart();
                onNavigate('cart');
              }}
              type="button"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Cart</span>
              {user && totalItems > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>
          )}
          {user ? (
            <>
              {user.role !== 'admin' ? (
                <div className="relative">
                  <button
                    className={`inline-flex h-10 max-w-48 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                      ['profile', 'recurring-template', 'wishlist', 'coupons', 'points', 'pay-balance'].includes(activeView) || profileMenuOpen
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
                    type="button"
                  >
                    <UserRound size={17} className="text-emerald-600" />
                    <span className="hidden truncate sm:inline">{user.full_name}</span>
                    <span className="sm:hidden">{user.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    {profileMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={openProfile}
                        type="button"
                      >
                        <UserRound size={16} className="text-emerald-600" />
                        My Profile
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={openRecurringTemplate}
                        type="button"
                      >
                        <CalendarDays size={16} className="text-emerald-600" />
                        Recurring Purchase Template
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={openWishlist}
                        type="button"
                      >
                        <Heart size={16} className="text-rose-600" />
                        Wishlist
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={openCoupons}
                        type="button"
                      >
                        <TicketPercent size={16} className="text-emerald-600" />
                        Coupons
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={openPoints}
                        type="button"
                      >
                        <Coins size={16} className="text-amber-600" />
                        Points
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        onClick={openPayBalance}
                        type="button"
                      >
                        <WalletCards size={16} className="text-emerald-600" />
                        Pay Balance
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden max-w-40 items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 lg:flex">
                  <UserRound size={17} className="text-emerald-600" />
                  <span className="truncate">{user.full_name}</span>
                </div>
              )}
              {user.role !== 'admin' && (
                <div className="hidden rounded-md bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 xl:block">
                  Free delivery for orders above ₹1000.
                </div>
              )}
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                onClick={handleLogout}
                type="button"
              >
                <span className="hidden lg:inline">Logout</span>
                <span className="lg:hidden">{user.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </button>
            </>
          ) : (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => onNavigate('auth')}
              type="button"
            >
              <LogIn size={18} />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
