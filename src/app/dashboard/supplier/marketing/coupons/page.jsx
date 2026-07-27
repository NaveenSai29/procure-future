'use client';

import { useState, useEffect } from 'react';
import {
  Ticket, Plus, Edit, Trash2, X, Save, Search,
  Percent, IndianRupee, Calendar, Copy, Power, PowerOff
} from 'lucide-react';
import { toast } from 'sonner';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const [form, setForm] = useState({
    code: '', description: '', discountType: 'PERCENTAGE',
    discountValue: 10, minOrderAmount: 0, maxDiscount: '',
    usageLimit: 100, startDate: '', endDate: ''
  });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/supplier/coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingCoupon
        ? '/api/supplier/coupons/' + editingCoupon.id
        : '/api/supplier/coupons';
      const method = editingCoupon ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
        setShowModal(false);
        resetForm();
        fetchCoupons();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save coupon');
      }
    } catch {
      toast.error('Failed to save coupon');
    }
  };

  const handleDelete = async (couponId) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await fetch('/api/supplier/coupons/' + couponId, { method: 'DELETE' });
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      await fetch('/api/supplier/coupons/' + couponId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(newStatus === 'ACTIVE' ? 'Coupon activated' : 'Coupon disabled');
      fetchCoupons();
    } catch {
      toast.error('Failed to update coupon');
    }
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || 0,
      maxDiscount: coupon.maxDiscount || '',
      usageLimit: coupon.usageLimit,
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setForm({
      code: '', description: '', discountType: 'PERCENTAGE',
      discountValue: 10, minOrderAmount: 0, maxDiscount: '',
      usageLimit: 100, startDate: '', endDate: ''
    });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied');
  };

  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-700',
      EXPIRED: 'bg-gray-100 text-gray-600',
      DISABLED: 'bg-red-100 text-red-700',
      DELETED: 'bg-red-100 text-red-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500 mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Validity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map(coupon => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">{coupon.code}</span>
                      <button onClick={() => copyCode(coupon.code)} className="p-1 hover:bg-gray-200 rounded">
                        <Copy className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{coupon.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {coupon.discountType === 'PERCENTAGE' ? (
                      <span className="text-green-600 font-medium">{coupon.discountValue}% Off</span>
                    ) : (
                      <span className="text-green-600 font-medium">Rs.{coupon.discountValue} Off</span>
                    )}
                    {coupon.minOrderAmount > 0 && (
                      <p className="text-xs text-gray-400">Min order: Rs.{coupon.minOrderAmount}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100) + '%' }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{coupon.usageCount}/{coupon.usageLimit}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(coupon.startDate).toLocaleDateString()} - {new Date(coupon.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(coupon.status)}`}>
                      {coupon.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(coupon)} className="p-1.5 hover:bg-gray-100 rounded">
                        <Edit className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(coupon.id, coupon.status)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title={coupon.status === 'ACTIVE' ? 'Disable' : 'Activate'}
                      >
                        {coupon.status === 'ACTIVE' ? (
                          <PowerOff className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Power className="h-4 w-4 text-green-500" />
                        )}
                      </button>
                      <button onClick={() => handleDelete(coupon.id)} className="p-1.5 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No coupons created yet</p>
                    <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-700 text-sm mt-1">
                      Create your first coupon
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Coupon Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1 font-mono"
                  placeholder="SUMMER20"
                  disabled={!!editingCoupon}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="Summer sale discount"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Discount Value</label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm(prev => ({ ...prev, discountValue: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Order Amount</label>
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm(prev => ({ ...prev, minOrderAmount: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Discount</label>
                  <input
                    type="number"
                    value={form.maxDiscount}
                    onChange={(e) => setForm(prev => ({ ...prev, maxDiscount: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Usage Limit</label>
                <input
                  type="number"
                  value={form.usageLimit}
                  onChange={(e) => setForm(prev => ({ ...prev, usageLimit: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                {editingCoupon ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}