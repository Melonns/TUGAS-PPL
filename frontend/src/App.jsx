import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import MagangLogbook from './pages/Magang/Logbook';
import MentorLogbook from './pages/Mentor/Logbook';
import AdminLogbook from './pages/Admin/Logbook';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Selamat Datang</h1>
          <p className="text-gray-600 mb-4">
            Halo, <strong>{user.nama}</strong>! Silakan pilih menu di atas.
          </p>
          <p className="text-sm text-gray-500">Role: {user.role === 'mentor' ? 'Dosen Pembimbing' : 'Mahasiswa'}</p>
        </div>
      </div>
    </div>
  );
}

function LogbookWrapper({ Component }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-4">
        <Component />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/logbook"
          element={
            <ProtectedRoute>
              {LogbookWrapper({ Component: MagangLogbook })}
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor/logbook"
          element={
            <ProtectedRoute>
              {LogbookWrapper({ Component: MentorLogbook })}
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logbook"
          element={
            <ProtectedRoute>
              {LogbookWrapper({ Component: AdminLogbook })}
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}