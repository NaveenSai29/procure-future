"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, Shield, Store, Mail, Phone,
  AlertCircle, Clock, CheckCircle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import ChatMessage from "@/components/support/ChatMessage";

const statusConfig = {
  OPEN: { label: "Open", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  WAITING: { label: "Waiting", color: "bg-purple-100 text-purple-700", icon: Clock },
  RESOLVED: { label: "Resolved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];

export default function AdminTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setTicket(data.data?.ticket || data.ticket);
      }
    } catch {
      toast.error("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (ticketId) fetchTicket(); }, [ticketId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket?.messages]);

  const handleSendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim(), isInternal }),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setReply("");
        setIsInternal(false);
        fetchTicket();
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateTicket = async (updates) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        toast.success("Ticket updated");
        fetchTicket();
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Ticket not found</p>
        <Link href="/admin/support" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Back to tickets
        </Link>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.OPEN;
  const StatusIcon = status.icon;
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/support" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              <StatusIcon className="h-3 w-3 inline mr-1" />
              {status.label}
            </span>
            <span className={`text-xs font-medium ${
              ticket.priority === "CRITICAL" ? "text-red-600" :
              ticket.priority === "HIGH" ? "text-orange-600" : "text-gray-500"
            }`}>
              {ticket.priority}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border p-6 min-h-[400px] max-h-[65vh] overflow-y-auto">
            {ticket.messages?.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Box */}
          {!isClosed && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsInternal(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    !isInternal ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Public Reply
                </button>
                <button
                  onClick={() => setIsInternal(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    isInternal ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Shield className="h-3 w-3 inline mr-1" />
                  Internal Note
                </button>
              </div>
              <div className="flex gap-3 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
                  rows={2}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !reply.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isInternal ? "Add Note" : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Ticket Info & Actions */}
        <div className="space-y-4">
          {/* Supplier Info */}
          {ticket.supplier && (
            <div className="bg-white rounded-xl border p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-400" />
                Supplier
              </h4>
              <p className="font-medium text-gray-900">{ticket.supplier.businessName}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" /> {ticket.supplier.email}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" /> {ticket.supplier.mobile}
              </p>
            </div>
          )}

          {/* Admin Controls */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Ticket Controls</h4>

            {/* Status */}
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                disabled={updating}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs text-gray-500">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                disabled={updating}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Resolve Button */}
            {!isClosed && ticket.status !== "RESOLVED" && (
              <button
                onClick={() => handleUpdateTicket({ action: "RESOLVE" })}
                disabled={updating}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Resolve Ticket
              </button>
            )}
          </div>

          {/* Ticket Meta */}
          <div className="bg-white rounded-xl border p-5 text-xs text-gray-500 space-y-1">
            <p>Created: {new Date(ticket.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
            {ticket.resolvedAt && <p>Resolved: {new Date(ticket.resolvedAt).toLocaleString()}</p>}
            <p>Messages: {ticket.messages?.length || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}