import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function roleLabel(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'mentor') return 'Dosen Pembimbing';
  if (value === 'admin') return 'Admin';
  return 'Mahasiswa';
}

function getRoleHome(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'mentor') return '/mentor/logbook';
  if (value === 'admin') return '/admin/logbook';
  return '/magang/logbook';
}

export default function RoleLayout({ role, children }) {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const activeRole = String(localStorage.getItem('role') || role || 'intern').toLowerCase();

  const handleConfirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('active_role');
    localStorage.removeItem('nama_lengkap');
    localStorage.removeItem('foto');
    localStorage.removeItem('permissions');
    localStorage.removeItem('must_change_password');
    navigate('/login', { replace: true });
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#27345A] text-white shadow-lg shadow-slate-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-[#27345A]">InternHub</div>
              <div className="text-xs text-slate-500">{roleLabel(activeRole)} Workspace</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-800">{user.nama || 'User'}</div>
              <div className="text-xs text-slate-500">{roleLabel(activeRole)}</div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-none p-0 pt-20 sm:p-0 sm:pt-20">
        {children || <Outlet />}
      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative"
            >
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <LogOut className="text-red-500" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sign Out</h3>
              <p className="text-sm text-slate-500 mb-6">Are you sure you want to sign out of your account?</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutModal(false)} 
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                >
                  Yes, Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
