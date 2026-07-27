'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Send, Users, Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState('SEND');
  const [templates, setTemplates] = useState([]);
  const [emailQueue, setEmailQueue] = useState([]);
  const [smsQueue, setSmsQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Send notification form
  const [sendForm, setSendForm] = useState({
    type: 'EMAIL',
    userIds: '',
    title: '',
    message: '',
    templateId: ''
  });

  useEffect(() => {
    fetchTemplates();
    fetchQueues();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/notifications/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Fetch templates error:', error);
    }
  };

  const fetchQueues = async () => {
    try {
      const [emailRes, smsRes] = await Promise.all([
        fetch('/api/admin/notifications/queue?type=EMAIL'),
        fetch('/api/admin/notifications/queue?type=SMS')
      ]);

      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmailQueue(data.queue || []);
      }
      if (smsRes.ok) {
        const data = await smsRes.json();
        setSmsQueue(data.queue || []);
      }
    } catch (error) {
      console.error('Fetch queues error:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userIds = sendForm.userIds.split(',').map(id => id.trim()).filter(Boolean);
      
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sendForm,
          userIds
        })
      });

      if (res.ok) {
        toast.success('Notification sent successfully');
        setSendForm({ type: 'EMAIL', userIds: '', title: '', message: '', templateId: '' });
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast.error('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async (type) => {
    try {
      const res = await fetch('/api/admin/notifications/process-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (res.ok) {
        toast.success(`${type} queue processed`);
        fetchQueues();
      }
    } catch (error) {
      toast.error('Failed to process queue');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
          <p className="text-gray-500 mt-1">Manage all platform notifications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'SEND', label: 'Send Notification', icon: Send },
          { id: 'TEMPLATES', label: 'Templates', icon: Edit },
          { id: 'EMAIL_QUEUE', label: 'Email Queue', icon: Mail },
          { id: 'SMS_QUEUE', label: 'SMS Queue', icon: MessageSquare }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Send Notification Form */}
      {activeTab === 'SEND' && (
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Send Platform Notification</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={sendForm.type}
                  onChange={(e) => setSendForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="IN_APP">In-App</option>
                  <option value="PUSH">Push</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template (Optional)</label>
                <select
                  value={sendForm.templateId}
                  onChange={(e) => setSendForm(prev => ({ ...prev, templateId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">No Template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User IDs (comma-separated, leave empty for all)
              </label>
              <input
                type="text"
                value={sendForm.userIds}
                onChange={(e) => setSendForm(prev => ({ ...prev, userIds: e.target.value }))}
                placeholder="user-id-1, user-id-2"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={sendForm.title}
                onChange={(e) => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Notification title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                required
                rows={4}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Notification message content"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates */}
      {activeTab === 'TEMPLATES' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Notification Templates</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add Template
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map(template => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{template.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {template.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{template.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="View">
                          <Eye className="h-4 w-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="Edit">
                          <Edit className="h-4 w-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No templates created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Email Queue */}
      {activeTab === 'EMAIL_QUEUE' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Email Queue</h2>
            <button
              onClick={() => processQueue('EMAIL')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              Process Queue
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emailQueue.map(email => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{email.toEmail}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{email.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        email.status === 'SENT' ? 'bg-green-100 text-green-700' :
                        email.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {email.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {email.attempts}/{email.maxAttempts}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {emailQueue.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Email queue is empty
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SMS Queue */}
      {activeTab === 'SMS_QUEUE' && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">SMS Queue</h2>
            <button
              onClick={() => processQueue('SMS')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              Process Queue
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {smsQueue.map(sms => (
                  <tr key={sms.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{sms.toMobile}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {sms.message}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        sms.status === 'SENT' ? 'bg-green-100 text-green-700' :
                        sms.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sms.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sms.attempts}/{sms.maxAttempts}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(sms.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {smsQueue.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      SMS queue is empty
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}