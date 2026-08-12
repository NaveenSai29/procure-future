'use client';

import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, Edit, Trash2, Search,
  Mail, Phone, MapPin, Calendar, X, Check, Loader2,
  UserCheck, UserX, Building2, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: '', mobile: '', role: 'STAFF', branchId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, rolesRes, branchesRes] = await Promise.all([
        fetch('/api/supplier/staff'),
        fetch('/api/supplier/roles'),
        fetch('/api/supplier/branches')
      ]);

      const [staffData, rolesData, branchesData] = await Promise.all([
        staffRes.json(), rolesRes.json(), branchesRes.json()
      ]);

      setStaff(staffData.staff || []);
      setRoles(rolesData || []);
      setBranches(branchesData.branches || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    try {
      const res = await fetch('/api/supplier/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });

      if (res.ok) {
        toast.success('Staff member added');
        setShowAddModal(false);
        setStaffForm({ name: '', email: '', password: '', mobile: '', role: 'STAFF', branchId: '' });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add staff');
      }
    } catch (error) {
      toast.error('Failed to add staff');
    }
  };

  const handleToggleActive = async (staffId, currentActive) => {
    try {
      await fetch(`/api/supplier/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      });
      toast.success(currentActive ? 'Staff deactivated' : 'Staff activated');
      fetchData();
    } catch {
      toast.error('Failed to update staff');
    }
  };

  const handleDelete = async (staffId) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await fetch(`/api/supplier/staff/${staffId}`, { method: 'DELETE' });
      toast.success('Staff removed');
      fetchData();
    } catch {
      toast.error('Failed to remove staff');
    }
  };

  const handleAssignRole = async (staffId, roleId) => {
    try {
      const res = await fetch(`/api/supplier/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId })
      });
      if (res.ok) {
        toast.success('Role assigned');
        fetchData();
        setShowRoleModal(false);
      }
    } catch {
      toast.error('Failed to assign role');
    }
  };

  const filteredStaff = staff.filter(s =>
    s.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage team members and their permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-xl border p-6 h-40"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map(member => (
            <div key={member.id} className="bg-white rounded-xl border p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.user?.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      member.user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {member.user?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleActive(member.id, member.user?.isActive)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title={member.user?.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {member.user?.isActive ? <UserX className="h-4 w-4 text-yellow-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-1.5 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail className="h-3.5 w-3.5" />
                  {member.user?.email}
                </div>
                {member.user?.mobile && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="h-3.5 w-3.5" />
                    {member.user.mobile}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                    {member.role}
                  </span>
                </div>
                {member.branch && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Building2 className="h-3.5 w-3.5" />
                    {member.branch.branchName}
                  </div>
                )}
                {member.staffRoles?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {member.staffRoles.map(sr => (
                      <span key={sr.id} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                        {sr.role.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => { setSelectedStaff(member); setShowRoleModal(true); }}
                className="mt-4 w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <Shield className="h-3.5 w-3.5" />
                Assign Role
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {filteredStaff.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-500">No staff members</h3>
              <p className="text-gray-400">Add team members to manage your business</p>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Password *</label>
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mobile</label>
                <input
                  type="text"
                  value={staffForm.mobile}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, mobile: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
                  <option value="SALES">Sales</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Branch</label>
                <select
                  value={staffForm.branchId}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, branchId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branchName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStaff}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showRoleModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Assign Role to {selectedStaff.user?.name}</h3>
              <button onClick={() => setShowRoleModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {roles.map(role => {
                const isAssigned = selectedStaff.staffRoles?.some(sr => sr.role.id === role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => handleAssignRole(selectedStaff.id, role.id)}
                    disabled={isAssigned}
                    className={`w-full p-3 rounded-lg border text-left transition ${
                      isAssigned
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                        )}
                      </div>
                      {isAssigned && <Check className="h-5 w-5 text-green-500" />}
                    </div>
                  </button>
                );
              })}
              {roles.length === 0 && (
                <p className="text-center text-gray-400 py-4">No roles created yet</p>
              )}
            </div>
            <div className="mt-4">
              <a
                href="/dashboard/supplier/staff/roles"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Manage Roles & Permissions →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}