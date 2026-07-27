"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import TicketCard from "@/components/support/TicketCard";
import TicketForm from "@/components/support/TicketForm";

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export default function SupplierSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [pagination, setPagination] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/supplier/tickets?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.data?.tickets || data.tickets || []);
        setPagination(data.data?.pagination || data.pagination);
      }
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-blue-600" />
            Support Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage your support requests</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <TicketForm
          onSuccess={() => {
            setShowForm(false);
            setStatusFilter("ALL");
            fetchTickets();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              statusFilter === tab.value
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center">
          <MessageSquare className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No tickets found</h3>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === "ALL"
              ? "You haven't created any support tickets yet."
              : `No ${statusFilter.toLowerCase().replace("_", " ")} tickets.`}
          </p>
          {statusFilter === "ALL" && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Create Your First Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              href={`/dashboard/supplier/support/${ticket.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}