import React, { useState } from 'react';
import { useGetPendingVolunteersQuery, useVerifyVolunteerMutation } from '../store/api/adminApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { ClipboardCheck, FileText, CheckCircle2, XCircle, User, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const AdminVolunteers = () => {
  const { data: applicantsRes, isLoading, refetch } = useGetPendingVolunteersQuery();
  const applicants = applicantsRes?.data || [];
  const [verifyVolunteer, { isLoading: isReviewing }] = useVerifyVolunteerMutation();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (id, name) => {
    if (window.confirm(`Are you sure you want to APPROVE the safety responder profile of ${name}?`)) {
      try {
        await verifyVolunteer({ id, action: 'verify' }).unwrap();
        toast.success(`Volunteer profile of ${name} approved successfully`);
        refetch();
      } catch (err) {
        toast.error('Failed to approve application');
      }
    }
  };

  const handleRejectClick = (applicant) => {
    setSelectedApplicant(applicant);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }

    try {
      await verifyVolunteer({
        id: selectedApplicant.id,
        action: 'reject',
        reason: rejectionReason,
      }).unwrap();

      toast.success(`Volunteer profile of ${selectedApplicant.full_name} rejected`);
      setRejectModalOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to reject application');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      {/* Title */}
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">administration</span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Volunteer Applicant Queue</h2>
        <p className="text-xs text-text-secondary mt-1">Review credentials, physical addresses, and verify new safety responders.</p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : !applicants || applicants.length === 0 ? (
        <EmptyState
          title="Queue Empty"
          description="There are currently no pending volunteer applications awaiting admin verification."
          icon={ClipboardCheck}
        />
      ) : (
        <div className="space-y-4">
          {applicants.map((a) => (
            <Card key={a.id} className="border-border bg-bg-surface p-6 flex flex-col gap-6 hover:border-text-secondary transition-all">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                {/* Profile credentials */}
                <div className="flex-1 space-y-4 text-xs">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                      <User className="h-5 w-5 text-accent-light" />
                      {a.full_name}
                    </h3>
                    <span className="text-[10px] text-text-muted">
                      Applied {format(new Date(a.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-text-secondary">
                    <div className="space-y-1.5">
                      <p><span className="font-semibold text-text-muted">Phone:</span> {a.phone}</p>
                      <p><span className="font-semibold text-text-muted">Email:</span> {a.email}</p>
                      <p className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-text-secondary mt-0.5" />
                        <span>
                          <span className="font-semibold text-text-muted">Address:</span> {a.address}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p><span className="font-semibold text-text-muted">Latitude:</span> {parseFloat(a.home_latitude).toFixed(6)}</p>
                      <p><span className="font-semibold text-text-muted">Longitude:</span> {parseFloat(a.home_longitude).toFixed(6)}</p>
                      <p><span className="font-semibold text-text-muted">Response Radius:</span> {a.service_radius_km} km</p>
                    </div>
                  </div>
                </div>

                {/* ID Document view */}
                <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">ID verification document</span>
                  {a.is_document_corrupted ? (
                    <div className="text-center p-2.5 bg-danger/10 border border-danger/20 rounded-lg text-[10px] font-bold text-danger leading-tight">
                      Document unavailable or corrupted. Applicant must re-upload.
                    </div>
                  ) : (
                    <a
                      href={a.document_url.startsWith('http') ? a.document_url : `${import.meta.env.VITE_SOCKET_URL || ''}${a.document_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 py-2 bg-bg-raised hover:bg-bg-overlay border border-border rounded-lg text-xs font-bold text-accent-light transition-all"
                    >
                      <FileText className="h-4 w-4" />
                      Inspect Document File
                    </a>
                  )}
                </div>
              </div>

              {/* Approve/Reject Controls */}
              <div className="border-t border-border/40 pt-4 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  icon={XCircle}
                  size="sm"
                  onClick={() => handleRejectClick(a)}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  icon={CheckCircle2}
                  size="sm"
                  onClick={() => handleApprove(a.id, a.full_name)}
                >
                  Approve Application
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Application Reason modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Volunteer Application"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Please provide a detailed reason why this volunteer responder profile application is being rejected. This feedback will be shown to the applicant.
          </p>
          <Input
            label="Rejection Reason"
            placeholder="Document unreadable, details mismatch, outside patrol region..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isReviewing} onClick={handleRejectSubmit}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminVolunteers;
