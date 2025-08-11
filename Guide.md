# Face ID > Password123: A Next.js Passkey Tutorial

Implementing Face ID and Touch ID authentication with passkeys and Next.js

<img width="1600" height="900" alt="passkey" src="https://github.com/user-attachments/assets/6b36bec3-f946-4bd6-806d-655dbae68c46" />

Check out the live passkey Next.js demo app [here](https://passkey-demo-zeta.vercel.app/)

## What are passkeys and why should you care?

Imagine if your users never had to remember another password again. That's the promise of passkeys, a new authentication standard that replaces passwords with biometric authentication (Face ID, Touch ID, Windows Hello) or security keys.

Here's why passkeys are game-changing:

- **No passwords to forget.** Authentication happens with your face, fingerprint, or device PIN.

- **Phishing-resistant.** Unlike passwords, passkeys can't be stolen or reused on fake websites.

- **Better UX.** One tap to sign in, no typing required.

- **Privacy-first.** Your biometric data never leaves your device.

### How Passkeys Work (The 30-Second Version)

```
Traditional login: Username + Password = Access
Passkey login: Username + Device Authentication = Access
```

Instead of typing a password, your device creates a unique cryptographic signature using your biometric data. This signature proves you are who you say you are, without ever sending your actual biometric data to the server.

## Give passkeys a try if you are building:

- **Any modern web app.** They work as the primary auth method or alongside existing passwords.

- **Mobile-first apps.** Especially effective since phones have great biometric support (think FaceId and fingerprint sensors).

- **Consumer apps.** Where UX and reducing friction drives conversion.

The main passkey limitation to know about is that older devices and browsers don't support them, so consider having a fallback authentication method.

## How passkey flows work

Passkeys require a two-step process between your frontend and backend:

```
1. Frontend tells backend: "I want to register/login"
2. Backend responds: "Here's a challenge (random data)"
3. Frontend uses device security to sign the challenge
4. Frontend sends signed response to backend
5. Backend verifies signature and grants access
```

This is where [**SimpleWebAuthn**](https://simplewebauthn.dev/) shines. It handles all the cryptographic complexity for you.

## Let's build it: Code walkthrough

Our demo has 3 main pages and 3 APIs that work together:

**Pages:**

- [Register page](app/register/page.tsx) - Create new passkey
- [Login page](app/login/page.tsx) - Authenticate with existing passkey
- [Content page](app/content/page.tsx) - Protected user dashboard

**APIs:**

- [Register API](app/api/register/route.ts) - Handle passkey creation
- [Login API](app/api/login/route.ts) - Handle passkey authentication
- [Session management](app/api/auth.ts) - Encrypted session cookies

Here's how they implement the complete flow with actual code snippets:

### 1. Registration API (Server-side)

When a user wants to create an account, your API needs to handle two requests:

**Step 1: Generate the challenge** ([view full file](app/api/register/route.ts))

```typescript
// app/api/register/route.ts
import { generateRegistrationOptions } from '@simplewebauthn/server';

if (step === 'start') {
  // Check if user already exists
  const existingUser = userStore.get(email);
  if (existingUser) {
    return NextResponse.json(
      { error: 'Email already registered' },
      { status: 400 }
    );
  }

  // Create new user and generate challenge
  const newUser = userStore.create(email);
  const options = await generateRegistrationOptions({
    rpName: 'Passkey Demo',
    rpID: hostname, // e.g., 'localhost' or 'yourdomain.com'
    userName: email,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge in session for verification step
  session.challenge = options.challenge;
  session.email = email;
  await session.save();

  return NextResponse.json(options);
}
```

**Step 2: Verify the passkey was created**

```typescript
if (step === 'verify') {
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: session.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    // Save the passkey data to your user
    const authenticatorData = {
      credentialID: verification.registrationInfo.credential.id,
      credentialPublicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
      // ... other fields
    };

    userStore.addAuthenticator(email, authenticatorData);
    return NextResponse.json({ verified: true });
  }
}
```

### 2. Registration Frontend

The frontend coordinates the two API calls with the browser's passkey creation ([view full file](app/register/page.tsx)):

```typescript
// app/register/page.tsx
import { startRegistration } from '@simplewebauthn/browser';

const handleSubmit = async (e: React.FormEvent) => {
  try {
    // Step 1: Get registration options from server
    const optionsResponse = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, step: 'start' }),
    });
    const options = await optionsResponse.json();

    // Step 2: Create passkey using browser API
    const credential = await startRegistration({ optionsJSON: options });

    // Step 3: Send passkey to server for verification
    const verifyResponse = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, step: 'verify', credential }),
    });

    if (verifyResponse.ok) {
      router.push('/login'); // Redirect to login after successful registration
    }
  } catch (err) {
    setError('Registration failed');
  }
};
```

### 3. Login flow (similar pattern)

**Login API** generates authentication options and verifies signatures ([view full file](app/api/login/route.ts)):

```typescript
// app/api/login/route.ts
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

if (step === 'start') {
  const user = userStore.get(email);
  if (!user || user.authenticators.length === 0) {
    return NextResponse.json({ error: 'No account found' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.authenticators.map((auth) => ({
      id: auth.credentialID,
      transports: auth.transports,
    })),
  });

  session.challenge = options.challenge;
  await session.save();
  return NextResponse.json(options);
}
```

**Login Frontend** authenticates with existing passkey ([view full file](app/login/page.tsx)):

```typescript
// app/login/page.tsx
import { startAuthentication } from '@simplewebauthn/browser';

// Get authentication options
const options = await fetch('/api/login', {
  body: JSON.stringify({ email, step: 'start' }),
}).then((r) => r.json());

// Authenticate with passkey
const credential = await startAuthentication({ optionsJSON: options });

// Verify with server
await fetch('/api/login', {
  body: JSON.stringify({ email, step: 'verify', credential }),
});
```

## 🚨 Gotchas and confusing parts

### 1. The "challenge" concept

**What it is:** A random string that prevents replay attacks. Think of it like a CSRF token.

**Why it's confusing:** You generate it on the server, store it temporarily, then verify it matches what the browser signed. If you don't understand this, the two-step flow seems arbitrary.

**Key point:** The challenge must be stored between the "start" and "verify" steps. We use encrypted session cookies ([see auth.ts](app/api/auth.ts)), but you could use Redis or a database.

### 2. RP ID vs Origin confusion

```typescript
// These are NOT the same thing
rpID: 'localhost'; // Domain only, no protocol/port
origin: 'http://localhost:3000'; // Full URL with protocol/port
```

**Common mistake:** Using full URLs for rpID or forgetting the protocol in origin.

### 3. User flow after registration

Unlike traditional auth where you might auto-login after signup, passkeys require users to **explicitly authenticate** after registration. That's why we redirect to `/login` instead of `/content`.

### 4. The mysterious `optionsJSON` wrapper

SimpleWebAuthn v10+ requires this specific structure:

```typescript
// ❌ Old way (doesn't work)
const credential = await startRegistration(options);

// ✅ New way
const credential = await startRegistration({ optionsJSON: options });
```

**Why:** The library evolved to support additional configuration options.

### 5. Binary data handling

Passkeys involve binary data (public keys, signatures) that must be stored as `Uint8Array`, not regular strings. SimpleWebAuthn handles the conversion, but if you see random type errors, this is likely why. ([see our User interface](app/api/users.ts#L7-L14))

### 6. Development vs Production domains

Our demo auto-detects the domain from request headers ([see implementation](app/api/register/route.ts#L9-L18)):

```typescript
function getRPConfig(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const hostname = host.split(':')[0]; // Remove port for rpID

  return {
    rpID: hostname, // "localhost" in dev, "yourdomain.com" in prod
    origin: `${protocol}://${host}`, // Full URL
  };
}
```

**Gotcha:** Passkeys are tied to domains. A passkey created on `localhost` won't work on your production domain.

## Quick start: Copy this demo

1. **Clone and install:**

   ```bash
   git clone [this-repo]
   cd passkey-demo
   npm install
   ```

   Or explore the code structure:

   - [Homepage](app/page.tsx) - Landing page with navigation
   - [Registration](app/register/page.tsx) - Create new passkey
   - [Login](app/login/page.tsx) - Authenticate with existing passkey
   - [Protected content](app/content/page.tsx) - User dashboard
   - [User storage](app/api/users.ts) - In-memory user management
   - [Session handling](app/api/auth.ts) - Encrypted session cookies

2. **Set environment variable:**

   ```bash
   echo "SESSION_SECRET=$(openssl rand -base64 32)" > .env.local
   ```

3. **Run:**

   ```bash
   npm run dev
   ```

4. **Test the flow:** Visit `http://localhost:3000`, create an account, then sign in.

## Improving the developer experience

Based on building this demo, here are suggestions for the ecosystem:

### For SimpleWebAuthn:

- **Clearer error messages.** When rpID/origin mismatch, the error is cryptic. Better errors would help developers debug faster.

- **Migration guide.** The `optionsJSON` change broke existing code. A clear migration path would help.

- **Domain configuration helper.** A utility function to generate rpID/origin from request headers would prevent common mistakes.

### For the broader passkey ecosystem:

- **Better testing tools.** Local testing with different authenticator types is challenging. Browser dev tools could simulate different device types.

- **Fallback strategy examples.** Most apps need to support both passkeys and passwords initially. More examples of hybrid approaches would help.

- **Database schema examples.** The in-memory storage works for demos, but developers need production-ready database schema blueprints for drag and drop production ready storage.

## More Resources

**[SimpleWebAuthn docs](https://simplewebauthn.dev/)** Complete API reference

**[WebAuthn.io](https://webauthn.io/)** Interactive WebAuthn tester

**[Passkeys.dev](https://passkeys.dev/)** Industry best practices and case studies

**[Can I Use WebAuthn](https://caniuse.com/webauthn)** Browser support matrix
