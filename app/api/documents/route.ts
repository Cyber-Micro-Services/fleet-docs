import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.AUTH_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    const backendResponse = await fetch(`${BACKEND_BASE_URL}/documents`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      cache: "no-store",
    });

    const payload = await backendResponse.text();
    const contentType =
      backendResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(payload, {
      status: backendResponse.status,
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json(
      {
        statusCode: 503,
        message: "Document service unavailable",
        error: "Service Unavailable",
      },
      { status: 503 },
    );
  }
}
