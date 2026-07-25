import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGetProfileQuery, useUpdateProfileMutation, useChangePasswordMutation } from '../store/api/usersApi';
import useAuth from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { User, Shield, Key, HeartHandshake, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
});

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const Settings = () => {
  const { volunteerProfile, isPendingVolunteer, isRejectedVolunteer, refetchProfile } = useAuth();
  
  const { data: profileRes, isLoading: isProfileLoading, refetch: refetchProfileData } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const profile = profileRes?.data || {};

  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset: resetProfile, formState: { errors: profileErrors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '' },
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors } } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // Populate profile form defaults on data load
  useEffect(() => {
    if (profile.full_name) {
      resetProfile({
        fullName: profile.full_name,
        phone: profile.phone || '',
      });
    }
  }, [profile, resetProfile]);

  const onUpdateProfile = async (data) => {
    try {
      await updateProfile(data).unwrap();
      toast.success('Profile details updated successfully');
      refetchProfileData();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update profile');
    }
  };

  const onChangePassword = async (data) => {
    try {
      const payload = {
        newPassword: data.newPassword,
      };
      if (profile.has_password) {
        payload.currentPassword = data.currentPassword;
      }

      await changePassword(payload).unwrap();
      toast.success(profile.has_password ? 'Password changed successfully' : 'Password created successfully');
      resetPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      refetchProfileData();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update password');
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <span className="animate-pulse text-text-secondary">Loading account details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      {/* Title */}
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">account administration</span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Settings</h2>
        <p className="text-xs text-text-secondary mt-1">Manage your profiles, password credentials, and volunteer verification status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Account Status Summary & Volunteer Status */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-border bg-bg-surface flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-accent-light" />
              Security Check
            </h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Email Verification</span>
                {profile.email_verified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="warning">Unverified</Badge>
                )}
              </div>


              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Account Role</span>
                <Badge variant="secondary">{profile.role?.toUpperCase()}</Badge>
              </div>
            </div>
          </Card>

          {/* Volunteer application status widget */}
          <Card className="border-border bg-bg-surface flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
              <HeartHandshake className="h-4.5 w-4.5 text-accent-light" />
              Responder Status
            </h3>

            {volunteerProfile ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">Application Status</span>
                  {volunteerProfile.verification_status === 'verified' && <Badge variant="success">Active Verified</Badge>}
                  {volunteerProfile.verification_status === 'pending' && <Badge variant="warning">Awaiting Review</Badge>}
                  {volunteerProfile.verification_status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                </div>

                {isRejectedVolunteer && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs mt-2 flex gap-2">
                    <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-text-primary">Rejection Reason</p>
                      <p className="text-text-secondary mt-0.5">{volunteerProfile.rejection_reason}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-text-secondary text-center py-2 space-y-3">
                <p>You have not applied to be a safety responder volunteer yet.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right column: Edit forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Form */}
          <Card className="border-border bg-bg-surface">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3 mb-4 flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-accent-light" />
              Profile Details
            </h3>

            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="Jane Doe"
                  error={profileErrors.fullName?.message}
                  {...registerProfile('fullName')}
                />

                <Input
                  label="Phone Number"
                  placeholder="+1234567890"
                  error={profileErrors.phone?.message}
                  {...registerProfile('phone')}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isUpdatingProfile}>
                  Save Details
                </Button>
              </div>
            </form>
          </Card>

          {/* Password Credentials Form */}
          <Card className="border-border bg-bg-surface">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3 mb-4 flex items-center gap-2">
              <Key className="h-4.5 w-4.5 text-accent-light" />
              {profile.has_password ? 'Change Password' : 'Create Password'}
            </h3>

            <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
              {profile.has_password && (
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••••••"
                  error={passwordErrors.currentPassword?.message}
                  {...registerPassword('currentPassword')}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Min. 10 chars, upper, lower, digit, symbol"
                  error={passwordErrors.newPassword?.message}
                  {...registerPassword('newPassword')}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="••••••••••••"
                  error={passwordErrors.confirmPassword?.message}
                  {...registerPassword('confirmPassword')}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isChangingPassword}>
                  {profile.has_password ? 'Update Password' : 'Create Credentials'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
