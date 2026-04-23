import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.AUTH_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.arrayBuffer();
    const contentType = request.headers.get("content-type") ?? "";
    const authorization = request.headers.get("authorization");

    const backendResponse = await fetch(
      `${BACKEND_BASE_URL}/documents/ocr/analyze`,
      {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
      cache: "no-store",
      },
    );

    const payload = await backendResponse.text();
    const responseContentType =
      backendResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(payload, {
      status: backendResponse.status,
      headers: { "Content-Type": responseContentType },
    });
  } catch {
    return NextResponse.json(
      {
        statusCode: 503,
        message: "OCR service unavailable",
        error: "Service Unavailable",
      },
      { status: 503 },
    );
  }
}
