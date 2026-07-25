import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useGetResourceRecommendationsQuery,
  useReviewResourceRecommendationMutation
} from '../store/api/adminApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Map, Check, X, Edit, Calendar, Clock, Square, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { RESOURCE_CATEGORY_LABELS } from '../lib/constants';

const resourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  category: z.string().min(1, 'Please select a resource category'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  opening_time: z.string(),
  closing_time: z.string(),
  special_closed_dates_raw: z.string().optional().default(''),
});

const weekdays = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

export const AdminRecommendations = () => {
  const { data: recsRes, isLoading, refetch } = useGetResourceRecommendationsQuery();
  const recommendations = recsRes?.data || [];
  const [reviewRecommendation, { isLoading: isReviewing }] = useReviewResourceRecommendationMutation();

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeRec, setActiveRec] = useState(null);
  const [weeklyClosed, setWeeklyClosed] = useState([]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(resourceSchema),
  });

  const handleOpenReviewModal = (rec) => {
    setActiveRec(rec);
    setWeeklyClosed(rec.weekly_closed_days || []);
    reset({
      name: rec.name,
      category: rec.category,
      address: rec.address,
      phone: rec.phone,
      latitude: rec.latitude,
      longitude: rec.longitude,
      opening_time: rec.opening_time.slice(0, 5),
      closing_time: rec.closing_time.slice(0, 5),
      special_closed_dates_raw: (rec.special_closed_dates || []).join(', '),
    });
    setReviewModalOpen(true);
  };

  const toggleWeeklyClosed = (dayVal) => {
    setWeeklyClosed(prev => 
      prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]
    );
  };

  const handleAction = async (action, data = null) => {
    const id = activeRec ? activeRec.id : null;
    if (!id) return;

    try {
      if (action === 'approve') {
        const special_closed_dates = data.special_closed_dates_raw
          ? data.special_closed_dates_raw.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        await reviewRecommendation({
          id,
          action: 'approve',
          name: data.name,
          category: data.category,
          address: data.address,
          phone: data.phone,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          opening_time: data.opening_time.includes(':') && data.opening_time.split(':').length === 2 ? `${data.opening_time}:00` : data.opening_time,
          closing_time: data.closing_time.includes(':') && data.closing_time.split(':').length === 2 ? `${data.closing_time}:00` : data.closing_time,
          weekly_closed_days: weeklyClosed,
          special_closed_dates
        }).unwrap();
        toast.success('Recommendation approved. Resource is now registered.');
      } else {
        if (window.confirm('Are you sure you want to reject this safety resource recommendation?')) {
          await reviewRecommendation({ id, action: 'reject' }).unwrap();
          toast.success('Recommendation rejected');
        } else {
          return;
        }
      }
      setReviewModalOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to review recommendation');
    }
  };

  const categories = [
    { label: 'Police Station', value: 'police_station' },
    { label: 'Hospital', value: 'hospital' },
    { label: 'Medical Clinic', value: 'clinic' },
    { label: "Women's Shelter", value: 'womens_shelter' },
    { label: 'Community Safe Zone', value: 'safe_zone' },
    { label: 'Other', value: 'other' },
  ];

  const pendingRecs = recommendations.filter(r => r.status === 'pending');

  return (
    <div className="max-w-5xl mx-auto w-full text-left py-4 flex flex-col gap-6 font-body">
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">safety dashboard</span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Recommended Safety Resources</h2>
        <p className="text-xs text-text-secondary mt-1">Review volunteer proposals for new security shelters or emergency care stations.</p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : pendingRecs.length === 0 ? (
        <EmptyState
          title="No Pending Recommendations"
          description="All resource recommendations submitted by volunteers have been reviewed."
          icon={Map}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {pendingRecs.map((rec) => (
            <Card key={rec.id} className="flex flex-col justify-between border-border bg-bg-surface hover:border-text-secondary transition-colors">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-base truncate max-w-[220px]" title={rec.name}>
                      {rec.name}
                    </h3>
                    <Badge variant="primary" className="mt-1">
                      {RESOURCE_CATEGORY_LABELS[rec.category] || rec.category}
                    </Badge>
                  </div>
                  <Badge variant="secondary">PENDING</Badge>
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary border-t border-border/50 pt-3">
                  <p className="truncate"><span className="font-semibold text-text-muted">Proposed Address:</span> {rec.address}</p>
                  <p><span className="font-semibold text-text-muted">Proposed Phone:</span> {rec.phone}</p>
                  <p><span className="font-semibold text-text-muted">Recommended By:</span> {rec.volunteer_name || 'Verified Volunteer'} ({rec.volunteer_email || 'responder@flare.local'})</p>
                  {rec.review && (
                    <div className="mt-2 p-2.5 bg-bg-raised/55 rounded border border-border/35 text-[11px] italic text-text-muted">
                      "{rec.review}"
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border/40">
                <Button 
                  onClick={() => {
                    setActiveRec(rec);
                    handleAction('reject');
                  }}
                  variant="secondary" 
                  className="px-3 py-1.5 h-8 text-xs text-danger border-danger/20 hover:bg-danger/10"
                >
                  Reject
                </Button>
                <Button onClick={() => handleOpenReviewModal(rec)} icon={Edit} className="px-3 py-1.5 h-8 text-xs">
                  Review & Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal Form */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review & Approve Resource"
        size="lg"
      >
        {activeRec && (
          <form onSubmit={handleSubmit((data) => handleAction('approve', data))} className="space-y-4 text-left max-h-[75vh] overflow-y-auto pr-1">
            <p className="text-xs text-text-secondary leading-relaxed">
              Verify and edit details before registering this safety resource to the public directory.
            </p>

            <Input
              label="Resource Name"
              error={errors.name?.message}
              {...register('name')}
            />

            <Select
              label="Category"
              options={categories}
              error={errors.category?.message}
              {...register('category')}
            />

            <Input
              label="Phone Contact"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Physical Address"
              error={errors.address?.message}
              {...register('address')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="number"
                step="0.000001"
                error={errors.latitude?.message}
                {...register('latitude')}
              />
              <Input
                label="Longitude"
                type="number"
                step="0.000001"
                error={errors.longitude?.message}
                {...register('longitude')}
              />
            </div>

            <div className="border-t border-border/50 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Configure Schedule</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Opening Time"
                  type="time"
                  error={errors.opening_time?.message}
                  {...register('opening_time')}
                />
                <Input
                  label="Closing Time"
                  type="time"
                  error={errors.closing_time?.message}
                  {...register('closing_time')}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">Weekly Closed Days</label>
                <div className="flex flex-wrap gap-2">
                  {weekdays.map(d => {
                    const active = weeklyClosed.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleWeeklyClosed(d.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          active 
                            ? 'bg-accent/15 border-accent text-accent' 
                            : 'bg-bg-surface border-border text-text-secondary hover:border-text-muted'
                        }`}
                      >
                        {active ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Special Closed Dates (comma-separated YYYY-MM-DD)"
                placeholder="e.g. 2026-12-25, 2026-01-01"
                error={errors.special_closed_dates_raw?.message}
                {...register('special_closed_dates_raw')}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
              <Button variant="secondary" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isReviewing}>
                Approve & Register
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminRecommendations;
