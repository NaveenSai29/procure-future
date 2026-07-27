'use client';

import { useEffect, useState } from 'react';
import { Users, Mail, Phone, Search, Shield, Ban, CheckCircle, XCircle, UserCheck, Building, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {} finally { setLoading(false); }
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
    const matchSearch = !searchTerm || u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !typeFilter || u.userType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Users</h1><p className="text-gray-500">{users.length} registered users</p></div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-4 flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" /></div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">All Types</option><option value="Admin">Admin</option><option value="Supplier">Supplier</option><option value="Buyer">Buyer</option><option value="User">User</option></select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Verified</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{user.name?.charAt(0)}</div>
                    <div><p className="font-medium text-sm">{user.name}</p><div className="flex gap-1 mt-0.5">{user.roles.map(r => <span key={r} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{r}</span>)}</div></div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.userType === 'Admin' ? 'bg-red-100 text-red-700' :
                    user.userType === 'Supplier' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{user.userType}</span>
                  {user.supplierName && <p className="text-xs text-gray-400 mt-0.5">{user.supplierName}</p>}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-gray-400" />{user.email}</div>
                  {user.mobile && <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="h-3 w-3" />{user.mobile}</div>}
                </td>
                <td className="px-4 py-3">
                  {user.emailVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {!user.emailVerified && <button onClick={() => handleVerifyEmail(user.id)} className="p-1.5 hover:bg-green-50 rounded" title="Verify Email"><UserCheck className="h-4 w-4 text-green-500" /></button>}
                    <button onClick={() => handleToggleActive(user.id, user.isActive)} className="p-1.5 hover:bg-gray-100 rounded" title={user.isActive ? 'Deactivate' : 'Activate'}>{user.isActive ? <Ban className="h-4 w-4 text-yellow-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}