import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.AUTH_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const authorization = request.headers.get("authorization");

    const backendResponse = await fetch(
      `${BACKEND_BASE_URL}/documents/${documentId}`,
      {
        method: "DELETE",
        headers: {
          ...(authorization ? { Authorization: authorization } : {}),
        },
        cache: "no-store",
      },
    );

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

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
        message: "Document service unavailable",
        error: "Service Unavailable",
      },
      { status: 503 },
    );
  }
}
