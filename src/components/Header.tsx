import React from 'react';
import { Database, Calendar, BookOpen } from 'lucide-react';
import { SupabaseConfig } from '../services/storage';
import { ThemeToggle } from './ThemeToggle';

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
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white block leading-tight">
                absensi-on
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Sistem Absensi Guru Mengajar & Tahfidz
              </span>
            </div>
          </div>

          {/* Date, Theme Toggle & Database Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Tanggal Hari Ini */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{currentDateStr}</span>
            </div>

            {/* Pengaturan Tema Terang / Gelap */}
            <ThemeToggle showLabel={false} />

            {/* Supabase Online Indicator Button */}
            <button
              onClick={handleOpen}
              title={isConnected ? 'Database Supabase Online Terhubung' : 'Supabase Belum Terhubung (Klik untuk Menghubungkan)'}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors shrink-0 shadow-2xs cursor-pointer ${
                isConnected
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                  : 'border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`} />
              <span className="hidden sm:inline">
                {isConnected ? 'Supabase Terhubung' : 'Hubungkan Supabase'}
              </span>
              <span className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
