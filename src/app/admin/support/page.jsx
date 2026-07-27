"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare, Search, Filter, AlertCircle, Clock,
  CheckCircle, XCircle, TrendingUp, Users,
} from "lucide-react";
import { toast } from "sonner";
import TicketCard from "@/components/support/TicketCard";

const STATUS_TABS = [
  { value: "OPEN", label: "Open", icon: AlertCircle },
  { value: "IN_PROGRESS", label: "In Progress", icon: Clock },
  { value: "WAITING", label: "Waiting", icon: Clock },
  { value: "RESOLVED", label: "Resolved", icon: CheckCircle },
  { value: "CLOSED", label: "Closed", icon: XCircle },
  { value: "ALL", label: "All", icon: Filter },
];

const PRIORITY_FILTERS = [
  { value: "", label: "All Priorities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.data?.tickets || data.tickets || []);
        setStats(data.data?.stats || data.stats || {});
        setPagination(data.data?.pagination || data.pagination);
      }
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [statusFilter, priorityFilter]);

  const statCards = [
    { label: "Open", value: stats.open || 0, color: "bg-blue-50 text-blue-700", icon: AlertCircle },
    { label: "In Progress", value: stats.inProgress || 0, color: "bg-yellow-50 text-yellow-700", icon: Clock },
    { label: "Critical", value: stats.critical || 0, color: "bg-red-50 text-red-700", icon: AlertCircle },
    { label: "Resolved", value: stats.resolved || 0, color: "bg-green-50 text-green-700", icon: CheckCircle },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-blue-600" />
          Support Tickets
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer and supplier support requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-4 ${stat.color} bg-opacity-10`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm">{stat.label}</p>
              </div>
              <stat.icon className="h-8 w-8 opacity-50" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {PRIORITY_FILTERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
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
          <p className="text-sm text-gray-400 mt-1">Try changing filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              href={`/admin/support/${ticket.id}`}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} tickets)
          </span>
        </div>
      )}
    </div>
  );
}