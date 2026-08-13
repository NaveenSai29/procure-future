'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Megaphone, Mail, MessageSquare, Bell } from 'lucide-react';

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  useEffect(() => {
    fetch('/api/admin/marketing/campaigns').then(r => r.json()).then(d => setCampaigns(d.campaigns || [])).catch(() => {});
  }, []);

  const icons = { EMAIL: Mail, SMS: MessageSquare, PUSH: Bell };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Campaigns</h1>
      <div className="space-y-3">
        {campaigns.map(c => {
          const Icon = icons[c.type] || Megaphone;
          return (
            <div key={c.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
              <Icon className="h-5 w-5 text-gray-400" />
              <div className="flex-1"><p className="font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.type} • {c.targetAudience}</p></div>
              <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{c.status}</span>
            </div>
          );
        })}
        {campaigns.length === 0 && <div className="text-center py-12 text-gray-400"><Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No campaigns found</p></div>}
      </div>
    </div>
  );
}