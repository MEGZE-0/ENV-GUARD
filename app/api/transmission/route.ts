import { NextResponse } from "next/server";

type Payload = {
  name?: unknown;
  email?: unknown;
  scope?: unknown;
  message?: unknown;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Contact endpoint. Validates the transmission and returns a reference.
 * To go live: forward `data` to Resend / Postmark / a CRM webhook, and add
 * rate limiting (e.g. Upstash) plus a spam check (Turnstile / honeypot).
 */
export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Malformed transmission." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const scope = typeof body.scope === "string" ? body.scope.trim() : "Unspecified";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Callsign required.";
  if (!EMAIL.test(email)) errors.email = "Valid return channel required.";
  if (message.length < 12) errors.message = "Brief too short — 12 characters minimum.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed.", fields: errors }, { status: 422 });
  }

  const reference = `TX-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Deliberate small delay so the client can show transmission feedback.
  await new Promise((resolve) => setTimeout(resolve, 550));

  if (process.env.NODE_ENV !== "production") {
    console.info("[transmission]", { reference, name, email, scope, message: message.slice(0, 80) });
  }

  return NextResponse.json({
    ok: true,
    reference,
    receivedAt: new Date().toISOString(),
  });
}
