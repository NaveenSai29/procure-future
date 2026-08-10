"use client";

import { User, Shield, Bot } from "lucide-react";

export default function ChatMessage({ message }) {
  const isSystem = message.senderType === "SYSTEM";
  const isAdmin = message.senderType === "ADMIN";
  const isSupplier = message.senderType === "SUPPLIER";
  const isInternal = message.isInternal;

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="px-4 py-1.5 bg-gray-100 rounded-full text-xs text-gray-500 flex items-center gap-1.5">
          <Bot className="h-3 w-3" />
          {message.message}
        </div>
      </div>
    );
  }

  if (isInternal) {
    return (
      <div className="flex justify-center my-3">
        <div className="px-4 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-xs text-yellow-700 flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          Internal Note: {message.message}
        </div>
      </div>
    );
  }

  // Admin messages: right-aligned, avatar on right
  // Supplier/User messages: left-aligned, avatar on left
  const isCurrentUser = isSupplier;
  const alignRight = isAdmin;

  return (
    <div className={`flex gap-3 my-3 ${alignRight ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAdmin ? "bg-red-100" : "bg-blue-100"
      }`}>
        {isAdmin ? (
          <Shield className="h-4 w-4 text-red-600" />
        ) : (
          <User className="h-4 w-4 text-blue-600" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${alignRight ? "items-end" : "items-start"} max-w-[75%]`}>
        {/* Name + Time */}
        <div className={`flex items-center gap-2 mb-0.5 ${alignRight ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[11px] font-semibold text-gray-600">
            {message.sender?.name || (isAdmin ? "Support Team" : "You")}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Bubble */}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAdmin
            ? "bg-red-50 text-gray-800 rounded-tr-md"
            : "bg-blue-50 text-gray-800 rounded-tl-md"
        }`}>
          {message.message}
        </div>
      </div>
    </div>
  );
}