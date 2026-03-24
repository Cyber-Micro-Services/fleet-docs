"use client";

import { Document, AlertStatus } from "@/lib/types";
import { Trash2, Download, Loader } from "lucide-react";
import { useState } from "react";
import { downloadFile } from "@/lib/utils";

interface DocumentCardProps {
  document: Document;
  statusConfig: Record<
    AlertStatus,
    { icon: React.ReactNode; label: string; color: string }
  >;
  onDelete: () => void;
}

export default function DocumentCard({
  document,
  statusConfig,
  onDelete,
}: DocumentCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const config = statusConfig[document.status];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysLeft;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const fileName = `${document.type}_${document.number}_${new Date().toISOString().split("T")[0]}`;
      await downloadFile(document.fileUrl, fileName);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Eroare la download fișierului.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const daysLeft = getDaysUntilExpiry(document.expiryDate);

  //const daysLeft = getDaysUntilExpiry(document.expiryDate);

  return (
    <div
      className={`rounded-lg border p-6 bg-white transition-all hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded ${config.color.split(" ")[0]}`}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{document.type}</h3>
            <p className="text-xs text-gray-600 mt-1">Nr. {document.number}</p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${config.color} mb-4`}
      >
        {config.icon}
        {config.label}
      </div>

      {/* Dates */}
      <div className="space-y-2 mb-4">
        <div>
          <p className="text-xs text-gray-600">Emis</p>
          <p className="text-sm text-gray-800">
            {formatDate(document.issueDate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Expiră</p>
          <p className="text-sm text-gray-800 font-semibold">
            {formatDate(document.expiryDate)}
          </p>
          {daysLeft > 0 ? (
            <p
              className={`text-xs mt-1 ${daysLeft <= 30 ? "text-orange-600" : daysLeft <= 60 ? "text-yellow-600" : "text-green-600"}`}
            >
              {daysLeft} zile rămase
            </p>
          ) : (
            <p className="text-xs mt-1 text-red-600">
              Expirat cu {Math.abs(daysLeft)} zile
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 text-sm rounded transition-colors disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          title="Descarcă documentul"
        >
          {isDownloading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Se descarcă...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Descarcă
            </>
          )}
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm rounded transition-colors"
        >
          Detalii
        </button>
        <button
          onClick={onDelete}
          className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
          title="Șterge document"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Download Error */}
      {downloadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {downloadError}
        </div>
      )}

      {/* Details Expandable */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ID Document:</span>
              <span className="text-gray-800 font-mono text-xs">
                {document.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">URL Fișier:</span>
              <span className="text-gray-800 font-mono text-xs truncate">
                {document.fileUrl}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Încărcat:</span>
              <span className="text-gray-800">
                {formatDate(document.uploadedAt)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
