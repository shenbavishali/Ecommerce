import React, { useMemo, useState } from 'react';
import { Edit3, Home, Plus, Save, Star, Trash2, UserRound, WalletCards, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getAllReviewsFromData, getProfileFromData, useProfileStore } from '../store/profileStore';

const blankAddress = { name: '', phone: '', line: '', city: '', pincode: '' };
const blankCard = { name: '', number: '', expiry: '' };
function EditableField({ label, value, placeholder, type = 'text', onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  return (
    <div className="border-b border-slate-200 py-5 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          {editing ? (
            <input
              className="mt-2 h-11 w-full max-w-md rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-500"
              onChange={(event) => setDraft(event.target.value)}
              placeholder={placeholder}
              type={type}
              value={draft}
            />
          ) : (
            <p className="mt-2 text-base font-black text-slate-950">{value || placeholder}</p>
          )}
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-700"
              onClick={() => {
                onSave(draft.trim());
                setEditing(false);
              }}
              type="button"
            >
              <Save size={15} />
              Save
            </button>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
              onClick={() => {
                setDraft(value || '');
                setEditing(false);
              }}
              type="button"
            >
              <X size={15} />
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-emerald-700 hover:bg-emerald-50"
            onClick={() => setEditing(true)}
            type="button"
          >
            <Edit3 size={15} />
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ id, title, icon: Icon, activeSection, setActiveSection }) {
  return (
    <button
      className={`flex w-full items-center gap-3 p-4 text-left text-sm font-black ${
        activeSection === id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
      }`}
      onClick={() => setActiveSection(id)}
      type="button"
    >
      <Icon size={18} className="text-emerald-600" />
      {title}
    </button>
  );
}

