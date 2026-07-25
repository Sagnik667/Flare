import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Shield, LogOut, LayoutDashboard, Radio, Users, ClipboardCheck, Map, Menu, X } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useNotifications from '../../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';
import Avatar from '../ui/Avatar';

export const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount, togglePanel } = useNotifications();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Incident Monitor', path: '/admin/incidents', icon: Radio },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Volunteer Queue', path: '/admin/volunteers', icon: ClipboardCheck },
    { label: 'Safety Resources', path: '/admin/resources', icon: Map },
    { label: 'Rec. Review', path: '/admin/resources/recommendations', icon: ClipboardCheck },
    { label: 'Closure Review', path: '/admin/resources/closures', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex font-body">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-bg-surface border-r border-border shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border select-none">
          <Link to="/admin" className="flex items-center gap-2 select-none group">
            <Shield className="h-6 w-6 text-accent transition-transform group-hover:scale-110" />
            <span className="font-display font-black text-xl tracking-wider text-text-primary">
              FLARE <span className="text-[9px] text-accent bg-accent/15 px-2 py-0.5 rounded-full font-bold ml-1">ADMIN</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 text-left">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-accent/10 text-accent-light'
                    : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {link.label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            title="Log Out"
            className="flex items-center gap-3 py-3 px-4 rounded-lg font-semibold text-text-secondary hover:bg-bg-raised hover:text-text-primary transition-colors text-left w-full mt-auto border-t border-border pt-4"
          >
            <LogOut className="h-4.5 w-4.5" />
            Log Out
          </button>
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary lg:hidden focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-bold text-text-primary hidden sm:block">
              Control Center
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => togglePanel()}
                className="p-2 rounded-lg bg-bg-raised hover:bg-bg-overlay border border-border text-text-secondary hover:text-text-primary relative transition-colors focus:outline-none"
                aria-label="Toggle notifications panel"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sos text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel />
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-3 pl-2 border-l border-border">
              <Avatar name={user?.full_name} size="sm" />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold truncate max-w-[120px] text-text-primary">
                  {user?.full_name}
                </span>
                <span className="text-[10px] text-accent uppercase font-bold tracking-wider">
                  System Admin
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-base flex flex-col">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col w-64 max-w-xs bg-bg-surface border-r border-border h-full p-4 gap-2 text-left z-10 animate-slideRight">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <span className="font-display font-black text-lg tracking-wider text-accent">ADMIN PORTAL</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isActive ? 'bg-accent/10 text-accent-light' : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 py-3 px-4 rounded-lg font-semibold text-text-secondary hover:bg-bg-raised hover:text-text-primary transition-colors text-left w-full mt-auto border-t border-border pt-4"
            >
              <LogOut className="h-4.5 w-4.5" />
              Log Out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
