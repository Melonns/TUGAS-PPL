import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import GuestRoute from './Layout/GuestRoute';
import AuthLayout from './Layout/AuthLayout';
import ProtectedRoute from './Layout/ProtectedRoute';
import MagangLayout from './Layout/MagangLayout';
import MentorLayout from './Layout/MentorLayout';
import AdminLayout from './Layout/AdminLayout';

const Login = lazy(() => import('./pages/Login'));
const MagangLogbook = lazy(() => import('./pages/Magang/Logbook'));
const MentorLogbook = lazy(() => import('./pages/Mentor/Logbook'));
const AdminLogbook = lazy(() => import('./pages/Admin/Logbook'));

export default function App() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-semibold text-slate-600">Loading...</div>}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute requiredRole="intern" layout={MagangLayout} />}>
          <Route path="/magang/logbook" element={<MagangLogbook />} />
        </Route>

        <Route element={<ProtectedRoute requiredRole="mentor" layout={MentorLayout} />}>
          <Route path="/mentor/logbook" element={<MentorLogbook />} />
        </Route>

        <Route element={<ProtectedRoute requiredRole="admin" layout={AdminLayout} />}>
          <Route path="/admin/logbook" element={<AdminLogbook />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}