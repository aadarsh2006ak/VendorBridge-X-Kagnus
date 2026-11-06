import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  Clock,
  Shield,
  User,
  Building2,
  FileText,
  Layers,
  CheckSquare,
  ShoppingBag,
  Receipt,
  Terminal,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { api, getErrorMessage } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn, formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

interface AuditStats {
  totalEvents: number;
  past24Hours: number;
  past7Days: number;
  byEntityType: Record<string, number>;
}

export function ActivityTimelinePage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch Audit Stats
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: async () => {
      const res = await api.get('/audit/stats');
      return res.data?.data as AuditStats;
    },
  });

  // Fetch Audit Logs
  const {
    data: logsData,
    isLoading: isLogsLoading,
    isFetching,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['audit', 'logs', page, entityType, searchTerm],
    queryFn: async () => {
      const res = await api.get('/audit', {
        params: {
          page,
          limit: 20,
          entityType: entityType || undefined,
          search: searchTerm || undefined,
        },
      });
      return res.data as {
        data: AuditLogItem[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    },
  });

  const logs = logsData?.data || [];
  const meta = logsData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const getEntityIcon = (type: string) => {
    switch (type.toUpperCase()) {
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
      case 'VENDOR':
        return <Building2 className="w-4 h-4 text-indigo-400" />;
      case 'AUTH':
        return <Shield className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatActionBadge = (action: string) => {
    if (action.includes('APPROVED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (action.includes('REJECTED') || action.includes('BLOCKED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/50 text-rose-300 border border-rose-500/30">
          <XCircle className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (action.includes('CREATED') || action.includes('GENERATED') || action.includes('SUBMITTED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/50 text-blue-300 border border-blue-500/30">
          <Activity className="w-3 h-3" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-2 text-secondary border border-border-default">
        {action}
      </span>
    );
  };

  const getEntityLink = (entityType: string, entityId: string, details?: any) => {
    const type = entityType.toUpperCase();
    if (type === 'RFQ') return `/rfqs/${entityId}`;
    if (type === 'PURCHASE_ORDER') return `/purchase-orders/${entityId}`;
    if (type === 'INVOICE') return `/invoices/${entityId}`;
    if (type === 'APPROVAL' && details?.rfqId) return `/approvals/by-rfq/${details.rfqId}`;
    if (type === 'APPROVAL') return `/approvals/${entityId}`;
    if (type === 'VENDOR') return `/vendors`;
    return null;
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center text-primary">
              <Activity className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">
                Activity & Forensic Audit Logs
              </h1>
              <p className="text-xs text-muted">
                Immutable, append-only chronological record of all procurement events and decisions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLogs();
              refetchStats();
            }}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            Refresh Trail
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface border-border-default space-y-1">
          <p className="text-xs font-medium text-secondary">Total Logged Events</p>
          <p className="text-2xl font-bold text-primary">
            {isStatsLoading ? '...' : (statsData?.totalEvents ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted flex items-center gap-1 pt-1 border-t border-border-default/50">
            <Terminal className="w-3 h-3 text-brand" />
            Immutable append-only records
          </p>
        </Card>

        <Card className="p-4 bg-surface border-border-default space-y-1">
          <p className="text-xs font-medium text-secondary">Activity Past 24h</p>
          <p className="text-2xl font-bold text-emerald-400">
            {isStatsLoading ? '...' : (statsData?.past24Hours ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted flex items-center gap-1 pt-1 border-t border-border-default/50">
            <Clock className="w-3 h-3 text-emerald-400" />
            Real-time procurement triggers
          </p>
        </Card>

        <Card className="p-4 bg-surface border-border-default space-y-1">
          <p className="text-xs font-medium text-secondary">Activity Past 7 Days</p>
          <p className="text-2xl font-bold text-blue-400">
            {isStatsLoading ? '...' : (statsData?.past7Days ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted flex items-center gap-1 pt-1 border-t border-border-default/50">
            <Calendar className="w-3 h-3 text-blue-400" />
            Weekly operational volume
          </p>
        </Card>

        <Card className="p-4 bg-surface border-border-default space-y-1">
          <p className="text-xs font-medium text-secondary">Active Entities Tracked</p>
          <p className="text-2xl font-bold text-primary">
            {isStatsLoading ? '...' : Object.keys(statsData?.byEntityType || {}).length}
          </p>
          <p className="text-[11px] text-muted flex items-center gap-1 pt-1 border-t border-border-default/50">
            <Shield className="w-3 h-3 text-purple-400" />
            RFQ, PO, Invoice, Approvals, Auth
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-surface border-border-default">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by action, user email, entity ID, or keyword..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs h-9 bg-surface-2 border-border-default"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-secondary shrink-0">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <span>Entity:</span>
            </div>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg bg-surface-2 border border-border-default text-xs text-primary focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">All Entities</option>
              <option value="RFQ">RFQ (Requests for Quote)</option>
              <option value="QUOTATION">Quotations</option>
              <option value="APPROVAL">Approvals</option>
              <option value="PURCHASE_ORDER">Purchase Orders</option>
              <option value="INVOICE">Invoices</option>
              <option value="VENDOR">Vendors</option>
              <option value="AUTH">Authentication</option>
            </select>

            {(entityType || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEntityType('');
                  setSearchTerm('');
                  setPage(1);
                }}
                className="text-xs text-muted hover:text-primary h-9"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Audit Timeline Feed */}
      <Card className="bg-surface border-border-default overflow-hidden">
        <div className="p-4 border-b border-border-default/60 flex items-center justify-between bg-surface-2/30">
          <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
            Chronological Audit Feed ({meta.total} events)
          </h2>
          <span className="text-[11px] text-muted">
            Page {meta.page} of {meta.totalPages || 1}
          </span>
        </div>

        {isLogsLoading ? (
          <div className="p-12 text-center text-secondary space-y-3">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading audit events from secure ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-secondary">
            <Activity className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-primary">No audit records found</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              No matching activity logged for the selected filter criteria. Try clearing search filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-default/40">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const link = getEntityLink(log.entityType, log.entityId, log.details);

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-surface-2/30 transition-colors space-y-2.5"
                >
                  {/* Top Line: Badge, Entity, Actor, Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center shrink-0">
                        {getEntityIcon(log.entityType)}
                      </div>

                      {formatActionBadge(log.action)}

                      <span className="text-xs font-semibold text-primary">
                        {log.entityType}
                      </span>

                      {link ? (
                        <Link
                          to={link}
                          className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-medium"
                          title="View Entity Record"
                        >
                          <span className="truncate max-w-[180px] font-mono">{log.entityId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted font-mono truncate max-w-[180px]">
                          {log.entityId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTimestamp(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Middle Line: Actor Info & Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-secondary gap-2 pl-9">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted">Actor:</span>
                      {log.user ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-primary bg-surface-2 px-2 py-0.5 rounded border border-border-default text-[11px]">
                          <User className="w-3 h-3 text-brand" />
                          {log.user.firstName} {log.user.lastName} ({log.user.role})
                        </span>
                      ) : (
                        <span className="text-muted italic">System Automated Process</span>
                      )}

                      {log.ipAddress && (
                        <span className="text-[11px] text-muted font-mono">
                          IP: {log.ipAddress}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-brand hover:text-status-success font-medium self-start sm:self-auto"
                    >
                      <span>{isExpanded ? 'Hide Payload' : 'Inspect Payload'}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Payload Inspector */}
                  {isExpanded && (
                    <div className="mt-3 pl-9 animate-in fade-in duration-150">
                      <div className="rounded-lg bg-surface-2 p-3 border border-border-default/80 font-mono text-[11px] overflow-x-auto text-emerald-300">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-default/60 text-muted">
                          <span className="text-[10px] uppercase tracking-wider font-sans font-semibold">
                            Forensic Event Metadata & JSON State
                          </span>
                          <span className="text-[10px] text-muted">
                            Record ID: {log.id}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(
                            {
                              id: log.id,
                              action: log.action,
                              entityType: log.entityType,
                              entityId: log.entityId,
                              ipAddress: log.ipAddress,
                              userAgent: log.userAgent,
                              timestamp: log.createdAt,
                              actor: log.user,
                              details: log.details,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-border-default/60 flex items-center justify-between bg-surface-2/20">
            <p className="text-xs text-muted">
              Showing {(meta.page - 1) * meta.limit + 1} to{' '}
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} events
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={meta.page <= 1}
                className="text-xs h-8"
              >
                Previous
              </Button>
              <span className="text-xs text-secondary px-2">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                disabled={meta.page >= meta.totalPages}
                className="text-xs h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ActivityTimelinePage;

