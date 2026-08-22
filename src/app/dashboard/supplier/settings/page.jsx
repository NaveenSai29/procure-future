"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Save, Power, PowerOff, Store, AlertCircle, CheckCircle,
  Building, CreditCard, FileText, Bell, Shield, Upload, Loader2,
  BadgeCheck, Clock,
} from "lucide-react";
import { toast } from "sonner";
import KYCProgressBar from "@/components/kyc/KYCProgressBar";
import KYCUploadCard from "@/components/kyc/KYCUploadCard";

const TABS = [
  { id: "business", label: "Business Info", icon: Store },
  { id: "kyc", label: "KYC Documents", icon: Shield },
];

const DAYS = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

// Business Info Edit Form Component
function BusinessInfoForm({ supplier, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [coverVideo, setCoverVideo] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [pendingLogo, setPendingLogo] = useState(null);
  const [pendingBanner, setPendingBanner] = useState(null);
  const [pendingLogoRemove, setPendingLogoRemove] = useState(false);
  const [pendingBannerRemove, setPendingBannerRemove] = useState(false);
  const [pendingVideoRemove, setPendingVideoRemove] = useState(false);
  const [pendingVideoUrl, setPendingVideoUrl] = useState(null);
  const [pendingPhotosRemove, setPendingPhotosRemove] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    mobile: '',
    gstin: '',
    pan: '',
    businessType: '',
    tags: '',
    website: '',
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        businessName: supplier.businessName || '',
        email: supplier.email || '',
        mobile: supplier.mobile || '',
        gstin: supplier.gstin || '',
        pan: supplier.pan || '',
        businessType: supplier.businessType || '',
        tags: supplier.tags || '',
        website: supplier.website || '',
      });
      fetchPhotos();
    }
  }, [supplier]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch('/api/supplier/photos');
      const data = await res.json();
      if (res.ok) {
        setPhotos(data.photos || []);
        setCoverVideo(data.coverVideo || null);
      }
    } catch {}
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/supplier/photos', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Photo uploaded!');
        fetchPhotos();
      } else {
        toast.error(data.error || 'Failed to upload');
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async (photoId) => {
    try {
      const res = await fetch(`/api/supplier/photos?photoId=${photoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Photo deleted');
        fetchPhotos();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete photo');
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video too large. Maximum size is 50MB.');
      return;
    }

    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('type', 'video');
      const res = await fetch('/api/supplier/photos', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        console.log('Video URL:', data.coverVideo);
        setPendingVideoUrl(data.coverVideo);
        toast.success('Video selected! Click Save Branding to apply.');
      } else {
        toast.error(data.error || 'Failed to upload video');
      }
    } catch {
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleVideoDelete = async () => {
    try {
      const res = await fetch('/api/supplier/photos?deleteVideo=true', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Video deleted');
        fetchPhotos();
      } else {
        toast.error(data.error || 'Failed to delete video');
      }
    } catch {
      toast.error('Failed to delete video');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');
      const res = await fetch('/api/supplier/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setPendingLogo(data.url);
        toast.success('Logo selected! Click Save to apply.');
      } else {
        toast.error(data.error || 'Failed to upload logo');
      }
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setPendingLogoRemove(true);
    setPendingLogo(null);
  };

  const handleRemoveBanner = () => {
    setPendingBannerRemove(true);
    setPendingBanner(null);
  };

  const handleRemoveVideo = () => {
    setPendingVideoRemove(true);
  };

  const handlePhotoRemove = (photoId) => {
    setPendingPhotosRemove(prev => [...prev, photoId]);
  };

  const handlePhotoUploadPending = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/supplier/photos', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setPendingPhotos(prev => [...prev, data.photo]);
        toast.success('Photo added! Click Save Branding to apply.');
      } else {
        toast.error(data.error || 'Failed to upload');
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

    const handleSaveBranding = async () => {
    try {
      // 1. Save logo/banner via settings API
      const payload = {};
      if (pendingLogoRemove) payload.logo = null;
      else if (pendingLogo !== null) payload.logo = pendingLogo;
      if (pendingBannerRemove) payload.banner = null;
      else if (pendingBanner !== null) payload.banner = pendingBanner;

      if (Object.keys(payload).length > 0) {
        const res = await fetch('/api/supplier/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to save branding');
          return;
        }
      }

      // 2. Save photos
      for (const photo of pendingPhotos) {
        await fetch('/api/supplier/photos/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: photo.url }),
        });
      }

      // 3. Delete marked photos
      for (const photoId of pendingPhotosRemove) {
        await fetch(`/api/supplier/photos?photoId=${photoId}`, { method: 'DELETE' });
      }

      // 4. Save cover video
      if (pendingVideoUrl) {
        await fetch('/api/supplier/photos/save-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: pendingVideoUrl }),
        });
      }

      // 5. Delete video if marked
      if (pendingVideoRemove) {
        await fetch('/api/supplier/photos?deleteVideo=true', { method: 'DELETE' });
      }

      toast.success('Branding saved!');
      // Reset all pending states
      setPendingLogo(null);
      setPendingBanner(null);
      setPendingLogoRemove(false);
      setPendingBannerRemove(false);
      setPendingVideoRemove(false);
      setPendingVideoUrl(null);
      setPendingPhotosRemove([]);
      setPendingPhotos([]);
      fetchPhotos();
      onUpdate?.();
    } catch {
      toast.error('Failed to save branding');
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'banner');
      const res = await fetch('/api/supplier/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setPendingBanner(data.url);
        toast.success('Banner selected! Click Save to apply.');
      } else {
        toast.error(data.error || 'Failed to upload banner');
      }
    } catch {
      toast.error('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!form.businessName.trim()) { toast.error('Business name is required'); return; }
    if (!form.mobile.trim()) { toast.error('Mobile is required'); return; }
    if (!form.businessType) { toast.error('Business type is required'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/supplier/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean)) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Business information updated!');
        setEditing(false);
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const businessTypes = [
    'Retail', 'Wholesale', 'Manufacturing', 'Distribution',
    'Import/Export', 'Service Provider', 'E-Commerce', 'Other'
  ];

  return (
    <div className="bg-white rounded-xl border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Business Information</h3>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        /* Display Mode */
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Business Name</label>
            <p className="font-medium">{supplier?.businessName || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="font-medium">{supplier?.email || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Mobile</label>
            <p className="font-medium">{supplier?.mobile || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Verification Status</label>
            <p className={`font-medium ${supplier?.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {supplier?.isVerified ? '✅ Verified' : '⏳ Pending Verification'}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email Verification</label>
            <p className={`font-medium flex items-center gap-1 ${supplier?.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
              {supplier?.emailVerified ? (
                <><BadgeCheck className="h-4 w-4" /> Verified</>
              ) : (
                <><Clock className="h-4 w-4" /> Not Verified</>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">GST Verification</label>
            <p className={`font-medium flex items-center gap-1 ${supplier?.gstVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {supplier?.gstVerified ? (
                <><BadgeCheck className="h-4 w-4" /> Verified by GST Portal</>
              ) : (
                <><Clock className="h-4 w-4" /> Pending Verification</>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">GSTIN</label>
            <p className="font-medium">{supplier?.gstin || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">PAN</label>
            <p className="font-medium">{supplier?.pan || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Business Type</label>
            <p className="font-medium">{supplier?.businessType || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Website</label>
            <p className="font-medium">{supplier?.website || 'Not provided'}</p>
          </div>
          {supplier?.gstBusinessName && (
            <div>
              <label className="text-sm text-gray-500">GST Business Name</label>
              <p className="font-medium text-emerald-700">{supplier.gstBusinessName}</p>
            </div>
          )}
          {supplier?.gstVerificationDate && (
            <div>
              <label className="text-sm text-gray-500">GST Verified On</label>
              <p className="font-medium">{new Date(supplier.gstVerificationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
          {supplier?.tags && (
            <div className="col-span-2">
              <label className="text-sm text-gray-500">Tags</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(typeof supplier.tags === 'string' ? JSON.parse(supplier.tags) : supplier.tags).map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Branding - Cover Video + Shop Photos only */}

          {/* Shop Photos */}
          <div className="col-span-2 mt-4">
            <label className="text-sm text-gray-500">Shop Photos (Max 5)</label>
            <p className="text-xs text-gray-400 mt-0.5">1:1 Square • 1080×1080 px • JPG/PNG • Max 5MB each</p>
            <div className="flex gap-3 mt-2 flex-wrap">
              {photos.filter(p => !pendingPhotosRemove.includes(p.id)).map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.url?.startsWith('http') ? photo.url : `https://vantagemarketspvt.com${photo.url}`}
                    alt="Shop"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => handlePhotoRemove(photo.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                    title="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* ADD PENDING PHOTOS HERE */}
              {pendingPhotos.map((photo, idx) => (
                <div key={`pending-${idx}`} className="relative group">
                  <img
                    src={photo.url?.startsWith('http') ? photo.url : `https://vantagemarketspvt.com${photo.url}`}
                    alt="New Photo"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                </div>
              ))}

              {photos.length < 5 && (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition">
                  {uploadingPhoto ? (
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Add Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUploadPending}
                    disabled={uploadingPhoto}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Cover Video */}
          <div className="col-span-2 mt-4">
            <label className="text-sm text-gray-500">Cover Video (Optional)</label>
            <p className="text-xs text-gray-400 mt-0.5">16:9 • 1920×1080 px • All formats • Max 50MB • 15-30 seconds recommended</p>
            <p className="text-xs text-gray-400 mt-1">Add an intro video of your shop. Shows on your supplier page hero banner.</p>
            <div className="mt-2">
              {(coverVideo || pendingVideoUrl) && !pendingVideoRemove ? (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <video 
                    key={pendingVideoUrl || coverVideo}
                    src={(pendingVideoUrl || coverVideo)?.startsWith('http') ? (pendingVideoUrl || coverVideo) : `https://vantagemarketspvt.com${pendingVideoUrl || coverVideo}`} 
                    className="w-full h-48 object-cover rounded-lg border mb-3 bg-black" 
                    controls
                    playsInline
                    preload="metadata"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {pendingVideoUrl ? '🎬 New video selected ✓' : '🎬 Video uploaded ✓'}
                      </p>
                      <p className="text-xs text-gray-500">This plays on your supplier page hero banner</p>
                    </div>
                    <button
                      onClick={handleRemoveVideo}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 transition">
                  {uploadingVideo ? (
                    <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700">Upload Cover Video</p>
                    <p className="text-xs text-gray-500">All video formats accepted. Max 50MB.</p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Save Branding - Common button at bottom */}
          {(pendingVideoRemove || pendingVideoUrl !== null || pendingPhotosRemove.length > 0 || pendingPhotos.length > 0) && (
            <div className="col-span-2 mt-4 border-t pt-4 flex gap-2">
              <button
                onClick={handleSaveBranding}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1"
              >
                <Save className="h-4 w-4" /> Save Branding
              </button>
              <button
                onClick={() => {
                  setPendingVideoRemove(false);
                  setPendingVideoUrl(null);
                  setPendingPhotosRemove([]);
                  setPendingPhotos([]);
                  fetchPhotos();
                }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Edit Mode */
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 font-medium">Business Name *</label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Mobile *</label>
            <input
              type="text"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Business Type *</label>
            <select
              value={form.businessType}
              onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select type...</option>
              {businessTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">GSTIN</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="22ABCDE1234F1Z5"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">PAN</label>
            <input
              type="text"
              value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="ABCDE1234F"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 font-medium">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.example.com"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-500 font-medium">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="BBQ, Chicken, North Indian (comma separated)"
            />
            <p className="text-xs text-gray-400 mt-1">Separate tags with commas. Max 5 tags recommended.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Shop Hours Component
function ShopHoursForm({ settings, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [openDays, setOpenDays] = useState(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);

  useEffect(() => {
    if (settings) {
      setOpenTime(settings.shopOpenTime || '09:00');
      setCloseTime(settings.shopCloseTime || '21:00');
      if (settings.shopOpenDays) {
        try {
          const parsed = JSON.parse(settings.shopOpenDays);
          if (Array.isArray(parsed)) setOpenDays(parsed);
        } catch {}
      }
    }
  }, [settings]);

  const toggleDay = (day) => {
    if (openDays.includes(day)) {
      setOpenDays(openDays.filter(d => d !== day));
    } else {
      setOpenDays([...openDays, day].sort((a, b) => {
        const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        return order.indexOf(a) - order.indexOf(b);
      }));
    }
  };

  const handleSave = async () => {
    if (!openTime || !closeTime) {
      toast.error('Please set both open and close time');
      return;
    }
    if (openDays.length === 0) {
      toast.error('Please select at least one open day');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/supplier/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopOpenTime: openTime,
          shopCloseTime: closeTime,
          shopOpenDays: JSON.stringify(openDays),
        }),
      });
      if (res.ok) {
        toast.success('Shop hours saved!');
        setEditing(false);
        onUpdate?.();
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Calculate if shop is currently open
  const getCurrentStatus = () => {
    if (!openTime || !closeTime) return { text: 'Not configured — Shop is CLOSED until hours are set', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle };
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const today = days[now.getDay()];
    
    if (!openDays.includes(today)) {
      return { text: 'Closed today', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle };
    }

    const [oh, om] = openTime.split(':').map(Number);
    const [ch, cm] = closeTime.split(':').map(Number);
    const openDate = new Date(now); openDate.setHours(oh, om, 0, 0);
    const closeDate = new Date(now); closeDate.setHours(ch, cm, 0, 0);

    if (now >= openDate && now < closeDate) {
      const minsLeft = Math.floor((closeDate.getTime() - now.getTime()) / 60000);
      const hrsLeft = Math.floor(minsLeft / 60);
      const minsRemain = minsLeft % 60;
      const timeText = hrsLeft > 0 ? `${hrsLeft}h ${minsRemain}m` : `${minsRemain}m`;
      return { text: `Open · Closes in ${timeText}`, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
    }
    return { text: 'Closed', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle };
  };

  const status = getCurrentStatus();

  return (
    <div className="bg-white rounded-xl border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">🕐 Shop Hours</h3>
          <p className="text-xs text-gray-500 mt-0.5">Set when your store accepts orders</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false);
                if (settings) {
                  setOpenTime(settings.shopOpenTime || '09:00');
                  setCloseTime(settings.shopCloseTime || '21:00');
                  if (settings.shopOpenDays) {
                    try { const parsed = JSON.parse(settings.shopOpenDays); if (Array.isArray(parsed)) setOpenDays(parsed); } catch {}
                  }
                }
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Hours</>}
            </button>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className={`${status.bg} rounded-lg p-3 mb-4 flex items-center gap-2`}>
        <status.icon className={`h-4 w-4 ${status.color}`} />
        <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
      </div>

      {!editing ? (
        /* Display Mode */
        <>
        {(!openTime || !closeTime) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 font-semibold">⚠️ Your shop is CLOSED — Set your hours to start accepting orders</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">Open Time</label>
            <p className="text-lg font-bold text-gray-900">{openTime || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Close Time</label>
            <p className="text-lg font-bold text-gray-900">{closeTime || '—'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500">Open Days</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {DAYS.map(d => (
                <span
                  key={d.key}
                  className={`px-2 py-0.5 text-xs rounded-md font-medium ${
                    openDays.includes(d.key)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        </>
      ) : (
        /* Edit Mode */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Open Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Close Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Open Days</label>
            <div className="flex gap-2">
              {DAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${
                    openDays.includes(d.key)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupplierSettingsPage() {
  const [supplier, setSupplier] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  const [kycData, setKycData] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  // Read tab from URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'kyc') setActiveTab('kyc');
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/supplier/settings");
      const data = await res.json();
      setSupplier(data.supplier);
      setSettings(data.settings);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchKYC = async () => {
    try {
      const res = await fetch("/api/supplier/kyc");
      const json = await res.json();
      if (res.ok) setKycData(json);
    } catch {
      toast.error("Failed to load KYC");
    }
  };

  useEffect(() => {
    if (activeTab === "kyc") fetchKYC();
  }, [activeTab]);

  const handleToggleStore = async () => {
    if (!confirm(supplier.isActive
      ? "Going offline will hide all your products from buyers. Continue?"
      : "Going online will make your products visible to buyers. Continue?"
    )) return;

    setToggling(true);
    try {
      const res = await fetch("/api/supplier/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });
      if (res.ok) {
        toast.success(supplier.isActive ? "Store is now offline" : "Store is now online!");
        fetchSettings();
      }
    } catch {
      toast.error("Failed to toggle");
    } finally {
      setToggling(false);
    }
  };

  const quickCards = [
    { title: "Bank Accounts", desc: "Manage settlement bank accounts", icon: Building, href: "/dashboard/supplier/settings/bank", color: "bg-blue-50 text-blue-600" },
    { title: "Notifications", desc: "Email, SMS & alert preferences", icon: Bell, href: "/dashboard/notifications", color: "bg-orange-50 text-orange-600" },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Store Status Toggle */}
      <div className={`rounded-xl p-6 mb-6 ${supplier?.isActive ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${supplier?.isActive ? "bg-green-200" : "bg-red-200"}`}>
              <Store className={`h-6 w-6 ${supplier?.isActive ? "text-green-700" : "text-red-700"}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Store Status</h2>
              <p className="text-sm mt-1">
                {supplier?.isActive ? (
                  <span className="text-green-700 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Your store is ONLINE
                  </span>
                ) : (
                  <span className="text-red-700 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Your store is OFFLINE
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleStore}
            disabled={toggling || !supplier?.isVerified}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition ${
              !supplier?.isVerified
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : supplier?.isActive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
            title={!supplier?.isVerified ? "Complete KYC verification to go online" : ""}
          >
            {supplier?.isActive ? (
              <><PowerOff className="h-5 w-5" /> Go Offline</>
            ) : (
              <><Power className="h-5 w-5" /> Go Online</>
            )}
          </button>
        </div>
        {!supplier?.isVerified && (
          <p className="text-xs text-yellow-700 mt-3 bg-yellow-100 rounded-lg p-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Complete KYC verification in the "KYC Documents" tab below to enable going online.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Business Info Tab */}
      {activeTab === "business" && (
        <>
          <BusinessInfoForm supplier={supplier} onUpdate={fetchSettings} />
          <ShopHoursForm settings={settings} onUpdate={fetchSettings} />

          <h3 className="font-semibold text-gray-900 mb-3">Quick Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="bg-white rounded-xl border p-5 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{card.title}</h4>
                    <p className="text-xs text-gray-500">{card.desc}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-500 transition">→</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* KYC Tab */}
      {activeTab === "kyc" && (
        <div className="space-y-6">
          {supplier?.isVerified && (!kycData?.documents || kycData.documents.length === 0) ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-green-800">Your Store is Verified ✅</h3>
              <p className="text-sm text-green-700 mt-1">
                Your business was verified before the document upload system was introduced.
              </p>
              <p className="text-xs text-green-600 mt-3 bg-green-100 rounded-lg p-2 inline-block">
                No additional documents required. You're all set to sell!
              </p>
            </div>
          ) : supplier?.isVerified && kycData?.documents?.length > 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">All documents verified! 🎉</p>
                <p className="text-sm text-green-700">Your store is LIVE and visible to buyers.</p>
              </div>
            </div>
          ) : kycData?.progress?.isComplete ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Documents under review</p>
                <p className="text-sm text-yellow-700">Our team will verify within 24-48 hours.</p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <Upload className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-800">Upload documents to get verified</p>
                <p className="text-sm text-blue-700">All 6 documents required to go LIVE.</p>
              </div>
            </div>
          )}

          {!(supplier?.isVerified && (!kycData?.documents || kycData.documents.length === 0)) && (
            <>
              <KYCProgressBar documents={kycData?.documents || []} />
              <h3 className="font-semibold text-gray-900">Upload Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["PAN", "GST", "BANK_PROOF", "BUSINESS_REGISTRATION", "IDENTITY_PROOF", "ADDRESS_PROOF"].map(
                  (docType) => {
                    const existingDoc = (kycData?.documents || []).find((d) => d.documentType === docType);
                    return (
                      <KYCUploadCard
                        key={docType}
                        documentType={docType}
                        existingDoc={existingDoc}
                        onUpload={() => fetchKYC()}
                        onDelete={() => fetchKYC()}
                      />
                    );
                  }
                )}
              </div>
              <div className="bg-gray-50 rounded-xl border p-5">
                <h4 className="font-semibold text-gray-900 mb-2">Document Guidelines</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Documents must be clearly visible and not expired</li>
                  <li>PDF, JPG, or PNG (Max 5MB per file)</li>
                  <li>Name on documents must match business registration</li>
                  <li>Verification takes 24-48 hours after all documents uploaded</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}