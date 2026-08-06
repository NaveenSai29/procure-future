'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import React from 'react';
import { 
  RefreshCw, MapPin, Truck, Building2, AlertTriangle,
  Search, Layers, Package,
} from 'lucide-react';
import { toast } from 'sonner';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

export default function LiveMapPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  const [showList, setShowList] = useState(true);
  const [L, setL] = useState(null);

  useEffect(() => {
    import('leaflet').then(leaflet => {
      setL(leaflet);
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    });
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/map-data');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch {
      toast.error('Failed to load map data');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const focusWarehouse = (w) => {
    setSelectedWarehouse(w); setSelectedDriver(null); setSelectedDelivery(null);
    if (w.latitude && w.longitude) { setMapCenter([w.latitude, w.longitude]); setMapZoom(15); }
  };

  const focusDriver = (d) => {
    setSelectedDriver(d); setSelectedWarehouse(null); setSelectedDelivery(null);
    if (d.currentLat && d.currentLng) { setMapCenter([d.currentLat, d.currentLng]); setMapZoom(15); }
  };

  const focusDelivery = (d) => {
    setSelectedDelivery(d); setSelectedWarehouse(null); setSelectedDriver(null);
    const warehouse = d.order?.product?.supplier?.warehouses?.[0];
    if (warehouse?.latitude) { setMapCenter([warehouse.latitude, warehouse.longitude]); setMapZoom(13); }
  };

  const warehouseIcon = useMemo(() => L && new L.DivIcon({
    className: 'custom-div-icon',
    html: '<div style="background:linear-gradient(135deg,#3b82f6,#2563eb);width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(59,130,246,0.4);display:flex;align-items:center;justify-content:center;font-size:16px;">🏭</div>',
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }), [L]);

  const truckIcon = useMemo(() => L && new L.DivIcon({
    className: 'custom-div-icon',
    html: '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>',
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
  }), [L]);

  const deliveryIcon = useMemo(() => L && new L.DivIcon({
    className: 'custom-div-icon',
    html: '<div style="background:linear-gradient(135deg,#10b981,#059669);width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;">📦</div>',
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18],
  }), [L]);

  const selectedIcon = useMemo(() => L && new L.DivIcon({
    className: 'custom-div-icon',
    html: '<div style="background:linear-gradient(135deg,#ef4444,#dc2626);width:44px;height:44px;border-radius:50%;border:4px solid white;box-shadow:0 6px 20px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;">📍</div>',
    iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -24],
  }), [L]);

  const tabs = [
    { id: 'all', label: 'All', icon: MapPin, count: (data?.warehouses?.length || 0) + (data?.deliveryPartners?.length || 0) + (data?.activeDeliveries?.length || 0) },
    { id: 'warehouses', label: 'Warehouses', icon: Building2, count: (data?.warehouses?.length || 0) + (data?.warehousesWithoutCoords?.length || 0) },
    { id: 'drivers', label: 'Drivers', icon: Truck, count: data?.deliveryPartners?.length || 0 },
    { id: 'deliveries', label: 'Deliveries', icon: Package, count: data?.activeDeliveries?.length || 0 },
  ];

  const filteredWarehouses = data?.warehouses?.filter(w =>
    !searchTerm || w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.supplier?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.city?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const allWarehouses = [...(data?.warehouses || []), ...(data?.warehousesWithoutCoords || [])];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-[600px] bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Operations Map</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data?.stats?.onMap || 0} warehouses • {data?.stats?.onlineDrivers || 0} drivers • {data?.stats?.activeDeliveries || 0} active deliveries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Updated: {lastUpdated?.toLocaleTimeString()}</span>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: 'Warehouses', value: data?.stats?.totalWarehouses || 0, icon: Building2, color: 'text-blue-600 bg-blue-50' },
          { label: 'On Map', value: data?.stats?.onMap || 0, icon: MapPin, color: 'text-green-600 bg-green-50' },
          { label: 'No Location', value: data?.stats?.withoutLocation || 0, icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Drivers Online', value: data?.stats?.onlineDrivers || 0, icon: Truck, color: 'text-amber-600 bg-amber-50' },
          { label: 'Active Del.', value: data?.stats?.activeDeliveries || 0, icon: Package, color: 'text-emerald-600 bg-emerald-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" /></div>
            <div><p className="text-lg font-bold text-gray-900">{stat.value}</p><p className="text-xs text-gray-500">{stat.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedWarehouse(null); setSelectedDriver(null); setSelectedDelivery(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="h-4 w-4" />{tab.label}
              <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <button onClick={() => setShowList(!showList)} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1">
          <Layers className="h-4 w-4" /> {showList ? 'Hide List' : 'Show List'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className={`bg-white rounded-xl border overflow-hidden ${showList ? 'lg:col-span-3' : 'lg:col-span-4'}`} style={{ height: '650px' }}>
          {L && (
            <MapContainer key={JSON.stringify(mapCenter)} center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {(activeTab === 'all' || activeTab === 'warehouses') && data?.warehouses?.map(w => (
                <Marker key={`wh-${w.id}`} position={[w.latitude, w.longitude]} icon={selectedWarehouse?.id === w.id ? selectedIcon : warehouseIcon}
                  eventHandlers={{ click: () => focusWarehouse(w) }}>
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>🏭 {w.name}</h4>
                      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 2px' }}>{w.supplier?.businessName}</p>
                      <p style={{ fontSize: '11px', color: '#999', margin: '0' }}>{w.city}, {w.state}</p>
                      {w.isPickupLocation !== false && (
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>✅ Pickup Location</span>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {(activeTab === 'all' || activeTab === 'drivers') && data?.deliveryPartners?.map(d => (
                <Marker key={`dp-${d.id}`} position={[d.currentLat, d.currentLng]} icon={selectedDriver?.id === d.id ? selectedIcon : truckIcon}
                  eventHandlers={{ click: () => focusDriver(d) }}>
                  <Popup>
                    <div style={{ minWidth: '180px' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>{d.user?.name || 'Driver'}</h4>
                      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 2px' }}>{d.displayVehicle?.vehicleType || 'N/A'} • {d.displayVehicle?.vehicleNumber || ''}</p>
                      <p style={{ fontSize: '11px', color: '#f59e0b', margin: '0' }}>⭐ {d.rating?.toFixed(1) || '0.0'} • {d.totalDeliveries || 0} deliveries</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {(activeTab === 'all' || activeTab === 'deliveries') && data?.activeDeliveries?.map(d => {
                const warehouse = d.order?.product?.supplier?.warehouses?.[0];
                return (
                  <React.Fragment key={`del-${d.id}`}>
                    {warehouse?.latitude && (
                      <Marker position={[warehouse.latitude, warehouse.longitude]} icon={selectedDelivery?.id === d.id ? selectedIcon : deliveryIcon}
                        eventHandlers={{ click: () => focusDelivery(d) }}>
                        <Popup>
                          <div style={{ minWidth: '200px' }}>
                            <h4 style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>📦 Delivery #{d.order?.id?.slice(-8)}</h4>
                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 2px' }}>Driver: {d.partner?.user?.name}</p>
                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 2px' }}>Buyer: {d.order?.buyer?.name}</p>
                            <p style={{ fontSize: '11px', color: '#f59e0b', margin: '0' }}>Amount: ₹{d.order?.totalAmount} • {d.status}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {d.partner?.currentLat && warehouse?.latitude && (
                      <Polyline
                        positions={[[d.partner.currentLat, d.partner.currentLng], [warehouse.latitude, warehouse.longitude]]}
                        pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '6, 6' }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          )}
        </div>

        {showList && (
          <div className="space-y-3 max-h-[650px] overflow-y-auto">
            {(activeTab === 'all' || activeTab === 'warehouses') && (
              <div className="bg-white rounded-xl border">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-600" /> Warehouses</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{allWarehouses.length}</span>
                </div>
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {filteredWarehouses.map(w => (
                    <button key={`wh-${w.id}`} onClick={() => focusWarehouse(w)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition ${selectedWarehouse?.id === w.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{w.name}</p>
                          <p className="text-xs text-gray-500">{w.supplier?.businessName}</p>
                          <p className="text-xs text-gray-400 truncate">{w.city}, {w.state}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {data?.warehousesWithoutCoords?.map(w => (
                    <div key={`whnc-${w.id}`} className="p-3 bg-yellow-50">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{w.name}</p>
                          <p className="text-xs text-gray-500">{w.supplier?.businessName}</p>
                          <p className="text-xs text-yellow-600">⚠️ Location not set</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'drivers') && (
              <div className="bg-white rounded-xl border">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><Truck className="h-4 w-4 text-amber-600" /> Online Drivers</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{data?.deliveryPartners?.length || 0}</span>
                </div>
                <div className="divide-y max-h-[200px] overflow-y-auto">
                  {data?.deliveryPartners?.map(d => (
                    <button key={`d-${d.id}`} onClick={() => focusDriver(d)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition ${selectedDriver?.id === d.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{d.user?.name || 'Driver'}</p>
                          <p className="text-xs text-gray-500">{d.displayVehicle?.vehicleType || 'N/A'} • {d.displayVehicle?.vehicleNumber || ''}</p>
                        </div>
                        <span className="text-xs text-amber-600">⭐ {d.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </button>
                  ))}
                  {data?.deliveryPartners?.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-400">No drivers online</p>
                  )}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'deliveries') && (
              <div className="bg-white rounded-xl border">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4 text-emerald-600" /> Active Deliveries</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{data?.activeDeliveries?.length || 0}</span>
                </div>
                <div className="divide-y max-h-[300px] overflow-y-auto">
                  {data?.activeDeliveries?.map(d => (
                    <button key={`del-${d.id}`} onClick={() => focusDelivery(d)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition ${selectedDelivery?.id === d.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">#{d.order?.id?.slice(-8)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{d.status?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-gray-500">🛵 {d.partner?.user?.name} • {d.partner?.displayVehicle?.vehicleType || 'N/A'}</p>
                      <p className="text-xs text-gray-400">👤 {d.order?.buyer?.name} • ₹{d.order?.totalAmount}</p>
                    </button>
                  ))}
                  {data?.activeDeliveries?.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-400">No active deliveries</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">Auto-refreshes every 30 seconds • Last updated: {lastUpdated?.toLocaleTimeString() || 'N/A'}</p>
    </div>
  );
}