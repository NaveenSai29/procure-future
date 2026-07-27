'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, Navigation, MapPin, Truck, Store } from 'lucide-react';
import { toast } from 'sonner';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

function MapView({ data, activeTab }) {
  const [L, setL] = useState(null);
  const [boundsReady, setBoundsReady] = useState(false);

  useEffect(() => {
    import('leaflet').then(leaflet => {
      setL(leaflet);
      // Fix default marker icon
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    });
  }, []);

  if (!L || !data) return null;

  const warehouseIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background:#3b82f6;width:30px;height:30px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">🏭</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });

  const truckIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background:#f59e0b;width:30px;height:30px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">🚚</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });

  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {(activeTab === 'all' || activeTab === 'warehouses') && data.warehouses.map(w => 
        w.latitude && w.longitude && (
          <Marker key={`wh-${w.id}`} position={[w.latitude, w.longitude]} icon={warehouseIcon}>
            <Popup>
              <div style={{ minWidth: '160px' }}>
                <h4 style={{ fontWeight: 600, fontSize: '13px' }}>{w.name}</h4>
                <p style={{ fontSize: '11px', color: '#666' }}>{w.supplier?.businessName}</p>
                <p style={{ fontSize: '11px', color: '#999' }}>{w.city}, {w.state}</p>
              </div>
            </Popup>
          </Marker>
        )
      )}

      {(activeTab === 'all' || activeTab === 'drivers') && data.deliveryPartners.map(d => 
        d.currentLat && d.currentLng && (
          <Marker key={`dp-${d.id}`} position={[d.currentLat, d.currentLng]} icon={truckIcon}>
            <Popup>
              <div style={{ minWidth: '160px' }}>
                <h4 style={{ fontWeight: 600, fontSize: '13px' }}>{d.user?.name || 'Driver'}</h4>
                <p style={{ fontSize: '11px', color: '#666' }}>{d.vehicleType} {d.vehicleNumber ? '• ' + d.vehicleNumber : ''}</p>
                <p style={{ fontSize: '11px', color: '#999' }}>⭐ {d.rating?.toFixed(1) || 'N/A'}</p>
              </div>
            </Popup>
          </Marker>
        )
      )}
    </MapContainer>
  );
}

export default function LiveMapPage() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); fetchMapData(); }, []);
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, [mounted]);

  const fetchMapData = async () => {
    try {
      const res = await fetch('/api/admin/map-data');
      const data = await res.json();
      if (data.success) setMapData(data.data);
    } catch { toast.error('Failed to load map data'); }
    finally { setLoading(false); }
  };

  const stats = {
    warehouses: mapData?.warehouses?.length || 0,
    drivers: mapData?.deliveryPartners?.length || 0,
    suppliers: mapData?.suppliers?.length || 0,
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse"><div className="h-[600px] bg-gray-200 rounded-xl"></div></div></div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-4 bg-white border-b flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="h-6 w-6 text-blue-600" /> Live Map View
          </h1>
          <p className="text-sm text-gray-500">Warehouse locations and active delivery partners</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> {stats.warehouses} Warehouses</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> {stats.drivers} Drivers</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> {stats.suppliers} Suppliers</span>
          </div>
          <button onClick={fetchMapData} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="px-4 py-2 bg-white border-b flex gap-2 shrink-0">
        {[{ key: 'all', label: 'All' }, { key: 'warehouses', label: 'Warehouses' }, { key: 'drivers', label: 'Drivers' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 relative">
        {mounted && mapData ? (
          <MapView data={mapData} activeTab={activeTab} />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Loading map...</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-48 bg-white border-t overflow-y-auto shrink-0">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTab !== 'drivers' && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Warehouses ({stats.warehouses})</h3>
              <div className="space-y-1">
                {stats.warehouses === 0 ? (
                  <p className="text-xs text-gray-400">No warehouses with location data. Add lat/lng to warehouses to see them here.</p>
                ) : (
                  mapData?.warehouses?.slice(0, 8).map(w => (
                    <div key={w.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span>{w.name}</span>
                      <span className="text-gray-400">{w.city}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activeTab !== 'warehouses' && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Active Drivers ({stats.drivers})</h3>
              <div className="space-y-1">
                {stats.drivers === 0 ? (
                  <p className="text-xs text-gray-400">No active drivers. Drivers appear here when delivery partners go online.</p>
                ) : (
                  mapData?.deliveryPartners?.slice(0, 8).map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span>{d.user?.name || 'Driver'}</span>
                      <span className="text-gray-400">{d.vehicleType}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}