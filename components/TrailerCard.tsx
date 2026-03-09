'use client';

import { Trailer, AlertStatus } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

interface TrailerCardProps {
  trailer: Trailer;
  onSelect: () => void;
  statusConfig: Record<AlertStatus, { icon: React.ReactNode; label: string; color: string }>;
}

export default function TrailerCard({ trailer, onSelect, statusConfig }: TrailerCardProps) {
  // Get the most urgent document status
  const mostUrgentStatus: AlertStatus = trailer.documents.reduce<AlertStatus>((current, doc) => {
    const statusPriority: Record<AlertStatus, number> = {
      EXPIRED: 5,
      URGENT: 4,
      ALERT: 3,
      WARNING: 2,
      NORMAL: 1,
    };
    return statusPriority[doc.status] > statusPriority[current] ? doc.status : current;
  }, 'NORMAL');

  const urgencyColor = {
    EXPIRED: 'border-red-300 bg-red-50',
    URGENT: 'border-red-300 bg-red-50',
    ALERT: 'border-orange-300 bg-orange-50',
    WARNING: 'border-yellow-300 bg-yellow-50',
    NORMAL: 'border-gray-200 bg-white',
  }[mostUrgentStatus];

  const docsByStatus = trailer.documents.reduce<Record<AlertStatus, number>>((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {} as Record<AlertStatus, number>);

  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-lg border p-6 transition-all hover:shadow-lg hover:border-blue-500/50 cursor-pointer ${urgencyColor}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{trailer.registrationNumber}</h3>
          <p className="text-sm text-gray-600">{trailer.manufacturer}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-blue-500" />
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tip:</span>
          <span className="text-gray-900 font-medium">{trailer.type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Anul:</span>
          <span className="text-gray-900 font-medium">{trailer.year}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Documente:</span>
          <span className="text-gray-900 font-medium">{trailer.documents.length}</span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
        {Object.entries(docsByStatus).map(([status, count]) => {
          const config = statusConfig[status as AlertStatus];
          return (
            <span key={status} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border ${config.color}`}>
              {config.icon}
              {config.label} ({count})
            </span>
          );
        })}
      </div>

      {/* Urgency Score Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Grad Urgență</span>
          <span className="text-xs font-semibold text-gray-900">{trailer.urgencyScore}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              trailer.urgencyScore >= 70 ? 'bg-red-500' : trailer.urgencyScore >= 40 ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${trailer.urgencyScore}%` }}
          />
        </div>
      </div>
    </button>
  );
}
