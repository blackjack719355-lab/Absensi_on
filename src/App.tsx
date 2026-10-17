/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { BerandaView } from './components/BerandaView';
import { JadwalView } from './components/JadwalView';
import { RekapBulananView } from './components/RekapBulananView';
import { LaporanTahunanView } from './components/LaporanTahunanView';
import { HariLiburView } from './components/HariLiburView';
import { MongoDbModal } from './components/MongoDbModal';
import { storage } from './services/storage';
import { Teacher, TeacherScheduleRow, HolidayItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('beranda');
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [mongoConfig, setMongoConfig] = useState(storage.getConfig());

  // Data state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<TeacherScheduleRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);

  const loadData = () => {
    setTeachers(storage.getTeachers());
    setSchedules(storage.getSchedules());
    setHolidays(storage.getHolidays());
    setMongoConfig(storage.getConfig());
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Utama */}
      <Header
        mongoConfig={mongoConfig}
        onOpenMongoModal={() => setIsMongoModalOpen(true)}
        activeTab={activeTab}
      />

      {/* Navigasi Menu */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Konten Utama */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-28 sm:py-8">
        {activeTab === 'beranda' && (
          <BerandaView
            teachers={teachers}
            schedules={schedules}
            holidays={holidays}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'jadwal' && (
          <JadwalView
            schedules={schedules}
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'rekap-bulanan' && (
          <RekapBulananView
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'laporan-tahunan' && (
          <LaporanTahunanView
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'hari-libur' && (
          <HariLiburView
            holidays={holidays}
            onRefreshData={loadData}
          />
        )}
      </main>

      {/* Modal MongoDB Online */}
      <MongoDbModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
        config={mongoConfig}
        onRefreshData={loadData}
      />

      {/* Footer Bersih & Elegan */}
      <footer className="border-t border-slate-200/80 bg-white py-6 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 absensi-on · Sistem Absensi Guru Mengajar & Tahfidz</p>
          <div className="flex items-center gap-4">
            <span>Didukung Database MongoDB Online</span>
            <span>·</span>
            <span>Ekspor & Impor Excel (.xlsx)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
