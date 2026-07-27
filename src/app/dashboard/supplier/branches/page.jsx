'use client';

import { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit, Trash2, X, Save, MapPin,
  Phone, Mail, Star, Clock, Calendar, Users, ChevronRight,
  Home, Check
} from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  const [form, setForm] = useState({
    branchName: '', addressLine1: '', addressLine2: '', city: '',
    state: '', pincode: '', mobile: '', email: '', isHeadOffice: false
  });

  const [hoursForm, setHoursForm] = useState(
    DAYS.map((_, i) => ({ dayOfWeek: i, openTime: '09:00', closeTime: '18:00', isOpen: i !== 0 }))
  );

  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', description: '' });
  const [holidays, setHolidays] = useState([]);

  useEffect(() => { fetchBranches(); }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/supplier/branches');
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (error) {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchDetails = async (branchId) => {
    try {
      const res = await fetch('/api/supplier/branches/' + branchId);
      const data = await res.json();
      setSelectedBranch(data);
    } catch { toast.error('Failed to load branch details'); }
  };

  const fetchHolidays = async (branchId) => {
    try {
      const res = await fetch('/api/supplier/branches/' + branchId + '/holidays');
      const data = await res.json();
      setHolidays(data || []);
    } catch { toast.error('Failed to load holidays'); }
  };

  const handleSubmit = async () => {
    try {
      const url = editingBranch
        ? '/api/supplier/branches/' + editingBranch.id
        : '/api/supplier/branches';
      const method = editingBranch ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingBranch ? 'Branch updated' : 'Branch created');
        setShowModal(false);
        resetForm();
        fetchBranches();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch { toast.error('Failed to save branch'); }
  };

  const handleDelete = async (branchId, name) => {
    if (!confirm('Delete branch "' + name + '"?')) return;
    try {
      const res = await fetch('/api/supplier/branches/' + branchId, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Branch deleted');
        if (selectedBranch?.id === branchId) setSelectedBranch(null);
        fetchBranches();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Cannot delete');
      }
    } catch { toast.error('Failed to delete'); }
  };

  const handleSaveHours = async () => {
    if (!selectedBranch) return;
    try {
      const res = await fetch('/api/supplier/branches/' + selectedBranch.id + '/hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessHours: hoursForm })
      });
      if (res.ok) {
        toast.success('Business hours updated');
        setShowHoursModal(false);
        fetchBranchDetails(selectedBranch.id);
      }
    } catch { toast.error('Failed to update hours'); }
  };

  const handleAddHoliday = async () => {
    if (!selectedBranch) return;
    try {
      const res = await fetch('/api/supplier/branches/' + selectedBranch.id + '/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm)
      });
      if (res.ok) {
        toast.success('Holiday added');
        setHolidayForm({ date: '', name: '', description: '' });
        fetchHolidays(selectedBranch.id);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add');
      }
    } catch { toast.error('Failed to add holiday'); }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!selectedBranch) return;
    try {
      await fetch('/api/supplier/branches/' + selectedBranch.id + '/holidays?id=' + holidayId, { method: 'DELETE' });
      toast.success('Holiday removed');
      fetchHolidays(selectedBranch.id);
    } catch { toast.error('Failed to remove'); }
  };

  const resetForm = () => {
    setEditingBranch(null);
    setForm({ branchName: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', mobile: '', email: '', isHeadOffice: false });
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    setForm({
      branchName: branch.branchName, addressLine1: branch.addressLine1,
      addressLine2: branch.addressLine2 || '', city: branch.city,
      state: branch.state, pincode: branch.pincode,
      mobile: branch.mobile, email: branch.email || '',
      isHeadOffice: branch.isHeadOffice
    });
    setShowModal(true);
  };

  const openHours = (branch) => {
    setSelectedBranch(branch);
    setHoursForm(
      DAYS.map((_, i) => {
        const existing = branch.businessHours?.find(bh => bh.dayOfWeek === i);
        return existing
          ? { dayOfWeek: i, openTime: existing.openTime, closeTime: existing.closeTime, isOpen: existing.isOpen }
          : { dayOfWeek: i, openTime: '09:00', closeTime: '18:00', isOpen: i !== 0 };
      })
    );
    setShowHoursModal(true);
  };

  const openHolidays = (branch) => {
    setSelectedBranch(branch);
    fetchHolidays(branch.id);
    setShowHolidayModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-gray-500 mt-1">Manage your business locations</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Branch
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(branch => (
          <div key={branch.id} className={`bg-white rounded-xl border p-5 hover:shadow-md transition cursor-pointer ${selectedBranch?.id === branch.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => { setSelectedBranch(branch); fetchBranchDetails(branch.id); }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${branch.isHeadOffice ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                  {branch.isHeadOffice ? <Star className="h-5 w-5 text-yellow-600" /> : <Building2 className="h-5 w-5 text-blue-600" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{branch.branchName}</h3>
                  {branch.isHeadOffice && <span className="text-xs text-yellow-600 font-medium">Head Office</span>}
                </div>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(branch)} className="p-1.5 hover:bg-gray-100 rounded"><Edit className="h-4 w-4 text-gray-400" /></button>
                <button onClick={() => handleDelete(branch.id, branch.branchName)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-gray-500">
              <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{branch.city}, {branch.state} - {branch.pincode}</div>
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{branch.mobile}</div>
              {branch.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{branch.email}</div>}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{branch._count?.staff || 0} staff</span>
              <button onClick={(e) => { e.stopPropagation(); openHours(branch); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                <Clock className="h-3 w-3" /> Hours
              </button>
              <button onClick={(e) => { e.stopPropagation(); openHolidays(branch); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                <Calendar className="h-3 w-3" /> Holidays
              </button>
            </div>
          </div>
        ))}

        {branches.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No branches added yet</p>
            <button onClick={() => setShowModal(true)} className="text-blue-600 hover:text-blue-700 text-sm mt-1">Add your first branch</button>
          </div>
        )}
      </div>

      {/* Branch Detail Panel */}
      {selectedBranch && (
        <div className="mt-6 bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{selectedBranch.branchName} - Details</h2>
            <button onClick={() => setSelectedBranch(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
          </div>

          {selectedBranch.staff?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-sm text-gray-700 mb-2">Staff Members ({selectedBranch.staff.length})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedBranch.staff.map(s => (
                  <span key={s.id} className="px-3 py-1.5 bg-gray-50 rounded-full text-sm flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                      {s.user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {s.user?.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedBranch.businessHours?.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">Business Hours</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {selectedBranch.businessHours.map(bh => (
                  <div key={bh.dayOfWeek} className={`p-2 rounded-lg text-sm ${bh.isOpen ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="font-medium text-gray-700">{DAYS[bh.dayOfWeek]}</p>
                    <p className={bh.isOpen ? 'text-green-600' : 'text-red-600'}>
                      {bh.isOpen ? bh.openTime + ' - ' + bh.closeTime : 'Closed'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingBranch ? 'Edit Branch' : 'Add Branch'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Branch Name *</label>
                  <input type="text" value={form.branchName} onChange={(e) => setForm(prev => ({ ...prev, branchName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="Main Branch" />
                </div>
                <div>
                  <label className="text-sm font-medium">Mobile *</label>
                  <input type="text" value={form.mobile} onChange={(e) => setForm(prev => ({ ...prev, mobile: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="9876543210" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="branch@company.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Address Line 1 *</label>
                <input type="text" value={form.addressLine1} onChange={(e) => setForm(prev => ({ ...prev, addressLine1: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="123 Business Street" />
              </div>
              <div>
                <label className="text-sm font-medium">Address Line 2</label>
                <input type="text" value={form.addressLine2} onChange={(e) => setForm(prev => ({ ...prev, addressLine2: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="Near landmark" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">City *</label>
                  <input type="text" value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">State *</label>
                  <input type="text" value={form.state} onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Pincode *</label>
                  <input type="text" value={form.pincode} onChange={(e) => setForm(prev => ({ ...prev, pincode: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isHeadOffice} onChange={(e) => setForm(prev => ({ ...prev, isHeadOffice: e.target.checked }))} className="rounded" />
                Set as Head Office
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSubmit} disabled={!form.branchName || !form.city || !form.state} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />{editingBranch ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Hours Modal */}
      {showHoursModal && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Business Hours - {selectedBranch.branchName}</h3>
            <div className="space-y-2">
              {hoursForm.map((bh, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-24 text-sm font-medium">{DAYS[i]}</span>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={bh.isOpen} onChange={() => {
                      const updated = [...hoursForm];
                      updated[i].isOpen = !updated[i].isOpen;
                      setHoursForm(updated);
                    }} className="rounded" />
                  </label>
                  {bh.isOpen ? (
                    <div className="flex items-center gap-1">
                      <input type="time" value={bh.openTime} onChange={(e) => { const u = [...hoursForm]; u[i].openTime = e.target.value; setHoursForm(u); }} className="px-2 py-1 border rounded text-sm w-32" />
                      <span className="text-gray-400">to</span>
                      <input type="time" value={bh.closeTime} onChange={(e) => { const u = [...hoursForm]; u[i].closeTime = e.target.value; setHoursForm(u); }} className="px-2 py-1 border rounded text-sm w-32" />
                    </div>
                  ) : (
                    <span className="text-sm text-red-500">Closed</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowHoursModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSaveHours} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Hours</button>
            </div>
          </div>
        </div>
      )}

      {/* Holidays Modal */}
      {showHolidayModal && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Holidays - {selectedBranch.branchName}</h3>
            <div className="flex gap-2 mb-4">
              <input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))} className="flex-1 px-3 py-2 border rounded-lg" />
              <input type="text" value={holidayForm.name} onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Holiday name" className="flex-1 px-3 py-2 border rounded-lg" />
              <button onClick={handleAddHoliday} disabled={!holidayForm.date || !holidayForm.name} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <button onClick={() => handleDeleteHoliday(h.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                </div>
              ))}
              {holidays.length === 0 && <p className="text-center text-gray-400 py-4">No holidays added</p>}
            </div>
            <button onClick={() => setShowHolidayModal(false)} className="w-full mt-4 py-2 border rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}