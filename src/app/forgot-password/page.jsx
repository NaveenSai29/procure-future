"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, ArrowLeft, Mail, CheckCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("Valid email required"),
});

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSent(true);
        toast.success("Reset link sent! Check your email.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-100">
        {!sent ? (
          <>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                <Package className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
              <p className="text-gray-500 mt-2">Enter your email and we'll send you a reset link</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input {...register("email")} type="email" placeholder="you@example.com" className="pl-10 h-11" />
                </div>
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-orange-500 to-rose-500 rounded-xl" loading={loading}>
                Send Reset Link
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:text-orange-600 flex items-center justify-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-500 mb-6">If an account exists with that email, we've sent a reset link.</p>
            <Link href="/login">
              <Button variant="outline" className="rounded-xl">Back to Sign In</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}