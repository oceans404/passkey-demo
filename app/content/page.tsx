'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/session')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        setEmail(data.email);
        setLoading(false);
      })
      .catch(() => {
        // Not authenticated, redirect to login
        router.push('/login');
      });
  }, [router]);

  const handleSignOut = async () => {
    await fetch('/api/session', { method: 'DELETE' });
    router.push('/');
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mt-4 rounded-lg bg-gray-50 p-6 border border-gray-200">
            <p className="text-lg">Welcome, {email}!</p>
            <p className="mt-2 text-sm text-gray-600">
              You've successfully signed in with your passkey
            </p>
            <div className="mt-4">
              <img
                src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGV0azFzZzlxbzMwODRod25lNjh4YWEwMWNjcHJwaDh5OG5xZ2xlbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bkcbX8SqTCXHG/giphy.gif"
                alt="Success celebration"
                className="w-full rounded-lg"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Sign Out
        </button>
      </div>
    </main>
  );
}
