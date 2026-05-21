import React from 'react';
import { Filter, Search } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

export default function Filters({ facets, filters, searchTerm, onFiltersChange, onSearchChange }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const categories = ['All', ...(facets?.categories || [])];
  const brands = ['All', ...(facets?.brands || [])];

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="text-emerald-600" size={20} />
        <h2 className="text-lg font-black">Filters</h2>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Search</span>
        <span className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Search size={18} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="shirts, sneakers, denim..."
            value={searchTerm}
          />
        </span>
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Category</span>
        <select
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
          onChange={(event) => updateFilter('category', event.target.value)}
          value={filters.category}
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Brand</span>
        <select
          className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"
          onChange={(event) => updateFilter('brand', event.target.value)}
          value={filters.brand}
        >
          {brands.map((brand) => (
            <option key={brand}>{brand}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
          <span>Max price</span>
          <span>{formatCurrency(filters.maxPrice)}</span>
        </span>
        <input
          className="w-full accent-emerald-600"
          max="200000"
          min="100"
          onChange={(event) => updateFilter('maxPrice', Number(event.target.value))}
          step="500"
          type="range"
          value={filters.maxPrice}
        />
      </label>
    </aside>
  );
}
