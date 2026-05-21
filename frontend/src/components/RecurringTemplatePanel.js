import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckSquare, Plus, Save, ShoppingCart, Trash2, Zap } from 'lucide-react';
import {
  addMonthlyGroceryTemplateItem,
  addCartItem,
  fetchGroceryMaster,
  fetchMonthlyGroceryTemplate,
  saveMonthlyGroceryTemplate,
} from '../services/api';
import { useCartStore } from '../store/cartStore';

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function formatAmount(value) {
  return `Rs.${Number(value || 0).toLocaleString('en-IN')}`;
}

function uniqueTemplateItems(templateItems = []) {
  const seen = new Set();
  return templateItems.filter((item) => {
    const key = Number(item.grocery_master_id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export default function RecurringTemplatePanel({ onBuyNow }) {
  const month = currentMonthKey();
  const [masterItems, setMasterItems] = useState([]);
  const [template, setTemplate] = useState({ month, derived_from: '', items: [] });
  const [items, setItems] = useState([]);
  const [removedItems, setRemovedItems] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [status, setStatus] = useState({ loading: true, message: '', error: '' });
  const loadCart = useCartStore((state) => state.loadCart);

  const checkedCount = items.filter((item) => item.is_required).length;
  const selectedTotal = items.reduce(
    (total, item) => total + (item.is_required ? Number(item.price || 0) * Number(item.qty || 0) : 0),
    0
  );
  const masterTotal = items.reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0);

  const loadPlanner = useCallback(async () => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const [masterResponse, templateResponse] = await Promise.all([
        fetchGroceryMaster(),
        fetchMonthlyGroceryTemplate(month),
      ]);
      setMasterItems(masterResponse || []);
      setTemplate(templateResponse || { month, derived_from: '', items: [] });
      setItems(uniqueTemplateItems(templateResponse?.items || []));
      setRemovedItems([]);
      setStatus({ loading: false, message: '', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Grocery planner failed to load',
      });
    }
  }, [month]);

  useEffect(() => {
    loadPlanner();
  }, [loadPlanner]);

  const updateTemplateItem = (rowId, patch) => {
    setItems((currentItems) =>
      currentItems.map((item) => (Number(item.id) === Number(rowId) ? { ...item, ...patch } : item))
    );
  };

  const addTemplateItem = async () => {
    if (!selectedMasterId) {
      return;
    }
    const existingItem = items.find((item) => Number(item.grocery_master_id) === Number(selectedMasterId));
    if (existingItem) {
      setStatus({ loading: false, message: '', error: 'This item is already in the monthly table.' });
      return;
    }

    const removedItem = removedItems.find((item) => Number(item.grocery_master_id) === Number(selectedMasterId));
    if (removedItem) {
      setItems((currentItems) => [...currentItems, removedItem]);
      setRemovedItems((currentItems) =>
        currentItems.filter((item) => Number(item.grocery_master_id) !== Number(selectedMasterId))
      );
      setSelectedMasterId('');
      setStatus({ loading: false, message: 'Item restored to this month.', error: '' });
      return;
    }

    setStatus({ loading: true, message: '', error: '' });
    try {
      const saved = await addMonthlyGroceryTemplateItem({
        month,
        grocery_master_id: Number(selectedMasterId),
        is_required: true,
      });
      setTemplate(saved);
      setItems(uniqueTemplateItems(saved.items || []));
      setRemovedItems([]);
      setSelectedMasterId('');
      setStatus({ loading: false, message: 'Item added to this month.', error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Could not add monthly item',
      });
    }
  };

  const saveMonth = async () => {
    setStatus({ loading: true, message: '', error: '' });
    try {
      const uniqueItems = uniqueTemplateItems(items);
      const saved = await saveMonthlyGroceryTemplate({
        month,
        items: uniqueItems.map((item) => ({
          grocery_master_id: Number(item.grocery_master_id),
          is_required: Boolean(item.is_required),
          qty: Number(item.qty || 1),
          price: Number(item.price || 0),
        })),
      });
      setTemplate(saved);
      setItems(uniqueTemplateItems(saved.items || []));
      setRemovedItems([]);
      setStatus({ loading: false, message: `${monthLabel(month)} template saved. This becomes next month's base.`, error: '' });
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Could not save monthly template',
      });
    }
  };

  const addTableItemsToCart = async (shouldCheckout = false) => {
    if (items.length === 0) {
      setStatus({ loading: false, message: '', error: 'Add at least one monthly item first.' });
      return;
    }

    setStatus({ loading: true, message: '', error: '' });
    try {
      const productMap = new Map(masterItems.map((item) => [Number(item.id), item.product]));
      for (const item of items) {
        const product = item.product || productMap.get(Number(item.grocery_master_id));
        if (!product?.id) {
          continue;
        }
        const quantity = Math.max(1, Math.round(Number(item.qty || 1)));
        await addCartItem(product.id, quantity);
      }
      await loadCart();
      setStatus({ loading: false, message: shouldCheckout ? 'Items added. Continue checkout.' : 'Monthly items added to cart.', error: '' });
      if (shouldCheckout) {
        onBuyNow?.();
      }
    } catch (error) {
      setStatus({
        loading: false,
        message: '',
        error: error.response?.data?.message || error.response?.data?.detail || 'Could not add monthly items to cart',
      });
    }
  };

  const removeTemplateItem = (item) => {
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
    if (item.id) {
      setRemovedItems((currentItems) => {
        const alreadyRemoved = currentItems.some((currentItem) => Number(currentItem.id) === Number(item.id));
        return alreadyRemoved ? currentItems : [...currentItems, item];
      });
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
              <CalendarDays size={17} />
              {monthLabel(month)}
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-950">Recurring Purchase Template</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Backend-backed monthly grocery consumption template. Choose from your grocery master list, then add items to this month.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            <span className="block text-2xl font-black text-slate-950">{checkedCount}/{items.length}</span>
            selected this month
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            <span className="block text-2xl font-black text-slate-950">{formatAmount(selectedTotal)}</span>
            selected estimate
          </div>
        </div>

        {(status.error || status.message) && (
          <p className={`mt-4 rounded-md px-3 py-2 text-sm font-black ${status.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {status.error || status.message}
          </p>
        )}

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <select
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
              onChange={(event) => setSelectedMasterId(event.target.value)}
              value={selectedMasterId}
            >
              <option value="">Select item from grocery_master</option>
              {masterItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product?.name} ({item.default_qty} {item.unit}) - {formatAmount(item.product?.price)}
                </option>
              ))}
            </select>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
              disabled={status.loading || !selectedMasterId}
              onClick={addTemplateItem}
              type="button"
            >
              <Plus size={17} />
              Add Item
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
          <div className="grid min-w-[1040px] grid-cols-[72px_minmax(320px,1fr)_140px_96px_160px_170px_56px] items-center bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">
            <span className="text-center">Use</span>
            <span className="text-left">Grocery Item</span>
            <span className="text-center">Quantity</span>
            <span className="text-center">Unit</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Line Total</span>
            <span />
          </div>
          <div className="divide-y divide-slate-200">
            {items.map((item) => (
              <div className="grid min-w-[1040px] grid-cols-[72px_minmax(320px,1fr)_140px_96px_160px_170px_56px] items-center px-4 py-3" key={item.id}>
                <input
                  checked={item.is_required}
                  className="mx-auto h-5 w-5"
                  onChange={(event) => updateTemplateItem(item.id, { is_required: event.target.checked })}
                  type="checkbox"
                />
                <div>
                  <div className={`text-sm font-black ${item.is_required ? 'text-slate-950' : 'text-slate-400 line-through'}`}>
                    {item.product_name}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">{item.brand} | {item.category}</div>
                </div>
                <input
                  className="mx-auto h-10 w-28 rounded-md border border-slate-200 px-3 text-center text-sm font-bold outline-none focus:border-emerald-500"
                  min="0.1"
                  onChange={(event) => updateTemplateItem(item.id, { qty: event.target.value })}
                  step="0.1"
                  type="number"
                  value={item.qty}
                />
                <span className="text-center text-sm font-bold text-slate-600">{item.unit}</span>
                <input
                  className="ml-auto h-10 w-36 rounded-md border border-slate-200 px-3 text-right text-sm font-bold outline-none focus:border-emerald-500"
                  min="0"
                  onChange={(event) => updateTemplateItem(item.id, { price: event.target.value })}
                  type="number"
                  value={item.price}
                />
                <span className="block text-right text-sm font-black text-slate-950">{formatAmount(Number(item.price || 0) * Number(item.qty || 0))}</span>
                <button
                  className="ml-auto grid h-10 w-10 place-items-center rounded-md text-rose-600 hover:bg-rose-50"
                  onClick={() => removeTemplateItem(item)}
                  type="button"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-8 text-center">
                <CheckSquare className="mx-auto text-slate-300" size={44} />
                <h2 className="mt-3 text-lg font-black text-slate-950">No monthly grocery template items</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Add grocery master items, then add monthly items from that master list.</p>
              </div>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-end gap-4 rounded-md bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
            <span>Master total {formatAmount(masterTotal)}</span>
            <span className="text-emerald-700">Selected this month {formatAmount(selectedTotal)}</span>
          </div>
        )}

        {template.derived_from && (
          <p className="mt-3 text-sm font-bold text-slate-500">
            Preloaded from {monthLabel(template.derived_from)}. Historical templates are preserved.
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-md bg-orange-500 px-5 text-sm font-black text-white hover:bg-orange-600 disabled:bg-slate-300"
            disabled={status.loading || items.length === 0}
            onClick={() => addTableItemsToCart(true)}
            type="button"
          >
            <Zap size={17} />
            Buy Now
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300"
            disabled={status.loading || items.length === 0}
            onClick={() => addTableItemsToCart(false)}
            type="button"
          >
            <ShoppingCart size={17} />
            Add to Cart
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
            disabled={status.loading}
            onClick={saveMonth}
            type="button"
          >
            <Save size={17} />
            Save current month template
          </button>
        </div>
      </div>
    </section>
  );
}
