"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Store, ArrowLeft, Warehouse, MapPin } from "lucide-react";
import Link from "next/link";

const supplierSchema = z.object({
  businessName: z.string().min(2, "Business name required").max(200),
  businessType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR", "MANUFACTURER", "IMPORTER"]),
  description: z.string().max(500).optional(),
  gstin: z.string().min(15, "Valid GSTIN required").max(15),
  pan: z.string().min(10, "Valid PAN required").max(10).optional().or(z.literal("")),
  email: z.string().email("Valid email required"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile required"),
  storageType: z.enum(["OWN_SHOP", "WAREHOUSE", "BOTH", "HOME_BASED"]),
  storageName: z.string().min(2, "Storage name required").max(200),
  storageAddress: z.string().min(5, "Address required").max(500),
  storageCity: z.string().min(2, "City required").max(100),
  storageState: z.string().min(2, "State required").max(100),
  storagePincode: z.string().regex(/^\d{6}$/, "Valid 6-digit pincode required"),
});

export default function BecomeSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [storageType, setStorageType] = useState("OWN_SHOP");
  const [sameAsBusiness, setSameAsBusiness] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) router.push("/login");
      });
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      storageType: "OWN_SHOP",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch("/api/supplier/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message || "Registration failed");
        return;
      }

      toast.success("Business registered! Warehouse created automatically. Upload KYC to go live.");
      router.push("/dashboard/supplier");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const businessTypes = [
    { value: "RETAIL", label: "Retail Shop" },
    { value: "WHOLESALE", label: "Wholesaler" },
    { value: "DISTRIBUTOR", label: "Distributor" },
    { value: "MANUFACTURER", label: "Manufacturer" },
    { value: "IMPORTER", label: "Importer" },
  ];

  const storageTypes = [
    { value: "OWN_SHOP", label: "Own Shop / Store", desc: "Stock at my shop counter or retail store" },
    { value: "WAREHOUSE", label: "Separate Warehouse / Godown", desc: "Dedicated storage facility away from shop" },
    { value: "BOTH", label: "Shop + Warehouse (Both)", desc: "I have both a shop and a separate warehouse" },
    { value: "HOME_BASED", label: "Home Based / Small Scale", desc: "Stock at home or small storage room" },
  ];

  const getAutoStorageName = (type, businessName) => {
    const names = {
      OWN_SHOP: `${businessName || "My"} Shop`,
      WAREHOUSE: `${businessName || "My"} Godown`,
      BOTH: `${businessName || "My"} Main Warehouse`,
      HOME_BASED: `${businessName || "My"} Home Storage`,
    };
    return names[type] || `${businessName || "My"} Storage`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Become a Supplier</h1>
            <p className="text-muted-foreground text-sm">
              Register your business and set up your storage location
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Business Details */}
        <div className="bg-background rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" /> Business Details
          </h3>

          <div>
            <label className="text-sm font-medium">Business Name *</label>
            <Input {...register("businessName")} placeholder="Your company name" className="mt-1" />
            {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Business Type *</label>
            <select {...register("businessType")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
              <option value="">Select type...</option>
              {businessTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.businessType && <p className="text-sm text-destructive mt-1">{errors.businessType.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea {...register("description")} rows={2} placeholder="Brief description of your business" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">GSTIN *</label>
              <Input {...register("gstin")} placeholder="22AAAAA0000A1Z5" className="mt-1 uppercase" />
              {errors.gstin && <p className="text-sm text-destructive mt-1">{errors.gstin.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">PAN (optional)</label>
              <Input {...register("pan")} placeholder="AAAAA0000A" className="mt-1 uppercase" />
              {errors.pan && <p className="text-sm text-destructive mt-1">{errors.pan.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Business Email *</label>
              <Input {...register("email")} type="email" placeholder="business@company.com" className="mt-1" />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Business Mobile *</label>
              <Input {...register("mobile")} type="tel" placeholder="9876543210" className="mt-1" />
              {errors.mobile && <p className="text-sm text-destructive mt-1">{errors.mobile.message}</p>}
            </div>
          </div>
        </div>

        {/* Storage Location */}
        <div className="bg-background rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-green-600" /> Storage Location
          </h3>
          <p className="text-sm text-gray-500">
            Where do you store your products? This will be your default warehouse for stock.
          </p>

          <div>
            <label className="text-sm font-medium">Storage Type *</label>
            <div className="grid grid-cols-1 gap-2 mt-1">
              {storageTypes.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    storageType === t.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setStorageType(t.value);
                    setValue("storageType", t.value);
                    const businessInput = document.querySelector('input[name="businessName"]');
                    const businessName = businessInput ? businessInput.value : "";
                    setValue("storageName", getAutoStorageName(t.value, businessName));
                  }}
                >
                  <input
                    type="radio"
                    {...register("storageType")}
                    value={t.value}
                    checked={storageType === t.value}
                    onChange={() => {}}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.storageType && <p className="text-sm text-destructive mt-1">{errors.storageType.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Storage Name *</label>
            <Input {...register("storageName")} placeholder="e.g., My Shop, Main Godown" className="mt-1" />
            <p className="text-xs text-gray-400 mt-0.5">You can change this later</p>
            {errors.storageName && <p className="text-sm text-destructive mt-1">{errors.storageName.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Storage Address *</label>
            <textarea {...register("storageAddress")} rows={2} placeholder="Full address of your storage location" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none" />
            {errors.storageAddress && <p className="text-sm text-destructive mt-1">{errors.storageAddress.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">City *</label>
              <Input {...register("storageCity")} placeholder="e.g., Mumbai" className="mt-1" />
              {errors.storageCity && <p className="text-sm text-destructive mt-1">{errors.storageCity.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">State *</label>
              <Input {...register("storageState")} placeholder="e.g., Maharashtra" className="mt-1" />
              {errors.storageState && <p className="text-sm text-destructive mt-1">{errors.storageState.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Pincode *</label>
              <Input {...register("storagePincode")} placeholder="e.g., 400001" className="mt-1" />
              {errors.storagePincode && <p className="text-sm text-destructive mt-1">{errors.storagePincode.message}</p>}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Register & Create Warehouse
        </Button>
      </form>
    </div>
  );
}