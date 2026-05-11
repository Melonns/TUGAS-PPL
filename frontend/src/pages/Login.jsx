import React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, BookOpen, Eye, EyeOff, Lock, Loader2, User, CheckCircle2, X } from 'lucide-react';
import baseUrl from '../api/baseUrl';
import bgGedung from '../assets/backgroundLogin.jpeg';
import logoSier from '../assets/Logo1.png';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.loggedOut) {
      setShowLogoutSuccess(true);
      const timer = setTimeout(() => setShowLogoutSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [location.state]);

  const handleLoginSuccess = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user || {}));

    const storedRole = String(user?.role || user?.roles?.[0] || 'intern').toLowerCase();
    localStorage.setItem('role', storedRole);
    localStorage.setItem('active_role', storedRole);
    localStorage.setItem('nama_lengkap', user?.nama || user?.name || 'User');

    if (user?.foto) {
      localStorage.setItem('foto', user.foto);
    } else {
      localStorage.removeItem('foto');
    }

    if (user?.must_change_password) {
      localStorage.setItem('must_change_password', 'true');
    } else {
      localStorage.removeItem('must_change_password');
    }

    if (Array.isArray(user?.permissions)) {
      localStorage.setItem('permissions', JSON.stringify(user.permissions));
    }

    const nextPath = storedRole === 'mentor'
      ? '/mentor/logbook'
      : storedRole === 'admin'
        ? '/admin/logbook'
        : '/magang/logbook';

    navigate(nextPath, { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = identifier.trim().includes('@')
        ? { email: identifier.trim(), password }
        : { usercode: identifier.trim(), password };

      const response = await axios.post(`${baseUrl}/login`, payload);

      if (response.data.success) {
        const token = response.data.data?.token || response.data.token;
        const user = response.data.data?.user || response.data.user || response.data.data || {};
        handleLoginSuccess(token, user);
      } else {
        setError(response.data.message || 'Login gagal');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {showLogoutSuccess && (
        <div className="fixed right-6 top-6 z-[100] animate-in slide-in-from-right duration-300">
          <div className="flex min-w-[300px] items-start gap-3 rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-lg">
            <div className="mt-0.5 text-emerald-500">
              <CheckCircle2 size={22} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-800">Success</h3>
              <p className="mt-1 text-xs text-slate-500">You have successfully logged out.</p>
            </div>
            <button
              onClick={() => setShowLogoutSuccess(false)}
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="auth-hero">
        <img src={bgGedung} alt="InternHub background" className="auth-heroImage" />
        <div className="auth-heroOverlay" />
        <div className="auth-heroContent">
          <div className="auth-badge">
            <BookOpen className="h-4 w-4" />
            PT SIER
          </div>
          <h2 className="auth-heroTitle">
            PT Surabaya Industrial Estate Rungkut (SIER)
          </h2>
          <p className="auth-heroText">
            Integrated Internship Attendance & Reporting System.
          </p>
        </div>
      </div>

      <div className="auth-formArea">
        <div className="auth-card">
          <div className="auth-cardTop">
            <img src={logoSier} alt="InternHub Logo" className="auth-logo" />
            <h1 className="auth-title">SIER Internship Program</h1>
            <p className="auth-subtitle">Sign in to access your dashboard.</p>
          </div>

          {error && (
            <div className="auth-alert">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <div>
              <label className="auth-fieldLabel">Email atau Usercode</label>
              <div className="auth-inputWrap">
                <User className="auth-inputIcon" size={20} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@company.com atau usercode"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="auth-fieldLabel" style={{ marginBottom: 0 }}>Password</label>
              </div>
              <div className="auth-inputWrap">
                <Lock className="auth-inputIcon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="auth-input"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="auth-passwordToggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-button"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="auth-testBox">
            <p className="auth-testTitle">Test Account:</p>
            <div>
              <p className="auth-testText"><strong>Mentor:</strong> mentor@test.com / password123</p>
              <p className="auth-testText"><strong>Mahasiswa:</strong> mahasiswa1@test.com / password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
