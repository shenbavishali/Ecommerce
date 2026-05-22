import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Headphones, MessageCircle, PackageSearch, Phone, Send, ShieldQuestion } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { createHelpRequest, fetchHelpContent, fetchHelpRequests } from '../services/api';
import { helpFaqTopics } from '../utils/helpFaqs';

const issueOptions = {
  placed: ['Cancel order', 'Change delivery address', 'Payment debited but order pending'],
  in_progress: ['Missing item update', 'Order taking longer than expected', 'Need invoice'],
  packed: ['Track delivery', 'Delivery slot issue', 'Need invoice'],
  shipped: ['Track delivery', 'Delivery partner issue', 'Delivery address issue'],
  delivered: ['Item missing', 'Damaged or defective item', 'Wrong item delivered', 'Return or refund'],
  cancelled: ['Refund status', 'Cancellation reason', 'Reorder help'],
};

const popularTopics = [
  'Product availability depends on selected location and pincode.',
  'Refunds for cancelled or returned prepaid orders can take up to 7 working days.',
  'COD refunds are credited to Pay Balance after return approval.',
  'Orders can be cancelled only while they are placed; request help or return after later stages.',
];

function topicsForStatus(status) {
  return issueOptions[status] || issueOptions.placed;
}

export default function HelpPanel({ initialOrder = null }) {
  const user = useAuthStore((state) => state.user);
  const orders = useOrderStore((state) => state.orders);
  const loadOrders = useOrderStore((state) => state.loadOrders);
  const [helpRequests, setHelpRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrder?.id ? String(initialOrder.id) : '');
  const [issueType, setIssueType] = useState('');
  const [message, setMessage] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);
  const [selectedFaqTopicId, setSelectedFaqTopicId] = useState('gift-card');
  const [selectedFaqQuestionId, setSelectedFaqQuestionId] = useState('gift-card-use');
  const [helpContent, setHelpContent] = useState({ branding: { company_name: 'JioBasket', logo_url: '' }, topics: helpFaqTopics });

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    let isMounted = true;
    fetchHelpContent()
      .then((content) => {
        if (isMounted && content) {
          setHelpContent(content);
          if (content.topics?.length) {
            setSelectedFaqTopicId(String(content.topics[0].id));
            setSelectedFaqQuestionId(String(content.topics[0].questions?.[0]?.id || ''));
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHelpRequests() {
      if (!user) {
        setHelpRequests([]);
        return;
      }

      setLoadingRequests(true);
      try {
        const requests = await fetchHelpRequests();
        if (isMounted) {
          setHelpRequests(requests || []);
        }
      } catch {
        if (isMounted) {
          setHelpRequests([]);
        }
      } finally {
        if (isMounted) {
          setLoadingRequests(false);
        }
      }
    }

    loadHelpRequests();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (initialOrder?.id) {
      setSelectedOrderId(String(initialOrder.id));
    }
  }, [initialOrder]);

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.id) === String(selectedOrderId)) || initialOrder,
    [initialOrder, orders, selectedOrderId]
  );
  const issueTopics = useMemo(() => topicsForStatus(selectedOrder?.status || 'placed'), [selectedOrder?.status]);
  const faqTopics = Array.isArray(helpContent.topics) ? helpContent.topics : helpFaqTopics;
  const selectedFaqTopic = faqTopics.find((topic) => String(topic.id) === String(selectedFaqTopicId)) || faqTopics[0];
  const selectedFaqQuestion =
    selectedFaqTopic?.questions?.find((question) => String(question.id) === String(selectedFaqQuestionId)) ||
    selectedFaqTopic?.questions?.[0];

  useEffect(() => {
    setIssueType(issueTopics[0] || '');
  }, [issueTopics, selectedOrderId, selectedOrder?.status]);

  const submitIssue = (event) => {
    event.preventDefault();
    if (!user || !issueType) {
      return;
    }
    createHelpRequest({
      order_id: selectedOrder?.id || null,
      issue_type: issueType,
      message: message || issueType,
    }).then((ticket) => {
      setCreatedTicket(ticket);
      setHelpRequests((currentRequests) => [ticket, ...currentRequests]);
      setMessage('');
    });
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[300px_400px_minmax(320px,1fr)]">
          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-950">
              Step 1: Select Topic
            </h2>
            <div className="max-h-80 overflow-y-auto lg:max-h-[430px]">
              {faqTopics.length === 0 && (
                <p className="p-4 text-sm font-semibold text-slate-500">No FAQ topics are active.</p>
              )}
              {faqTopics.map((topic) => {
                const isSelected = String(topic.id) === String(selectedFaqTopic.id);
                return (
                  <button
                    className={`flex min-h-11 w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 ${
                      isSelected ? 'bg-slate-100 font-black' : 'bg-white'
                    }`}
                    key={topic.id}
                    onClick={() => {
                      setSelectedFaqTopicId(String(topic.id));
                      setSelectedFaqQuestionId(String(topic.questions[0]?.id || ''));
                    }}
                    type="button"
                  >
                    <span>{topic.title}</span>
                    <ChevronRight size={18} className="shrink-0 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-950">
              Step 2: Select Issue
            </h2>
            <div className="max-h-80 overflow-y-auto lg:max-h-[430px]">
              {!selectedFaqTopic && (
                <p className="p-4 text-sm font-semibold text-slate-500">Select or add an active topic first.</p>
              )}
              {selectedFaqTopic?.questions?.map((item) => {
                const isSelected = String(item.id) === String(selectedFaqQuestion.id);
                return (
                  <button
                    className={`flex min-h-11 w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-semibold leading-5 text-slate-800 hover:bg-slate-50 ${
                      isSelected ? 'bg-slate-100 font-black' : 'bg-white'
                    }`}
                    key={item.id}
                    onClick={() => setSelectedFaqQuestionId(String(item.id))}
                    type="button"
                  >
                    <span>{item.question}</span>
                    <ChevronRight size={18} className="shrink-0 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-950">
              Step 3: Get Assistance
            </h2>
            <div className="min-h-64 p-5 lg:min-h-[430px]">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                {selectedFaqTopic?.title || 'Help & Care'}
              </p>
              <h3 className="mt-2 text-base font-black leading-6 text-slate-950">
                {selectedFaqQuestion?.question || 'No FAQ selected'}
              </h3>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-700">
                {selectedFaqQuestion?.answer || 'Add active FAQ topics and questions from the Admin Panel to show assistance here.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-3xl font-black text-slate-950">Help & Care</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Issue with your order?</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
              <Headphones size={18} />
              Support
            </span>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={submitIssue}>
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Select order</span>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500"
                onChange={(event) => setSelectedOrderId(event.target.value)}
                value={selectedOrderId}
              >
                <option value="">General help</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_number || order.id} - {String(order.status || 'placed').replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              {issueTopics.map((topic) => (
                <button
                  className={`rounded-md border p-4 text-left text-sm font-black ${
                    issueType === topic
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200'
                  }`}
                  key={topic}
                  onClick={() => setIssueType(topic)}
                  type="button"
                >
                  <ShieldQuestion className="mb-3" size={18} />
                  {topic}
                </button>
              ))}
            </div>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">Describe issue</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Add order issue details"
                value={message}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-500">
                {selectedOrder ? `Order ${selectedOrder.order_number || selectedOrder.id}` : 'No order selected'}
              </div>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700"
                disabled={!user}
                type="submit"
              >
                <Send size={17} />
                Report Issue
              </button>
            </div>
          </form>

          {createdTicket && (
            <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              Issue reported: {createdTicket.ticket_number}. Our support team will review it.
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Contact Our Support</h2>
            <div className="mt-4 space-y-3 text-sm font-bold text-slate-700">
              <p className="flex items-center gap-2"><MessageCircle size={17} className="text-emerald-600" /> WhatsApp: 70003 70003</p>
              <p className="flex items-center gap-2"><Phone size={17} className="text-emerald-600" /> Call: 1800 890 1222</p>
              <p>8:00 AM to 8:00 PM, 365 days</p>
              <p>Email: cs@jiobasket.example</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Useful Topics</h2>
            <div className="mt-4 space-y-3">
              {popularTopics.map((topic) => (
                <div className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-600" key={topic}>
                  {topic}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Issues Reported</h2>
            <div className="mt-4 space-y-3">
              {loadingRequests ? (
                <div className="rounded-md border border-slate-200 p-4 text-center text-sm font-bold text-slate-500">
                  Loading issues...
                </div>
              ) : helpRequests.length > 0 ? (
                helpRequests.map((request) => (
                  <div className="rounded-md border border-slate-200 p-3 text-sm" key={request.id}>
                    <p className="font-black text-slate-950">{request.ticket_number}</p>
                    <p className="mt-1 font-semibold text-slate-600">{request.issue_type}</p>
                    {request.admin_response && (
                      <p className="mt-2 rounded-md bg-emerald-50 p-2 font-bold text-emerald-800">{request.admin_response}</p>
                    )}
                    <p className="mt-1 text-xs font-bold uppercase text-emerald-700">{request.status}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
                  <PackageSearch className="mx-auto text-slate-300" size={34} />
                  <p className="mt-2 text-sm font-semibold text-slate-500">No issues reported.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
