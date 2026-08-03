'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Phone, Bike, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function DeliveryChatsPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => { fetchConversations(); return () => clearInterval(pollRef.current); }, []);

  // Poll messages every 5 seconds when chat is open
  useEffect(() => {
    if (selectedPartner) {
      pollRef.current = setInterval(() => {
        fetchMessages(selectedPartner.id, true);
      }, 5000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [selectedPartner]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/admin/delivery-chats');
      const data = await res.json();
      if (data.success) setConversations(data.data || []);
    } catch (e) { toast.error('Failed to load chats'); }
    finally { setLoading(false); }
  };

  const fetchMessages = async (partnerId, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/delivery-chats?partnerId=${partnerId}`);
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch (e) { if (!silent) toast.error('Failed to load messages'); }
    finally { if (!silent) setLoading(false); }
  };

  const openChat = async (partner) => {
    setSelectedPartner(partner);
    await fetchMessages(partner.id);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedPartner || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const tempMsg = { id: Date.now().toString(), message: text, senderType: 'ADMIN', createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch('/api/admin/delivery-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: selectedPartner.id, message: text }),
      });
      // Refresh to get server message
      setTimeout(() => fetchMessages(selectedPartner.id, true), 300);
    } catch (e) { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className={`w-80 border-r bg-white flex flex-col ${selectedPartner ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Partner Chats</h2>
            <p className="text-xs text-gray-500">{conversations.length} conversations</p>
          </div>
          <button onClick={fetchConversations} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Partners will appear here when they send a message</p>
            </div>
          ) : (
            conversations.map(c => (
              <button key={c.id} onClick={() => openChat(c)}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${selectedPartner?.id === c.id ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm">
                    {c.user?.name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.user?.name || 'Partner'}</p>
                    <p className="text-xs text-gray-400 truncate">
                      <Bike className="h-3 w-3 inline mr-1" />
                      {c.vehicleType || 'N/A'}
                      {c.vehicleNumber ? ` • ${c.vehicleNumber}` : ''}
                    </p>
                    {c.lastMessage && (
                      <p className="text-xs text-gray-400 truncate mt-0.5 italic">
                        {c.lastMessage.message?.slice(0, 40)}...
                      </p>
                    )}
                  </div>
                  {c._count?.chats > 0 && (
                    <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                      {c._count.chats}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedPartner ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b flex items-center gap-3">
              <button onClick={() => setSelectedPartner(null)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm">
                {selectedPartner.user?.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{selectedPartner.user?.name || 'Partner'}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                  <Bike className="h-3 w-3" /> {selectedPartner.vehicleType || 'N/A'}
                  {selectedPartner.vehicleNumber && <><span className="mx-1">•</span>{selectedPartner.vehicleNumber}</>}
                  <span className="mx-1">•</span>
                  <Phone className="h-3 w-3" /> {selectedPartner.user?.mobile || 'N/A'}
                </p>
              </div>
              <a href={`tel:${selectedPartner.user?.mobile}`} className="p-2 hover:bg-green-50 rounded-lg text-green-600" title="Call partner">
                <Phone className="h-4 w-4" />
              </a>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Send the first message below</p>
                  </div>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.senderType === 'ADMIN'
                        ? 'bg-orange-500 text-white rounded-br-md'
                        : 'bg-white border text-gray-800 rounded-bl-md shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{m.message}</p>
                      <p className={`text-[10px] mt-1 ${m.senderType === 'ADMIN' ? 'text-orange-100' : 'text-gray-400'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t flex gap-3">
              <input
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                {sending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a delivery partner from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}