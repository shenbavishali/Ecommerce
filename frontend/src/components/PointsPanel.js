import React, { useEffect } from 'react';
import { Coins, Gift, ShoppingBag } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { formatCurrency } from '../utils/formatCurrency';
import { useAuthStore } from '../store/authStore';
import { getProfileFromData, useProfileStore } from '../store/profileStore';

function eligibleOrders(orders) {
  return orders.filter((order) => order.status !== 'cancelled');
}

function orderPoints(order) {
  return Math.floor(Number(order.total || 0) / 100);
}

export default function PointsPanel() {
  const user = useAuthStore((state) => state.user);
  const profileData = useProfileStore((state) => state.data);
  const profile = getProfileFromData(profileData, user);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const loading = useOrderStore((state) => state.loading);
  const error = useOrderStore((state) => state.error);
  const pointOrders = eligibleOrders(orders);
  const totalSpent = pointOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const earnedPoints = pointOrders.reduce((sum, order) => sum + orderPoints(order), 0);
  const redeemedPoints = Number(profile.pointsRedeemed || 0);
  const totalPoints = Math.max(0, earnedPoints - redeemedPoints);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950">Points</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Earn 1 point for every Rs.100 spent.</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-md bg-amber-50 text-amber-700">
            <Coins size={32} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase text-amber-700">Total Points</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{totalPoints}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-500">Earned Points</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{earnedPoints}</p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase text-emerald-700">Redeemed</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{redeemedPoints}</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-500">Eligible spend: {formatCurrency(totalSpent)}</p>

        {error && <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-700">{error}</p>}

        <div className="mt-6 overflow-hidden rounded-md border border-slate-200">
          <div className="grid grid-cols-[1fr_140px_100px] bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">
            <span>Order</span>
            <span>Amount</span>
            <span className="text-right">Points</span>
          </div>
          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="p-5 text-center text-sm font-bold text-slate-500">Loading points...</div>
            ) : pointOrders.length > 0 ? (
              pointOrders.map((order) => (
                <div className="grid grid-cols-[1fr_140px_100px] px-4 py-3 text-sm" key={order.id}>
                  <span className="font-black text-slate-950">{order.order_number || order.id}</span>
                  <span className="font-semibold text-slate-600">{formatCurrency(order.total)}</span>
                  <span className="text-right font-black text-amber-700">{orderPoints(order)}</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <ShoppingBag className="mx-auto text-slate-300" size={42} />
                <h2 className="mt-3 font-black text-slate-950">No points yet</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Place orders to start earning reward points.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-600">
          <Gift className="text-emerald-600" size={18} />
          Rs.100 = 1 point. Rs.1000 = 10 points.
        </div>

        {(profile.pointsTransactions || []).length > 0 && (
          <div className="mt-5 rounded-md border border-slate-200">
            <div className="bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">Redemption History</div>
            <div className="divide-y divide-slate-200">
              {profile.pointsTransactions.map((transaction) => (
                <div className="flex justify-between gap-3 px-4 py-3 text-sm" key={transaction.id}>
                  <span className="font-bold text-slate-700">{transaction.description}</span>
                  <span className="font-black text-amber-700">-{transaction.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
