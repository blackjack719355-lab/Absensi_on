import React from 'react';
import { Database, Calendar, Sparkles, BookOpen } from 'lucide-react';
import { MongoConfig } from '../services/storage';

interface HeaderProps {
  mongoConfig: MongoConfig;
  onOpenMongoModal: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ mongoConfig, onOpenMongoModal }) => {
  const currentDateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Wordmark (Single Element as per Top Bar contract) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <BookOpen className="w-5 h-5 text-emerald-50" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                absensi-on
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Sistem Absensi Guru Mengajar & Tahfidz
              </span>
            </div>
          </div>

          {/* Date & System Status */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDateStr}</span>
            </div>

            {/* MongoDB Online Indicator Button */}
            <button
              onClick={onOpenMongoModal}
              title="Status Database MongoDB Online"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70 transition-colors shrink-0"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">MongoDB Online</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
