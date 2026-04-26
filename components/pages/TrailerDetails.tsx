"use client";

import { useApp } from "@/lib/app-context";
import { AlertStatus } from "@/lib/types";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader,
} from "lucide-react";
import DocumentCard from "@/components/DocumentCard";
import BulkUploadModal from "@/components/BulkUploadModal";
import NotificationCenter from "@/components/NotificationCenter";
import { downloadMultipleFiles } from "@/lib/utils";
import { useEffect, useState } from "react";

const statusConfig: Record<
  AlertStatus,
  { icon: React.ReactNode; label: string; color: string }
> = {
  EXPIRED: {
    icon: <XCircle className="w-4 h-4" />,
    label: "EXPIRAT",
    color: "bg-red-100 text-red-800 border-red-300",
  },
  URGENT: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "URGENT",
    color: "bg-red-100 text-red-800 border-red-300",
  },
  ALERT: {
    icon: <AlertCircle className="w-4 h-4" />,
    label: "ATENȚIE",
    color: "bg-orange-100 text-orange-800 border-orange-300",
  },
  WARNING: {
    icon: <Clock className="w-4 h-4" />,
    label: "AVERTISMENT",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  NORMAL: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "OK",
    color: "bg-green-100 text-green-800 border-green-300",
  },
};

export default function TrailerDetails({
  trailerId,
  onBack,
}: {
  trailerId: string;
  onBack: () => void;
}) {
  const { getTrailerById, deleteDocument, refreshTrailerDocuments } = useApp();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [bulkDownloadMessage, setBulkDownloadMessage] = useState<string | null>(
    null,
  );
  const trailer = getTrailerById(trailerId);

  useEffect(() => {
    if (!trailer) {
      return;
    }

    const hasUnresolvedOcr = trailer.documents.some(
      (document) =>
        (typeof document.ocrStatus === "string" &&
          document.ocrStatus.toUpperCase() === "PENDING") ||
        (typeof document.ocrStatus === "string" &&
          document.ocrStatus.toUpperCase() === "FAILED" &&
          (document.ocrExtractedData?.keyValuePairs ?? []).length === 0),
    );

    if (!hasUnresolvedOcr) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshTrailerDocuments(trailerId);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshTrailerDocuments, trailer, trailerId]);

  if (!trailer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 text-lg">Remorca nu a fost găsită</p>
          <button
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi
          </button>
        </div>
      </div>
    );
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Sigur doriți să ștergeți acest document?")) {
      return;
    }

    setIsDeletingDocument(true);
    setBulkDownloadMessage(null);

    try {
      await deleteDocument(trailerId, documentId);
    } catch (error) {
      setBulkDownloadMessage(
        error instanceof Error
          ? error.message
          : "Nu am putut sterge documentul.",
      );
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const handleBulkDownload = async () => {
    if (trailer.documents.length === 0) {
      setBulkDownloadMessage("Nu sunt documente de descărcat");
      return;
    }

    setIsBulkDownloading(true);
    setBulkDownloadMessage(null);

    try {
      const files = trailer.documents.map((doc) => ({
        url: doc.fileUrl,
        name: `${doc.type}_${doc.number}_${new Date(doc.uploadedAt).toISOString().split("T")[0]}`,
      }));

      const result = await downloadMultipleFiles(files);

      if (result.failed === 0) {
        setBulkDownloadMessage(
          `✓ S-au descărcat cu succes ${result.success} documente.`,
        );
      } else {
        setBulkDownloadMessage(
          `S-au descărcat ${result.success} documente.\n${result.failed} au eșuat.\n\n${result.errors.join("\n")}`,
        );
      }
    } catch (error) {
      setBulkDownloadMessage(
        error instanceof Error ? error.message : "Eroare la descărcare bulk.",
      );
    } finally {
      setIsBulkDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Înapoi la dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {trailer.registrationNumber}
                </h1>
                <p className="text-sm text-gray-600">
                  Detalii Remorcă și Documente
                </p>
              </div>
            </div>
            <NotificationCenter />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trailer Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Informații Generale
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Număr Înmatriculare</p>
              <p className="text-gray-900 font-semibold">
                {trailer.registrationNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tip</p>
              <p className="text-gray-900 font-semibold">{trailer.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Producător</p>
              <p className="text-gray-900 font-semibold">
                {trailer.manufacturer}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Anul Fabricației</p>
              <p className="text-gray-900 font-semibold">{trailer.year}</p>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Documente ({trailer.documents.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDownload}
                disabled={trailer.documents.length === 0 || isBulkDownloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isBulkDownloading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Se descarcă...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Descarcă Tot
                  </>
                )}
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Încărcare Documente
              </button>
            </div>
          </div>

          {bulkDownloadMessage && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                bulkDownloadMessage.startsWith("✓")
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-orange-50 border-orange-200 text-orange-700"
              }`}
            >
              {bulkDownloadMessage}
            </div>
          )}

          {trailer.documents.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
              <p className="text-gray-600 mb-4">Nu sunt documente încărcate</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Încarcă Documente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trailer.documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  statusConfig={statusConfig}
                  onDelete={() => {
                    if (!isDeletingDocument) {
                      void handleDeleteDocument(document.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <BulkUploadModal
            trailerId={trailerId}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </main>
    </div>
  );
}
