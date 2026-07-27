"use client";

import { Truck, MapPin } from "lucide-react";

export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Delivery Management</h1>
        <p className="text-muted-foreground">Track shipments and manage deliveries</p>
      </div>

      <div className="bg-background rounded-xl border p-12 text-center">
        <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Delivery management coming soon</h3>
        <p className="text-muted-foreground">Integrate with delivery partners and track shipments in real-time</p>
      </div>
    </div>
  );
}