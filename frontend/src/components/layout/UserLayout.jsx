import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, Shield, LogOut, Settings, PhoneCall, AlertTriangle, Menu, X, ShieldAlert } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useNotifications from '../../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';
import Avatar from '../ui/Avatar';
import { clearSOS } from '../../store/slices/sosSlice';

export const UserLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount, togglePanel } = useNotifications();
  const activeIncident = useSelector((state) => state.sos.activeIncident);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Shield },
    { label: 'Contacts', path: '/contacts', icon: PhoneCall },
    { label: 'Resources', path: '/resources', icon: ShieldAlert },
    { label: 'Become Responder', path: '/apply', icon: Settings, hide: user?.role === 'volunteer' },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-body">
      {/* Active Incident Sticky Header Alert */}
      {activeIncident && (
        <Link
          to={`/sos/tracker`}
          className="bg-danger hover:bg-red-600 text-white font-bold py-2.5 px-4 text-center text-sm flex items-center justify-center gap-2 animate-pulse sticky top-0 z-40 select-none cursor-pointer"
        >
          <AlertTriangle className="h-4 w-4 animate-bounce" />
          <span>CRITICAL SOS ALARM ACTIVE - CLICK HERE FOR RESPONSE TIMELINE & RESCUERS</span>
        </Link>
      )}

      {/* Main Header */}
      <header className="sticky top-0 bg-bg-surface border-b border-border z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary sm:hidden focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 select-none group">
              <Shield className="h-6 w-6 text-sos transition-transform group-hover:scale-110" />
              <span className="font-display font-black text-xl tracking-wider text-text-primary">
                FLARE
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.filter(l => !l.hide).map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 text-sm font-semibold transition-colors py-2 px-1 border-b-2 ${
                    isActive
                      ? 'text-accent border-accent'
                      : 'text-text-secondary border-transparent hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions: Notifications, Avatar, Logout */}
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

            {/* User Avatar & Logout */}
            <div className="flex items-center gap-3 pl-2 border-l border-border">
              <Avatar name={user?.full_name} size="sm" />
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold truncate max-w-[100px] text-text-primary">
                  {user?.full_name}
                </span>
                <span className="text-[10px] text-text-secondary uppercase font-semibold">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="p-1 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                title="Account Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 flex sm:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col w-64 max-w-xs bg-bg-surface border-r border-border h-full p-4 gap-2 text-left z-10 animate-slideRight">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <span className="font-display font-black text-lg tracking-wider text-accent">MENU</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navLinks.filter(l => !l.hide).map((link) => {
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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col">
        {children}
      </main>
    </div>
  );
};

export default UserLayout;
