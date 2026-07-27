'use client';

import { useState, useEffect } from 'react';
import { Building, Search, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBankAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState({});

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/admin/finance/bank-accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const toggleShowNumber = (id) => {
    setShowAccountNumber(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const filtered = accounts.filter(a =>
    !searchTerm ||
    a.supplier?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.accountHolder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.bankName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.accountNumber?.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Bank Accounts</h1>
          <p className="text-gray-500 mt-1">{accounts.length} bank accounts registered</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" placeholder="Search by supplier name, bank, account number..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
      </div>

      <div className="space-y-3">
        {filtered.map(acc => (
          <div key={acc.id} className="bg-white rounded-xl border p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${acc.isDefault ? 'bg-green-100' : 'bg-blue-100'}`}>
                  <Building className={`h-6 w-6 ${acc.isDefault ? 'text-green-600' : 'text-blue-600'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{acc.supplier?.businessName || 'Unknown Supplier'}</h3>
                    {acc.isDefault && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Default</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
                    <div>
                      <span className="text-gray-400">Account Holder:</span>
                      <span className="ml-2 font-medium">{acc.accountHolder}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Bank:</span>
                      <span className="ml-2 font-medium">{acc.bankName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Account Number:</span>
                      <span className="ml-2 font-mono">
                        {showAccountNumber[acc.id] ? acc.accountNumber : '••••' + acc.accountNumber?.slice(-4)}
                        <button onClick={() => toggleShowNumber(acc.id)} className="ml-1 p-0.5 hover:bg-gray-100 rounded">
                          {showAccountNumber[acc.id] ? <EyeOff className="h-3.5 w-3.5 text-gray-400" /> : <Eye className="h-3.5 w-3.5 text-gray-400" />}
                        </button>
                        <button onClick={() => copyToClipboard(acc.accountNumber)} className="ml-1 p-0.5 hover:bg-gray-100 rounded">
                          <Copy className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">IFSC:</span>
                      <span className="ml-2 font-mono font-medium">{acc.ifscCode}</span>
                    </div>
                    {acc.branchName && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Branch:</span>
                        <span className="ml-2">{acc.branchName}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Added: {new Date(acc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400">Supplier ID</span>
                <p className="text-xs font-mono text-gray-500">{acc.supplierId?.slice(0, 8)}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No bank accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
}