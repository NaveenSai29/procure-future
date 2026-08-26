"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Search, Send, Users, Building2, RefreshCw,
  User, Store, ChevronRight, Clock, BadgeCheck, Mail,
  Radio, Megaphone, Loader2, ArrowLeft, CheckCircle2, ShoppingCart,
  Headphones, XCircle, AlertTriangle, Bot,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMessagesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversationFilter, setConversationFilter] = useState('ALL'); // ALL, SUPPORT, SUPPLIER, ARCHIVED
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', audience: 'ALL' });
  const [broadcasting, setBroadcasting] = useState(false);
  const [showEndChatModal, setShowEndChatModal] = useState(false);
  const [endingChat, setEndingChat] = useState(false);

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

  // Auto-refresh conversations every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Auto-refresh messages when a conversation is open
  useEffect(() => {
    if (!selectedConv) return;
    const interval = setInterval(() => {
      // If conversation is archived, pass showArchived=true
      const showArchivedParam = selectedConv.isArchived ? '&showArchived=true' : '';
      fetch(`/api/admin/messages?userId=${selectedConv.buyer.id}&supplierId=${selectedConv.supplier.id}${showArchivedParam}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setMessages(json.data || []);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConv?.buyer?.id, selectedConv?.supplier?.id, selectedConv?.isArchived]);

  const openConversation = async (conv) => {
    setSelectedConv(conv);
    try {
      // If conversation is archived, pass showArchived=true
      const showArchivedParam = conv.isArchived ? '&showArchived=true' : '';
      const res = await fetch(`/api/admin/messages?userId=${conv.buyer.id}&supplierId=${conv.supplier.id}${showArchivedParam}`);
      const json = await res.json();
      if (json.success) setMessages(json.data || []);
    } catch {
      toast.error('Failed to load messages');
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const msgContainer = document.getElementById('message-container');
    if (msgContainer) {
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }
  }, [messages]);

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

  const handleEndChat = async () => {
    if (!selectedConv) return;
    setEndingChat(true);
    try {
      const res = await fetch(`/api/admin/messages?userId=${selectedConv.buyer.id}&supplierId=${selectedConv.supplier.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Conversation ended successfully');
        setShowEndChatModal(false);
        setSelectedConv(null);
        setMessages([]);
        fetchConversations();
      } else {
        toast.error(json.error || 'Failed to end conversation');
      }
    } catch {
      toast.error('Failed to end conversation');
    } finally {
      setEndingChat(false);
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

  // Clean message text - remove [Support Team] prefix and bot emoji clutter
  const cleanMessage = (msg) => {
    if (!msg) return '';
    let cleaned = msg.replace(/^\[Support Team\]\s*/i, '');
    return cleaned;
  };

  // Check if message is a bot selection (buyer clicked an option)
  const isBotSelection = (msg) => {
    if (msg.senderType !== 'BUYER') return false;
    const botOptionLabels = [
      '📦 Order Related', '💳 Payment / Refund', '🛵 Delivery Issue', '👤 Account Related', '❓ Other',
      '⏰ Order is delayed', '📦 Wrong item received', '🔍 Quality issue', '❌ Want to cancel order', '📋 Order status inquiry',
      '💰 Refund not received', '💳 Double payment charged', '❌ Payment failed', '👛 Wallet issue',
      '📍 Partner is late', '🗺️ Wrong location shown', '📞 Partner not reachable', '🚫 Delivery marked delivered but not received',
      '✏️ Update profile', '🔑 Login issue', '📱 Change mobile number', '🗑️ Delete account',
      'Yes, more than 7 days', 'No, less than 7 days', 'Not sure when it started',
      'Okay, Got it', 'Still need help', 'Connect to support team', 'Connect to Agent',
      'Yes, process refund', 'No, keep my order', 'Yes, arrange replacement', 'No, I changed my mind',
      'Wait a bit more', 'Contact delivery partner', 'Cancel order', 'Cancel delivery',
      'Upload Photo', 'Skip - Connect to Agent', 'I want a refund',
      'Less than 30 minutes', '30 min to 1 hour', 'More than 1 hour',
      'Yes, I need more help', 'No, that helps', 'Still can\'t login', 'OTP not received', 'It works now',
      'Still no OTP', 'OTP received now', 'I need help updating', 'That helps, thanks!',
      'Yes, delete my account', 'No, keep my account',
      'Update my location', 'Wait for partner to respond',
      'Amount deducted but no order', 'Try different payment method',
      'Money deducted but not credited', 'Unable to add money', 'Balance showing wrong',
      'No, that\'s all. Thank you!', 'Yes, I have another question',
    ];
    return botOptionLabels.some(label => msg.message?.includes(label));
  };

  // Filter conversations based on selected filter
  const filteredConversations = data?.conversations?.filter(conv => {
    if (conversationFilter === 'ALL') return !conv.isArchived;
    if (conversationFilter === 'SUPPORT') return conv.isSupportChat === true && !conv.isArchived;
    if (conversationFilter === 'SUPPLIER') return conv.isSupportChat !== true && !conv.isArchived;
    if (conversationFilter === 'ARCHIVED') return conv.isArchived === true;
    return true;
  }) || [];

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
                <Users className="h-4 w-4" /> Conversations ({filteredConversations.length})
              </h3>
              {/* Filter Tabs */}
              <div className="flex gap-1 mt-3 bg-white rounded-lg p-1 border">
                {[
                  { id: 'ALL', label: 'Active' },
                  { id: 'SUPPORT', label: 'Support', icon: Headphones },
                  { id: 'SUPPLIER', label: 'Supplier', icon: Store },
                  { id: 'ARCHIVED', label: 'Closed', icon: XCircle },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setConversationFilter(filter.id)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition ${
                      conversationFilter === filter.id
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {filter.icon && <filter.icon className="h-3 w-3" />}
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y max-h-[550px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No conversations found</div>
              ) : (
                filteredConversations.map((conv, i) => (
                  <button
                    key={i}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      selectedConv?.buyer?.id === conv.buyer?.id && selectedConv?.supplier?.id === conv.supplier?.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                        conv.isSupportChat 
                          ? 'bg-gradient-to-br from-purple-400 to-pink-400' 
                          : 'bg-gradient-to-br from-orange-400 to-rose-400'
                      }`}>
                        {conv.isSupportChat ? <Headphones className="h-5 w-5" /> : (conv.buyer?.name?.charAt(0) || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">{conv.buyer?.name || 'Unknown'}</span>
                          <ChevronRight className="h-3 w-3 text-gray-300" />
                          <span className="text-sm font-medium text-gray-600 truncate">{conv.supplier?.businessName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {conv.isSupportChat && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                              <Headphones className="h-2.5 w-2.5" /> Support
                            </span>
                          )}
                          {conv.isArchived && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                              <XCircle className="h-2.5 w-2.5" /> Closed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {conv.lastSender === 'ADMIN' ? 'You: ' : ''}{cleanMessage(conv.lastMessage)}
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                    selectedConv.isSupportChat 
                      ? 'bg-gradient-to-br from-purple-400 to-pink-400' 
                      : 'bg-gradient-to-br from-orange-400 to-rose-400'
                  }`}>
                    {selectedConv.isSupportChat ? <Headphones className="h-4 w-4" /> : selectedConv.buyer?.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                      {selectedConv.buyer?.name} ↔ {selectedConv.supplier?.businessName}
                      {selectedConv.isSupportChat && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                          <Headphones className="h-2.5 w-2.5" /> Support Chat
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{selectedConv.messageCount} messages</p>
                  </div>
                  {/* End Chat Button - only show for active chats */}
                  {!selectedConv.isArchived && (
                    <button
                      onClick={() => setShowEndChatModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition border border-red-200"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      End Chat
                    </button>
                  )}
                  {selectedConv.isArchived && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium">
                      <XCircle className="h-3.5 w-3.5" />
                      Closed
                    </span>
                  )}
                </div>

                <div id="message-container" className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                  {messages.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No messages in this conversation</p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isBotSelectionMsg = isBotSelection(msg);
                      return (
                        <div key={i} className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            msg.senderType === 'ADMIN' ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white' :
                            msg.senderType === 'BUYER' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-50 text-gray-800'
                          }`}>
                            <p className="text-xs font-semibold mb-0.5 opacity-70 flex items-center gap-1">
                              {msg.senderType === 'ADMIN' ? 'You (Admin)' : msg.senderType === 'BUYER' ? msg.buyer?.name : msg.supplier?.businessName}
                              {isBotSelectionMsg && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded-full ml-1">
                                  <Bot className="h-2.5 w-2.5" /> Selected
                                </span>
                              )}
                            </p>
                            <p>{cleanMessage(msg.message)}</p>
                            <p className="text-right text-xs opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t flex gap-2">
                  {selectedConv.isArchived ? (
                    <div className="flex-1 text-center py-2.5 text-sm text-gray-400">
                      This conversation is closed
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your reply as support team..."
                        className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                      />
                      <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 flex items-center gap-2">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </>
                  )}
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

      {/* End Chat Confirmation Modal */}
      {showEndChatModal && selectedConv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">End Conversation?</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              This will permanently delete all messages between{' '}
              <span className="font-medium text-gray-700">{selectedConv.buyer?.name}</span>{' '}
              and{' '}
              <span className="font-medium text-gray-700">{selectedConv.supplier?.businessName}</span>.
              The buyer will need to start a new chat if they need help again.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEndChatModal(false)}
                disabled={endingChat}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEndChat}
                disabled={endingChat}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {endingChat ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Ending...</>
                ) : (
                  <><XCircle className="h-4 w-4" /> End Chat</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}