import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getSession } from "../auth";
import { userStore } from "../users";

function getRPConfig(request: NextRequest) {
  // Auto-detect from request headers
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const hostname = host.split(":")[0];
  
  return {
    rpID: hostname,
    origin: `${protocol}://${host}`,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, step, credential } = body;
  const { rpID, origin } = getRPConfig(request);

  const session = await getSession();

  if (step === "start") {
    // Get user
    const user = userStore.get(email);
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please create an account first." },
        { status: 400 }
      );
    }
    
    if (user.authenticators.length === 0) {
      return NextResponse.json(
        { error: "No passkeys found for this account. Please try registering again." },
        { status: 400 }
      );
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.authenticators.map(auth => ({
        id: auth.credentialID,
        transports: auth.transports,
      })),
      userVerification: "preferred",
    });

    // Store challenge in session
    session.challenge = options.challenge;
    session.email = email;
    await session.save();

    return NextResponse.json(options);
  }

  if (step === "verify") {
    // Verify the authentication response
    if (!session.challenge || session.email !== email) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 400 }
      );
    }

    const user = userStore.get(email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    // Find the authenticator used
    const authenticator = userStore.getAuthenticator(email, credential.id);
    if (!authenticator) {
      return NextResponse.json(
        { error: "Authenticator not found" },
        { status: 400 }
      );
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: session.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: authenticator.credentialID,
          publicKey: authenticator.credentialPublicKey,
          counter: authenticator.counter,
        },
      });

      if (!verification.verified) {
        return NextResponse.json(
          { error: "Verification failed" },
          { status: 400 }
        );
      }

      // Update counter
      authenticator.counter = verification.authenticationInfo.newCounter;

      // Clear challenge and keep user logged in
      session.challenge = undefined;
      await session.save();

      return NextResponse.json({ verified: true });
    } catch (error) {
      console.error("Authentication verification error:", error);
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(
    { error: "Invalid request" },
    { status: 400 }
  );
}