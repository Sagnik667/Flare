import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useRegisterMutation } from '../store/api/authApi';
import useAuth from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import { Shield, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { BLOOD_GROUPS } from '../lib/constants';

export const Register = () => {
  const navigate = useNavigate();
  const { login: setAuthCredentials } = useAuth();
  const [formError, setFormError] = useState('');
  const [registerUser, { isLoading }] = useRegisterMutation();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { fullName: '', email: '', phone: '', password: '', bloodGroup: '' },
  });

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        role: 'woman', // Standard registration always starts as role woman
        bloodGroup: data.bloodGroup || undefined,
      };

      const res = await registerUser(payload).unwrap();
      if (res.success) {
        setAuthCredentials(res.data);
        toast.success(`Account registered! Welcome, ${data.fullName}`);
        navigate('/dashboard');
      }
    } catch (err) {
      setFormError(err?.data?.message || 'Registration failed. Email or phone may already exist.');
      toast.error('Registration failed');
    }
  };

  const bloodOptions = BLOOD_GROUPS.map((bg) => ({ label: bg, value: bg }));

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-6 px-4">
      <Card className="w-full max-w-lg bg-bg-surface border border-border shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-accent" />

        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-accent-light" />
          </div>
          <h2 className="text-2xl font-display font-bold text-text-primary">
            Create Account
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Register your safety profile to enable SOS commands
          </p>
        </div>

        {formError && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3.5 mb-6 flex gap-2 text-left animate-fadeIn">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-text-primary">
              <p className="font-bold">Error Creating Account</p>
              <p className="text-text-secondary mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              error={errors.fullName?.message}
              {...register('fullName', { required: 'Full name is required' })}
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="+1234567890"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="jane@example.com"
              error={errors.email?.message}
              {...register('email', { required: 'Email address is required' })}
            />

            <Select
              label="Blood Group (Optional)"
              placeholder="Select Blood Group"
              options={bloodOptions}
              error={errors.bloodGroup?.message}
              {...register('bloodGroup')}
            />
          </div>

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          <Button
            type="submit"
            className="w-full mt-4"
            isLoading={isLoading}
          >
            Register Profile
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-text-secondary">
          <span>Already have an account? </span>
          <Link to="/login" className="text-accent hover:underline font-bold">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
