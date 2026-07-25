import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, ShieldAlert, HeartHandshake, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export const NotificationPanel = () => {
  const { items, unreadCount, panelOpen, markRead, markAllRead, togglePanel } = useNotifications();

  const getIcon = (type) => {
    switch (type) {
      case 'SOS_TRIGGERED':
      case 'incident_triggered':
        return <ShieldAlert className="h-5 w-5 text-sos" />;
      case 'VOLUNTEER_ACCEPTED':
      case 'volunteer_accepted':
        return <HeartHandshake className="h-5 w-5 text-accent-light" />;
      case 'VOLUNTEER_VERIFIED':
      case 'volunteer_verified':
        return <UserCheck className="h-5 w-5 text-success" />;
      case 'INCIDENT_RESOLVED':
      case 'incident_resolved':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'VOLUNTEER_REJECTED':
      case 'volunteer_rejected':
        return <AlertTriangle className="h-5 w-5 text-danger" />;
      default:
        return <Bell className="h-5 w-5 text-text-secondary" />;
    }
  };

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          {/* Backdrop Click */}
          <div className="fixed inset-0 z-40" onClick={() => togglePanel(false)} />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-raised">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" />
                <span className="font-bold text-text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-sos text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-accent hover:text-accent-light flex items-center gap-1 font-semibold focus:outline-none"
                    title="Mark all as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Read All
                  </button>
                )}
                <button
                  onClick={() => togglePanel(false)}
                  className="text-text-secondary hover:text-text-primary p-1 rounded-lg focus:outline-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
              {items.length === 0 ? (
                <div className="p-8 text-center text-text-secondary text-sm">
                  No notifications yet.
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.status === 'unread') markRead(n.id);
                    }}
                    className={`p-4 flex gap-3 text-left transition-colors cursor-pointer hover:bg-bg-raised ${
                      n.status === 'unread' ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm font-semibold truncate ${
                          n.status === 'unread' ? 'text-text-primary font-bold' : 'text-text-secondary'
                        }`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-text-muted shrink-0 mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at || n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed break-words">
                        {n.message}
                      </p>
                    </div>
                    {n.status === 'unread' && (
                      <span className="h-2 w-2 bg-sos rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
