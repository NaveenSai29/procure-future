"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, AlertCircle, Clock, CheckCircle, XCircle, MessageSquare
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

export default function SupplierTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/supplier/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setTicket(data.data?.ticket || data.ticket);
      } else {
        toast.error(data.error || "Failed to load ticket");
      }
    } catch {
      toast.error("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (ticketId) fetchTicket(); }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/supplier/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setReply("");
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

  const handleCloseTicket = async () => {
    if (!confirm("Are you sure you want to close this ticket?")) return;
    try {
      const res = await fetch(`/api/supplier/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE" }),
      });
      const data = await res.json();
      if (res.ok || data.success) {
        toast.success("Ticket closed");
        fetchTicket();
      } else {
        toast.error(data.error || "Failed to close");
      }
    } catch {
      toast.error("Failed to close ticket");
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
        <Link href="/dashboard/supplier/support" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Back to tickets
        </Link>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.OPEN;
  const StatusIcon = status.icon;
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/supplier/support" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
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
        {!isClosed && (
          <button
            onClick={handleCloseTicket}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Close Ticket
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="bg-white rounded-xl border p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
        {ticket.messages?.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Box */}
      {!isClosed && (
        <div className="bg-white rounded-xl border p-4 flex gap-3 items-end">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
            placeholder="Type your reply..."
            rows={2}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleSendReply}
            disabled={sending || !reply.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </button>
        </div>
      )}
    </div>
  );
}