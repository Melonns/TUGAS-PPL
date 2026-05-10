import React from 'react';
import { BookOpen, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
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
            onClick={handleLogout}
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
              onClick={handleLogout}
              className="nav-logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
