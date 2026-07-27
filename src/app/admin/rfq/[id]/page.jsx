'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileText, Building2, Mail, Phone, Calendar,
  DollarSign, Award, CheckCircle, XCircle, Clock, Tag,
  Package, Download, TrendingDown, TrendingUp, BarChart3
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

  const handleStatusChange = async (newStatus, awardedSupplierId) => {
    try {
      const body = { status: newStatus };
      if (awardedSupplierId) body.awardedSupplierId = awardedSupplierId;
      
      const res = await fetch('/api/admin/rfq/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.success('RFQ ' + newStatus.toLowerCase());
        fetchRFQ();
      }
    } catch { toast.error('Failed to update'); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0
  }).format(amount || 0);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!rfq) return <div className="p-6">RFQ not found</div>;

  const sortedQuotes = [...(rfq.quotations || [])].sort((a, b) => a.totalAmount - b.totalAmount);
  const lowestQuote = sortedQuotes[0];
  const highestQuote = sortedQuotes[sortedQuotes.length - 1];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => router.push('/admin/rfq')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to RFQs
      </button>

      {/* RFQ Header */}
      <div className="bg-white rounded-xl border p-6 mb-6">
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
          <span className={`px-3 py-1.5 text-sm rounded-full font-medium ${
            rfq.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-700' :
            rfq.status === 'AWARDED' ? 'bg-green-100 text-green-700' :
            rfq.status === 'CLOSED' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {rfq.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500">Category</p>
            <p className="font-medium text-sm">{rfq.category?.name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Quantity</p>
            <p className="font-medium text-sm">{rfq.quantity} {rfq.unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Budget Range</p>
            <p className="font-medium text-sm">{formatCurrency(rfq.budgetMin)} - {formatCurrency(rfq.budgetMax)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Deadline</p>
            <p className="font-medium text-sm">{rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'Open'}</p>
          </div>
        </div>

        {rfq.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">{rfq.description}</p>
          </div>
        )}
      </div>

      {/* Items */}
      {rfq.items?.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">RFQ Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-left px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rfq.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-gray-500">{item.description || '-'}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quotation Comparison */}
      {rfq.quotations?.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Quotation Comparison ({rfq.quotations.length} quotes)
          </h2>

          {/* Comparison Bar Chart */}
          <div className="mb-6 space-y-2">
            {sortedQuotes.map(q => {
              const maxAmount = highestQuote?.totalAmount || 1;
              const width = (q.totalAmount / maxAmount * 100);
              const isLowest = q.id === lowestQuote?.id;
              return (
                <div key={q.id} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-600 truncate">{q.supplier?.businessName}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full flex items-center px-2 text-xs text-white font-medium ${isLowest ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: Math.max(width, 5) + '%' }}
                    >
                      {formatCurrency(q.totalAmount)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleStatusChange('AWARDED', q.supplierId)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                      q.status === 'ACCEPTED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                    }`}
                  >
                    {q.status === 'ACCEPTED' ? 'Awarded' : 'Award'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Detailed Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Supplier</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-right px-3 py-2">Tax</th>
                  <th className="text-right px-3 py-2">Delivery</th>
                  <th className="text-right px-3 py-2">Validity</th>
                  <th className="text-center px-3 py-2">Status</th>
                  <th className="text-center px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rfq.quotations.map(q => (
                  <tr key={q.id} className={q.status === 'ACCEPTED' ? 'bg-green-50' : ''}>
                    <td className="px-3 py-2 font-medium">{q.supplier?.businessName}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(q.totalAmount)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(q.taxAmount)}</td>
                    <td className="px-3 py-2 text-right">{q.deliveryDays || '-'} days</td>
                    <td className="px-3 py-2 text-right">{q.validityDays} days</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        q.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {q.status !== 'ACCEPTED' && q.status !== 'REJECTED' && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStatusChange('AWARDED', q.supplierId)}
                            className="p-1 hover:bg-green-100 rounded"
                          >
                            <Award className="h-4 w-4 text-green-500" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Responses */}
      {rfq.responses?.length > 0 && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Supplier Responses ({rfq.responses.length})</h2>
          <div className="space-y-3">
            {rfq.responses.map(response => (
              <div key={response.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                    {response.supplier?.businessName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{response.supplier?.businessName}</p>
                    <p className="text-xs text-gray-500">{response.supplier?.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  response.status === 'SHORTLISTED' ? 'bg-green-100 text-green-700' :
                  response.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {response.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {rfq.status === 'PUBLISHED' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Admin Actions</h2>
          <div className="flex gap-3">
            {rfq.quotations?.length > 0 && (
              <button
                onClick={() => {
                  const best = sortedQuotes[0];
                  handleStatusChange('AWARDED', best?.supplierId);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
              >
                <Award className="h-4 w-4" /> Award to Lowest Bidder ({formatCurrency(lowestQuote?.totalAmount)})
              </button>
            )}
            <button
              onClick={() => handleStatusChange('CLOSED')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" /> Close RFQ
            </button>
            <button
              onClick={() => handleStatusChange('CANCELLED')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" /> Cancel RFQ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}