import React from 'react';
import {
  Home,
  CalendarDays,
  BarChart3,
  FileSpreadsheet,
  CalendarOff,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'beranda' | 'jadwal' | 'rekap-bulanan' | 'laporan-tahunan' | 'hari-libur';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const { isAdmin, isPetugas, isAuthenticated, openLoginModal, logout } = useAuth();

  const allTabs = [
    { id: 'beranda' as NavTab, label: 'Beranda', icon: Home },
    { id: 'jadwal' as NavTab, label: 'Jadwal', icon: CalendarDays },
    { id: 'rekap-bulanan' as NavTab, label: 'Rekap Bulanan', icon: BarChart3 },
    { id: 'laporan-tahunan' as NavTab, label: 'Laporan Tahunan', icon: FileSpreadsheet },
    { id: 'hari-libur' as NavTab, label: 'Hari Libur', icon: CalendarOff },
  ];

  // Hanya Admin yang melihat seluruh menu; Pengisi Absensi & Tamu hanya mengakses Beranda
  const visibleTabs = isAdmin ? allTabs : allTabs.filter((t) => t.id === 'beranda');

  return (
    <>
      {/* Desktop / Tablet Subheader Navigation */}
      <nav className="hidden md:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 gap-4">
            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {!isAuthenticated && (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                <span>Mode Lihat Saja</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  Login untuk Mengisi Absensi
                </button>
              </div>
            )}

            {isPetugas && (
              <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                Akses Pengisi Absensi · Hanya Menu Beranda
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 z-40 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] transition-colors duration-150">
        <div
          className={`grid gap-1 mx-auto ${
            isAdmin ? 'grid-cols-5 max-w-md' : 'grid-cols-2 max-w-xs'
          }`}
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium transition active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/80 dark:bg-emerald-950/60'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mb-1 transition-transform ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 scale-110'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate max-w-[68px] text-center leading-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {!isAuthenticated && (
            <button
              type="button"
              onClick={openLoginModal}
              className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4 mb-1 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate max-w-[68px] text-center leading-tight font-semibold">
                Login
              </span>
            </button>
          )}

          {isPetugas && (
            <button
              type="button"
              onClick={logout}
              className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/40 transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mb-1 text-rose-500" />
              <span className="truncate max-w-[68px] text-center leading-tight font-semibold">
                Keluar
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
