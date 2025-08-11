"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Step 1: Get registration options from server
      const optionsResponse = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, step: "start" }),
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get registration options");
      }

      const options = await optionsResponse.json();

      // Step 2: Create passkey
      const credential = await startRegistration({ optionsJSON: options });

      // Step 3: Verify with server
      const verifyResponse = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          step: "verify",
          credential 
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify registration");
      }

      // Success - redirect to login to sign in with new passkey
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-gray-600">
            Register with a passkey for secure, passwordless access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-800 border border-gray-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Passkey..." : "Create Passkey"}
          </button>
        </form>

        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-gray-600 hover:text-black underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}