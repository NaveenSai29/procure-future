"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found.");
      return;
    }
    verifyEmail(token);
  }, []);

  const verifyEmail = async (token) => {
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage(data.data?.message || "Email verified successfully!");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-gray-100">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
          <Package className="h-8 w-8 text-white" />
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Email</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified! 🎉</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-orange-500 to-rose-500 text-white px-8 rounded-xl">Sign In</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-500 mb-4">{message}</p>
            <div className="flex flex-col gap-3">
              <Link href="/login">
                <Button variant="outline" className="rounded-xl w-full">Back to Sign In</Button>
              </Link>
              <p className="text-sm text-gray-400">
                Link expired?{" "}
                <Link href="/login" className="text-orange-600 font-medium hover:underline">
                  Sign in to request a new one
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}