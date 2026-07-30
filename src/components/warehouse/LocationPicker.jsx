"use client";

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, Navigation, MapPin, Loader2, Check, AlertCircle } from 'lucide-react';

if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

let L = null;

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

function MapUpdater({ center, zoom }) {
  const { useMap } = require('react-leaflet');
  const map = useMap();
  
  useEffect(() => {
    if (map && center) {
      map.setView([center.lat, center.lng], zoom || 16, { animate: true });
    }
  }, [map, center.lat, center.lng, zoom]);
  
  return null;
}

export default function LocationPicker({ 
  initialLat, initialLng, 
  onLocationChange, 
  onAddressChange,
  existingAddress = {},
}) {
  const [position, setPosition] = useState({ 
    lat: initialLat || 12.9716, 
    lng: initialLng || 77.5946 
  });
  const [hasPin, setHasPin] = useState(!!initialLat);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapCenter, setMapCenter] = useState({ 
    lat: initialLat || 12.9716, 
    lng: initialLng || 77.5946 
  });

  const [addressForm, setAddressForm] = useState({
    addressLine1: existingAddress.addressLine1 || '',
    addressLine2: existingAddress.addressLine2 || '',
    city: existingAddress.city || '',
    state: existingAddress.state || '',
    pincode: existingAddress.pincode || '',
  });

  useEffect(() => {
    import('leaflet').then(leaflet => {
      L = leaflet;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      setLeafletReady(true);
    });
  }, []);

  // Only set initial values once on mount
  useEffect(() => {
    if (initialLat && initialLng) {
      const pos = { lat: initialLat, lng: initialLng };
      setPosition(pos);
      setMapCenter(pos);
      setHasPin(true);
    }
  }, []); // Empty array = only on mount

  useEffect(() => {
    setAddressForm({
      addressLine1: existingAddress.addressLine1 || '',
      addressLine2: existingAddress.addressLine2 || '',
      city: existingAddress.city || '',
      state: existingAddress.state || '',
      pincode: existingAddress.pincode || '',
    });
  }, []); // Empty array = only on mount

  const pinIcon = leafletReady && L ? new L.DivIcon({
    className: 'custom-pin',
    html: '<div style="background:#ef4444;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 16px rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;"><div style="background:white;width:14px;height:14px;border-radius:50%;"></div></div>',
    iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
  }) : null;

  const updatePosition = (pos) => {
    setPosition(pos);
    setMapCenter(pos);
    setHasPin(true);
    onLocationChange?.(pos);

    // Reverse geocode - fire and forget
    setReverseGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&addressdetails=1`, {
      headers: { 'User-Agent': 'PROCURE/1.0' }
    })
    .then(r => r.json())
    .then(data => {
      if (data?.address) {
        const a = data.address;
        const rev = {
          road: a.road || '',
          neighbourhood: a.neighbourhood || a.suburb || '',
          city: a.city || a.town || a.county || '',
          state: a.state || '',
          pincode: a.postcode || '',
          display: data.display_name || '',
        };
        setGeocodedAddress(rev);
        
        const newAddress = {
          addressLine1: addressForm.addressLine1 || [rev.road, rev.neighbourhood].filter(Boolean).join(', '),
          addressLine2: addressForm.addressLine2 || '',
          city: addressForm.city || rev.city,
          state: addressForm.state || rev.state,
          pincode: addressForm.pincode || rev.pincode,
        };
        setAddressForm(newAddress);
        onAddressChange?.(newAddress);
      }
    })
    .catch(() => {})
    .finally(() => setReverseGeocoding(false));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery + ', India')}&limit=1`, {
        headers: { 'User-Agent': 'PROCURE/1.0' }
      });
      const data = await res.json();
      if (data?.features?.length > 0) {
        const c = data.features[0].geometry.coordinates;
        updatePosition({ lat: c[1], lng: c[0] });
      }
    } catch {} finally { setSearching(false); }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updatePosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => { alert('Allow location access in browser settings.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleAddressChange = (field, value) => {
    const updated = { ...addressForm, [field]: value };
    setAddressForm(updated);
    onAddressChange?.(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search location..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="hidden sm:inline">Search</span>
          </button>
          <button onClick={handleGetCurrentLocation} disabled={locating}
            className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            <span className="hidden sm:inline">My Location</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100" style={{ height: '350px', width: '100%' }}>
        {leafletReady && (
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={hasPin ? 16 : 5}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapUpdater center={mapCenter} zoom={hasPin ? 16 : 5} />
            {pinIcon && (
              <Marker 
                draggable={true} 
                position={[position.lat, position.lng]} 
                icon={pinIcon}
                eventHandlers={{
                  dragend(e) {
                    const p = e.target.getLatLng();
                    updatePosition({ lat: p.lat, lng: p.lng });
                  },
                }} 
              />
            )}
          </MapContainer>
        )}
        <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 z-[1000] shadow-sm ${hasPin ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
          {hasPin ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {hasPin ? 'Pinned' : 'Click map to pin'}
        </div>
        {reverseGeocoding && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white rounded-full text-xs shadow flex items-center gap-1.5 z-[1000] border">
            <Loader2 className="h-3 w-3 animate-spin" /> Getting address...
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">📌 {hasPin ? 'Drag red pin to adjust. Click map to move.' : 'Search, use GPS, or click map to drop a pin.'}</p>

      {hasPin && (
        <div className="bg-blue-50 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm border border-blue-100">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <code className="text-blue-700 font-mono text-xs bg-white px-2 py-0.5 rounded">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</code>
          </div>
          {geocodedAddress?.display && <span className="text-gray-400 text-xs truncate sm:ml-auto">📍 {geocodedAddress.display.substring(0, 50)}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Address Line 1 *</label>
          <input type="text" value={addressForm.addressLine1} onChange={e => handleAddressChange('addressLine1', e.target.value)}
            placeholder="Building name, street" className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Address Line 2</label>
          <input type="text" value={addressForm.addressLine2} onChange={e => handleAddressChange('addressLine2', e.target.value)}
            placeholder="Landmark (optional)" className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div><label className="text-sm font-medium text-gray-700">City *</label>
          <input type="text" value={addressForm.city} onChange={e => handleAddressChange('city', e.target.value)}
            placeholder="Chennai" className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div><label className="text-sm font-medium text-gray-700">State *</label>
          <input type="text" value={addressForm.state} onChange={e => handleAddressChange('state', e.target.value)}
            placeholder="Tamil Nadu" className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div><label className="text-sm font-medium text-gray-700">Pincode *</label>
          <input type="text" value={addressForm.pincode} onChange={e => handleAddressChange('pincode', e.target.value)}
            placeholder="600063" maxLength={6} className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
    </div>
  );
}