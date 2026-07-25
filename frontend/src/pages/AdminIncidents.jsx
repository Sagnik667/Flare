import React, { useState } from 'react';
import { useGetAdminIncidentsQuery } from '../store/api/adminApi';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { ShieldAlert, User, Navigation, Calendar, CheckSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { INCIDENT_STATUS_LABELS } from '../lib/constants';
import useSocket from '../hooks/useSocket';

export const AdminIncidents = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: resData, isLoading, refetch } = useGetAdminIncidentsQuery({
    status: statusFilter || undefined,
    page,
    limit: 10,
  }, {
    pollingInterval: 10000, // refresh logs
  });

  useSocket({
    incident_created: () => {
      refetch();
    },
    incident_updated: () => {
      refetch();
    },
  });

  const incidents = resData?.data || [];
  const pagination = resData?.pagination || { total: 0, page: 1, limit: 10, pages: 1 };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return <Badge variant="danger">Active SOS</Badge>;
      case 'volunteer_assigned': return <Badge variant="warning">Assigned</Badge>;
      case 'volunteer_en_route': return <Badge variant="info">En Route</Badge>;
      case 'volunteer_arrived': return <Badge variant="info">Arrived</Badge>;
      case 'assisting': return <Badge variant="primary">Assisting</Badge>;
      case 'resolved': return <Badge variant="success">Resolved</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filters = [
    { label: 'All Incidents', value: '' },
    { label: 'Active SOS Only', value: 'active' },
    { label: 'Responder Assigned', value: 'volunteer_assigned' },
    { label: 'Assistance Active', value: 'assisting' },
    { label: 'Resolved Safe', value: 'resolved' },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">operational center</span>
          <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Incident Monitor Log</h2>
          <p className="text-xs text-text-secondary mt-1">Review live emergency calls, responder details, and historical audit reports.</p>
        </div>
      </div>

      {/* Filter panel */}
      <Card className="border-border py-4 px-6 max-w-sm">
        <Select
          label="Filter by Incident Status"
          options={filters}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        />
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No Incidents Logged"
          description="There are currently no emergency safety incidents matching the selected filter."
          icon={CheckSquare}
        />
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id} className="border-border bg-bg-surface p-6 hover:border-text-secondary transition-all">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                {/* Victim details */}
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(incident.status)}
                    <span className="text-xs text-text-muted">
                      Triggered {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <p className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                        <User className="h-4 w-4 text-text-secondary" />
                        {incident.user_name}
                      </p>
                      <p className="text-text-secondary"><span className="font-semibold text-text-muted">Phone:</span> {incident.user_phone}</p>
                      <p className="text-text-secondary"><span className="font-semibold text-text-muted">Email:</span> {incident.user_email}</p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                        <Navigation className="h-4 w-4 text-text-secondary" />
                        Coordinates
                      </p>
                      <p className="text-text-secondary"><span className="font-semibold text-text-muted">Latitude:</span> {parseFloat(incident.trigger_lat).toFixed(6)}</p>
                      <p className="text-text-secondary"><span className="font-semibold text-text-muted">Longitude:</span> {parseFloat(incident.trigger_lng).toFixed(6)}</p>
                    </div>
                  </div>
                </div>

                {/* Responder Details */}
                <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-center text-xs space-y-1.5">
                  <h4 className="font-bold text-text-primary text-sm mb-1">Responder Info</h4>
                  {incident.volunteer_info ? (
                    <>
                      <p className="text-text-secondary font-semibold">{incident.volunteer_info.name}</p>
                      <p className="text-text-muted">Phone: {incident.volunteer_info.phone}</p>
                      {incident.resolved_at && (
                        <p className="text-success font-semibold flex items-center gap-1 mt-2">
                          Safe & Resolved
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-text-muted italic">Broadcasting alert (No responder assigned)...</span>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs font-semibold text-text-secondary">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span>Page {page} of {pagination.pages}</span>
              <Button
                variant="secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminIncidents;
