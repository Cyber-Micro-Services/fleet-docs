import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.AUTH_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const backendResponse = await fetch(`${BACKEND_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: rawBody,
      cache: "no-store",
    });

    const payload = await backendResponse.text();
    const contentType =
      backendResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(payload, {
      status: backendResponse.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      {
        statusCode: 503,
        message: "Auth service unavailable",
        error: "Service Unavailable",
      },
      { status: 503 },
    );
  }
}
