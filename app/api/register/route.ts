import { NextRequest, NextResponse } from 'next/server';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { getSession } from '../auth';
import { userStore } from '../users';

function getRPConfig(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const hostname = host.split(':')[0];

  return {
    rpName: 'Passkey Demo',
    rpID: hostname,
    origin: `${protocol}://${host}`,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, step, credential } = body;
  const { rpName, rpID, origin } = getRPConfig(request);

  const session = await getSession();

  if (step === 'start') {
    // Check if user already exists
    const existingUser = userStore.get(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered. Please use the login page instead.' },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = userStore.create(email);

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge in session
    session.challenge = options.challenge;
    session.email = email;
    await session.save();

    return NextResponse.json(options);
  }

  if (step === 'verify') {
    // Verify the registration response
    if (!session.challenge || session.email !== email) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Make sure user exists (should have been created in start step)
    const user = userStore.get(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found during verification' }, { status: 400 });
    }

    try {
      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: session.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return NextResponse.json(
          { error: 'Verification failed' },
          { status: 400 }
        );
      }

      const { registrationInfo } = verification;

      // Save authenticator
      const authenticatorData = {
        credentialID: registrationInfo.credential.id,
        credentialPublicKey: registrationInfo.credential.publicKey,
        counter: registrationInfo.credential.counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        transports: credential.response.transports,
      };
      
      userStore.addAuthenticator(email, authenticatorData);

      // Clear challenge (user will need to sign in)
      session.challenge = undefined;
      await session.save();

      return NextResponse.json({ verified: true });
    } catch (error) {
      console.error('Registration verification error:', error);
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
