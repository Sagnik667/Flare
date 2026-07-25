import React, { useState } from 'react';
import { useGetAdminUsersQuery, useUpdateUserStatusMutation } from '../store/api/adminApi';
import useAuth from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Search, UserMinus, UserCheck, Shield, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const AdminUsers = () => {
  const { user: currentAdmin } = useAuth();
  
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data: resData, isLoading, refetch } = useGetAdminUsersQuery({
    search: search || undefined,
    role: role || undefined,
    status: status || undefined,
    page,
    limit: 12,
  });

  const [updateUserStatus, { isLoading: isStatusUpdating }] = useUpdateUserStatusMutation();

  const users = resData?.data || [];
  const pagination = resData?.pagination || { total: 0, page: 1, limit: 12, pages: 1 };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const actionText = newStatus === 'suspended' ? 'suspend' : 'reactivate';
    
    if (window.confirm(`Are you sure you want to ${actionText} the user account of ${user.full_name}?`)) {
      try {
        await updateUserStatus({ id: user.id, status: newStatus }).unwrap();
        toast.success(`User ${user.full_name} account set to ${newStatus}`);
        refetch();
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update user account status');
      }
    }
  };

  const roles = [
    { label: 'All Roles', value: '' },
    { label: 'Woman Profiles', value: 'woman' },
    { label: 'Responder Volunteers', value: 'volunteer' },
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Active Profiles', value: 'active' },
    { label: 'Suspended Profiles', value: 'suspended' },
  ];

  return (
    <div className="max-w-6xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      {/* Title */}
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">administration</span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">User Profile Directory</h2>
        <p className="text-xs text-text-secondary mt-1">Search user details, monitor roles, and manage active account suspension states.</p>
      </div>

      {/* Filter panel */}
      <Card className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-border py-4 px-6 items-end">
        <div className="sm:col-span-2">
          <Input
            label="Search Directory"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          label="Profile Role"
          options={roles}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Account Status"
          options={statuses}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        />
      </Card>

      {/* List Grid */}
      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No Users Found"
          description="There are no user profiles matching the current search parameters."
          icon={Search}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <Card key={u.id} className="border-border bg-bg-surface flex flex-col justify-between p-5 hover:border-text-secondary transition-colors">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-text-primary text-base truncate max-w-[150px]" title={u.full_name}>
                        {u.full_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={u.role === 'volunteer' ? 'primary' : 'secondary'}>
                          {u.role.toUpperCase()}
                        </Badge>
                        <Badge variant={u.status === 'suspended' ? 'danger' : 'success'}>
                          {u.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-text-secondary mb-5 border-t border-border/40 pt-3">
                    <p className="truncate"><span className="font-semibold text-text-muted">Email:</span> {u.email}</p>
                    <p><span className="font-semibold text-text-muted">Phone:</span> {u.phone}</p>
                    <p><span className="font-semibold text-text-muted">Registered:</span> {format(new Date(u.created_at), 'MMM dd, yyyy')}</p>
                  </div>
                </div>

                {/* Suspension actions */}
                {u.id !== currentAdmin?.id && u.role !== 'admin' && (
                  <Button
                    variant={u.status === 'suspended' ? 'outline' : 'danger'}
                    size="sm"
                    className="w-full justify-center"
                    icon={u.status === 'suspended' ? UserCheck : UserMinus}
                    onClick={() => handleToggleStatus(u)}
                  >
                    {u.status === 'suspended' ? 'Reactivate Profile' : 'Suspend Profile'}
                  </Button>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
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

export default AdminUsers;
