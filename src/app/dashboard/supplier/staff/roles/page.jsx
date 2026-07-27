'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Plus, Edit, Trash2, X, Check, Lock,
  Eye, EyeOff, ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function RoleManagementPage() {
  const [roles, setRoles] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [expandedRoles, setExpandedRoles] = useState({});

  // Form
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/supplier/roles');
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch roles error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/supplier/roles?permissions=true');
      const data = await res.json();
      setPermissionGroups(data || {});
    } catch (error) {
      console.error('Fetch permissions error:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      const res = await fetch('/api/supplier/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      });

      if (res.ok) {
        toast.success('Role created');
        setShowModal(false);
        setRoleForm({ name: '', description: '', permissions: [] });
        fetchRoles();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create role');
      }
    } catch {
      toast.error('Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    try {
      const res = await fetch(`/api/supplier/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      });

      if (res.ok) {
        toast.success('Role updated');
        setEditingRole(null);
        setShowModal(false);
        fetchRoles();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update role');
      }
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Delete this role?')) return;
    try {
      const res = await fetch(`/api/supplier/roles/${roleId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Role deleted');
        fetchRoles();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete role');
      }
    } catch {
      toast.error('Failed to delete role');
    }
  };

  const togglePermission = (permKey) => {
    setRoleForm(prev => {
      const perms = [...prev.permissions];
      const idx = perms.indexOf(permKey);
      if (idx > -1) {
        perms.splice(idx, 1);
      } else {
        perms.push(permKey);
      }
      return { ...prev, permissions: perms };
    });
  };

  const toggleAllInGroup = (groupPerms) => {
    setRoleForm(prev => {
      const perms = [...prev.permissions];
      const allSelected = groupPerms.every(p => perms.includes(p));
      if (allSelected) {
        return { ...prev, permissions: perms.filter(p => !groupPerms.includes(p)) };
      } else {
        const newPerms = [...new Set([...perms, ...groupPerms])];
        return { ...prev, permissions: newPerms };
      }
    });
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    const perms = typeof role.permissions === 'string'
      ? JSON.parse(role.permissions)
      : role.permissions || [];
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: perms
    });
    setShowModal(true);
  };

  const toggleExpand = (roleId) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-500 mt-1">Define roles with granular permissions for your staff</p>
        </div>
        <button
          onClick={() => { setEditingRole(null); setRoleForm({ name: '', description: '', permissions: [] }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map(role => {
          const perms = typeof role.permissions === 'string'
            ? JSON.parse(role.permissions)
            : role.permissions || [];
          const isExpanded = expandedRoles[role.id];

          return (
            <div key={role.id} className="bg-white rounded-xl border">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${role.isDefault ? 'bg-green-100' : 'bg-purple-100'}`}>
                    <Shield className={`h-5 w-5 ${role.isDefault ? 'text-green-600' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500">
                      {role.description || 'No description'}
                      {role.isDefault && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {perms.length} permissions • {role.staff?.length || 0} members
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(role.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit className="h-4 w-4 text-gray-500" />
                  </button>
                  {!role.isDefault && (
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Permissions */}
              {isExpanded && (
                <div className="border-t px-4 py-3 bg-gray-50 rounded-b-xl">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {perms.map(permKey => (
                      <div key={permKey} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-3 w-3 text-green-500" />
                        {permKey}
                      </div>
                    ))}
                  </div>
                  {role.staff?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-2">Assigned Members:</p>
                      <div className="flex flex-wrap gap-2">
                        {role.staff.map(s => (
                          <span key={s.id} className="px-2 py-1 bg-white rounded-full text-xs text-gray-600 border">
                            {s.staff?.user?.name || s.staff?.user?.email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {roles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500">No roles created</h3>
            <p className="text-gray-400">Create roles to manage staff permissions</p>
          </div>
        )}
      </div>

      {/* Create/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium">Role Name *</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    placeholder="e.g., Warehouse Manager"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                    rows={2}
                    placeholder="Brief description of this role"
                  />
                </div>
              </div>

              {/* Permissions Grid */}
              <h4 className="font-semibold text-gray-900 mb-3">Permissions</h4>
              <div className="space-y-4">
                {Object.entries(permissionGroups).map(([groupKey, group]) => {
                  const groupPerms = group.permissions?.map(p => p.key) || [];
                  const allSelected = groupPerms.length > 0 && groupPerms.every(p => roleForm.permissions.includes(p));
                  const someSelected = groupPerms.some(p => roleForm.permissions.includes(p));

                  return (
                    <div key={groupKey} className="border rounded-lg">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleAllInGroup(groupPerms)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            allSelected ? 'bg-blue-600 border-blue-600' :
                            someSelected ? 'border-blue-400 bg-blue-100' : 'border-gray-300'
                          }`}>
                            {allSelected && <Check className="h-3 w-3 text-white" />}
                            {someSelected && !allSelected && <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>}
                          </div>
                          <span className="font-medium text-sm">{group.label}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {roleForm.permissions.filter(p => groupPerms.includes(p)).length}/{groupPerms.length}
                        </span>
                      </div>
                      <div className="border-t px-3 py-2 bg-gray-50 rounded-b-lg">
                        <div className="grid grid-cols-2 gap-1">
                          {group.permissions?.map(perm => (
                            <label
                              key={perm.key}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={roleForm.permissions.includes(perm.key)}
                                onChange={() => togglePermission(perm.key)}
                                className="rounded border-gray-300 text-blue-600"
                              />
                              {perm.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                disabled={!roleForm.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}