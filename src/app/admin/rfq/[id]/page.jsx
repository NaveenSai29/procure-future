'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileText, Building2, Mail, Phone, Calendar,
  DollarSign, Award, Clock, Package, User, Tag, Eye
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRFQDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRFQ(); }, [id]);

  const fetchRFQ = async () => {
    try {
      const res = await fetch('/api/admin/rfq/' + id);
      const data = await res.json();
      setRfq(data);
    } catch { toast.error('Failed to load RFQ'); }
    finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0
  }).format(amount || 0);

  // Parse JSON description
  const getParsedInfo = (desc) => {
    if (!desc) return null;
    try {
      return JSON.parse(desc);
    } catch (e) { return null; }
  };

  const parsedInfo = getParsedInfo(rfq?.description);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );
  
  if (!rfq) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">RFQ not found</p>
    </div>
  );

  const sortedQuotes = [...(rfq.quotations || [])].sort((a, b) => a.totalAmount - b.totalAmount);
  const lowestQuote = sortedQuotes[0];
  const highestQuote = sortedQuotes[sortedQuotes.length - 1];

  const statusColors = {
    PUBLISHED: 'bg-blue-100 text-blue-700',
    AWARDED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Back */}
        <button onClick={() => router.push('/admin/rfq')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to RFQs
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{rfq.title}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{rfq.buyer?.name}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{rfq.buyer?.email}</span>
                  {rfq.buyer?.mobile && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{rfq.buyer.mobile}</span>}
                </div>
              </div>
            </div>
            <span className={`px-3 py-1.5 text-sm rounded-full font-medium ${statusColors[rfq.status] || 'bg-gray-100'}`}>
              {rfq.status}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Quantity</p>
              <p className="font-medium text-sm">{rfq.quantity} {rfq.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Quotes Received</p>
              <p className="font-medium text-sm">{rfq.quotations?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deadline</p>
              <p className="font-medium text-sm">{rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'Open'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="font-medium text-sm">{new Date(rfq.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Parsed Description */}
          {parsedInfo && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {parsedInfo.productName && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Product</p>
                    <p className="font-medium text-sm flex items-center gap-1">
                      <Package className="h-3 w-3 text-gray-400" /> {parsedInfo.productName}
                    </p>
                  </div>
                )}
                {parsedInfo.marketPrice && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs text-blue-600">Market Price</p>
                    <p className="font-bold text-sm text-blue-700">₹{Number(parsedInfo.marketPrice).toLocaleString()}/{rfq.unit}</p>
                  </div>
                )}
                {parsedInfo.expectedPrice && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-green-600">Buyer's Offer</p>
                    <p className="font-bold text-sm text-green-700">₹{Number(parsedInfo.expectedPrice).toLocaleString()}/{rfq.unit}</p>
                  </div>
                )}
                {parsedInfo.neededBy && (
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <p className="text-xs text-orange-600">Needed By</p>
                    <p className="font-medium text-sm text-orange-700">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(parsedInfo.neededBy).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {parsedInfo.notes && (
                  <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700">{parsedInfo.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!parsedInfo && rfq.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">{rfq.description}</p>
            </div>
          )}
        </div>

        {/* Quotations */}
        {rfq.quotations?.length > 0 ? (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Quotations ({rfq.quotations.length})
            </h2>

            {/* Bar Comparison */}
            <div className="mb-6 space-y-3">
              {sortedQuotes.map(q => {
                const maxAmount = highestQuote?.totalAmount || 1;
                const width = Math.max((q.totalAmount / maxAmount) * 100, 8);
                const isLowest = q.id === lowestQuote?.id;
                const perUnit = q.items?.[0]?.unitPrice || Math.round(q.totalAmount / (rfq.quantity || 1));
                
                return (
                  <div key={q.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{q.supplier?.businessName}</span>
                      <span className="text-xs text-gray-400">₹{perUnit.toLocaleString()}/{rfq.unit} × {rfq.quantity} = {formatCurrency(q.totalAmount)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                        <div
                          className={`h-full rounded-full flex items-center px-3 text-xs text-white font-medium ${isLowest ? 'bg-green-500' : 'bg-blue-400'}`}
                          style={{ width: `${width}%` }}
                        >
                          {formatCurrency(q.totalAmount)}
                        </div>
                      </div>
                      {q.status === 'ACCEPTED' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Awarded</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 pl-1">
                      <span>Delivery: {q.deliveryDays || '-'} days</span>
                      {q.terms && <span className="truncate max-w-[300px]">Note: {q.terms}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail Table */}
            <div className="overflow-x-auto mt-4 pt-4 border-t">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Supplier</th>
                    <th className="text-right px-3 py-2">Per Unit</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-right px-3 py-2">Delivery</th>
                    <th className="text-center px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rfq.quotations.map(q => {
                    const perUnit = q.items?.[0]?.unitPrice || Math.round(q.totalAmount / (rfq.quantity || 1));
                    return (
                      <tr key={q.id} className={q.status === 'ACCEPTED' ? 'bg-green-50' : ''}>
                        <td className="px-3 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                              {q.supplier?.businessName?.charAt(0)}
                            </div>
                            {q.supplier?.businessName}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-bold">₹{perUnit.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(q.totalAmount)}</td>
                        <td className="px-3 py-2 text-right">{q.deliveryDays || '-'} days</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {q.status === 'ACCEPTED' ? 'Awarded' : 'Submitted'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No quotations yet</p>
            <p className="text-sm text-gray-400 mt-1">Waiting for suppliers to respond</p>
          </div>
        )}

        {/* Timeline / Status */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" /> Status Timeline
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">Created</span>
            <span className="text-gray-300">→</span>
            <span className={`px-3 py-1.5 rounded-full font-medium ${
              rfq.quotations?.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
            }`}>
              {rfq.quotations?.length || 0} Quotes
            </span>
            <span className="text-gray-300">→</span>
            <span className={`px-3 py-1.5 rounded-full font-medium ${
              rfq.status === 'AWARDED' ? 'bg-green-100 text-green-700' :
              rfq.status === 'CLOSED' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-400'
            }`}>
              {rfq.status === 'AWARDED' ? 'Awarded' : rfq.status === 'CLOSED' ? 'Closed' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}