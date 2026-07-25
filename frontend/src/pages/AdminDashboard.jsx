import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGetAdminDashboardQuery } from '../store/api/adminApi';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { LayoutDashboard, Radio, Users, ClipboardCheck, Map, Clock, AlertTriangle, ShieldCheck, HeartHandshake } from 'lucide-react';
import useSocket from '../hooks/useSocket';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: statsRes, isLoading, refetch } = useGetAdminDashboardQuery(undefined, {
    pollingInterval: 15000, // refresh stats
  });

  useSocket({
    incident_created: () => {
      refetch();
    },
    incident_updated: () => {
      refetch();
    },
  });

  const stats = statsRes?.data || {
    totalUsers: 0,
    totalVolunteers: 0,
    verifiedVolunteers: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
    avgResponseTime: 0,
    acceptanceRate: 0,
  };

  const cards = [
    { title: 'Incident Monitor', desc: 'Watch active alarms and timeline feeds', path: '/admin/incidents', icon: Radio, badge: stats.activeIncidents > 0 ? `${stats.activeIncidents} Active` : null, badgeColor: 'danger' },
    { title: 'Volunteer Queue', desc: 'Verify responder credentials and submissions', path: '/admin/volunteers', icon: ClipboardCheck, badge: 'Applications', badgeColor: 'warning' },
    { title: 'User Management', desc: 'Monitor, suspend, or reactivate profiles', path: '/admin/users', icon: Users, badge: `${stats.totalUsers} registered`, badgeColor: 'primary' },
    { title: 'Safety Resources', desc: 'Manage shelter, precinct, and medical lists', path: '/admin/resources', icon: Map, badge: 'Database', badgeColor: 'secondary' },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left w-full max-w-6xl mx-auto py-4">
      {/* Title */}
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">administration</span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Control Center Overview</h2>
        <p className="text-xs text-text-secondary mt-1">Real-time command center telemetry, active incidents monitoring, and safety operations dashboard.</p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-bg-surface flex flex-col justify-between py-4 px-5">
          <div className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">Active Alarms</div>
          <div className="text-3xl font-display font-black text-danger mt-2 flex items-baseline gap-2">
            {stats.activeIncidents}
            {stats.activeIncidents > 0 && <span className="h-2.5 w-2.5 bg-danger rounded-full animate-ping shrink-0" />}
          </div>
        </Card>

        <Card className="border-border bg-bg-surface flex flex-col justify-between py-4 px-5">
          <div className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">Verified Responders</div>
          <div className="text-3xl font-display font-black text-success mt-2">
            {stats.verifiedVolunteers} <span className="text-xs text-text-secondary font-semibold font-body">/ {stats.totalVolunteers}</span>
          </div>
        </Card>

        <Card className="border-border bg-bg-surface flex flex-col justify-between py-4 px-5">
          <div className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">Avg Response Time</div>
          <div className="text-3xl font-display font-black text-text-primary mt-2">
            {stats.avgResponseTime} <span className="text-xs text-text-secondary font-semibold font-body">sec</span>
          </div>
        </Card>

        <Card className="border-border bg-bg-surface flex flex-col justify-between py-4 px-5">
          <div className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">Acceptance Rate</div>
          <div className="text-3xl font-display font-black text-accent-light mt-2">
            {stats.acceptanceRate}%
          </div>
        </Card>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.path}
              onClick={() => navigate(c.path)}
              hoverable
              className="flex items-center gap-4 p-6 border-border"
            >
              <div className={`p-3 rounded-xl bg-bg-raised text-text-secondary shrink-0 border border-border`}>
                <Icon className="h-6 w-6 text-accent-light" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text-primary text-base">{c.title}</h3>
                  {c.badge && <Badge variant={c.badgeColor}>{c.badge}</Badge>}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{c.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
