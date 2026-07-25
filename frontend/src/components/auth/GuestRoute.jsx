import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import { ROLE_HOME } from '../../lib/constants';

export const GuestRoute = ({ children }) => {
  const { user, isAuthenticated, isProfileLoading } = useAuth();

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    const defaultPath = ROLE_HOME[user.role] || '/';
    return <Navigate to={defaultPath} replace />;
  }

  return children;
};

export default GuestRoute;
