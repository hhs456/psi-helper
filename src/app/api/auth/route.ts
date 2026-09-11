import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correctPassword = process.env.APP_PASSWORD || "psi2024";

  if (password === correctPassword) {
    const cookieStore = await cookies();
    cookieStore.set("psi-auth", "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("psi-auth");
  return NextResponse.json({ success: true });
}
