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

  const isCurrentUser = false; // You can pass this as prop if needed

  return (
    <div className={`flex gap-3 my-4 ${isAdmin ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAdmin ? "bg-red-100" : "bg-blue-100"
      }`}>
        {isAdmin ? (
          <Shield className="h-4 w-4 text-red-600" />
        ) : (
          <User className="h-4 w-4 text-blue-600" />
        )}
      </div>
      <div className={`flex-1 max-w-[70%] ${isAdmin ? "text-right" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700">
            {message.sender?.name || (isAdmin ? "Support Team" : "You")}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className={`inline-block px-4 py-2 rounded-2xl text-sm ${
          isAdmin
            ? "bg-red-50 text-gray-800 rounded-tr-sm"
            : "bg-blue-50 text-gray-800 rounded-tl-sm"
        }`}>
          {message.message}
        </div>
      </div>
    </div>
  );
}