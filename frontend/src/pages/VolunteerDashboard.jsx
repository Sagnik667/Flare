import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetAlertsQuery, useAcceptAlertMutation } from '../store/api/volunteerApi';
import { setAlerts, setCurrentAssignment } from '../store/slices/volunteerSlice';
import useSocket from '../hooks/useSocket';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { HeartHandshake, ShieldAlert, Navigation, ArrowRight, MapPin, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const alerts = useSelector((state) => state.volunteer.alerts);
  const currentAssignment = useSelector((state) => state.volunteer.currentAssignment);

  // Fetch alerts within search radius
  const { data: alertsRes, isLoading, refetch } = useGetAlertsQuery(undefined, {
    pollingInterval: 10000, // Backup polling
    skip: !!currentAssignment, // Skip fetching other alerts if assigned
  });

  const [acceptAlert, { isLoading: isAccepting }] = useAcceptAlertMutation();

  // Sync RTK query alerts to redux state
  useEffect(() => {
    if (alertsRes && alertsRes.success) {
      dispatch(setAlerts(alertsRes.data || []));
    }
  }, [alertsRes, dispatch]);

  // Socket event listener for incoming emergency alerts in real-time
  useSocket({
    incident_triggered: (data) => {
      console.log('Socket incoming alert received:', data);
      if (!currentAssignment) {
        refetch();
        toast.error('⚠️ NEW EMERGENCY SOS ALERT BROADCAST NEARBY!', { duration: 5000 });
      }
    },
    incident_resolved: (data) => {
      console.log('Socket incident resolved:', data);
      if (currentAssignment && data.incidentId === currentAssignment.incident_id) {
        dispatch(setCurrentAssignment(null));
        toast.success('Your assigned incident has been resolved.');
      }
      refetch();
    },
  });

  // Handle Accept SOS Incident
  const handleAccept = async (incidentId) => {
    try {
      const res = await acceptAlert(incidentId).unwrap();
      if (res.success) {
        dispatch(setCurrentAssignment(res.data));
        toast.success('Assignment accepted! Route details secured.');
        navigate('/volunteer/tracker');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to accept incident alert.');
      refetch();
    }
  };

  if (isLoading && !currentAssignment) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <span className="animate-pulse text-text-secondary">Syncing active responder patrol feeds...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">safety patrol</span>
          <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Emergency Patrol Dashboard</h2>
          <p className="text-xs text-text-secondary mt-1">
            {currentAssignment 
              ? 'Active rescue operations in progress.' 
              : 'Real-time incoming SOS broadcasts within your designated response radius.'}
          </p>
        </div>
      </div>

      {/* FOCUS VIEW: Active Assignment Focus ONLY */}
      {currentAssignment ? (
        <Card className="border-accent bg-bg-surface flex flex-col gap-6 p-6 md:p-8 animate-fadeIn">
          <div className="flex gap-4 items-start text-left">
            <div className="p-3 bg-accent/15 border border-accent/20 rounded-xl text-accent-light shrink-0 mt-0.5 animate-pulse">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-text-primary text-lg">ACTIVE EMERGENCY RESPONSE</h3>
                <Badge variant="primary">{currentAssignment.assignment_status?.toUpperCase() || 'ACCEPTED'}</Badge>
              </div>
              <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                You are currently assigned to assist <span className="font-bold text-text-primary">{currentAssignment.user_name || 'Anonymous User'}</span>. Please proceed to coordinate location immediately.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-xs text-text-secondary">
                <div className="space-y-1.5 p-3 bg-bg-raised/50 border border-border/40 rounded-lg">
                  <p className="font-bold text-text-primary">Victim Contact</p>
                  <p><span className="text-text-muted">Name:</span> {currentAssignment.user_name || 'Anonymous'}</p>
                  {currentAssignment.phone && (
                    <p className="flex items-center gap-1">
                      <span className="text-text-muted">Phone:</span> 
                      <a href={`tel:${currentAssignment.phone}`} className="hover:underline text-success font-semibold flex items-center gap-0.5">
                        <Phone className="h-3 w-3" /> {currentAssignment.phone}
                      </a>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 p-3 bg-bg-raised/50 border border-border/40 rounded-lg">
                  <p className="font-bold text-text-primary">Trigger Position</p>
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-sos" />
                    <span>Lat: {parseFloat(currentAssignment.trigger_lat || currentAssignment.latitude || 0).toFixed(5)}, Lng: {parseFloat(currentAssignment.trigger_lng || currentAssignment.longitude || 0).toFixed(5)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="border-t border-border/40 pt-6 flex justify-end">
            <Button variant="primary" icon={ArrowRight} onClick={() => navigate('/volunteer/tracker')}>
              Open Live Rescue Tracker
            </Button>
          </div>
        </Card>
      ) : (
        /* LIST VIEW: Show available alerts ONLY when not accepted yet */
        alerts.length === 0 ? (
          <EmptyState
            title="No Active Incidents Nearby"
            description="All clear. No emergency safety alarms are currently active within your designated service coordinates."
            icon={HeartHandshake}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="border-border bg-bg-surface flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-6 p-6 hover:border-text-secondary transition-all">
                <div className="flex gap-4 items-start text-left">
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger shrink-0 mt-0.5 animate-pulse">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-text-primary text-base">CRITICAL SOS ALARM</h3>
                      <Badge variant="danger">Active</Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Triggered {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })} by <span className="font-bold text-text-secondary">{alert.user_name || 'Anonymous User'}</span>
                    </p>
                    
                    {/* Distance badge */}
                    <div className="flex items-center gap-1.5 text-xs text-success font-semibold mt-3">
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Approximately {alert.distanceKm ? alert.distanceKm.toFixed(2) : '0.0'} km from your home</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleAccept(alert.id)}
                    isLoading={isAccepting}
                  >
                    Accept Assignment
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default VolunteerDashboard;
