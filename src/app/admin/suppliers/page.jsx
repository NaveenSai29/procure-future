'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, Search, CheckCircle, Ban, Package, Warehouse, Mail, Phone, Shield, RefreshCw, BadgeCheck, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/admin/suppliers');
      const data = await res.json();
      if (data.success) setSuppliers(data.data || data);
    } catch {} finally { setLoading(false); }
  };

  const handleGstVerify = async (supplierId) => {
    setVerifyingId(supplierId);
    try {
      const res = await fetch('/api/admin/gst/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      });
      const json = await res.json();
      if (json.success && json.data.verified) {
        toast.success('GST Verified: ' + json.data.businessName);
        fetchSuppliers();
      } else {
        toast.error(json.data?.error || 'GST Verification failed');
      }
    } catch {
      toast.error('Verification request failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleToggleActive = async (supplierId) => {
    try {
      await fetch('/api/admin/suppliers', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId, action: 'toggleActive' })
      });
      toast.success('Status toggled');
      fetchSuppliers();
    } catch { toast.error('Failed'); }
  };

  const filtered = suppliers.filter(s => {
    const matchSearch = !searchTerm || 
      s.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.gstin?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'VERIFIED') return matchSearch && s.isVerified;
    if (statusFilter === 'PENDING') return matchSearch && !s.isVerified;
    if (statusFilter === 'INACTIVE') return matchSearch && !s.isActive;
    return matchSearch;
  });

  const tabs = [
    { value: 'ALL', label: 'All', count: suppliers.length },
    { value: 'PENDING', label: 'Pending KYC', count: suppliers.filter(s => !s.isVerified).length },
    { value: 'VERIFIED', label: 'Verified', count: suppliers.filter(s => s.isVerified).length },
    { value: 'INACTIVE', label: 'Inactive', count: suppliers.filter(s => !s.isActive).length },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">
            {suppliers.length} total • {suppliers.filter(s => !s.isVerified).length} pending verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/gst"
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
          >
            <BadgeCheck className="h-4 w-4" />
            GST Verification
          </Link>
          <Link
            href="/admin/kyc"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            KYC Verification Queue
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              statusFilter === tab.value
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, GSTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Supplier List */}
      <div className="space-y-3">
        {filtered.map(supplier => (
          <div
            key={supplier.id}
            className={`bg-white rounded-xl border p-5 transition hover:shadow-sm ${
              !supplier.isVerified ? 'border-l-4 border-l-yellow-400' : 
              !supplier.isActive ? 'border-l-4 border-l-red-400' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 ${
                  supplier.isVerified ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {supplier.logo ? (
                    <img src={supplier.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <Store className={`h-6 w-6 ${supplier.isVerified ? 'text-green-600' : 'text-yellow-600'}`} />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900">{supplier.businessName}</h3>
                    {!supplier.isVerified && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                        Pending KYC
                      </span>
                    )}
                    {supplier.isVerified && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        ✓ Verified
                      </span>
                    )}
                    {!supplier.isActive && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        Inactive
                      </span>
                    )}
                    {/* GST Verification Status Badge */}
                    {supplier.gstVerified ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" /> GST Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> GST Unverified
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{supplier.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{supplier.mobile}</span>
                    {supplier.gstin && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">GST: {supplier.gstin}</span>}
                    {supplier.gstBusinessName && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded" title="GST Portal Business Name">
                        GST Name: {supplier.gstBusinessName}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" />{supplier._count?.products || 0} products</span>
                    <span className="flex items-center gap-1">
                      <Warehouse className="h-3 w-3" />
                      {supplier._count?.warehouses || 0} warehouse(s)
                      {supplier.warehouses?.length > 0 && (
                        <span className="text-gray-400 ml-1">
                          • {supplier.warehouses.map(w => `${w.name} (${w.city || "N/A"})`).join(", ")}
                          {supplier._count?.warehouses > 3 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                fetch(`/api/warehouses?supplierId=${supplier.id}`)
                                  .then(r => r.json())
                                  .then(d => {
                                    if (d.success) {
                                      const all = d.data || d;
                                      const names = all.map(w => `• ${w.name} (${w.city || "N/A"}, ${w.state || ""})`).join("\n");
                                      toast(`All ${all.length} Warehouses for ${supplier.businessName}`, {
                                        description: names,
                                        duration: 8000,
                                      });
                                    }
                                  });
                              }}
                              className="text-blue-600 hover:underline text-xs"
                              title="Show all warehouses"
                            >
                              +{supplier._count.warehouses - 3} more
                            </button>
                          )}
                        </span>
                      )}
                    </span>
                    <span>{supplier.staff?.length || 0} staff</span>
                    <span>Joined: {new Date(supplier.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* GST Verify Button - only show if unverified */}
                {!supplier.gstVerified && (
                  <button
                    onClick={() => handleGstVerify(supplier.id)}
                    disabled={verifyingId === supplier.id}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-1 transition disabled:opacity-50"
                  >
                    {verifyingId === supplier.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Verify GST
                  </button>
                )}
                {/* Re-verify button for already verified */}
                {supplier.gstVerified && (
                  <button
                    onClick={() => handleGstVerify(supplier.id)}
                    disabled={verifyingId === supplier.id}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                    title="Re-verify GSTIN"
                  >
                    {verifyingId === supplier.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Re-verify
                  </button>
                )}
                {!supplier.isVerified && (
                  <Link
                    href={`/admin/kyc?supplierId=${supplier.id}`}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium flex items-center gap-1 transition"
                  >
                    <Shield className="h-4 w-4" />
                    Review KYC
                  </Link>
                )}
                <button
                  onClick={() => handleToggleActive(supplier.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${
                    supplier.isActive
                      ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                  title={supplier.isActive ? 'Deactivate supplier' : 'Activate supplier'}
                >
                  {supplier.isActive ? (
                    <><Ban className="h-4 w-4" /> Deactivate</>
                  ) : (
                    <><CheckCircle className="h-4 w-4" /> Activate</>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Store className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No suppliers found</p>
            <p className="text-sm">Try changing the filter or search</p>
          </div>
        )}
      </div>
    </div>
  );
}