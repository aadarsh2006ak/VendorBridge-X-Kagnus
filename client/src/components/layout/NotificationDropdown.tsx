import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  FileText,
  Layers,
  CheckSquare,
  ShoppingBag,
  Receipt,
  Info,
  ExternalLink,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'RFQ' | 'QUOTATION' | 'APPROVAL' | 'PURCHASE_ORDER' | 'INVOICE' | 'SYSTEM';
  entityType: string;
  entityId?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch unread count (polls every 30s)
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data?.data as { unreadCount: number };
    },
    refetchInterval: 30000,
  });

  const unreadCount = countData?.unreadCount ?? 0;

  // 2. Fetch notifications list
  const { data: listData, isLoading } = useQuery({
    queryKey: ['notifications', 'list', filter],
    queryFn: async () => {
      const res = await api.get('/notifications', {
        params: {
          limit: 15,
          unreadOnly: filter === 'unread',
        },
      });
      return res.data as {
        data: NotificationItem[];
        meta: { total: number; unreadCount: number };
      };
    },
    enabled: isOpen,
  });

  // 3. Mark Single as Read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      error('Notification Error', getErrorMessage(err));
    },
  });

  // 4. Mark All as Read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/mark-all-read');
    },
    onSuccess: () => {
      success('Success', 'All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      error('Notification Error', getErrorMessage(err));
    },
  });

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'RFQ':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'QUOTATION':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'APPROVAL':
        return <CheckSquare className="w-4 h-4 text-amber-400" />;
      case 'PURCHASE_ORDER':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'INVOICE':
        return <Receipt className="w-4 h-4 text-cyan-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const notifications = listData?.data || [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-2 transition-colors border border-transparent hover:border-border-default focus:outline-none focus:ring-2 focus:ring-brand"
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-brand rounded-full ring-2 ring-surface shadow-sm animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-surface border border-border-default shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-default/80 flex items-center justify-between bg-surface-2/40">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-subtle text-status-success border border-brand/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="inline-flex items-center gap-1 text-xs text-brand hover:text-status-success font-medium transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border-default/60 px-3 bg-surface-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'py-2 px-3 font-medium transition-colors border-b-2 -mb-[1px]',
                filter === 'all'
                  ? 'border-brand text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'py-2 px-3 font-medium transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5',
                filter === 'unread'
                  ? 'border-brand text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              )}
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border-default/40">
            {isLoading ? (
              <div className="p-8 text-center text-secondary text-xs space-y-2">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-secondary">
                <Bell className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-primary">No notifications</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'You have no alerts at this time.'}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    'p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-surface-2/60 relative group',
                    !item.isRead ? 'bg-surface-2/30' : 'bg-transparent'
                  )}
                >
                  {/* Left Icon Badge */}
                  <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs font-medium truncate', !item.isRead ? 'text-primary font-semibold' : 'text-secondary')}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>

                    {item.link && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-brand font-medium group-hover:underline">
                        <span>View details</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Unread indicator */}
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5 ring-2 ring-surface shadow-xs" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border-default/80 bg-surface-2/30 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/activity');
              }}
              className="text-xs text-secondary hover:text-primary font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <span>View full audit & activity trail</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
