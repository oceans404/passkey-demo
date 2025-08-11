'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Get authentication options from server
      const optionsResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, step: 'start' }),
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get authentication options');
      }

      const options = await optionsResponse.json();

      // Step 2: Authenticate with passkey
      const credential = await startAuthentication({ optionsJSON: options });

      // Step 3: Verify with server
      const verifyResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          step: 'verify',
          credential,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify authentication');
      }

      // Success - redirect to content
      router.push('/content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="mt-2 text-gray-600">
            Use your passkey to sign in securely
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
            {loading ? 'Signing in...' : 'Sign In with Passkey'}
          </button>
        </form>

        <p className="text-center text-sm">
          Don't have an account?{' '}
          <Link href="/register" className="text-gray-600 hover:text-black underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
