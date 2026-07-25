import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useLoginMutation, useGetDevAdminCredentialsQuery } from '../store/api/authApi';
import useAuth from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Shield, AlertCircle, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuthCredentials } = useAuth();

  const isAdminPath = window.location.pathname === '/admin/login';
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

  const [formError, setFormError] = useState('');
  const [emailLogin, { isLoading }] = useLoginMutation();

  const { data: devCredsRes } = useGetDevAdminCredentialsQuery(undefined, {
    skip: !isAdminPath || !isDev,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const res = await emailLogin(data).unwrap();
      if (res.success) {
        setAuthCredentials(res.data);
        toast.success(`Welcome back, ${res.data.user.full_name}!`);
        navigate(res.data.user.role === 'admin' ? '/admin' : res.data.user.role === 'volunteer' ? '/volunteer' : '/dashboard');
      }
    } catch (err) {
      setFormError(err?.data?.message || 'Invalid credentials');
      toast.error('Login failed');
    }
  };

  const handleAutofill = () => {
    if (devCredsRes?.data) {
      setValue('email', devCredsRes.data.email);
      setValue('password', devCredsRes.data.password);
      toast.success('Form autofilled!');
    }
  };

  const handleCopy = () => {
    if (devCredsRes?.data) {
      const text = `Email: ${devCredsRes.data.email}\nPassword: ${devCredsRes.data.password}`;
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Credentials copied to clipboard!');
      }).catch(() => {
        toast.error('Failed to copy credentials');
      });
    }
  };

  const showDevCredentials = isDev && isAdminPath && devCredsRes?.success && devCredsRes?.data;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-6 px-4">
      <Card className="w-full max-w-md bg-bg-surface border border-border shadow-2xl p-8 relative overflow-hidden">
        {/* Decorative corner flash */}
        <div className="absolute top-0 right-0 h-1.5 w-full bg-accent" />

        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-accent-light" />
          </div>
          <h2 className="text-2xl font-display font-bold text-text-primary">
            {isAdminPath ? 'Admin Portal Sign In' : 'Sign In'}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isAdminPath ? 'Access the Flare administration control center' : 'Access the Flare command and tracker dashboard'}
          </p>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3.5 mb-6 flex gap-2 text-left animate-fadeIn">
            <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-text-primary">
              <p className="font-bold">Access Denied</p>
              <p className="text-text-secondary mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        {/* Email Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            error={errors.email?.message}
            {...register('email', { required: 'Email address is required' })}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            isLoading={isLoading}
          >
            Sign In with Email
          </Button>
        </form>

        {showDevCredentials && (
          <div className="mt-6 border border-dashed border-border rounded-lg p-4 bg-bg-surface/50 text-left animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-display font-bold text-accent-light flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                Development Credentials
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="text-[10px] text-accent hover:underline font-bold"
                >
                  Autofill
                </button>
                <span className="text-text-muted text-[10px]">•</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[10px] text-accent hover:underline font-bold"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-text-secondary bg-bg-main/50 p-2 rounded border border-border/50">
              <div><span className="text-text-muted">Email:</span> {devCredsRes.data.email}</div>
              <div><span className="text-text-muted">Password:</span> {devCredsRes.data.password}</div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-text-secondary">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-accent hover:underline font-bold">
            Sign Up
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
