'use client';

import { useState, useEffect } from 'react';
import {
  FolderTree, Plus, Edit, Trash2, X, Save, Search,
  ChevronRight, ChevronDown, Folder, FolderOpen,
  Image, MoveUp, MoveDown, Eye, EyeOff, Package,
  GripVertical, Layers, ArrowUp, Filter
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [viewMode, setViewMode] = useState('tree'); // tree, list
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    name: '', description: '', image: '', parentId: '', sortOrder: 0, isActive: true
  });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/categories?tree=true&includeInactive=true');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editingCategory
        ? '/api/admin/categories/' + editingCategory.id
        : '/api/admin/categories';
      const method = editingCategory ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingCategory ? 'Category updated' : 'Category created');
        setShowModal(false);
        resetForm();
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async (categoryId, name) => {
    if (!confirm('Delete category "' + name + '"?')) return;
    try {
      const res = await fetch('/api/admin/categories/' + categoryId, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted');
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Cannot delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleActive = async (categoryId, currentActive) => {
    try {
      await fetch('/api/admin/categories/' + categoryId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      });
      toast.success(currentActive ? 'Deactivated' : 'Activated');
      fetchCategories();
    } catch {
      toast.error('Failed to update');
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setForm({ name: '', description: '', image: '', parentId: '', sortOrder: 0, isActive: true });
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      image: cat.image || '',
      parentId: cat.parentId || '',
      sortOrder: cat.sortOrder || 0,
      isActive: cat.isActive
    });
    setShowModal(true);
  };

  const toggleExpand = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all = {};
    categories.forEach(c => {
      all[c.id] = true;
      c.children?.forEach(ch => { all[ch.id] = true; });
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  // Flatten categories for list view
  const flattenCategories = (cats, level = 0) => {
    let result = [];
    cats.forEach(cat => {
      result.push({ ...cat, level });
      if (cat.children?.length > 0) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    });
    return result;
  };

  const filteredCategories = searchTerm
    ? flattenCategories(categories).filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : flattenCategories(categories);

  // Tree Node Component
  const TreeNode = ({ category, level = 0 }) => {
    const isExpanded = expandedNodes[category.id];
    const hasChildren = category.children?.length > 0;
    const productCount = category._count?.products || 0;
    const childCount = category._count?.children || 0;

    return (
      <div>
        <div
          className={`flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 transition ${
            !category.isActive ? 'opacity-50' : ''
          }`}
          style={{ paddingLeft: (level * 24 + 12) + 'px' }}
        >
          {/* Expand/Collapse */}
          <button
            onClick={() => toggleExpand(category.id)}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
            ) : (
              <span className="w-4"></span>
            )}
          </button>

          {/* Icon */}
          <div className="p-1.5 bg-blue-50 rounded">
            {hasChildren && isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-600" />
            ) : (
              <Folder className="h-4 w-4 text-blue-600" />
            )}
          </div>

          {/* Name & Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900 truncate">{category.name}</span>
              {!category.isActive && (
                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">Inactive</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
              {productCount > 0 && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" /> {productCount} products
                </span>
              )}
              {childCount > 0 && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" /> {childCount} subcategories
                </span>
              )}
              <span className="text-gray-300">slug: {category.slug}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleToggleActive(category.id, category.isActive)}
              className="p-1.5 hover:bg-gray-100 rounded"
              title={category.isActive ? 'Deactivate' : 'Activate'}
            >
              {category.isActive ? <EyeOff className="h-3.5 w-3.5 text-yellow-500" /> : <Eye className="h-3.5 w-3.5 text-green-500" />}
            </button>
            <button
              onClick={() => openEdit(category)}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <Edit className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button
              onClick={() => handleDelete(category.id, category.name)}
              className="p-1.5 hover:bg-red-50 rounded"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {category.children.map(child => (
              <TreeNode key={child.id} category={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-500 mt-1">{categories.length} root categories</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <ChevronDown className="h-4 w-4" /> Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <ChevronRight className="h-4 w-4" /> Collapse All
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Category Tree */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredCategories.length > 0 ? (
            searchTerm ? (
              // Flat list when searching
              filteredCategories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50" style={{ paddingLeft: (cat.level * 24 + 16) + 'px' }}>
                  <Folder className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium flex-1">{cat.name}</span>
                  <span className="text-xs text-gray-400">{cat.slug}</span>
                  <button onClick={() => openEdit(cat)} className="p-1 hover:bg-gray-100 rounded">
                    <Edit className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              ))
            ) : (
              // Tree view
              categories.map(cat => (
                <TreeNode key={cat.id} category={cat} level={0} />
              ))
            )
          ) : (
            <div className="p-12 text-center text-gray-400">
              <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No categories found</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="e.g., Electronics"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Parent Category</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm(prev => ({ ...prev, parentId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                >
                  <option value="">None (Root Category)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} disabled={cat.id === editingCategory?.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  rows={2}
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Image URL</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={form.isActive}
                    onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}