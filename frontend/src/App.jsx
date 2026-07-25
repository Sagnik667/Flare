import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';

// Layout Imports
import PublicLayout from './components/layout/PublicLayout';
import UserLayout from './components/layout/UserLayout';
import VolunteerLayout from './components/layout/VolunteerLayout';
import AdminLayout from './components/layout/AdminLayout';

// Guard Imports
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';
import useAuth from './hooks/useAuth';

// Page Imports
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import IncidentTracker from './pages/IncidentTracker';
import EmergencyContacts from './pages/EmergencyContacts';
import Resources from './pages/Resources';
import VolunteerApply from './pages/VolunteerApply';
import VolunteerDashboard from './pages/VolunteerDashboard';
import VolunteerTracker from './pages/VolunteerTracker';
import AdminDashboard from './pages/AdminDashboard';
import AdminIncidents from './pages/AdminIncidents';
import AdminUsers from './pages/AdminUsers';
import AdminVolunteers from './pages/AdminVolunteers';
import AdminResources from './pages/AdminResources';
import AdminRecommendations from './pages/AdminRecommendations';
import AdminClosures from './pages/AdminClosures';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import ResponderInfo from './pages/ResponderInfo';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-bg-overlay)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            },
          }}
        />
        <Routes>
          {/* Guest / Public Routes */}
          <Route
            path="/"
            element={
              <GuestRoute>
                <PublicLayout>
                  <Landing />
                </PublicLayout>
              </GuestRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <PublicLayout>
                  <Login />
                </PublicLayout>
              </GuestRoute>
            }
          />
          <Route
            path="/admin/login"
            element={
              <GuestRoute>
                <PublicLayout>
                  <Login />
                </PublicLayout>
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <PublicLayout>
                  <Register />
                </PublicLayout>
              </GuestRoute>
            }
          />
          <Route
            path="/responder-info"
            element={
              <GuestRoute>
                <PublicLayout>
                  <ResponderInfo />
                </PublicLayout>
              </GuestRoute>
            }
          />

          {/* Woman (User) Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['woman']}>
                <UserLayout>
                  <Dashboard />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sos/tracker"
            element={
              <ProtectedRoute allowedRoles={['woman']}>
                <UserLayout>
                  <IncidentTracker />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute allowedRoles={['woman']}>
                <UserLayout>
                  <EmergencyContacts />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute allowedRoles={['woman']}>
                <UserLayout>
                  <VolunteerApply />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['woman']}>
                <UserLayout>
                  <Settings />
                </UserLayout>
              </ProtectedRoute>
            }
          />

          {/* Shared Protected Routes (Both Woman & Volunteer) */}
          <Route
            path="/resources/*"
            element={
              <ProtectedRoute allowedRoles={['woman', 'volunteer']}>
                <Routes>
                  {/* Dynamically choose layout wrapper based on active role guard */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute allowedRoles={['woman']}>
                        <UserLayout>
                          <Resources />
                        </UserLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/volunteer"
                    element={
                      <ProtectedRoute allowedRoles={['volunteer']}>
                        <VolunteerLayout>
                          <Resources />
                        </VolunteerLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </ProtectedRoute>
            }
          />
          {/* Simple redirect helper to resolve layout for resources path */}
          <Route
            path="/resources-redirect"
            element={
              <ProtectedRoute allowedRoles={['woman', 'volunteer']}>
                <ResourcesRedirector />
              </ProtectedRoute>
            }
          />

          {/* Volunteer Responder Protected Routes */}
          <Route
            path="/volunteer"
            element={
              <ProtectedRoute allowedRoles={['volunteer']}>
                <VolunteerLayout>
                  <VolunteerDashboard />
                </VolunteerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/volunteer/tracker"
            element={
              <ProtectedRoute allowedRoles={['volunteer']}>
                <VolunteerLayout>
                  <VolunteerTracker />
                </VolunteerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/volunteer/settings"
            element={
              <ProtectedRoute allowedRoles={['volunteer']}>
                <VolunteerLayout>
                  <Settings />
                </VolunteerLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/incidents"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminIncidents />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminUsers />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/volunteers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminVolunteers />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/resources"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminResources />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/resources/recommendations"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminRecommendations />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/resources/closures"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminClosures />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 Route */}
          <Route
            path="/404"
            element={
              <PublicLayout>
                <NotFound />
              </PublicLayout>
            }
          />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

// Redirect Helper Component for shared resources route
const ResourcesRedirector = () => {
  const { user } = useAuth();
  if (user?.role === 'volunteer') {
    return <Navigate to="/resources/volunteer" replace />;
  }
  return <Navigate to="/resources" replace />;
};

export default App;
