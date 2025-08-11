import { NextResponse } from "next/server";
import { getSession } from "../auth";

export async function GET() {
  const session = await getSession();
  
  if (!session.email) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({ email: session.email });
}

export async function DELETE() {
  const session = await getSession();
  session.destroy();
  
  return NextResponse.json({ success: true });
}