export default function ProfilePanel() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const profileData = useProfileStore((state) => state.data);
  const addAddress = useProfileStore((state) => state.addAddress);
  const updateAddress = useProfileStore((state) => state.updateAddress);
  const deleteAddress = useProfileStore((state) => state.deleteAddress);
  const addUpi = useProfileStore((state) => state.addUpi);
  const deleteUpi = useProfileStore((state) => state.deleteUpi);
  const addCard = useProfileStore((state) => state.addCard);
  const deleteCard = useProfileStore((state) => state.deleteCard);
  const profile = useMemo(
    () => getProfileFromData(profileData, user),
    [profileData, user]
  );
  const reviews = useMemo(
    () => getAllReviewsFromData(profileData),
    [profileData]
  );
  const [activeSection, setActiveSection] = useState('profile');
  const [addressForm, setAddressForm] = useState(blankAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [upiDraft, setUpiDraft] = useState('');
  const [cardForm, setCardForm] = useState(blankCard);

  if (!user) {
    return null;
  }

  const submitAddress = (event) => {
    event.preventDefault();
    if (editingAddressId) {
      updateAddress(user, editingAddressId, addressForm);
    } else {
      addAddress(user, addressForm);
    }
    setAddressForm(blankAddress);
    setEditingAddressId(null);
  };

  const renderContent = () => {
    if (activeSection === 'address') {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Manage Address</h1>
          <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={submitAddress}>
            {[
              ['name', 'Full name'],
              ['phone', 'Phone number'],
              ['line', 'Address'],
              ['city', 'City'],
              ['pincode', 'Pincode'],
            ].map(([key, label]) => (
              <label className={key === 'line' ? 'md:col-span-2' : ''} key={key}>
                <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                <input
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
                  onChange={(event) => setAddressForm({ ...addressForm, [key]: event.target.value })}
                  required
                  value={addressForm[key]}
                />
              </label>
            ))}
            <button className="h-11 rounded-md bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 md:col-span-2" type="submit">
              {editingAddressId ? 'Save Address' : 'Add Address'}
            </button>
          </form>
          <div className="mt-5 grid gap-3">
            {profile.addresses.map((address) => (
              <div className="rounded-md border border-slate-200 p-4" key={address.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{address.name} | {address.phone}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{address.line}, {address.city} - {address.pincode}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="h-9 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700" onClick={() => {
                      setAddressForm(address);
                      setEditingAddressId(address.id);
                    }} type="button">Edit</button>
                    <button className="h-9 rounded-md border border-rose-200 px-3 text-sm font-bold text-rose-700" onClick={() => deleteAddress(user, address.id)} type="button">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {profile.addresses.length === 0 && <p className="text-sm font-semibold text-slate-500">No addresses saved yet.</p>}
          </div>
        </div>
      );
    }

    if (activeSection === 'payments') {
      return (
        <div className="grid gap-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-black text-slate-950">Saved UPI</h1>
            <div className="mt-4 flex gap-2">
              <input className="h-11 flex-1 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" onChange={(event) => setUpiDraft(event.target.value)} placeholder="name@bank" value={upiDraft} />
              <button className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white" onClick={() => {
                if (upiDraft.trim()) {
                  addUpi(user, upiDraft.trim());
                  setUpiDraft('');
                }
              }} type="button"><Plus size={16} />Save UPI</button>
            </div>
            <div className="mt-4 grid gap-2">
              {profile.upis.map((upi) => (
                <div className="flex items-center justify-between rounded-md border border-slate-200 p-3" key={upi.id}>
                  <span className="font-bold text-slate-700">{upi.upiId}</span>
                  <button className="text-rose-700" onClick={() => deleteUpi(user, upi.id)} type="button"><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Saved Cards</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ['number', 'Card number'],
                ['name', 'Name on card'],
                ['expiry', 'Expiry'],
              ].map(([key, label]) => (
                <label key={key}>
                  <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
                  <input className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" onChange={(event) => setCardForm({ ...cardForm, [key]: event.target.value })} value={cardForm[key]} />
                </label>
              ))}
              <button className="h-11 rounded-md bg-emerald-600 px-4 text-sm font-black text-white md:col-span-3" onClick={() => {
                if (cardForm.number && cardForm.name) {
                  addCard(user, { ...cardForm, last4: cardForm.number.slice(-4) });
                  setCardForm(blankCard);
                }
              }} type="button">Save Card</button>
            </div>
            <div className="mt-4 grid gap-2">
              {profile.cards.map((card) => (
                <div className="flex items-center justify-between rounded-md border border-slate-200 p-3" key={card.id}>
                  <span className="font-bold text-slate-700">{card.name} | **** {card.last4} | {card.expiry}</span>
                  <button className="text-rose-700" onClick={() => deleteCard(user, card.id)} type="button"><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'reviews') {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Product Reviews & Ratings</h1>
          <div className="mt-5 divide-y divide-slate-200">
            {reviews.map((review) => (
              <div className="py-4" key={review.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-black text-slate-950">{review.productName}</h2>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-sm font-black text-amber-700">{review.rating}/5</span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-700">{review.feedback}</p>
                <p className="mt-1 text-sm text-slate-600">{review.review}</p>
                {review.adminResponse && (
                  <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Admin response: {review.adminResponse}</p>
                )}
              </div>
            ))}
            {reviews.length === 0 && <p className="py-6 text-sm font-semibold text-slate-500">Delivered product reviews will appear here.</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h1 className="text-2xl font-black text-slate-950">My Profile</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Manage your personal information and account preferences.</p>
        </div>
        <div className="px-5">
          <EditableField label="Name" onSave={(fullName) => updateProfile({ full_name: fullName || user.full_name })} placeholder="Add your name" value={user.full_name} />
          <EditableField label="Email Address" onSave={(email) => updateProfile({ email: email || user.email })} placeholder="Add email address" type="email" value={user.email} />
          <EditableField label="Phone Number" onSave={(phone) => updateProfile({ phone })} placeholder="Add phone number" type="tel" value={user.phone} />
        </div>
      </div>
    );
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-emerald-50 text-emerald-700"><UserRound size={24} /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500">Hello,</p>
              <p className="truncate text-lg font-black text-slate-950">{user.full_name}</p>
            </div>
          </div>
          <Section activeSection={activeSection} icon={UserRound} id="profile" setActiveSection={setActiveSection} title="My Profile" />
          <Section activeSection={activeSection} icon={Home} id="address" setActiveSection={setActiveSection} title="Manage Address" />
          <Section activeSection={activeSection} icon={WalletCards} id="payments" setActiveSection={setActiveSection} title="Saved UPI & Saved Cards" />
          <Section activeSection={activeSection} icon={Star} id="reviews" setActiveSection={setActiveSection} title="My Reviews & Ratings" />
        </aside>
        {renderContent()}
      </div>
    </section>
  );
}
