'use client';
import { useState, useEffect } from 'react';
import {
  Users, Search, CheckCircle, XCircle, Eye, Phone,
  Bike, Shield, Star, AlertTriangle, Clock, Image as ImageIcon,
  ChevronLeft, ChevronRight, FileText, Camera, User, Truck, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';

const REJECT_REASONS = [
  'Documents not clear - Please re-upload clearer images',
  'Driving License expired or invalid - Please upload renewed license',
  'Vehicle RC not matching with vehicle details',
  'Vehicle RC outdated or expired - Please upload current RC',
  'Profile photo not clear - Please upload a clear front-facing photo',
  'Selfie with vehicle not clear - Please retake with better lighting',
  'Aadhaar details mismatch with submitted documents',
  'PAN card details mismatch with submitted documents',
  'License not renewed - Please upload renewed driving license',
  'Incomplete documentation - All required documents not submitted',
];

export default function AdminDeliveryPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [stats, setStats] = useState({ verified: 0, pending: 0, rejected: 0, online: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editVehicleType, setEditVehicleType] = useState('');

  useEffect(() => { fetchPartners(); }, [filter, page]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.append('status', filter);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', '10');
      const res = await fetch(`/api/admin/delivery-partners?${params}`);
      const data = await res.json();
      if (data.success) {
        setPartners(data.data.partners || []);
        setStats(data.data.stats || {});
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (e) { toast.error('Failed to load delivery partners'); }
    finally { setLoading(false); }
  };

  const handleSearch = () => { setPage(1); fetchPartners(); };

  const handleAction = async (partnerId, action, reason, documentType = null, vehicleId = null, name = null, mobile = null, licenseNumber = null, vehicleNumber = null, vehicleType = null) => {
    try {
      const body = { partnerId, action };
      if (reason) body.reason = reason;
      if (documentType) body.documentType = documentType;
      if (vehicleId) body.vehicleId = vehicleId;
      if (name) body.name = name;
      if (mobile) body.mobile = mobile;
      if (licenseNumber) body.licenseNumber = licenseNumber;
      if (vehicleNumber) body.vehicleNumber = vehicleNumber;
      if (vehicleType) body.vehicleType = vehicleType;
      const res = await fetch('/api/admin/delivery-partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message);
        fetchPartners();
        setSelectedPartner(null);
        setShowRejectModal(false);
        setRejectReason('');
        setEditMode(false);
      } else { toast.error(data.message); }
    } catch (e) { toast.error('Action failed.'); }
  };

  const getStatusBadge = (partner) => {
    if (partner.verificationStatus === 'APPROVED' || partner.isVerified) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold border border-green-200"><CheckCircle className="h-3 w-3" /> Approved</span>;
    }
    if (partner.verificationStatus === 'REJECTED') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-red-100 text-red-700 font-semibold border border-red-200"><XCircle className="h-3 w-3" /> Rejected</span>;
    }
    if (partner.licenseDoc || partner.profilePhoto || (partner.vehicles && partner.vehicles.length > 0)) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-semibold border border-yellow-200"><Clock className="h-3 w-3" /> Pending Review</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-600 font-semibold border border-gray-200"><AlertTriangle className="h-3 w-3" /> No Documents</span>;
  };

  const statCards = [
    { label: 'Approved', value: stats.verified || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Pending Review', value: stats.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Rejected', value: stats.rejected || 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Online Now', value: stats.online || 0, icon: Bike, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Verify and manage delivery partner accounts • {stats.total || 0} total</p>
        </div>
        <button onClick={fetchPartners} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">↻ Refresh</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className={`${s.bg} ${s.border} rounded-xl p-5 border`}>
            <div className="flex items-center justify-between">
              <div><p className="text-3xl font-bold text-gray-900">{s.value}</p><p className="text-sm text-gray-600 mt-1 font-medium">{s.label}</p></div>
              <div className={`p-3 rounded-xl ${s.bg}`}><s.icon className={`h-6 w-6 ${s.color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search by name, mobile, vehicle number, license..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <select className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
          value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Partners</option>
          <option value="pending">⏳ Pending Review</option>
          <option value="verified">✅ Approved</option>
          <option value="rejected">❌ Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Partner</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Performance</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="flex items-center justify-center gap-2 text-gray-400"><div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full" /><span className="text-sm">Loading partners...</span></div></td></tr>
              ) : partners.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center"><Users className="h-12 w-12 mx-auto text-gray-300 mb-3" /><p className="text-gray-500 font-medium">No delivery partners found</p><p className="text-gray-400 text-sm mt-1">{filter ? 'Try changing the filter' : 'Partners will appear here after registration'}</p></td></tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {p.profilePhoto ? (
                            <img src={p.profilePhoto} className="w-10 h-10 rounded-xl object-cover" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">{p.user?.name?.charAt(0)?.toUpperCase() || 'P'}</div>
                          )}
                          {p.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {p.user?.mobile || 'N/A'}</p>
                          {p.licenseNumber && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Shield className="h-3 w-3" /> {p.licenseNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{p.activeVehicle?.vehicleType || 'Not set'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Bike className="h-3 w-3" /> {p.activeVehicle?.vehicleNumber || 'Not provided'}</p>
                      {p.vehicles && p.vehicles.length > 1 && <p className="text-xs text-orange-500 mt-0.5">+{p.vehicles.length - 1} more</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {p.licenseDoc && <button onClick={() => setPreviewImage({ url: p.licenseDoc, label: 'Driving License' })} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium hover:bg-blue-100">DL</button>}
                        {p.activeVehicle?.rcDocument && <button onClick={() => setPreviewImage({ url: p.activeVehicle.rcDocument, label: 'Vehicle RC' })} className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium hover:bg-green-100">RC</button>}
                        {p.profilePhoto && <button onClick={() => setPreviewImage({ url: p.profilePhoto, label: 'Profile Photo' })} className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium hover:bg-purple-100">Photo</button>}
                        {p.selfieWithVehicle && <button onClick={() => setPreviewImage({ url: p.selfieWithVehicle, label: 'Selfie' })} className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium hover:bg-orange-100">Selfie</button>}
                        {!p.licenseDoc && !p.activeVehicle?.rcDocument && !p.profilePhoto && !p.selfieWithVehicle && <span className="text-xs text-gray-400 italic">No documents</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {getStatusBadge(p)}
                      {p.verificationNote && <p className="text-xs text-red-500 mt-1.5 max-w-[180px] truncate italic" title={p.verificationNote}>"{p.verificationNote}"</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1"><p className="text-sm font-semibold text-gray-900">{p.totalDeliveries || 0} deliveries</p><p className="text-xs flex items-center gap-1 text-amber-500"><Star className="h-3 w-3 fill-current" /><span className="font-medium">{p.rating?.toFixed(1) || '0.0'}</span></p></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setSelectedPartner(p)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700" title="View details"><Eye className="h-4 w-4" /></button>
                        {!p.isVerified && p.verificationStatus !== 'REJECTED' && (
                          <>
                            <button onClick={() => handleAction(p.id, 'verify')} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                            <button onClick={() => { setSelectedPartner(p); setShowRejectModal(true); }} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Reject"><XCircle className="h-4 w-4" /></button>
                          </>
                        )}
                        {p.verificationStatus === 'REJECTED' && <button onClick={() => handleAction(p.id, 'verify')} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Approve after re-upload"><CheckCircle className="h-4 w-4" /></button>}
                        {p.isVerified && <button onClick={() => handleAction(p.id, 'unverify')} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Revoke"><XCircle className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== DETAIL MODAL ==================== */}
      {selectedPartner && !showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setSelectedPartner(null); setEditMode(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <div><h3 className="text-lg font-bold text-gray-900">Partner Details</h3><p className="text-sm text-gray-500">Full verification review</p></div>
              <button onClick={() => { setSelectedPartner(null); setEditMode(false); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-orange-50 to-rose-50 rounded-2xl border border-orange-100">
                {selectedPartner.profilePhoto ? (
                  <img src={selectedPartner.profilePhoto} className="w-16 h-16 rounded-2xl object-cover shadow-lg" alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">{selectedPartner.user?.name?.charAt(0)?.toUpperCase() || 'P'}</div>
                )}
                <div>
                  <p className="font-bold text-lg text-gray-900">{selectedPartner.user?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {selectedPartner.user?.mobile || 'N/A'}</p>
                  {selectedPartner.licenseNumber && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Shield className="h-3 w-3" /> License: {selectedPartner.licenseNumber}</p>}
                  <div className="mt-1">{getStatusBadge(selectedPartner)}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Vehicle Type', value: selectedPartner.activeVehicle?.vehicleType || 'Not set', icon: Bike, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Vehicle Number', value: selectedPartner.activeVehicle?.vehicleNumber || 'N/A', icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'License Number', value: selectedPartner.licenseNumber || 'N/A', icon: Shield, color: 'bg-purple-50 text-purple-700' },
                  { label: 'Rating', value: `⭐ ${selectedPartner.rating?.toFixed(1) || '0.0'}`, icon: Star, color: 'bg-amber-50 text-amber-700' },
                ].map((item, i) => (
                  <div key={i} className={`${item.color} rounded-xl p-3.5`}><item.icon className="h-4 w-4 mb-1 opacity-70" /><p className="text-xs opacity-70">{item.label}</p><p className="font-semibold text-sm mt-0.5">{item.value}</p></div>
                ))}
              </div>

              {/* Editable Fields Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Edit3 className="h-4 w-4" /> Partner Details</h4>
                  <button onClick={() => {
                    if (editMode) {
                      handleAction(selectedPartner.id, 'update_partner', null, null, null, editName, editMobile, editLicense, editVehicleNumber, editVehicleType);
                    } else {
                      setEditName(selectedPartner.user?.name || '');
                      setEditMobile(selectedPartner.user?.mobile || '');
                      setEditLicense(selectedPartner.licenseNumber || '');
                      setEditVehicleNumber(selectedPartner.activeVehicle?.vehicleNumber || '');
                      setEditVehicleType(selectedPartner.activeVehicle?.vehicleType || '');
                      setEditMode(true);
                    }
                  }} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${editMode ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {editMode ? '✓ Save Changes' : '✏️ Edit'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500">Name</label>{editMode ? <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /> : <p className="text-sm font-semibold mt-1">{selectedPartner.user?.name || 'N/A'}</p>}</div>
                  <div><label className="text-xs text-gray-500">Mobile</label>{editMode ? <input type="text" value={editMobile} onChange={e => setEditMobile(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" maxLength={10} /> : <p className="text-sm font-semibold mt-1">{selectedPartner.user?.mobile || 'N/A'}</p>}</div>
                  <div><label className="text-xs text-gray-500">License Number</label>{editMode ? <input type="text" value={editLicense} onChange={e => setEditLicense(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /> : <p className="text-sm font-semibold mt-1">{selectedPartner.licenseNumber || 'N/A'}</p>}</div>
                  <div><label className="text-xs text-gray-500">Vehicle Number</label>{editMode ? <input type="text" value={editVehicleNumber} onChange={e => setEditVehicleNumber(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /> : <p className="text-sm font-semibold mt-1">{selectedPartner.activeVehicle?.vehicleNumber || 'N/A'}</p>}</div>
                  <div><label className="text-xs text-gray-500">Vehicle Type</label>{editMode ? <select value={editVehicleType} onChange={e => setEditVehicleType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mt-1"><option value="">Select</option><option>Bicycle</option><option>Bike</option><option>Scooter</option><option>Auto</option><option>Mini Truck</option><option>Tata Ace</option><option>Pickup Truck</option><option>Tempo</option><option>LCV</option><option>Container</option><option>Truck</option></select> : <p className="text-sm font-semibold mt-1">{selectedPartner.activeVehicle?.vehicleType || 'N/A'}</p>}</div>
                </div>
              </div>

              {/* Document Verification */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Camera className="h-4 w-4" /> Document Verification (Per-Document)</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'licenseDoc', url: selectedPartner.licenseDoc, label: 'Driving License', icon: Shield },
                    { key: 'profilePhoto', url: selectedPartner.profilePhoto, label: 'Profile Photo', icon: User },
                    { key: 'selfieWithVehicle', url: selectedPartner.selfieWithVehicle, label: 'Selfie with Vehicle', icon: Camera },
                  ].map((doc, i) => {
                    const docCheck = selectedPartner.documentChecks?.find(d => d.documentType === doc.key);
                    const docStatus = docCheck?.status || (doc.url ? 'PENDING' : 'MISSING');
                    const docRejection = docCheck?.rejectionReason || '';
                    const statusBadge = docStatus === 'APPROVED' ? 'bg-green-100 text-green-700 border-green-200' : docStatus === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' : docStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-500 border-gray-200';
                    const statusText = docStatus === 'APPROVED' ? '✓ Approved' : docStatus === 'REJECTED' ? '✕ Rejected' : docStatus === 'PENDING' ? '⏳ Pending' : 'Not Uploaded';
                    return (
                      <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                        {doc.url ? (<button onClick={() => setPreviewImage({ url: doc.url, label: doc.label })} className="w-full"><img src={doc.url} alt={doc.label} className="w-full h-28 object-cover hover:opacity-90 transition-opacity" /></button>) : (<div className="h-28 bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon className="h-8 w-8" /></div>)}
                        <div className="p-2.5 space-y-2">
                          <span className="text-xs font-medium text-gray-700 truncate block">{doc.label}</span>
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full border font-medium ${statusBadge}`}>{statusText}</span>
                          {docStatus === 'REJECTED' && docRejection && <p className="text-xs text-red-500 italic truncate" title={docRejection}>💬 {docRejection}</p>}
                          {doc.url && docStatus !== 'APPROVED' && (
                            <div className="flex gap-1.5 pt-1">
                              <button onClick={() => handleAction(selectedPartner.id, 'approve_doc', null, doc.key)} className="flex-1 px-2 py-1.5 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium border border-emerald-200">✓ Approve</button>
                              <button onClick={() => { setSelectedPartner({...selectedPartner, _rejectDoc: doc.key}); setShowRejectModal(true); }} className="flex-1 px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium border border-red-200">✕ Reject</button>
                            </div>
                          )}
                          {docStatus === 'APPROVED' && <button onClick={() => handleAction(selectedPartner.id, 'reject_doc', 'Document needs review', doc.key)} className="w-full px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium border border-red-200">↩ Revoke</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vehicles Section */}
              {selectedPartner.vehicles && selectedPartner.vehicles.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Truck className="h-4 w-4" /> Vehicles ({selectedPartner.vehicles.length})</h4>
                  <div className="space-y-2">
                    {selectedPartner.vehicles.map((v, i) => (
                      <div key={v.id} className={`p-3 rounded-xl border ${selectedPartner.activeVehicleId === v.id ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{selectedPartner.activeVehicleId === v.id && '✅ '}{v.vehicleType} — {v.vehicleNumber || 'No number'}</p>
                            <p className="text-xs text-gray-500">{v.isVerified ? '✓ Verified' : v.verificationStatus === 'REJECTED' ? '✕ Rejected' : '⏳ Pending'}{v.verificationNote && <span className="text-red-500 ml-1">— {v.verificationNote}</span>}</p>
                          </div>
                          <div className="flex gap-1">
                            {v.rcDocument && <button onClick={() => setPreviewImage({ url: v.rcDocument, label: `RC - ${v.vehicleNumber}` })} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">View RC</button>}
                            {!v.isVerified && v.verificationStatus !== 'REJECTED' && <button onClick={() => handleAction(selectedPartner.id, 'approve_vehicle', null, null, v.id)} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">Approve</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPartner.verificationNote && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Rejection Reason</p>
                  <p className="text-sm text-red-600 mt-1">{selectedPartner.verificationNote}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                {!selectedPartner.isVerified ? (
                  <button onClick={() => handleAction(selectedPartner.id, 'verify')} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"><CheckCircle className="h-4 w-4" /> Approve Partner</button>
                ) : (
                  <button onClick={() => handleAction(selectedPartner.id, 'unverify')} className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 flex items-center justify-center gap-2"><XCircle className="h-4 w-4" /> Revoke Verification</button>
                )}
                {!selectedPartner.isVerified && selectedPartner.verificationStatus !== 'REJECTED' && (
                  <button onClick={() => setShowRejectModal(true)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 flex items-center justify-center gap-2"><XCircle className="h-4 w-4" /> Reject</button>
                )}
                <button onClick={() => { setSelectedPartner(null); setEditMode(false); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REJECT MODAL ==================== */}
      {showRejectModal && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedPartner._rejectDoc ? 'Reject Document' : 'Reject Partner'}</h3>
            <p className="text-sm text-gray-500 mb-4">Select a reason — this will be shown to {selectedPartner.user?.name || 'the partner'}</p>
            <div className="space-y-2 max-h-[260px] overflow-y-auto mb-4 pr-1">
              {REJECT_REASONS.map((reason, i) => (
                <button key={i} onClick={() => setRejectReason(reason)} className={`w-full text-left p-3 rounded-xl text-sm border-2 transition-all ${rejectReason === reason ? 'border-red-500 bg-red-50 text-red-700 font-medium' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'}`}>{reason}</button>
              ))}
            </div>
            <textarea className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm mb-4 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none" rows={2} placeholder="Or type a custom reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => { const docKey = selectedPartner._rejectDoc; if (docKey) { handleAction(selectedPartner.id, 'reject_doc', rejectReason || 'Document needs attention', docKey); } else { handleAction(selectedPartner.id, 'reject', rejectReason || 'Documents need attention'); } }} disabled={!rejectReason.trim()} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2"><XCircle className="h-4 w-4" /> {selectedPartner._rejectDoc ? 'Reject Document' : 'Reject Partner'}</button>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== IMAGE PREVIEW MODAL ==================== */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="max-w-3xl max-h-[90vh] relative">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white text-sm font-medium hover:text-gray-300">✕ Close</button>
            <p className="text-white text-sm mb-2 text-center">{previewImage.label}</p>
            <img src={previewImage.url} alt={previewImage.label} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}