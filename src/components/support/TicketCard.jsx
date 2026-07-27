"use client";

import Link from "next/link";
import { Clock, AlertCircle, AlertTriangle, CheckCircle, XCircle, MessageSquare, ChevronRight } from "lucide-react";

const statusConfig = {
  OPEN: { label: "Open", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  WAITING: { label: "Waiting", color: "bg-purple-100 text-purple-700", icon: Clock },
  RESOLVED: { label: "Resolved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

const priorityConfig = {
  LOW: { color: "text-gray-500", icon: null },
  MEDIUM: { color: "text-blue-600", icon: null },
  HIGH: { color: "text-orange-600", icon: AlertTriangle },
  CRITICAL: { color: "text-red-600", icon: AlertCircle },
};

const categoryLabels = {
  GENERAL: "General",
  ORDER: "Order Issue",
  PAYMENT: "Payment",
  PRODUCT: "Product",
  DELIVERY: "Delivery",
  ACCOUNT: "Account",
  TECHNICAL: "Technical",
  OTHER: "Other",
};

export default function TicketCard({ ticket, href }) {
  const status = statusConfig[ticket.status] || statusConfig.OPEN;
  const priority = priorityConfig[ticket.priority] || priorityConfig.MEDIUM;
  const StatusIcon = status.icon;
  const PriorityIcon = priority.icon;

  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-5 hover:shadow-md transition block group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              <StatusIcon className="h-3 w-3 inline mr-1" />
              {status.label}
            </span>
            {ticket.priority === "CRITICAL" && (
              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{categoryLabels[ticket.category] || ticket.category}</span>
            <span>•</span>
            <span className={priority.color}>
              {PriorityIcon && <PriorityIcon className="h-3 w-3 inline mr-0.5" />}
              {ticket.priority}
            </span>
            {ticket._count?.messages > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {ticket._count.messages}
                </span>
              </>
            )}
          </div>
          {ticket.supplier && (
            <p className="text-xs text-gray-400 mt-1">{ticket.supplier.businessName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {new Date(ticket.updatedAt).toLocaleDateString()}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition" />
        </div>
      </div>
    </Link>
  );
}