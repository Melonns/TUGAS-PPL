import React, { useState } from 'react';
import { BookOpen, LogOut, Menu, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleConfirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('active_role');
    localStorage.removeItem('nama_lengkap');
    localStorage.removeItem('foto');
    localStorage.removeItem('permissions');
    localStorage.removeItem('must_change_password');
    navigate('/login', { state: { loggedOut: true } });
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  return (
    <nav className="nav-shell">
      <div className="nav-shellInner">
        <div className="nav-brand">
          <div className="nav-brandIcon">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="nav-brandTitle">InternHub</div>
            <div className="nav-brandSub">Logbook and internship workspace</div>
          </div>
        </div>

        <div className="nav-actions">
          <span className="nav-user">{user.nama || 'User'}</span>
          <button
            onClick={handleLogoutClick}
            className="nav-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <button onClick={() => setOpen(!open)} className="nav-menuButton">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="nav-mobileMenu">
          <div className="nav-mobileActions">
            <span className="nav-mobileUser">{user.nama || 'User'}</span>
            <button
              onClick={handleLogoutClick}
              className="nav-logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(event) => event.stopPropagation()}
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
    </nav>
  );
}
