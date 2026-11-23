import React, { useState } from 'react';
import {
  Database,
  Calendar,
  BookOpen,
  LogIn,
  LogOut,
  KeyRound,
  UserCheck,
  ClipboardCheck,
} from 'lucide-react';
import { SupabaseConfig } from '../services/storage';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  supabaseConfig?: SupabaseConfig;
  mongoConfig?: SupabaseConfig;
  onOpenSupabaseModal?: () => void;
  onOpenMongoModal?: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  supabaseConfig,
  mongoConfig,
  onOpenSupabaseModal,
  onOpenMongoModal,
}) => {
  const {
    isAuthenticated,
    isAdmin,
    isPetugas,
    logout,
    openLoginModal,
    openChangePasswordModal,
  } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const config = supabaseConfig ||
    mongoConfig || {
      url: '',
      anonKey: '',
      status: 'offline_sync',
      lastSyncedAt: '',
    };

  const handleOpen = onOpenSupabaseModal || onOpenMongoModal || (() => {});

  const currentDateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const isConnected = config.status === 'connected';

  const roleSubtitle = isAdmin
    ? 'Administrator · Akses Penuh'
    : isPetugas
    ? 'Pengisi Absensi · Akses Beranda'
    : 'Mode Tamu · Lihat Saja';

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-5 h-5 text-emerald-50" />
            </div>
            <div className="min-w-0">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white block leading-tight whitespace-nowrap">
                absensi-on
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block truncate">
                {roleSubtitle}
              </span>
            </div>
          </div>

          {/* Date, Theme Toggle, Role Actions & Database Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Tanggal Hari Ini */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 px-2 py-1.5 whitespace-nowrap shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{currentDateStr}</span>
            </div>

            {/* Pengaturan Tema Terang / Gelap */}
            <ThemeToggle showLabel={false} />

            {/* Supabase Online Button (Hanya Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpen}
                title={isConnected ? 'Database Aktif & Tersinkronisasi' : 'Pengaturan Database'}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                  isConnected
                    ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                    : 'border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                }`}
              >
                <Database
                  className={`w-3.5 h-3.5 ${
                    isConnected
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                />
                <span className="hidden sm:inline">
                  {isConnected ? 'Database Aktif' : 'Database'}
                </span>
              </button>
            )}

            {/* Profile / Login Controls */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
                  title={isAdmin ? 'Menu Akun Admin' : 'Menu Akun Pengisi Absensi'}
                >
                  {isAdmin ? (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>{isAdmin ? 'Admin' : 'Petugas'}</span>
                </button>

                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {isAdmin ? 'Administrator' : 'Pengisi Absensi'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {isAdmin
                            ? 'Hak Akses Penuh Sistem'
                            : 'Hanya Input Presensi Beranda'}
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfileMenu(false);
                            openChangePasswordModal();
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer text-left"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>Kelola Password Akun</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer text-left font-medium border-t border-slate-100 dark:border-slate-800"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openLoginModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-2xs active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Login untuk mengisi absensi atau mengakses menu admin"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
