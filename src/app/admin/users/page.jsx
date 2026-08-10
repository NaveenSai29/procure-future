'use client';

import { useEffect, useState } from 'react';
import { 
  Search, RefreshCw, Ban, CheckCircle, UserCheck, 
  XCircle, Loader2, Users, ShoppingBag, Building, Bike, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch { toast.error('Failed to load users'); } 
    finally { setLoading(false); }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'toggleActive', isActive: !currentStatus })
      });
      toast.success(currentStatus ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const handleVerifyEmail = async (userId) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'verifyEmail' })
      });
      toast.success('Email verified');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const filtered = users.filter(u => {
    const matchSearch = !searchTerm || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      u.mobile?.includes(searchTerm);
    const matchType = !typeFilter || u.userType === typeFilter;
    return matchSearch && matchType;
  });

  const counts = {
    all: users.length,
    buyer: users.filter(u => u.userType === 'Buyer').length,
    supplier: users.filter(u => u.userType === 'Supplier').length,
    delivery: users.filter(u => u.userType === 'Delivery Partner').length,
    admin: users.filter(u => u.userType === 'Admin').length,
  };

  const filterTabs = [
    { key: '', label: 'All', count: counts.all, icon: Users },
    { key: 'Buyer', label: 'Buyers', count: counts.buyer, icon: ShoppingBag },
    { key: 'Supplier', label: 'Suppliers', count: counts.supplier, icon: Building },
    { key: 'Delivery Partner', label: 'Delivery', count: counts.delivery, icon: Bike },
    { key: 'Admin', label: 'Admins', count: counts.admin, icon: Shield },
  ];

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              typeFilter === tab.key
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className="text-xs text-gray-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by name, email or mobile..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" 
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-gray-400" />
                    <p className="text-gray-400 text-sm">Loading users...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 text-sm font-medium">No users found</p>
                    <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filter</p>
                  </td>
                </tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* User Name + Contact */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{user.name || 'Unnamed'}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                          {user.email ? (
                            <span className="flex items-center gap-1">
                              {user.email}
                              {user.emailVerified ? 
                                <CheckCircle className="h-3 w-3 text-green-500" /> : 
                                <span className="text-amber-500 font-medium">(Unverified)</span>
                              }
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No email</span>
                          )}
                          {user.mobile && (
                            <span>+91 {user.mobile}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.userType === 'Admin' ? 'bg-red-50 text-red-700' :
                        user.userType === 'Supplier' ? 'bg-purple-50 text-purple-700' :
                        user.userType === 'Delivery Partner' ? 'bg-orange-50 text-orange-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {user.userType}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="px-5 py-4">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {user.supplier && (
                          <>
                            <p className="font-medium text-gray-700">{user.supplier.businessName}</p>
                            <p>{user.supplier.productCount} products · {user.supplier.isVerified ? 'Verified' : 'Pending'}</p>
                          </>
                        )}
                        {user.deliveryPartner && (
                          <>
                            <p>
                              {user.deliveryPartner.vehicle || 'No vehicle'} 
                              {user.deliveryPartner.vehicleNumber && ` (${user.deliveryPartner.vehicleNumber})`}
                            </p>
                            <p>
                              {user.deliveryPartner.totalDeliveries || 0} deliveries · Rating {user.deliveryPartner.rating?.toFixed(1) || '0.0'} 
                              · {user.deliveryPartner.isVerified ? 'Verified' : 'Pending'}
                              {user.deliveryPartner.isOnline && <span className="text-green-600 ml-1">· Online</span>}
                            </p>
                          </>
                        )}
                        {user.buyer && (
                          <p>{user.buyer.orderCount || 0} orders</p>
                        )}
                        {!user.supplier && !user.deliveryPartner && !user.buyer && user.userType === 'Admin' && (
                          <p className="text-gray-400">Platform administrator</p>
                        )}
                        {user.userType === 'User' && (
                          <p className="text-gray-400">No profile</p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.isActive 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-red-50 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {user.email && !user.emailVerified && (
                          <button 
                            onClick={() => handleVerifyEmail(user.id)} 
                            className="p-2 rounded-lg hover:bg-green-50 transition" 
                            title="Verify Email"
                          >
                            <UserCheck className="h-4 w-4 text-green-500" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleToggleActive(user.id, user.isActive)} 
                          className="p-2 rounded-lg hover:bg-gray-100 transition" 
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? 
                            <Ban className="h-4 w-4 text-gray-400 hover:text-red-500" /> : 
                            <CheckCircle className="h-4 w-4 text-gray-400 hover:text-green-500" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-5 py-3 border-t bg-gray-50 text-xs text-gray-500">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
}