# Passkey Demo

A Next.js app showing how to implement passkey login (WebAuthn) with [SimpleWebAuthn](https://simplewebauthn.dev/). No passwords needed!

## Getting Started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your SESSION_SECRET:

```bash
cp .env.example .env.local
# Then edit .env.local with your SESSION_SECRET
```

The SESSION_SECRET encrypts your users' session cookies. Generate a secure one with:

```bash
openssl rand -base64 32
```

Open http://localhost:3000 and try it out.

## How it works

This demo has 4 pages that show the complete passkey flow:

**Homepage** - Two buttons: "Create Account" and "Sign In"

**Register page** - For new users who don't have an account yet. Enter your email, click "Create Passkey", and your device will prompt you to create a passkey (Face ID, Touch ID, Windows Hello, etc.). After registration, you'll be redirected to the login page.

**Login page** - For returning users who already created a passkey. Enter your email, click "Sign In with Passkey", and authenticate with your passkey to access the protected content

**Content page** - For logged-in users only. Shows a personalized (email) welcome message after successful authentication

## The API flow

When you register or login, here's what happens behind the scenes:

```typescript
// Registration (creates passkey, redirects to login)
POST /api/register { email, step: "start" }     // Server creates challenge
startRegistration(options)                      // Browser creates passkey
POST /api/register { email, step: "verify" }    // Server saves your passkey → redirect to /login

// Login (authenticates with existing passkey)
POST /api/login { email, step: "start" }        // Server creates challenge
startAuthentication(options)                    // Browser uses your passkey
POST /api/login { email, step: "verify" }       // Server verifies it's really you → redirect to /content
```

The "challenge" is a random string that prevents replay attacks. It's stored in an encrypted session cookie between the start/verify steps.

## SimpleWebAuthn functions

This demo uses just 4 functions from SimpleWebAuthn:

**Client-side** (`@simplewebauthn/browser`):

- `startRegistration()` - Asks browser to create a passkey
- `startAuthentication()` - Asks browser to use an existing passkey

**Server-side** (`@simplewebauthn/server`):

- `generateRegistrationOptions()` - Creates the challenge for registration
- `verifyRegistrationResponse()` - Makes sure the new passkey is legit
- `generateAuthenticationOptions()` - Creates the challenge for login
- `verifyAuthenticationResponse()` - Makes sure the passkey signature is valid

## Project structure

```
app/
├── page.tsx                 # Homepage with nav buttons
├── register/page.tsx        # Create account form
├── login/page.tsx           # Sign in form
├── content/page.tsx         # Protected page (shows after login)
└── api/
    ├── register/route.ts    # Handles passkey creation
    ├── login/route.ts       # Handles passkey authentication
    ├── session/route.ts     # Check if logged in, sign out
    ├── auth.ts              # Session helper functions
    └── users.ts             # Fake database (just a Map)
```

## Notes

- User data is stored in memory and disappears when you restart the server (it's just a demo! In production you'd use a real database)
- Sessions are encrypted with your SESSION_SECRET
- Requires HTTPS in production (localhost is fine for development)
