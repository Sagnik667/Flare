import React from 'react';
import {
  useGetClosureRecommendationsQuery,
  useReviewClosureRecommendationMutation
} from '../store/api/adminApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { AlertOctagon, Check, X, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { RESOURCE_CATEGORY_LABELS } from '../lib/constants';

export const AdminClosures = () => {
  const { data: closuresRes, isLoading, refetch } = useGetClosureRecommendationsQuery();
  const closures = closuresRes?.data || [];
  const [reviewClosure, { isLoading: isReviewing }] = useReviewClosureRecommendationMutation();

  const handleAction = async (id, action) => {
    const confirmMsg = action === 'approve' 
      ? 'Are you sure you want to approve this closure recommendation? This will update the resource status.'
      : 'Are you sure you want to reject this closure recommendation?';

    if (window.confirm(confirmMsg)) {
      try {
        await reviewClosure({ id, action }).unwrap();
        toast.success(action === 'approve' ? 'Closure recommendation approved successfully' : 'Closure recommendation rejected');
        refetch();
      } catch (err) {
        toast.error('Failed to review closure recommendation');
      }
    }
  };

  const pendingClosures = closures.filter(c => c.status === 'pending');

  return (
    <div className="max-w-5xl mx-auto w-full text-left py-4 flex flex-col gap-6 font-body">
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">safety dashboard</span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Safety Resource Closure Recommendations</h2>
        <p className="text-xs text-text-secondary mt-1">Review volunteer recommendations to temporarily or permanently close safety resources.</p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : pendingClosures.length === 0 ? (
        <EmptyState
          title="No Pending Closure Recommendations"
          description="All safety resource closure recommendations have been reviewed."
          icon={AlertOctagon}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {pendingClosures.map((cl) => (
            <Card key={cl.id} className="flex flex-col justify-between border-border bg-bg-surface hover:border-text-secondary transition-colors">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-base truncate max-w-[200px]" title={cl.resource_name}>
                      {cl.resource_name}
                    </h3>
                    <Badge variant="primary" className="mt-1">
                      {RESOURCE_CATEGORY_LABELS[cl.resource_category] || cl.resource_category}
                    </Badge>
                  </div>
                  <Badge variant="danger" className="uppercase">{cl.closure_type} closure</Badge>
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary border-t border-border/50 pt-3">
                  <p className="truncate"><span className="font-semibold text-text-muted">Resource Address:</span> {cl.resource_address}</p>
                  <p><span className="font-semibold text-text-muted">Recommended By:</span> {cl.volunteer_name || 'Verified Volunteer'} ({cl.volunteer_email || 'responder@flare.local'})</p>
                  
                  {cl.closure_type === 'temporary' && (
                    <div className="bg-bg-raised/40 p-2.5 rounded border border-border/25 text-[11px] text-text-secondary space-y-1 mt-3">
                      <p><span className="font-bold text-text-primary">Closed From:</span> {new Date(cl.closed_from).toLocaleString()}</p>
                      <p>
                        <span className="font-bold text-text-primary">Closed Until:</span>{' '}
                        {cl.until_unknown ? 'Unknown Duration / Until Reopened' : new Date(cl.closed_until).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border/40">
                <Button 
                  onClick={() => handleAction(cl.id, 'reject')}
                  variant="secondary" 
                  disabled={isReviewing}
                  className="px-3 py-1.5 h-8 text-xs text-danger border-danger/20 hover:bg-danger/10"
                >
                  Reject
                </Button>
                <Button 
                  onClick={() => handleAction(cl.id, 'approve')}
                  disabled={isReviewing}
                  icon={Check}
                  className="px-3 py-1.5 h-8 text-xs bg-success hover:bg-success-light border-success/35 text-white"
                >
                  Approve Closure
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClosures;
