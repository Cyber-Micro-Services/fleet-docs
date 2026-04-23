import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.AUTH_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const filePath = path.join("/");

    let backendResponse = await fetch(
      `${BACKEND_BASE_URL}/public/uploads/${filePath}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    // Fallback to misc/uploads if backend has migrated the storage folder
    if (backendResponse.status === 404) {
      const miscResponse = await fetch(
        `${BACKEND_BASE_URL}/misc/uploads/${filePath}`,
        { method: "GET", cache: "no-store" },
      );
      if (miscResponse.ok) {
        backendResponse = miscResponse;
      }
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error: `File not found or server error: ${backendResponse.statusText}`,
        },
        { status: backendResponse.status },
      );
    }

    const blob = await backendResponse.blob();
    const contentType =
      backendResponse.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition":
          backendResponse.headers.get("content-disposition") ||
          `inline; filename="${filePath.split("/").pop()}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        statusCode: 503,
        message: "File service unavailable",
        error: error instanceof Error ? error.message : "Service Unavailable",
      },
      { status: 503 },
    );
  }
}
