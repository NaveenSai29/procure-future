'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Building, CreditCard, Check, Search, Loader2, AlertCircle, Shield, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [ifscVerified, setIfscVerified] = useState(false);
  const [pennyDropResult, setPennyDropResult] = useState(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [form, setForm] = useState({
    accountHolder: '', accountNumber: '', confirmAccount: '',
    ifscCode: '', bankName: '', branchName: '', isDefault: false
  });

  useEffect(() => { fetchAccounts(); checkPayoutStatus(); }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/supplier/bank-accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {} finally { setLoading(false); }
  };

  const checkPayoutStatus = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setPayoutsEnabled(data.settings?.PAYMENT?.razorpayPayoutsEnabled || false);
    } catch { setPayoutsEnabled(false); }
  };

  // Verify IFSC and fetch bank details
  const verifyIFSC = async (ifsc) => {
    if (!ifsc || ifsc.length < 11) { setIfscVerified(false); return; }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc.toUpperCase())) {
      toast.error('Invalid IFSC format. Example: SBIN0001234');
      setIfscVerified(false);
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, bankName: data.BANK || '', branchName: data.BRANCH || '', ifscCode: ifsc.toUpperCase() }));
        setIfscVerified(true);
        toast.success(`Bank verified: ${data.BANK}, ${data.BRANCH}`);
      } else {
        toast.error('IFSC not found. Please check and try again.');
        setIfscVerified(false);
      }
    } catch {
      setIfscVerified(true);
      toast.success('IFSC format verified');
    } finally {
      setVerifying(false);
    }
  };

  // Penny Drop Verification
  const handlePennyDropVerify = async () => {
    if (!form.accountNumber || !form.ifscCode || !form.accountHolder) {
      return toast.error('Please fill all fields before verification');
    }

    setVerifying(true);
    setPennyDropResult(null);

    try {
      const res = await fetch('/api/payments/bank/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_bank',
          accountNumber: form.accountNumber,
          ifsc: form.ifscCode,
          accountHolder: form.accountHolder,
        }),
      });

      const result = await res.json();

      if (result.valid && result.nameMatch) {
        setPennyDropResult({
          status: 'success',
          nameAtBank: result.nameAtBank,
          message: 'Account verified successfully! Name matches bank records.',
        });
        toast.success('Bank account verified successfully!');
      } else if (result.valid && !result.nameMatch) {
        setPennyDropResult({
          status: 'mismatch',
          nameAtBank: result.nameAtBank,
          message: `Name mismatch! Bank has "${result.nameAtBank}" but you entered "${form.accountHolder}". Please correct the name.`,
        });
        toast.error('Name mismatch with bank records');
      } else {
        setPennyDropResult({
          status: 'error',
          message: result.error || 'Verification failed. Please check your details.',
        });
        toast.error(result.error || 'Verification failed');
      }
    } catch (error) {
      setPennyDropResult({
        status: 'error',
        message: 'Verification service unavailable. Try again later.',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Submit (with or without penny drop)
  const handleSubmit = async () => {
    // Validations
    if (!form.accountHolder.trim()) return toast.error('Account holder name is required');
    if (!form.accountNumber.trim()) return toast.error('Account number is required');
    
    // Double check account number only if penny drop not available
    if (!payoutsEnabled) {
      if (form.accountNumber !== form.confirmAccount) return toast.error('Account numbers do not match');
      if (form.accountNumber.length < 9 || form.accountNumber.length > 18) return toast.error('Account number should be 9-18 digits');
    }
    
    if (!form.ifscCode.trim()) return toast.error('IFSC code is required');
    if (!ifscVerified) return toast.error('Please verify IFSC code first');
    if (!form.bankName) return toast.error('Bank name is required');

    // If penny drop available but not done, warn
    if (payoutsEnabled && !pennyDropResult) {
      if (!confirm('Verify this bank account with Penny Drop? This ensures the account is correct and prevents settlement failures.')) return;
      await handlePennyDropVerify();
      return;
    }

    // If penny drop done but name mismatch, block
    if (pennyDropResult?.status === 'mismatch') {
      return toast.error('Please correct the account holder name to match bank records');
    }

    const url = editing ? '/api/supplier/bank-accounts/' + editing.id : '/api/supplier/bank-accounts';
    const method = editing ? 'PATCH' : 'POST';
    const { confirmAccount, ...submitData } = form;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...submitData,
        pennyDropVerified: !!pennyDropResult?.status === 'success',
      }),
    });

    if (res.ok) {
      toast.success(editing ? 'Bank account updated' : 'Bank account added successfully');
      setShowModal(false); resetForm(); fetchAccounts();
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bank account? You will need to add a new one for settlements.')) return;
    await fetch('/api/supplier/bank-accounts/' + id, { method: 'DELETE' });
    toast.success('Bank account deleted');
    fetchAccounts();
  };

  const resetForm = () => {
    setEditing(null); setIfscVerified(false); setPennyDropResult(null);
    setForm({ accountHolder: '', accountNumber: '', confirmAccount: '', ifscCode: '', bankName: '', branchName: '', isDefault: false });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-500 mt-1">Manage your settlement bank accounts for receiving payments</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Bank Account
        </button>
      </div>

      {/* Bank Accounts List */}
      <div className="space-y-3">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-xl border p-5 flex items-center justify-between hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${acc.isDefault ? 'bg-green-100' : 'bg-blue-100'}`}>
                <Building className={`h-6 w-6 ${acc.isDefault ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{acc.bankName}</p>
                  {acc.isDefault && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Default</span>}
                  {acc.pennyDropVerified && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{acc.accountHolder} • A/C: ••••{acc.accountNumber?.slice(-4)}</p>
                <p className="text-xs text-gray-400">IFSC: {acc.ifscCode} • {acc.branchName}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => {
                setEditing(acc);
                setForm({
                  accountHolder: acc.accountHolder, accountNumber: acc.accountNumber, confirmAccount: acc.accountNumber,
                  ifscCode: acc.ifscCode, bankName: acc.bankName, branchName: acc.branchName || '', isDefault: acc.isDefault
                });
                setIfscVerified(true);
                if (acc.pennyDropVerified) setPennyDropResult({ status: 'success', nameAtBank: acc.accountHolder });
                setShowModal(true);
              }} className="p-2 hover:bg-gray-100 rounded-lg">
                <Edit className="h-4 w-4 text-gray-400" />
              </button>
              <button onClick={() => handleDelete(acc.id)} className="p-2 hover:bg-red-50 rounded-lg">
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No bank accounts added</p>
            <p className="text-gray-400 text-sm mt-1">Add a bank account to receive your earnings</p>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              Add Bank Account
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit Bank Account' : 'Add Bank Account'}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              {/* Account Holder */}
              <div>
                <label className="text-sm font-medium text-gray-700">Account Holder Name *</label>
                <input type="text" value={form.accountHolder}
                  onChange={(e) => { setForm(prev => ({ ...prev, accountHolder: e.target.value })); setPennyDropResult(null); }}
                  className={`w-full px-3 py-2.5 border rounded-lg mt-1 ${pennyDropResult?.status === 'mismatch' ? 'border-red-300' : pennyDropResult?.status === 'success' ? 'border-green-300 bg-green-50' : ''}`}
                  placeholder="As per bank records" />
                {pennyDropResult?.status === 'mismatch' && (
                  <p className="text-xs text-red-500 mt-1">Bank records show: "{pennyDropResult.nameAtBank}"</p>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="text-sm font-medium text-gray-700">Account Number *</label>
                <input type="text" value={form.accountNumber} maxLength={18}
                  onChange={(e) => { setForm(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') })); setPennyDropResult(null); }}
                  className="w-full px-3 py-2.5 border rounded-lg mt-1 font-mono"
                  placeholder={payoutsEnabled ? "Enter once - verified automatically" : "Enter 9-18 digit account number"} />
              </div>

              {/* Confirm Account Number - Only if penny drop NOT available */}
              {!payoutsEnabled && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Confirm Account Number *</label>
                  <input type="text" value={form.confirmAccount} maxLength={18}
                    onChange={(e) => setForm(prev => ({ ...prev, confirmAccount: e.target.value.replace(/\D/g, '') }))}
                    className={`w-full px-3 py-2.5 border rounded-lg mt-1 font-mono ${form.confirmAccount && form.accountNumber !== form.confirmAccount ? 'border-red-300' : form.confirmAccount && form.accountNumber === form.confirmAccount ? 'border-green-300' : ''}`}
                    placeholder="Re-enter account number" />
                  {form.confirmAccount && form.accountNumber !== form.confirmAccount && (
                    <p className="text-xs text-red-500 mt-1">Account numbers do not match</p>
                  )}
                </div>
              )}

              {/* IFSC Code */}
              <div>
                <label className="text-sm font-medium text-gray-700">IFSC Code *</label>
                <div className="flex gap-2 mt-1">
                  <input type="text" value={form.ifscCode} maxLength={11}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setForm(prev => ({ ...prev, ifscCode: val }));
                      if (val.length === 11) verifyIFSC(val);
                      else setIfscVerified(false);
                    }}
                    className={`flex-1 px-3 py-2.5 border rounded-lg font-mono uppercase ${ifscVerified ? 'border-green-300 bg-green-50' : ''}`}
                    placeholder="e.g., SBIN0001234" />
                  <button onClick={() => verifyIFSC(form.ifscCode)} disabled={verifying || form.ifscCode.length < 11}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-1 whitespace-nowrap">
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Verify
                  </button>
                </div>
                {ifscVerified && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="h-3 w-3" /> IFSC verified</p>}
              </div>

              {/* Bank Name */}
              <div>
                <label className="text-sm font-medium text-gray-700">Bank Name *</label>
                <input type="text" value={form.bankName}
                  onChange={(e) => setForm(prev => ({ ...prev, bankName: e.target.value }))}
                  className={`w-full px-3 py-2.5 border rounded-lg mt-1 ${ifscVerified ? 'bg-gray-50' : ''}`}
                  placeholder="Auto-filled from IFSC" readOnly={ifscVerified} />
              </div>

              {/* Branch */}
              <div>
                <label className="text-sm font-medium text-gray-700">Branch</label>
                <input type="text" value={form.branchName}
                  onChange={(e) => setForm(prev => ({ ...prev, branchName: e.target.value }))}
                  className={`w-full px-3 py-2.5 border rounded-lg mt-1 ${ifscVerified ? 'bg-gray-50' : ''}`}
                  placeholder="Auto-filled from IFSC" readOnly={ifscVerified} />
              </div>

              {/* Default Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm(prev => ({ ...prev, isDefault: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Set as default settlement account</span>
              </label>

              {/* Penny Drop Result */}
              {pennyDropResult && (
                <div className={`p-3 rounded-lg ${pennyDropResult.status === 'success' ? 'bg-green-50 border border-green-200' : pennyDropResult.status === 'mismatch' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {pennyDropResult.status === 'success' ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                    {pennyDropResult.message}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border rounded-lg font-medium">Cancel</button>
              
              {payoutsEnabled && !pennyDropResult && (
                <button onClick={handlePennyDropVerify} disabled={verifying || !form.accountNumber || !form.ifscCode || !form.accountHolder}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  {verifying ? 'Verifying...' : 'Verify & Add'}
                </button>
              )}

              {(!payoutsEnabled || pennyDropResult?.status === 'success') && (
                <button onClick={handleSubmit} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />{editing ? 'Update' : 'Add Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}