"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Search, Send, Users, Building2, RefreshCw,
  User, Store, ChevronRight, Clock, BadgeCheck, Mail,
  Radio, Megaphone, Loader2, ArrowLeft, CheckCircle2, ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMessagesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', audience: 'ALL' });
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/messages');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const openConversation = async (conv) => {
    setSelectedConv(conv);
    try {
      const res = await fetch(`/api/admin/messages?userId=${conv.buyer.id}&supplierId=${conv.supplier.id}`);
      const json = await res.json();
      if (json.success) setMessages(json.data || []);
    } catch {
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedConv.buyer.id,
          supplierId: selectedConv.supplier.id,
          message: newMessage,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages([...messages, { ...json.data, senderType: 'ADMIN', buyer: selectedConv.buyer, supplier: selectedConv.supplier }]);
        setNewMessage('');
      }
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastForm.message.trim()) { toast.error('Message required'); return; }
    setBroadcasting(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastType: broadcastForm.audience || 'ALL',
          title: broadcastForm.title,
          message: broadcastForm.message,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${json.data.message}`);
        setBroadcastForm({ title: '', message: '', audience: 'ALL' });
      }
    } catch {
      toast.error('Broadcast failed');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 mt-1">Monitor conversations & broadcast announcements</p>
        </div>
        <button onClick={fetchConversations} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { id: 'conversations', label: 'Conversations', icon: MessageSquare },
          { id: 'broadcast', label: 'Broadcast', icon: Radio },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* CONVERSATIONS TAB */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4" /> Conversations ({data?.conversations?.length || 0})
              </h3>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
              ) : data?.conversations?.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No conversations yet</div>
              ) : (
                data?.conversations?.map((conv, i) => (
                  <button
                    key={i}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      selectedConv?.buyer?.id === conv.buyer?.id && selectedConv?.supplier?.id === conv.supplier?.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white font-bold text-sm">
                        {conv.buyer?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{conv.buyer?.name || 'Unknown'}</span>
                          <ChevronRight className="h-3 w-3 text-gray-300" />
                          <span className="text-sm font-medium text-gray-600 truncate">{conv.supplier?.businessName || 'Unknown'}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {conv.lastSender === 'ADMIN' ? 'You: ' : ''}{conv.lastMessage}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{new Date(conv.lastMessageAt).toLocaleDateString()}</span>
                          <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{conv.messageCount} msgs</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Message View */}
          <div className="lg:col-span-2 bg-white rounded-xl border flex flex-col">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
                  <button onClick={() => setSelectedConv(null)} className="p-1 hover:bg-gray-200 rounded">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white font-bold text-xs">
                    {selectedConv.buyer?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedConv.buyer?.name} ↔ {selectedConv.supplier?.businessName}</p>
                    <p className="text-xs text-gray-400">{selectedConv.messageCount} messages</p>
                  </div>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[450px]">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : msg.senderType === 'BUYER' ? 'justify-start' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.senderType === 'ADMIN' ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white' :
                        msg.senderType === 'BUYER' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-50 text-gray-800'
                      }`}>
                        <p className="text-xs font-semibold mb-0.5 opacity-70">
                          {msg.senderType === 'ADMIN' ? 'You (Admin)' : msg.senderType === 'BUYER' ? msg.buyer?.name : msg.supplier?.businessName}
                        </p>
                        <p>{msg.message}</p>
                        <p className="text-right text-xs opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your message as admin..."
                    className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 flex items-center gap-2">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* BROADCAST TAB */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-100">
                <Radio className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Broadcast Message</h3>
                <p className="text-xs text-gray-500">Send notification + email to targeted audience</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Audience Selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Send To</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Users', icon: Users, desc: 'Everyone' },
                    { id: 'BUYERS', label: 'Buyers Only', icon: ShoppingCart, desc: 'Customers' },
                    { id: 'SUPPLIERS', label: 'Suppliers Only', icon: Store, desc: 'Businesses' },
                  ].map(audience => (
                    <button
                      key={audience.id}
                      onClick={() => setBroadcastForm({ ...broadcastForm, audience: audience.id })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        broadcastForm.audience === audience.id
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <audience.icon className={`h-5 w-5 mx-auto mb-1 ${broadcastForm.audience === audience.id ? 'text-purple-600' : 'text-gray-400'}`} />
                      <p className={`text-xs font-semibold ${broadcastForm.audience === audience.id ? 'text-purple-700' : 'text-gray-700'}`}>{audience.label}</p>
                      <p className="text-[10px] text-gray-400">{audience.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="Important Update from PROCURE"
                  className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  placeholder="Type your announcement here..."
                  rows={5}
                  className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <button
                onClick={sendBroadcast}
                disabled={broadcasting || !broadcastForm.message.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {broadcasting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending Broadcast...</>
                ) : (
                  <><Megaphone className="h-4 w-4" /> Send Broadcast</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}