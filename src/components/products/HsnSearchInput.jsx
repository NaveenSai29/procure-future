// src/components/products/HsnSearchInput.jsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Check, Hash } from 'lucide-react';

export default function HsnSearchInput({ value, onChange, className = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedHsn, setSelectedHsn] = useState(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch HSN code info when value prop changes
  useEffect(() => {
    if (value && value !== selectedHsn?.code) {
      fetchHsnInfo(value);
    }
  }, [value]);

  const fetchHsnInfo = async (code) => {
    try {
      const res = await fetch(`/api/admin/hsn/search?q=${code}&limit=1`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setSelectedHsn(data.data[0]);
        setQuery('');
      }
    } catch {}
  };

  // Search HSN codes
  const searchHsn = async (q) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/hsn/search?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    if (selectedHsn) {
      setSelectedHsn(null);
      onChange('');
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchHsn(val), 300);
  };

  const handleSelect = (hsn) => {
    setSelectedHsn(hsn);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
    onChange(hsn.code);
  };

  const handleClear = () => {
    setSelectedHsn(null);
    setQuery('');
    setResults([]);
    onChange('');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <label className="text-sm font-medium text-gray-700">HSN Code</label>
      
      {selectedHsn ? (
        // Selected HSN display
        <div className="mt-1.5 flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{selectedHsn.code}</span>
              <span className="text-sm text-blue-800 truncate">{selectedHsn.description}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {selectedHsn.section && <span className="text-xs text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">{selectedHsn.section}</span>}
              <span className="text-xs text-blue-500">GST: {selectedHsn.gstRate}%</span>
            </div>
          </div>
          <button onClick={handleClear} className="p-1 hover:bg-blue-200 rounded text-blue-500" title="Remove">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Search input
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder="Search HSN code (e.g., 8504)"
            className="w-full pl-10 pr-8 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {query && (
            <button onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && !selectedHsn && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((hsn) => (
            <button
              key={hsn.code}
              onClick={() => handleSelect(hsn)}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b last:border-0 transition-colors"
            >
              <Hash className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{hsn.code}</span>
                  <span className="text-sm text-gray-700 truncate">{hsn.description}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {hsn.section && <span className="text-xs text-gray-400">{hsn.section}</span>}
                  <span className="text-xs font-medium text-gray-500">GST: {hsn.gstRate}%</span>
                </div>
              </div>
              <Check className="h-4 w-4 text-transparent" />
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {showDropdown && loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg p-3 text-center text-sm text-gray-400">
          Searching HSN codes...
        </div>
      )}

      {/* No results */}
      {showDropdown && !loading && query.length >= 2 && results.length === 0 && !selectedHsn && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg p-3 text-center text-sm text-gray-400">
          No HSN codes found for "{query}"
        </div>
      )}
    </div>
  );
}