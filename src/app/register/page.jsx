"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Package, ArrowRight, Store, ShoppingCart } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSupplier = searchParams.get('type') === 'supplier';
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message || "Registration failed");
        return;
      }

      if (isSupplier) {
        toast.success("Account created! Redirecting to business setup...");
        router.push("/dashboard/become-supplier");
      } else {
        toast.success("Account created successfully! Please sign in.");
        router.push("/login");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PROCURE</span>
            </Link>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              {isSupplier ? "Create your supplier account" : "Create your account"}
            </h2>
            <p className="text-gray-500 mt-1">
              {isSupplier 
                ? "Register first, then set up your business profile" 
                : "Start your procurement journey today"}
            </p>
            {isSupplier && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-sm font-medium text-orange-700">
                <Store className="h-4 w-4" />
                Supplier Registration
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name *</label>
              <Input
                {...register("name")}
                placeholder="Enter your full name"
                className="mt-1.5 h-11"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email *</label>
              <Input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="mt-1.5 h-11"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Mobile *</label>
              <Input
                {...register("mobile")}
                type="tel"
                placeholder="Enter your 10-digit mobile number"
                className="mt-1.5 h-11"
              />
              {errors.mobile && (
                <p className="text-sm text-red-500 mt-1">{errors.mobile.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Password *</label>
              <div className="relative mt-1.5">
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password *</label>
              <Input
                {...register("confirmPassword")}
                type="password"
                placeholder="Re-enter password"
                className="mt-1.5 h-11"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base" loading={loading}>
              {isSupplier ? "Continue to Business Setup" : "Create Account"} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}