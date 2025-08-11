import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" 
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Passkey Demo</h1>
          <p className="mt-2 text-gray-600">
            Secure, passwordless authentication with{" "}
            <a 
              href="https://developers.google.com/identity/passkeys/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black underline"
            >
              passkeys
            </a>
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/register"
            className="block w-full text-center bg-black text-white rounded-lg px-4 py-3 font-medium hover:bg-gray-800 transition-colors"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="block w-full text-center bg-gray-200 text-gray-900 rounded-lg px-4 py-3 font-medium hover:bg-gray-300 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
