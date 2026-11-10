import React, { useState } from 'react';
import { Database, Calendar, BookOpen, ShieldCheck, LogIn, LogOut, KeyRound, UserCheck } from 'lucide-react';
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
  onOpenMongoModal 
}) => {
  const { isAdmin, logout, openLoginModal, openChangePasswordModal } = useAuth();
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const config = supabaseConfig || mongoConfig || {
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

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
              <BookOpen className="w-5 h-5 text-emerald-50" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white block leading-tight">
                  absensi-on
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Mode Tamu
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Sistem Absensi Guru Mengajar & Tahfidz
              </span>
            </div>
          </div>

          {/* Date, Theme Toggle, Admin Actions & Database Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Tanggal Hari Ini */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{currentDateStr}</span>
            </div>

            {/* Pengaturan Tema Terang / Gelap */}
            <ThemeToggle showLabel={false} />

            {/* Supabase Online Indicator Button (Hanya tampil untuk Admin) */}
            {isAdmin && (
              <button
                onClick={handleOpen}
                title={isConnected ? 'Database Aktif & Tersinkronisasi Otomatis' : 'Pengaturan Database'}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors shrink-0 shadow-2xs cursor-pointer ${
                  isConnected
                    ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                    : 'border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                }`}
              >
                <Database className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`} />
                <span className="hidden sm:inline">
                  {isConnected ? 'Database Aktif' : 'Database'}
                </span>
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}></span>
              </button>
            )}

            {/* Admin Profile / Login Controls */}
            {isAdmin ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  title="Menu Akun Admin"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">Admin</span>
                </button>

                {showAdminMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowAdminMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Administrator</p>
                        <p className="text-[10px] text-slate-400 truncate">Hak Akses Penuh Sistem</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          openChangePasswordModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer text-left"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Ganti Password</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer text-left font-medium border-t border-slate-100 dark:border-slate-800"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-2xs active:scale-95 transition cursor-pointer"
                title="Login Admin untuk mengakses Jadwal, Rekap, dan Hari Libur"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
