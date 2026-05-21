import React, { useMemo } from 'react';
import { BadgePercent, CheckCircle2, TicketPercent } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getProfileFromData, useProfileStore } from '../store/profileStore';
import { formatCurrency } from '../utils/formatCurrency';

export default function CouponsPanel({ coupons = [], status }) {
  const user = useAuthStore((state) => state.user);
  const profileData = useProfileStore((state) => state.data);
  const profile = useMemo(() => getProfileFromData(profileData, user), [profileData, user]);
  const applyCoupon = useProfileStore((state) => state.applyCoupon);
  const clearAppliedCoupon = useProfileStore((state) => state.clearAppliedCoupon);
  const redeemedCouponIds = profile.redeemedCouponIds || [];
  const formatExpiryDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'No expiry date';

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Coupons</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Redeem one coupon and it will be applied automatically during checkout.
          </p>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-md bg-emerald-50 text-emerald-700">
          <TicketPercent size={28} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {status?.error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 sm:col-span-2 lg:col-span-4">
            {status.error}
          </div>
        )}
        {coupons.map((coupon) => {
          const isApplied = profile.appliedCouponId === coupon.id;
          const isRedeemed = redeemedCouponIds.includes(coupon.id);

          return (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={coupon.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                  <BadgePercent size={23} />
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{coupon.code}</span>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-950">{coupon.title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{coupon.description}</p>
              <div className="mt-4 rounded-md bg-slate-50 p-3">
                <p className="text-2xl font-black text-emerald-700">{formatCurrency(coupon.discount)} off</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Minimum order {formatCurrency(coupon.minOrder)}</p>
                <p className="mt-1 text-xs font-bold text-amber-700">Valid till {formatExpiryDate(coupon.expires_at)}</p>
              </div>
              <button
                className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-black ${
                  isApplied
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300'
                }`}
                disabled={isRedeemed}
                onClick={() => (isApplied ? clearAppliedCoupon(user) : applyCoupon(user, coupon.id))}
                type="button"
              >
                {isApplied && <CheckCircle2 size={16} />}
                {isRedeemed ? 'Used' : isApplied ? 'Applied' : 'Redeem'}
              </button>
            </article>
          );
        })}
        {!status?.loading && coupons.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 sm:col-span-2 lg:col-span-4">
            No active coupons are available right now.
          </div>
        )}
      </div>
    </section>
  );
}
