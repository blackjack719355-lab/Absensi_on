import React from 'react';
import { Home, CalendarDays, BarChart3, FileSpreadsheet, CalendarOff } from 'lucide-react';

export type NavTab = 'beranda' | 'jadwal' | 'rekap-bulanan' | 'laporan-tahunan' | 'hari-libur';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'beranda' as NavTab, label: 'Beranda', icon: Home },
    { id: 'jadwal' as NavTab, label: 'Jadwal', icon: CalendarDays },
    { id: 'rekap-bulanan' as NavTab, label: 'Rekap Bulanan', icon: BarChart3 },
    { id: 'laporan-tahunan' as NavTab, label: 'Laporan Tahunan', icon: FileSpreadsheet },
    { id: 'hari-libur' as NavTab, label: 'Hari Libur', icon: CalendarOff },
  ];

  return (
    <>
      {/* Desktop / Tablet Subheader Navigation (Disembunyikan pada mode mobile) */}
      <nav className="hidden md:block bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Fixed Navigation Bar for Seamless Mobile Experience */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium transition active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-emerald-700 font-bold bg-emerald-50/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 transition-transform ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400'}`} />
                <span className="truncate max-w-[62px] text-center leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
