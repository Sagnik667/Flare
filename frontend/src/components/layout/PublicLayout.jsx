import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../lib/constants';
import Shield from 'lucide-react/dist/esm/icons/shield';

export const PublicLayout = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-body">
      {/* Navigation Header */}
      <header className="sticky top-0 bg-bg-surface/80 backdrop-blur-md border-b border-border z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 select-none group">
            <Shield className="h-6 w-6 text-sos transition-transform group-hover:scale-110" />
            <span className="font-display font-black text-xl tracking-wider text-text-primary">
              FLARE
            </span>
          </Link>
          
          <nav className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <Link
                to={ROLE_HOME[user.role] || '/'}
                className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-text-secondary hover:text-text-primary text-sm font-semibold transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/responder-info"
                  className="bg-bg-raised hover:bg-bg-overlay border border-border px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                >
                  Apply as Responder
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-surface py-6 text-center text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Flare. Built for women's emergency safety and rapid response.</p>
          <Link to="/admin/login" className="text-text-muted hover:text-accent font-semibold transition-colors">
            Admin Portal
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
