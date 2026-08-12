'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Edit, Trash2, X, Save,
  Mail, MessageSquare, Bell, Send, Calendar, Play, Eye
} from 'lucide-react';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [form, setForm] = useState({
    name: '', description: '', type: 'EMAIL',
    subject: '', content: '', targetAudience: 'ALL'
  });

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/supplier/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const url = editingCampaign ? '/api/supplier/campaigns/' + editingCampaign.id : '/api/supplier/campaigns';
      const method = editingCampaign ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingCampaign ? 'Campaign updated' : 'Campaign created');
        setShowModal(false);
        resetForm();
        fetchCampaigns();
      }
    } catch { toast.error('Failed to save campaign'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await fetch(`/api/supplier/campaigns?id=${id}`, { method: 'DELETE' });
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch { toast.error('Failed to delete'); }
  };

  const handleSend = async (id) => {
    if (!confirm('Send this campaign now to all your customers?')) return;
    try {
      const res = await fetch(`/api/supplier/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sent to ${data.sentCount} customers!`);
        fetchCampaigns();
      } else {
        toast.error(data.message || 'Failed to send');
      }
    } catch { toast.error('Failed to send campaign'); }
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setForm({ name: '', description: '', type: 'EMAIL', subject: '', content: '', targetAudience: 'ALL' });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'EMAIL': return <Mail className="h-5 w-5" />;
      case 'SMS': return <MessageSquare className="h-5 w-5" />;
      case 'PUSH': return <Bell className="h-5 w-5" />;
      default: return <Megaphone className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-600',
      SCHEDULED: 'bg-blue-100 text-blue-700',
      SENDING: 'bg-yellow-100 text-yellow-700',
      SENT: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Email, SMS, and push notification campaigns</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${campaign.type === 'EMAIL' ? 'bg-blue-50 text-blue-600' : campaign.type === 'SMS' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                  {getTypeIcon(campaign.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{campaign.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {campaign.subject && <span>Subject: {campaign.subject}</span>}
                    <span>Audience: {campaign.targetAudience}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
                <button
                  onClick={() => { setEditingCampaign(campaign); setForm({
                    name: campaign.name, description: campaign.description || '',
                    type: campaign.type, subject: campaign.subject || '',
                    content: campaign.content || '', targetAudience: campaign.targetAudience || 'ALL'
                  }); setShowModal(true); }}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  <Edit className="h-4 w-4 text-gray-400" />
                </button>
                  {campaign.status !== 'SENT' && (
                  <button onClick={() => handleSend(campaign.id)} className="p-1.5 hover:bg-green-50 rounded" title="Send Now">
                    <Send className="h-4 w-4 text-green-500" />
                  </button>
                )}
                <button onClick={() => handleDelete(campaign.id)} className="p-1.5 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
            {/* Stats */}
            {campaign.status === 'SENT' && (
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-gray-500">Sent</p>
                  <p className="font-bold text-gray-900">{campaign.recipientCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Opens</p>
                  <p className="font-bold text-gray-900">{campaign.openCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Clicks</p>
                  <p className="font-bold text-gray-900">{campaign.clickCount}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {campaigns.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No campaigns created yet</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Campaign Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="Summer Promotion" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1">
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="PUSH">Push Notification</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Target Audience</label>
                  <select value={form.targetAudience} onChange={(e) => setForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg mt-1">
                    <option value="ALL">All Customers</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="NEW">New Customers</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <input type="text" value={form.subject} onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="Campaign subject line" />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <textarea value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1" rows={5} placeholder="Campaign message content" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="Internal notes" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="h-4 w-4 inline mr-1" />{editingCampaign ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}