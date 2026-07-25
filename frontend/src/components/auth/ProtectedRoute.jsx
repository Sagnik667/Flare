import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import { ROLE_HOME } from '../../lib/constants';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isProfileLoading } = useAuth();
  const location = useLocation();

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login page, preserving path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard role path
    const fallbackPath = ROLE_HOME[user.role] || '/';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
