import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock3, Filter, HelpCircle, Package, Search, Truck } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { formatCurrency } from '../utils/formatCurrency';
import { createProductReview, createReturnRequest } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';

const statusIcon = {
  placed: Clock3,
  in_progress: Clock3,
  packed: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: Circle,
};

const trackingSteps = [
  ['placed', 'Placed'],
  ['in_progress', 'In Progress'],
  ['packed', 'Packed'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
];

const deliveryPartnerVisibleStatuses = ['packed', 'shipped', 'delivered'];

const returnReasons = [
  'Damaged product',
  'Wrong item delivered',
  'Quality issue',
  'Expired product',
  'No longer needed',
];

function statusLabel(status) {
  return String(status || 'placed').replaceAll('_', ' ');
}

function deliveryHeadline(order, status) {
  if (status === 'delivered') {
    return order.estimated_delivery_label || 'Delivered';
  }
  if (['packed', 'shipped'].includes(status)) {
    return order.estimated_delivery_label
      ? order.estimated_delivery_label.replace('Estimated delivery:', 'Arriving by')
      : 'Arriving soon';
  }
  return order.estimated_delivery_label || 'Estimated delivery will be updated soon';
}

function itemDeliveryHeadline(item) {
  if (item.estimated_delivery_label) {
    return item.estimated_delivery_label;
  }
  if (item.delivery_days) {
    return `Estimated delivery in ${item.delivery_days} days`;
  }
  return 'Estimated delivery will be updated soon';
}

export default function OrdersPanel({ onHelpOrder }) {
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnReason, setReturnReason] = useState(returnReasons[0]);
  const [returnMessage, setReturnMessage] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: '5', feedback: '', review: '' });
  const [filters, setFilters] = useState({ q: '', status: 'all', from: '', to: '' });
  const user = useAuthStore((state) => state.user);
  const addReview = useProfileStore((state) => state.addReview);
  const creditWallet = useProfileStore((state) => state.creditWallet);
  const cancelOrder = useOrderStore((state) => state.cancelOrder);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const loading = useOrderStore((state) => state.loading);
  const error = useOrderStore((state) => state.error);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const createdAt = order.created_at ? new Date(order.created_at) : null;
      const query = filters.q.trim().toLowerCase();
      const searchableText = [
        order.order_number,
        order.id,
        order.shipping_address,
        order.payment_method,
        order.status,
        ...(order.items || []).map((item) => item.product_name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);
      const matchesStatus = filters.status === 'all' || String(order.status || 'placed') === filters.status;
      const matchesFrom = !filters.from || (createdAt && createdAt >= new Date(`${filters.from}T00:00:00`));
      const matchesTo = !filters.to || (createdAt && createdAt <= new Date(`${filters.to}T23:59:59`));
      return matchesQuery && matchesStatus && matchesFrom && matchesTo;
    });
  }, [filters, orders]);

  if (user?.is_guest) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-slate-950">Orders</h1>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Package className="mx-auto text-slate-300" size={48} />
          <h2 className="mt-4 text-xl font-black text-slate-950">Login to view your orders</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Guest browsing does not create an order history. Sign in before checkout to track orders, courier partners, and returns.
          </p>
        </div>
      </section>
    );
  }

  const submitReturn = async () => {
    if (!returnTarget) {
      return;
    }

    try {
      const selectedItem = returnTarget.order.items.find((item) => String(item.id) === String(returnTarget.itemId));
      await createReturnRequest({
        order_id: returnTarget.order.id,
        order_item_id: selectedItem.id,
        reason: returnReason,
      });
      setReturnMessage('Return request sent.');
      setReturnTarget(null);
      await loadOrders();
    } catch (error) {
      setReturnMessage(error.response?.data?.message || error.response?.data?.detail || 'Return request failed');
    }
  };

  const submitReview = async () => {
    if (!reviewTarget) {
      return;
    }

    const reviewPayload = {
      orderId: reviewTarget.order.id,
      orderNumber: reviewTarget.order.order_number,
      productId: reviewTarget.item.product_id,
      productName: reviewTarget.item.product_name,
      rating: Number(reviewForm.rating),
      feedback: reviewForm.feedback,
      review: reviewForm.review,
      customerName: user.full_name,
      customerEmail: user.email,
    };

    try {
      const savedReview = await createProductReview({
        order_id: reviewPayload.orderId,
        order_number: reviewPayload.orderNumber,
        product_id: reviewPayload.productId,
        product_name: reviewPayload.productName,
        rating: reviewPayload.rating,
        feedback: reviewPayload.feedback,
        review: reviewPayload.review,
      });
      addReview(user, { ...reviewPayload, ...savedReview });
    } catch {
      addReview(user, reviewPayload);
    }
    setReviewTarget(null);
    setReviewForm({ rating: '5', feedback: '', review: '' });
  };

  const submitCancellation = async () => {
    if (!cancelTarget) {
      return;
    }

    const cancelledOrder = await cancelOrder(cancelTarget.id, cancelReason);
    if (cancelTarget.payment_method === 'wallet' && Number(cancelledOrder.refund_amount || 0) > 0) {
      creditWallet(user, Number(cancelledOrder.refund_amount), `Refund for ${cancelTarget.order_number}`);
    }
    setCancelTarget(null);
    setCancelReason('Changed my mind');
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-slate-950">Orders</h1>
      {error && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {error}
        </div>
      )}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-slate-500">
          <Filter size={17} />
          Filter orders
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_160px_160px]">
          <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-500">
            <Search size={17} />
            <input
              className="w-full bg-transparent text-sm font-semibold outline-none"
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              placeholder="Order no, product, address"
              value={filters.q}
            />
          </label>
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            value={filters.status}
          >
            <option value="all">All statuses</option>
            {['placed', 'in_progress', 'packed', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
          </select>
          <input
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500"
            onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            type="date"
            value={filters.from}
          />
          <input
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500"
            onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            type="date"
            value={filters.to}
          />
        </div>
        <div className="mt-3 text-sm font-bold text-slate-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            Loading your orders...
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const currentStatus = order.status || 'placed';
            const Icon = statusIcon[currentStatus] || CheckCircle2;
            const showDeliveryPartner = deliveryPartnerVisibleStatuses.includes(currentStatus);
            const currentStepIndex = Math.max(
              0,
              trackingSteps.findIndex(([value]) => value === currentStatus)
            );

            return (
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Order {order.order_number || order.id}</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{formatCurrency(order.total)}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {new Date(order.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-black capitalize text-emerald-700">
                    <Icon size={17} />
                    {statusLabel(currentStatus)}
                  </span>
                </div>

                <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950">{deliveryHeadline(order, currentStatus)}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        Shipment {order.items.length > 1 ? `1 - ${order.items.length} items` : '1 item'}
                      </p>
                    </div>
                    {showDeliveryPartner && order.items.length === 1 && order.tracking_url && (
                      <a
                        className="inline-flex h-10 items-center rounded-md border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50"
                        href={order.tracking_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View Tracking Details
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                    <span className="block text-xs font-black uppercase text-slate-400">Shipping address</span>
                    <span className="mt-1 block">{order.shipping_address}</span>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                    <span className="block text-xs font-black uppercase text-slate-400">Payment</span>
                    <span className="mt-1 block uppercase">{order.payment_method}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-black uppercase text-slate-500">Order tracking</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-6">
                    {trackingSteps.map(([value, label], index) => {
                      const isDone = index <= currentStepIndex;
                      const StepIcon = isDone ? CheckCircle2 : Circle;

                      return (
                        <div
                          className={`rounded-md border p-3 text-sm font-black ${
                            isDone
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-400'
                          }`}
                          key={value}
                        >
                          <StepIcon className="mb-2" size={17} />
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
                  <div className="grid grid-cols-[minmax(220px,1fr)_220px_70px_120px_120px] items-center gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
                    <span className="text-left">Product</span>
                    <span className="text-left">Delivery Partner</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Cost</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {order.items.map((item) => (
                      <div className="grid grid-cols-[minmax(220px,1fr)_220px_70px_120px_120px] items-start gap-3 px-3 py-3 text-sm" key={item.id}>
                        <span className="text-left font-bold text-slate-950">{item.product_name}</span>
                        <span className="text-left font-semibold text-slate-600">
                          {showDeliveryPartner ? (
                            <>
                              <span className="block font-black text-slate-950">{item.delivery_partner || 'Assigning soon'}</span>
                              <span className="block text-xs font-black text-slate-700">{itemDeliveryHeadline(item)}</span>
                              <span className="block text-xs">Tracking ID {item.tracking_id || 'Not generated'}</span>
                              {item.tracking_url && (
                                <a
                                  className="mt-1 inline-flex text-xs font-black text-emerald-700 hover:text-emerald-800"
                                  href={item.tracking_url}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  View Tracking Details
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="block text-xs font-bold text-slate-400">Available after packed</span>
                          )}
                        </span>
                        <span className="text-center font-semibold tabular-nums text-slate-600">{item.quantity}</span>
                        <span className="text-right font-semibold tabular-nums text-slate-600">{formatCurrency(item.unit_price)}</span>
                        <span className="text-right font-black text-slate-950">{formatCurrency(item.line_total)}</span>
                        {item.warranty_card && (
                          <div className="col-span-5 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-800">
                            <span className="block font-black">Warranty Card No: {item.warranty_card.card_number}</span>
                            <span className="block">Valid From: {item.warranty_card.issued_at}</span>
                            <span className="block">Valid To: {item.warranty_card.expires_at}</span>
                            <span className="block">Duration: {item.warranty_card.warranty_months} Months</span>
                          </div>
                        )}
                        {item.replacement && (
                          <div className={`col-span-5 text-xs font-black ${item.replacement.eligible ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {item.replacement.message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {order.return_requests?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {order.return_requests.map((request) => (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800" key={request.id}>
                        <div>{request.product_name}: {String(request.status).replaceAll('_', ' ')}</div>
                        {['refund_completed', 'amount_received'].includes(request.status) && (
                          <div className="mt-1 font-black">Amount Received</div>
                        )}
                        {request.admin_message && <div className="mt-1">{request.admin_message}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-4 text-sm font-bold text-slate-600">
                  <span>Subtotal {formatCurrency(order.subtotal)}</span>
                  <span>Delivery {formatCurrency(order.delivery_fee)}</span>
                  <span className="text-slate-950">Total {formatCurrency(order.total)}</span>
                </div>
                {currentStatus === 'cancelled' && (
                  <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
                    <p>Cancelled: {order.cancel_reason}</p>
                    {Number(order.refund_amount || 0) > 0 ? (
                      <p className="mt-1">
                        {order.cancellation_message === 'Amount Refunded'
                          ? 'Amount Refunded'
                          : `Refund of ${formatCurrency(order.refund_amount)} will be processed in ${order.refund_days || 5} days.`}
                      </p>
                    ) : (
                      <p className="mt-1">No refund is required for Cash on Delivery orders.</p>
                    )}
                  </div>
                )}
                {currentStatus === 'placed' && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                      onClick={() => onHelpOrder?.(order)}
                      type="button"
                    >
                      <HelpCircle size={17} />
                      Help
                    </button>
                    <button
                      className="h-10 rounded-md border border-rose-200 px-4 text-sm font-black text-rose-700 hover:bg-rose-50"
                      onClick={() => setCancelTarget(order)}
                      type="button"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
                {['in_progress', 'packed', 'shipped'].includes(currentStatus) && (
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
                      Cancellation is closed after processing starts.
                    </span>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                      onClick={() => onHelpOrder?.(order)}
                      type="button"
                    >
                      <HelpCircle size={17} />
                      Help
                    </button>
                  </div>
                )}
                {currentStatus === 'delivered' && (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                      onClick={() => onHelpOrder?.(order)}
                      type="button"
                    >
                      <HelpCircle size={17} />
                      Help
                    </button>
                    {order.items.map((item) => (
                      <button
                        className="h-10 rounded-md border border-emerald-200 px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50"
                        key={item.id}
                        onClick={() => {
                          setReviewTarget({ order, item });
                          setReviewForm({ rating: '5', feedback: '', review: '' });
                        }}
                        type="button"
                      >
                        Rate {item.product_name}
                      </button>
                    ))}
                    <button
                      className="h-10 rounded-md border border-rose-200 px-4 text-sm font-black text-rose-700 hover:bg-rose-50"
                      disabled={
                        order.items.every(
                          (item) =>
                            !item.replacement?.eligible ||
                            (order.return_requests || []).some(
                              (request) =>
                                request.order_item_id === item.id &&
                                ['refund_completed', 'amount_received'].includes(request.status)
                            )
                        )
                      }
                      onClick={() => {
                        const returnedItemIds = new Set(
                          (order.return_requests || [])
                            .filter((request) => ['refund_completed', 'amount_received'].includes(request.status))
                            .map((request) => request.order_item_id)
                        );
                        const firstReturnableItem = order.items.find((item) => !returnedItemIds.has(item.id) && item.replacement?.eligible);
                        if (!firstReturnableItem) {
                          return;
                        }
                        setReturnTarget({ order, itemId: firstReturnableItem.id });
                        setReturnReason(returnReasons[0]);
                        setReturnMessage('');
                      }}
                      type="button"
                    >
                      Return
                    </button>
                  </div>
                )}
                {currentStatus === 'cancelled' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                      onClick={() => onHelpOrder?.(order)}
                      type="button"
                    >
                      <HelpCircle size={17} />
                      Help
                    </button>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-lg font-black text-slate-950">{orders.length > 0 ? 'No orders match filters' : 'No orders yet'}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {orders.length > 0 ? 'Try changing the date, status, or order number filter.' : 'Your order details and tracking will appear here after checkout.'}
            </p>
          </div>
        )}
      </div>
      {returnMessage && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          {returnMessage}
        </div>
      )}
      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-black text-slate-950">Return product</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{returnTarget.order.order_number}</p>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Product</span>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setReturnTarget({ ...returnTarget, itemId: event.target.value })}
                value={returnTarget.itemId}
              >
                {returnTarget.order.items
                  .filter(
                    (item) =>
                      item.replacement?.eligible &&
                      !(returnTarget.order.return_requests || []).some(
                        (request) =>
                          request.order_item_id === item.id &&
                          ['refund_completed', 'amount_received'].includes(request.status)
                      )
                  )
                  .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_name} - {formatCurrency(item.line_total)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Reason</span>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setReturnReason(event.target.value)}
                value={returnReason}
              >
                {returnReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-md px-3 text-sm font-black text-slate-600 hover:bg-slate-100"
                onClick={() => setReturnTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"
                onClick={submitReturn}
                type="button"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-black text-slate-950">Cancel order</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{cancelTarget.order_number}</p>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Reason</span>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setCancelReason(event.target.value)}
                value={cancelReason}
              >
                {['Changed my mind', 'Ordered by mistake', 'Found a better price', 'Delivery time is too long', 'Other'].map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </label>
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-600">
              {cancelTarget.payment_method === 'cod'
                ? 'COD order: no refund is required.'
                : `Online payment: ${formatCurrency(cancelTarget.total)} will be marked for refund.`}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="h-10 rounded-md px-3 text-sm font-black text-slate-600 hover:bg-slate-100" onClick={() => setCancelTarget(null)} type="button">Close</button>
              <button className="h-10 rounded-md bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700" onClick={submitCancellation} type="button">Cancel Order</button>
            </div>
          </div>
        </div>
      )}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-black text-slate-950">Rate product</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{reviewTarget.item.product_name}</p>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Rating</span>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}
                value={reviewForm.rating}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>{rating} Star</option>
                ))}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Feedback</span>
              <input
                className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setReviewForm({ ...reviewForm, feedback: event.target.value })}
                placeholder="Short feedback"
                value={reviewForm.feedback}
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Review</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setReviewForm({ ...reviewForm, review: event.target.value })}
                placeholder="Share your experience"
                value={reviewForm.review}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button className="h-10 rounded-md px-3 text-sm font-black text-slate-600 hover:bg-slate-100" onClick={() => setReviewTarget(null)} type="button">Cancel</button>
              <button className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700" onClick={submitReview} type="button">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
