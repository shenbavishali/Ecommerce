import React, { useMemo, useState } from 'react';
import { Plus, WalletCards } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getProfileFromData, useProfileStore } from '../store/profileStore';
import { formatCurrency } from '../utils/formatCurrency';

export default function PayBalancePanel() {
  const user = useAuthStore((state) => state.user);
  const profileData = useProfileStore((state) => state.data);
  const profile = useMemo(() => getProfileFromData(profileData, user), [profileData, user]);
  const addWalletMoney = useProfileStore((state) => state.addWalletMoney);
  const [amount, setAmount] = useState('');
  const transactions = profile.walletTransactions || [];

  const addMoney = () => {
    const value = Number(amount);
    if (value <= 0) {
      return;
    }
    addWalletMoney(user, value);
    setAmount('');
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-950">Pay Balance</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Add money, pay for orders, and track wallet activity.</p>
            </div>
            <div className="grid h-14 w-14 place-items-center rounded-md bg-emerald-50 text-emerald-700">
              <WalletCards size={28} />
            </div>
          </div>

          <div className="mt-6 rounded-md bg-slate-950 p-5 text-white">
            <p className="text-xs font-black uppercase text-emerald-200">Available Balance</p>
            <p className="mt-2 text-4xl font-black">{formatCurrency(profile.walletBalance || 0)}</p>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Add money</span>
            <input
              className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
              inputMode="numeric"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              value={amount}
            />
          </label>
          <button
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
            disabled={Number(amount) <= 0}
            onClick={addMoney}
            type="button"
          >
            <Plus size={17} />
            Add Money
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Transactions</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Credits, refunds, and order payments appear here.</p>

          <div className="mt-5 divide-y divide-slate-200">
            {transactions.map((transaction) => (
              <div className="flex items-center justify-between gap-4 py-4" key={transaction.id}>
                <div>
                  <p className="font-black text-slate-950">{transaction.description}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {new Date(transaction.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <span
                  className={`text-right font-black ${
                    transaction.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {transaction.type === 'credit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="py-10 text-center">
                <WalletCards className="mx-auto text-slate-300" size={42} />
                <h3 className="mt-3 font-black text-slate-950">No wallet transactions yet</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Add money or pay with Pay Balance to see activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
