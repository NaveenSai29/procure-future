'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, User, Clock, ArrowLeft, MessageSquare, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierMessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('messages'); // messages | customers
  const messagesEndRef = useRef(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selectedBuyer) fetchMessages(selectedBuyer.buyerId); }, [selectedBuyer]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [msgRes, custRes] = await Promise.all([
        fetch('/api/supplier/messages'),
        fetch('/api/supplier/customers')
      ]);
      const msgData = await msgRes.json();
      const custData = await custRes.json();
      if (msgData.success) setConversations(msgData.data);
      if (custData.success) setCustomers(custData.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const fetchMessages = async (buyerId) => {
    try {
      const res = await fetch(`/api/supplier/messages?buyerId=${buyerId}`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch { toast.error('Failed to load messages'); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedBuyer) return;
    try {
      const res = await fetch('/api/supplier/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: selectedBuyer.buyerId, message: newMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...messages, data.data]);
        setNewMessage('');
        loadData();
      }
    } catch { toast.error('Failed to send'); }
  };

    const startConversation = (customer) => {
    const buyerId = customer.buyerId || customer.id;
    const buyerName = customer.buyer?.name || customer.name || 'Customer';
    const buyerEmail = customer.buyer?.email || customer.email || '';
    setSelectedBuyer({ buyerId, buyer: { name: buyerName, email: buyerEmail }, unreadCount: 0 });
    setActiveTab('messages');
  };

  // Merge: conversations with messages + customers without messages
  const conversationBuyerIds = conversations.map(c => c.buyerId);
  const newCustomers = customers.filter(c => !conversationBuyerIds.includes(c.id));

  const displayList = activeTab === 'messages' ? conversations : newCustomers.map(c => ({
    buyerId: c.id,
    buyer: { name: c.name, email: c.email },
    totalMessages: 0,
    lastMessageAt: c.lastOrder,
    unreadCount: 0,
    isNew: true,
  }));

  const filtered = displayList.filter(c =>
    c.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.buyer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-6">
      {/* Sidebar */}
      <div className={`${selectedBuyer ? 'hidden md:flex' : 'flex'} md:flex flex-col w-full md:w-80 border-r bg-white`}>
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
          <div className="flex gap-1 mt-2 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setActiveTab('messages')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md ${activeTab === 'messages' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Chats {conversations.length > 0 && `(${conversations.length})`}
            </button>
            <button onClick={() => setActiveTab('customers')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md ${activeTab === 'customers' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Customers {newCustomers.length > 0 && `(${newCustomers.length})`}
            </button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{activeTab === 'messages' ? 'No conversations yet' : 'No customers found'}</p>
            </div>
          ) : (
            filtered.map(conv => (
              <button key={conv.buyerId} onClick={() => startConversation(conv)}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 transition ${selectedBuyer?.buyerId === conv.buyerId ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-900 truncate">{conv.buyer?.name || 'Unknown'}</p>
                      <span className="text-xs text-gray-400">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{conv.buyer?.email}</p>
                  </div>
                  {conv.unreadCount > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{conv.unreadCount}</span>}
                  {conv.isNew && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">New</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      {selectedBuyer ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b bg-white flex items-center gap-3">
            <button onClick={() => setSelectedBuyer(null)} className="md:hidden p-1 hover:bg-gray-100 rounded"><ArrowLeft className="h-5 w-5" /></button>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><User className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="font-medium text-gray-900">{selectedBuyer.buyer?.name || 'Buyer'}</p>
              <p className="text-xs text-gray-500">{selectedBuyer.buyer?.email}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm mt-1">Send a message to start the conversation</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderType === 'SUPPLIER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${msg.senderType === 'SUPPLIER' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-900'}`}>
                    <p className="text-sm">{msg.message}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${msg.senderType === 'SUPPLIER' ? 'text-blue-200' : 'text-gray-400'}`}>
                      <Clock className="h-3 w-3" />
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-3">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..." className="flex-1 px-4 py-2.5 border rounded-lg text-sm" />
            <button type="submit" disabled={!newMessage.trim()} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a customer to view or start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}