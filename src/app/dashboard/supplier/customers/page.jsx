"use client";

import { useEffect, useState } from "react";
import { Users, Mail, Phone, ShoppingCart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/supplier/customers")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCustomers(data.data);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-muted-foreground">{customers.length} customers who ordered from you</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-background rounded-xl border p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No customers yet</h3>
          <p className="text-muted-foreground">Customers will appear when they place orders</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => (
            <div key={customer.id} className="bg-background rounded-xl border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {customer.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orders</span>
                  <span className="font-medium">{customer._count?.orders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Spent</span>
                  <span className="font-medium">₹{customer.totalSpent?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Order</span>
                  <span className="font-medium">
                    {customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}