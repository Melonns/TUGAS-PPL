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

export default function GuestRoute() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (token) {
    if (!isKnownRole(role)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('active_role');
      return <Navigate to="/login" replace />;
    }

    return <Navigate to={getHomeByRole(role)} replace />;
  }

  return <Outlet />;
}
