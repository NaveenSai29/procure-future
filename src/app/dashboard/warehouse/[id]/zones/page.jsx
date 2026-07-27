'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Layers, Grid3X3, Box, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const ZONE_TYPES = ['STORAGE', 'RECEIVING', 'PICKING', 'PACKING', 'DISPATCH', 'RETURNS', 'COLD_STORAGE', 'HAZARDOUS', 'BULK'];
const SHELF_TYPES = ['STANDARD', 'PALLET', 'HEAVY_DUTY', 'CANTILEVER'];
const BIN_TYPES = ['STANDARD', 'SMALL', 'LARGE', 'SECURE'];

export default function WarehouseZonesPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id;

  const [warehouse, setWarehouse] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedZone, setExpandedZone] = useState(null);
  const [expandedShelf, setExpandedShelf] = useState(null);
  const [shelves, setShelves] = useState({});
  const [bins, setBins] = useState({});

  // Modal: Zone
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState('STORAGE');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id, name, parentId }

  // Modal: Shelf
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [shelfCode, setShelfCode] = useState('');
  const [shelfType, setShelfType] = useState('STANDARD');
  const [shelfCapacity, setShelfCapacity] = useState(100);
  const [activeZoneId, setActiveZoneId] = useState(null);

  // Modal: Bin
  const [showBinModal, setShowBinModal] = useState(false);
  const [binCode, setBinCode] = useState('');
  const [binType, setBinType] = useState('STANDARD');
  const [binCapacity, setBinCapacity] = useState(50);
  const [activeShelfId, setActiveShelfId] = useState(null);

  useEffect(() => { fetchData(); }, [warehouseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, zonesRes] = await Promise.all([
        fetch(`/api/warehouses/${warehouseId}`),
        fetch(`/api/warehouses/${warehouseId}/zones`)
      ]);
      const whData = await whRes.json();
      const zonesData = await zonesRes.json();
      setWarehouse(whData.data || whData);
      setZones(zonesData.zones || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const loadShelves = async (zoneId) => {
    if (shelves[zoneId]) return;
    try {
      const res = await fetch(`/api/warehouses/zones/${zoneId}/shelves`);
      const data = await res.json();
      setShelves(prev => ({ ...prev, [zoneId]: data.shelves || data || [] }));
    } catch { toast.error('Failed to load shelves'); }
  };

  const loadBins = async (shelfId) => {
    if (bins[shelfId]) return;
    try {
      const res = await fetch(`/api/warehouses/shelves/${shelfId}/bins`);
      const data = await res.json();
      setBins(prev => ({ ...prev, [shelfId]: data.bins || data || [] }));
    } catch { toast.error('Failed to load bins'); }
  };

  const handleZoneClick = (zoneId) => {
    if (expandedZone === zoneId) {
      setExpandedZone(null);
      setExpandedShelf(null);
    } else {
      setExpandedZone(zoneId);
      setExpandedShelf(null);
      loadShelves(zoneId);
    }
  };

  const handleShelfClick = (shelfId) => {
    if (expandedShelf === shelfId) {
      setExpandedShelf(null);
    } else {
      setExpandedShelf(shelfId);
      loadBins(shelfId);
    }
  };

  // Zone CRUD
  const createZone = async () => {
    if (!zoneName.trim()) return toast.error('Please enter a zone name');
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/zones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneName, zoneType })
      });
      if (res.ok) {
        toast.success(`Zone "${zoneName}" created!`);
        setShowZoneModal(false); setZoneName(''); setZoneType('STORAGE');
        fetchData();
      }
    } catch { toast.error('Failed'); }
  };

  const confirmDeleteZone = (zone) => {
    setDeleteConfirm({
      type: 'zone', id: zone.id, name: zone.zoneName,
      message: `Delete zone "${zone.zoneName}" and all its shelves & bins?`
    });
  };

  // Shelf CRUD
  const createShelf = async () => {
    if (!shelfCode.trim()) return toast.error('Please enter a shelf code');
    try {
      const res = await fetch(`/api/warehouses/zones/${activeZoneId}/shelves`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shelfCode, shelfType, capacity: shelfCapacity })
      });
      if (res.ok) {
        toast.success(`Shelf "${shelfCode}" created!`);
        setShowShelfModal(false); setShelfCode(''); setShelfType('STANDARD'); setShelfCapacity(100);
        setShelves(prev => ({ ...prev, [activeZoneId]: null }));
        loadShelves(activeZoneId);
      }
    } catch { toast.error('Failed'); }
  };

  const confirmDeleteShelf = (shelf, zoneId) => {
    setDeleteConfirm({
      type: 'shelf', id: shelf.id, name: shelf.shelfCode, parentId: zoneId,
      message: `Delete shelf "${shelf.shelfCode}" and all its bins?`
    });
  };

  // Bin CRUD
  const createBin = async () => {
    if (!binCode.trim()) return toast.error('Please enter a bin code');
    try {
      const res = await fetch(`/api/warehouses/shelves/${activeShelfId}/bins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binCode, binType, capacity: binCapacity })
      });
      if (res.ok) {
        toast.success(`Bin "${binCode}" created!`);
        setShowBinModal(false); setBinCode(''); setBinType('STANDARD'); setBinCapacity(50);
        setBins(prev => ({ ...prev, [activeShelfId]: null }));
        loadBins(activeShelfId);
      }
    } catch { toast.error('Failed'); }
  };

  const confirmDeleteBin = (bin, shelfId) => {
    setDeleteConfirm({
      type: 'bin', id: bin.id, name: bin.binCode, parentId: shelfId,
      message: `Delete bin "${bin.binCode}"?`
    });
  };

  // Execute delete
  const executeDelete = async () => {
  if (!deleteConfirm) return;
  const { type, id, parentId } = deleteConfirm;

  try {
    let url = '';
    if (type === 'zone') url = `/api/warehouses/zones/${id}`;
    else if (type === 'shelf') url = `/api/warehouses/shelves/${id}`;
    else if (type === 'bin') url = `/api/warehouses/bins/${id}`;

    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      toast.success(`${type === 'zone' ? 'Zone' : type === 'shelf' ? 'Shelf' : 'Bin'} deleted!`);
      setDeleteConfirm(null);

      if (type === 'zone') { setExpandedZone(null); fetchData(); }
      else if (type === 'shelf') { setShelves(prev => ({ ...prev, [parentId]: null })); loadShelves(parentId); }
      else if (type === 'bin') { setBins(prev => ({ ...prev, [parentId]: null })); loadBins(parentId); }
    } else {
      // Show the actual error from server
      const errorMsg = data.error || data.message || 'Cannot delete. Remove all items inside first.';
      toast.error(errorMsg);
      setDeleteConfirm(null);
    }
  } catch { 
    toast.error('Failed to delete'); 
    setDeleteConfirm(null);
  }
};

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/warehouse')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{warehouse?.name || 'Warehouse'}</h1>
            <p className="text-sm text-gray-500">Storage Layout • {zones.length} zones</p>
          </div>
        </div>
        <button onClick={() => setShowZoneModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Zone
        </button>
      </div>

      {/* Empty State */}
      {zones.length === 0 && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-5xl mb-4">🏭</div>
          <h3 className="text-lg font-semibold text-gray-700">No zones yet</h3>
          <p className="text-gray-500 mt-1 mb-1">Zones are areas in your warehouse like:</p>
          <p className="text-gray-400 text-sm mb-4">"Main Storage", "Packing Area", "Returns Counter"</p>
          <button onClick={() => setShowZoneModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            + Create First Zone
          </button>
        </div>
      )}

      {/* Zones List */}
      <div className="space-y-2">
        {zones.map(zone => {
          const isZoneOpen = expandedZone === zone.id;
          const zoneShelves = shelves[zone.id] || [];

          return (
            <div key={zone.id} className="bg-white rounded-xl border overflow-hidden">
              {/* Zone Row */}
              <div onClick={() => handleZoneClick(zone.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-10 rounded-full ${
                    zone.zoneType === 'STORAGE' ? 'bg-blue-500' :
                    zone.zoneType === 'RECEIVING' ? 'bg-green-500' :
                    zone.zoneType === 'DISPATCH' ? 'bg-orange-500' :
                    zone.zoneType === 'RETURNS' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-semibold text-gray-900">{zone.zoneName}</p>
                    <p className="text-xs text-gray-500">{zone.zoneType.replace('_', ' ')} • {zoneShelves.length} shelves</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); confirmDeleteZone(zone); }}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {isZoneOpen ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                </div>
              </div>

              {/* Shelves under this Zone */}
              {isZoneOpen && (
                <div className="border-t bg-gray-50/50">
                  <div className="px-4 py-2 flex items-center justify-between border-b bg-white">
                    <span className="text-xs font-medium text-gray-500">SHELVES</span>
                    <button onClick={() => { setActiveZoneId(zone.id); setShowShelfModal(true); }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      + Add Shelf
                    </button>
                  </div>

                  {zoneShelves.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">
                      No shelves. Shelves are racks/rows where you store products.
                    </div>
                  ) : (
                    zoneShelves.map(shelf => {
                      const isShelfOpen = expandedShelf === shelf.id;
                      const shelfBins = bins[shelf.id] || [];
                      const used = shelfBins.reduce((s, b) => s + (b.currentQty || 0), 0);
                      const capPercent = shelf.capacity > 0 ? Math.round((used / shelf.capacity) * 100) : 0;

                      return (
                        <div key={shelf.id} className="border-b last:border-0 bg-white">
                          {/* Shelf Row */}
                          <div onClick={() => handleShelfClick(shelf.id)}
                            className="pl-8 pr-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition">
                            <div className="flex items-center gap-3">
                              <Grid3X3 className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium">{shelf.shelfCode}</p>
                                <p className="text-xs text-gray-400">{shelf.shelfType} • {shelfBins.length} bins</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Capacity bar */}
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${capPercent > 80 ? 'bg-red-500' : capPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${capPercent}%` }} />
                                </div>
                                <span className="text-xs text-gray-400">{used}/{shelf.capacity}</span>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); confirmDeleteShelf(shelf, zone.id); }}
                                className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </button>
                              {isShelfOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                            </div>
                          </div>

                          {/* Bins under this Shelf */}
                          {isShelfOpen && (
                            <div className="border-t bg-gray-50/30">
                              <div className="pl-12 pr-4 py-1.5 flex items-center justify-between border-b">
                                <span className="text-xs font-medium text-gray-400">BINS</span>
                                <button onClick={() => { setActiveShelfId(shelf.id); setShowBinModal(true); }}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                  + Add Bin
                                </button>
                              </div>
                              {shelfBins.length === 0 ? (
                                <div className="pl-12 py-4 text-center text-xs text-gray-400">
                                  No bins. Bins are individual storage boxes/spots.
                                </div>
                              ) : (
                                shelfBins.map(bin => (
                                  <div key={bin.id} className="pl-12 pr-4 py-2.5 flex items-center justify-between border-b last:border-0 hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                      <Box className="h-3.5 w-3.5 text-gray-400" />
                                      <span className="text-sm">{bin.binCode}</span>
                                      <span className="text-xs text-gray-400">{bin.binType}</span>
                                      <span className="text-xs text-gray-400">{bin.currentQty || 0}/{bin.capacity}</span>
                                      {bin.product && (
                                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{bin.product.name}</span>
                                      )}
                                    </div>
                                    <button onClick={() => confirmDeleteBin(bin, shelf.id)}
                                      className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========== MODALS ========== */}

      {/* Add Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-1">Create Zone</h3>
            <p className="text-sm text-gray-500 mb-4">A zone is an area in your warehouse (e.g., "Main Storage", "Packing Area")</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Zone Name</label>
                <input type="text" value={zoneName} onChange={e => setZoneName(e.target.value)}
                  placeholder="e.g., Main Storage" className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select value={zoneType} onChange={e => setZoneType(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm">
                  {ZONE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowZoneModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={createZone} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Shelf Modal */}
      {showShelfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-1">Add Shelf</h3>
            <p className="text-sm text-gray-500 mb-4">A shelf is a rack or row where bins are placed (e.g., "Rack A", "Row 1")</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Shelf Code</label>
                <input type="text" value={shelfCode} onChange={e => setShelfCode(e.target.value)}
                  placeholder="e.g., A-01, Rack-1" className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select value={shelfType} onChange={e => setShelfType(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm">
                  {SHELF_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Capacity (how many items can fit)</label>
                <input type="number" value={shelfCapacity} onChange={e => setShelfCapacity(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowShelfModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={createShelf} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">Add Shelf</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Bin Modal */}
      {showBinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-1">Add Bin</h3>
            <p className="text-sm text-gray-500 mb-4">A bin is an individual storage spot on a shelf (e.g., "A-01-01", "Box 5")</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Bin Code</label>
                <input type="text" value={binCode} onChange={e => setBinCode(e.target.value)}
                  placeholder="e.g., A-01-01" className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select value={binType} onChange={e => setBinType(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm">
                  {BIN_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Capacity (how many items fit)</label>
                <input type="number" value={binCapacity} onChange={e => setBinCapacity(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowBinModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium">Cancel</button>
                <button onClick={createBin} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">Add Bin</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold text-gray-900">Delete {deleteConfirm.type === 'zone' ? 'Zone' : deleteConfirm.type === 'shelf' ? 'Shelf' : 'Bin'}?</h3>
            <p className="text-sm text-gray-500 mt-1">{deleteConfirm.message}</p>
            <p className="text-xs text-red-500 mt-2">This action cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={executeDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}