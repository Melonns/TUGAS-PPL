import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const getHomeByRole = (role) => {
  const value = String(role || '').toLowerCase();
  if (value === 'mentor') return '/mentor/logbook';
  if (value === 'admin') return '/admin/logbook';
  return '/magang/logbook';
};

const isKnownRole = (role) => {
  const value = String(role || '').toLowerCase();
  return value === 'intern' || value === 'mentor' || value === 'admin';
};

const ProtectedRoute = ({ requiredRole, layout: Layout }) => {
  const token = localStorage.getItem('token');
  const userRole = String(localStorage.getItem('role') || '').toLowerCase();
  const mustChangePassword = localStorage.getItem('must_change_password') === 'true';
  const currentPath = window.location.pathname;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && !currentPath.includes('/force-change-password')) {
    return <Navigate to="/login" replace />;
  }

  if (!isKnownRole(userRole)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('active_role');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== String(requiredRole).toLowerCase()) {
    return <Navigate to={getHomeByRole(userRole)} replace />;
  }

  return Layout ? (
    <Layout>
      <Outlet />
    </Layout>
  ) : (
    <Outlet />
  );
};

export default ProtectedRoute;
