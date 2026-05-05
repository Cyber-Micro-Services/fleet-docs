import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RAW_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:4000';
const BACKEND_BASE_URL = RAW_BACKEND_BASE_URL.replace(/\/+$/, '');
const BACKEND_ORIGIN = BACKEND_BASE_URL.replace(/\/api$/i, '');

function toBackendUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_ORIGIN}${normalizedPath}`;
}

/**
 * Download a single file from a URL
 * @param fileUrl - URL to download from
 * @param fileName - Name to save the file as
 */
export async function downloadFile(fileUrl: string, fileName: string): Promise<void> {
  try {
    let blob: Blob;
    let normalizedFileUrl = fileUrl;

    const normalizeUploadPath = (pathname: string): string | null => {
      const stripped = pathname.replace(/^\/(?:public|misc)\/uploads\//, '');
      if (stripped !== pathname) return toBackendUrl(`/public/uploads/${stripped}`);
      return null;
    };

    const localNormalized = normalizeUploadPath(fileUrl);
    if (localNormalized) {
      normalizedFileUrl = localNormalized;
    } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      try {
        const parsedUrl = new URL(fileUrl);
        const remoteNormalized = normalizeUploadPath(parsedUrl.pathname);
        if (remoteNormalized) normalizedFileUrl = remoteNormalized;
      } catch {
        normalizedFileUrl = fileUrl;
      }
    }

    // Handle mock URLs (for demo/test purposes)
    if (normalizedFileUrl.startsWith('mock://')) {
      // Create a simple PDF-like file for mock downloads
      const mockContent = `Mock Document Demo\n\nFile: ${fileName}\nURL: ${normalizedFileUrl}\nDownloaded: ${new Date().toLocaleString('ro-RO')}\n\nThis is a mock file generated for demonstration purposes.`;
      blob = new Blob([mockContent], { type: 'text/plain' });
    } else {
      // Fetch real files from server with proper error handling
      const response = await fetch(normalizedFileUrl, { cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Fișierul nu a fost găsit pe server (404)');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Nu ai acces la acest fișier');
        } else {
          throw new Error(`Eroare server: ${response.statusText}`);
        }
      }
      blob = await response.blob();
    }

    // Create and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Eroare la download fișierului.');
  }
}

/**
 * Download multiple files sequentially with a delay
 * @param files - Array of {url, name} objects
 * @param delayMs - Delay between downloads in milliseconds
 */
export async function downloadMultipleFiles(
  files: Array<{ url: string; name: string }>,
  delayMs: number = 500
): Promise<{ success: number; failed: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const { url, name } = files[i];
    try {
      await downloadFile(url, name);
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push(error instanceof Error ? error.message : `Eroare la download: ${name}`);
    }

    // Add delay between downloads (except after the last one)
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { success: successCount, failed: failedCount, errors };
}
