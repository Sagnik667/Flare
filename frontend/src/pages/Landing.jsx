import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, AlertTriangle, ArrowRight, UserPlus, Info } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_HOME } from '../lib/constants';

export const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    navigate(ROLE_HOME[user.role] || '/');
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4 text-center">
      {/* Decorative Grid Backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161a23_1px,transparent_1px),linear-gradient(to_bottom,#161a23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-3xl flex flex-col items-center">
        {/* Flashing Status Indicator */}
        <div className="inline-flex items-center gap-2 bg-sos/15 border border-sos/30 rounded-full px-3 py-1.5 mb-8 text-xs font-semibold text-text-primary animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5 text-sos" />
          <span>Active Command and Patrol Safety Monitor Enabled</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight leading-[1.1] mb-6">
          INSTANT SAFETY AND <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sos to-accent-light">
            EMERGENCY RESPONSE
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-text-secondary max-w-xl mb-10 leading-relaxed">
          Flare is a secure safety application linking women in immediate danger with community volunteer responders and official agencies.
        </p>

        {/* CTA Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full max-w-md mb-12">
          {/* Primary CTA - Log In */}
          <Link
            to="/login"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sos to-accent-light text-text-primary font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-xl shadow-sos/20 hover:opacity-95 active:scale-[0.98] select-none text-sm sm:text-base"
          >
            <Mail className="h-4.5 w-4.5 text-text-primary" />
            Log In
          </Link>

          {/* Secondary CTA - Sign Up */}
          <Link
            to="/register"
            className="flex-1 flex items-center justify-center gap-2 bg-bg-raised hover:bg-bg-overlay border border-border font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:border-text-secondary active:scale-[0.98] select-none text-sm sm:text-base text-text-primary"
          >
            <UserPlus className="h-4.5 w-4.5 text-text-secondary" />
            Sign Up
          </Link>
        </div>

        {/* Small Navigation helper for responder onboarding */}
        <div className="flex items-center justify-center text-xs font-semibold text-text-secondary bg-bg-surface border border-border/60 rounded-xl px-5 py-3 w-full max-w-md">
          <Link to="/responder-info" className="text-text-secondary hover:text-text-primary flex items-center gap-1.5 hover:underline">
            <Info className="h-4 w-4 text-accent-light" />
            <span>Apply as Volunteer Responder</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
