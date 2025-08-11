import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  email?: string;
  challenge?: string;
}

export async function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      'SESSION_SECRET environment variable is required. Please add it to your .env.local file.'
    );
  }

  const sessionOptions = {
    password: process.env.SESSION_SECRET,
    cookieName: "passkey-demo-session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  };

  return getIronSession<SessionData>(await cookies(), sessionOptions);
}