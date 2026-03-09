'use client';

import { useApp } from '@/lib/app-context';
import { useEffect, useState } from 'react';
import { AlertStatus } from '@/lib/types';
import { Bell, X, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface Notification {
  id: string;
  documentId: string;
  trailerId: string;
  trilerNumber: string;
  documentType: string;
  status: AlertStatus;
  message: string;
  createdAt: Date;
  read: boolean;
}

export default function NotificationCenter() {
  const { trailers } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate notifications based on document status
  useEffect(() => {
    const newNotifications: Notification[] = [];

    trailers.forEach(trailer => {
      trailer.documents.forEach(doc => {
        if (doc.status === 'URGENT' || doc.status === 'EXPIRED' || doc.status === 'ALERT') {
          const notifId = `notif-${doc.id}`;
          
          // Check if notification already exists
          if (!notifications.some(n => n.documentId === doc.id)) {
            let message = '';
            if (doc.status === 'EXPIRED') {
              message = `Document expirat: ${doc.type} pentru remorca ${trailer.registrationNumber}`;
            } else if (doc.status === 'URGENT') {
              message = `Urgent! ${doc.type} expiră curând pentru remorca ${trailer.registrationNumber}`;
            } else if (doc.status === 'ALERT') {
              message = `Atenție! ${doc.type} va expira în curând pentru remorca ${trailer.registrationNumber}`;
            }

            newNotifications.push({
              id: notifId,
              documentId: doc.id,
              trailerId: trailer.id,
              trilerNumber: trailer.registrationNumber,
              documentType: doc.type,
              status: doc.status,
              message,
              createdAt: new Date(),
              read: false,
            });
          }
        }
      });
    });

    // Combine with existing notifications
    setNotifications(prev => {
      const combined = [...prev];
      newNotifications.forEach(newNotif => {
        if (!combined.some(n => n.documentId === newNotif.documentId)) {
          combined.push(newNotif);
        }
      });
      return combined;
    });
  }, [trailers]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setIsOpen(false);
  };

  const getIcon = (status: AlertStatus) => {
    switch (status) {
      case 'EXPIRED':
      case 'URGENT':
        return <AlertTriangle className="w-4 h-4" />;
      case 'ALERT':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case 'EXPIRED':
      case 'URGENT':
        return 'bg-red-100 border-red-300';
      case 'ALERT':
        return 'bg-orange-100 border-orange-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificări"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg border border-gray-200 shadow-xl z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notificări ({notifications.length})</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">Nu sunt notificări</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
                      notif.status === 'EXPIRED' || notif.status === 'URGENT'
                        ? 'border-red-500'
                        : notif.status === 'ALERT'
                        ? 'border-orange-500'
                        : 'border-gray-300'
                    } ${!notif.read ? 'bg-blue-50' : ''}`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded ${getStatusColor(notif.status)}`}>
                        {getIcon(notif.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{notif.documentType}</p>
                        <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {notif.createdAt.toLocaleTimeString('ro-RO')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <button
                onClick={clearAll}
                className="w-full text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Șterge toate notificările
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
