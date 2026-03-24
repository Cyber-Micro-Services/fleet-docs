"use client";

import { useApp } from "@/lib/app-context";
import { AlertStatus } from "@/lib/types";
import {
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import TrailerCard from "@/components/TrailerCard";
import NotificationCenter from "@/components/NotificationCenter";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function Dashboard({
  onSelectTrailer,
}: {
  onSelectTrailer: (trailerId: string) => void;
}) {
  const { logout, getTrailersSorted, addTrailer } = useApp();
  const sortedTrailers = getTrailersSorted();
  const [isAddTrailerOpen, setIsAddTrailerOpen] = useState(false);
  const [formData, setFormData] = useState({
    registrationNumber: "",
    manufacturer: "",
    type: "Semiremorca Furgon",
    manufactureDate: "",
  });

  const trailerTypes = [
    "Semiremorca Furgon",
    "Semiremorca Cisterna",
    "Semiremorca Platforma",
    "Remorca Platforma",
    "Camion",
    "Cap Camion",
  ];

  const resetForm = () => {
    setFormData({
      registrationNumber: "",
      manufacturer: "",
      type: "Semiremorca Furgon",
      manufactureDate: "",
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    addTrailer({
      registrationNumber: formData.registrationNumber,
      manufacturer: formData.manufacturer,
      type: formData.type,
      manufactureDate: formData.manufactureDate,
    });

    resetForm();
    setIsAddTrailerOpen(false);
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setIsAddTrailerOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  // Calculate statistics
  const stats = {
    total: sortedTrailers.length,
    urgent: sortedTrailers.filter((t) =>
      t.documents.some((d) => d.status === "URGENT" || d.status === "EXPIRED"),
    ).length,
    alert: sortedTrailers.filter((t) =>
      t.documents.some((d) => d.status === "ALERT"),
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FleetDocs</h1>
              <p className="text-sm text-gray-600">
                Dashboard - Gestionare Documente
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Deconectare
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Total Remorci</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Situații Urgente</p>
            <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Necesită Atenție</p>
            <p className="text-3xl font-bold text-orange-600">{stats.alert}</p>
          </div>
        </div>

        {/* Trailers List */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              Remorci - Ordonate după Urgență
            </h2>
            <button
              onClick={() => setIsAddTrailerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Adauga remorca +
            </button>
          </div>

          {sortedTrailers.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
              <p className="text-gray-600">Nu sunt remorci disponibile</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTrailers.map((trailer) => (
                <TrailerCard
                  key={trailer.id}
                  trailer={trailer}
                  onSelect={() => onSelectTrailer(trailer.id)}
                  statusConfig={statusConfig}
                />
              ))}
            </div>
          )}
        </div>

        <Dialog open={isAddTrailerOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adauga remorca</DialogTitle>
              <DialogDescription>
                Completeaza detaliile pentru adaugarea unei remorci noi.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="registrationNumber"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Serie
                </label>
                <input
                  id="registrationNumber"
                  type="text"
                  required
                  value={formData.registrationNumber}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      registrationNumber: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="B-TR-011"
                />
              </div>

              <div>
                <label
                  htmlFor="manufacturer"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Producator
                </label>
                <input
                  id="manufacturer"
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      manufacturer: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Wielton, Schimitz Cargobul"
                />
              </div>

              <div>
                <label
                  htmlFor="trailerType"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Tip
                </label>
                <select
                  id="trailerType"
                  required
                  value={formData.type}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {trailerTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="manufactureDate"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  An fabricare
                </label>
                <input
                  id="manufactureDate"
                  type="date"
                  required
                  value={formData.manufactureDate}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      manufactureDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => handleDialogOpenChange(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Anuleaza
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Salveaza
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Footer Info */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            Legenda Statusuri
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`p-2 rounded ${config.color.split(" ")[0]}`}>
                  {config.icon}
                </div>
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {config.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
