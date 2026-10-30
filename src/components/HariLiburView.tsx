import React, { useState } from 'react';
import { 
  CalendarOff, Plus, Trash2, Edit3, X, AlertCircle, CheckCircle2, 
  Calendar, BookOpen, Sparkles, Sun, Sunset, Check, Layers
} from 'lucide-react';
import { HolidayItem, HolidayScope, HolidaySessionType } from '../types';
import { storage, getHolidaySessions, formatHolidayScopeTitle } from '../services/storage';

interface HariLiburViewProps {
  holidays: HolidayItem[];
  onRefreshData: () => void;
}

export const HariLiburView: React.FC<HariLiburViewProps> = ({
  holidays,
  onRefreshData,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'single' as 'single' | 'range',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    selectedSessions: ['mengajar', 'tahfidz_pagi', 'tahfidz_sore'] as HolidaySessionType[],
    description: '',
  });

  const weeklyHolidays = holidays.filter(h => h.isAutomaticWeekly);
  const customHolidays = holidays.filter(h => !h.isAutomaticWeekly);

  const handleOpenAddModal = () => {
    setEditingHoliday(null);
    setFormData({
      title: '',
      type: 'single',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      selectedSessions: ['mengajar', 'tahfidz_pagi', 'tahfidz_sore'],
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (h: HolidayItem) => {
    setEditingHoliday(h);
    const sessions = getHolidaySessions(h);
    setFormData({
      title: h.title,
      type: h.type === 'range' ? 'range' : 'single',
      startDate: h.startDate,
      endDate: h.endDate || h.startDate,
      selectedSessions: sessions,
      description: h.description || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleSession = (session: HolidaySessionType) => {
    setFormData(prev => {
      const exists = prev.selectedSessions.includes(session);
      let updated: HolidaySessionType[];
      if (exists) {
        // Jangan biarkan kosong sama sekali
        if (prev.selectedSessions.length === 1) return prev;
        updated = prev.selectedSessions.filter(s => s !== session);
      } else {
        updated = [...prev.selectedSessions, session];
      }
      return { ...prev, selectedSessions: updated };
    });
  };

  const handleApplyPreset = (sessions: HolidaySessionType[]) => {
    setFormData(prev => ({ ...prev, selectedSessions: sessions }));
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return;
    }

    if (formData.selectedSessions.length === 0) {
      alert('Pilih minimal satu sesi yang diliburkan!');
      return;
    }

    if (formData.type === 'range' && formData.endDate < formData.startDate) {
      return;
    }

    const scope = formatHolidayScopeTitle(formData.selectedSessions);

    if (editingHoliday) {
      storage.updateHoliday(editingHoliday.id, {
        title: formData.title,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.type === 'range' ? formData.endDate : undefined,
        scope,
        sessions: formData.selectedSessions,
        description: formData.description,
      });
    } else {
      storage.addHoliday({
        title: formData.title,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.type === 'range' ? formData.endDate : undefined,
        scope,
        sessions: formData.selectedSessions,
        description: formData.description,
      });
    }

    onRefreshData();
    setIsModalOpen(false);
  };

  const handleDeleteHoliday = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    storage.deleteHoliday(deleteTarget.id);
    onRefreshData();
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Action Toolbar (Tanpa Banner Hero) */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Total <strong>{holidays.length}</strong> Agenda Libur Terdaftar
        </span>

        <button
          onClick={handleOpenAddModal}
          className="px-3.5 py-2 text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Hari Libur</span>
        </button>
      </div>

      {/* Bagian 1: Libur Pekanan Otomatis (Hasil Analisis Jadwal) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Libur Pekanan Otomatis (Dari Jadwal)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ditandai otomatis oleh sistem jika tidak ada jadwal mengajar atau tahfidz pada hari tersebut.
            </p>
          </div>
        </div>

        {weeklyHolidays.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Seluruh hari dalam sepekan (Senin s.d. Ahad) memiliki jadwal terisi. Tidak ada libur pekanan otomatis.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-4">
            {weeklyHolidays.map(hol => (
              <div
                key={hol.id}
                className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Hari {hol.dayOfWeek}
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-400 font-medium mt-0.5">
                    Libur Pekanan Rutin
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Cakupan: <strong className="text-slate-700 dark:text-slate-200">{hol.scope}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bagian 2: Libur Khusus / Nasional (Single Date & Rentang Tanggal) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Daftar Libur Khusus & Rentang Tanggal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Libur kegiatan khusus, hari besar nasional, tasmi akbar, atau perayaan sekolah.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            {customHolidays.length} Hari Libur Terdaftar
          </span>
        </div>

        {customHolidays.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarOff className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum ada hari libur khusus yang ditambahkan</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Klik tombol "Tambah Hari Libur" di atas untuk menambahkan libur 1 hari atau rentang tanggal.
            </p>
          </div>
        ) : (
          <>
            {/* TAMPILAN KHUSUS MOBILE (sm:hidden) - Desain kartu rapi tanpa scrollbar */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
              {customHolidays.map(hol => {
                const sessions = getHolidaySessions(hol);
                const hasMengajar = sessions.includes('mengajar');
                const hasTahfidzPagi = sessions.includes('tahfidz_pagi');
                const hasTahfidzSore = sessions.includes('tahfidz_sore');
                const isAll = sessions.length === 3;

                return (
                  <div key={hol.id} className="p-3.5 space-y-2.5 bg-white dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {hol.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>
                            {hol.type === 'range' && hol.endDate
                              ? `${hol.startDate} s.d. ${hol.endDate}`
                              : hol.startDate}
                          </span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                            {hol.type === 'range' ? 'Rentang' : '1 Hari'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditModal(hol)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Edit Libur"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(hol.id, hol.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Hapus Libur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Badges Cakupan Libur */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {isAll ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Semua Sesi Libur
                        </span>
                      ) : (
                        <>
                          {hasMengajar && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Mengajar Libur
                            </span>
                          )}
                          {hasTahfidzPagi && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              Tahfidz Pagi Libur
                            </span>
                          )}
                          {hasTahfidzSore && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Tahfidz Sore Libur
                            </span>
                          )}
                          {/* Indikator Tetap Masuk */}
                          {!hasTahfidzSore && (hasTahfidzPagi || hasMengajar) && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Tahfidz Sore Tetap Masuk
                            </span>
                          )}
                          {!hasTahfidzPagi && hasTahfidzSore && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Tahfidz Pagi Tetap Masuk
                            </span>
                          )}
                          {!hasMengajar && (hasTahfidzPagi || hasTahfidzSore) && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Mengajar Tetap Masuk
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {hol.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                        {hol.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TAMPILAN TABEL TABLET & DESKTOP (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium bg-slate-50/70 dark:bg-slate-800/60">
                    <th className="py-3 px-3.5">Nama Hari Libur</th>
                    <th className="py-3 px-3.5">Bentuk Libur</th>
                    <th className="py-3 px-3.5">Tanggal / Periode</th>
                    <th className="py-3 px-3.5">Cakupan Sesi Libur & Tetap Masuk</th>
                    <th className="py-3 px-3.5">Keterangan</th>
                    <th className="py-3 px-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customHolidays.map(hol => {
                    const sessions = getHolidaySessions(hol);
                    const hasMengajar = sessions.includes('mengajar');
                    const hasTahfidzPagi = sessions.includes('tahfidz_pagi');
                    const hasTahfidzSore = sessions.includes('tahfidz_sore');
                    const isAll = sessions.length === 3;

                    return (
                      <tr key={hol.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {hol.title}
                        </td>

                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {hol.type === 'range' ? 'Rentang Tanggal' : '1 Hari'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3.5 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {hol.type === 'range' && hol.endDate
                            ? `${hol.startDate} s.d. ${hol.endDate}`
                            : hol.startDate}
                        </td>

                        <td className="py-3.5 px-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isAll ? (
                              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Semua Sesi Libur
                              </span>
                            ) : (
                              <>
                                {hasMengajar && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    Mengajar Libur
                                  </span>
                                )}
                                {hasTahfidzPagi && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                    Tahfidz Pagi Libur
                                  </span>
                                )}
                                {hasTahfidzSore && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Tahfidz Sore Libur
                                  </span>
                                )}
                                {!hasTahfidzSore && (hasTahfidzPagi || hasMengajar) && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Tahfidz Sore Masuk
                                  </span>
                                )}
                                {!hasTahfidzPagi && hasTahfidzSore && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Tahfidz Pagi Masuk
                                  </span>
                                )}
                                {!hasMengajar && (hasTahfidzPagi || hasTahfidzSore) && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Mengajar Masuk
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3.5 text-slate-600 dark:text-slate-400">
                          {hol.description || '-'}
                        </td>

                        <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(hol)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Edit Libur"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHoliday(hol.id, hol.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title="Hapus Libur"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT HARI LIBUR DENGAN DUKUNGAN MULTI-SESI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 my-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <CalendarOff className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingHoliday ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="py-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Hari Libur</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tasmi Akbar / Libur Khusus Santri"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                />
              </div>

              {/* Pilihan Bentuk Libur: 1 Hari vs Rentang Tanggal */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bentuk Libur</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'single' })}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition cursor-pointer ${
                      formData.type === 'single'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    1 Hari (Tanggal Tunggal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'range' })}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition cursor-pointer ${
                      formData.type === 'range'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Rentang Tanggal (Beberapa Hari)
                  </button>
                </div>
              </div>

              {/* Tanggal */}
              {formData.type === 'single' ? (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tanggal Libur</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* PILIHAN SESI YANG DILIBURKAN: MULTI-CHECKBOX & TOMBOL PINTAS */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 dark:text-slate-200 font-bold">
                    Pilih Sesi yang Diliburkan
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    (Bisa pilih lebih dari 1 sesi)
                  </span>
                </div>

                {/* Preset Kombinasi Populer */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(['mengajar', 'tahfidz_pagi', 'tahfidz_sore'])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                  >
                    Semua Sesi Libur
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(['mengajar', 'tahfidz_pagi'])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Mengajar & Tahfidz Pagi Libur</span>
                    <span className="text-[9px] bg-emerald-700 dark:bg-emerald-600 text-white px-1 py-0.2 rounded font-mono">Sore Masuk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(['tahfidz_pagi', 'tahfidz_sore'])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800 transition cursor-pointer"
                  >
                    Tahfidz Pagi & Sore Libur
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(['mengajar'])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                  >
                    Hanya Mengajar Libur
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(['tahfidz_sore'])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Tahfidz Sore Saja Libur</span>
                    <span className="text-[9px] bg-amber-700 dark:bg-amber-600 text-white px-1 py-0.2 rounded font-mono">Pagi Masuk (1 Jam)</span>
                  </button>
                </div>

                {/* 3 Interactive Multi-Select Checkbox Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* 1. Sesi Mengajar */}
                  <div
                    onClick={() => handleToggleSession('mengajar')}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 ${
                      formData.selectedSessions.includes('mengajar')
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        formData.selectedSessions.includes('mengajar')
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                      }`}>
                        {formData.selectedSessions.includes('mengajar') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <BookOpen className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Mengajar</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 sm:mt-1">
                      Jam KBM / Sekolah
                    </span>
                  </div>

                  {/* 2. Sesi Tahfidz Pagi */}
                  <div
                    onClick={() => handleToggleSession('tahfidz_pagi')}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 ${
                      formData.selectedSessions.includes('tahfidz_pagi')
                        ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        formData.selectedSessions.includes('tahfidz_pagi')
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                      }`}>
                        {formData.selectedSessions.includes('tahfidz_pagi') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Sun className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                        <span>Tahfidz Pagi</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 sm:mt-1">
                      Sesi Subuh / Pagi
                    </span>
                  </div>

                  {/* 3. Sesi Tahfidz Sore */}
                  <div
                    onClick={() => handleToggleSession('tahfidz_sore')}
                    className={`p-3 rounded-xl border-2 transition cursor-pointer flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 ${
                      formData.selectedSessions.includes('tahfidz_sore')
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        formData.selectedSessions.includes('tahfidz_sore')
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                      }`}>
                        {formData.selectedSessions.includes('tahfidz_sore') && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Sunset className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>Tahfidz Sore</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 sm:mt-1">
                      Sesi Ashar / Sore
                    </span>
                  </div>
                </div>

                {/* Status Ringkasan Pratinjau Real-Time */}
                <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Status Libur & Masuk:</span>
                  </div>

                  {/* List yang Libur */}
                  <div className="flex flex-wrap items-center gap-1.5 text-rose-900 dark:text-rose-300 font-medium">
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                      Diliburkan:
                    </span>
                    {formData.selectedSessions.includes('mengajar') && (
                      <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        Mengajar (KBM)
                      </span>
                    )}
                    {formData.selectedSessions.includes('tahfidz_pagi') && (
                      <span className="bg-teal-100 dark:bg-teal-900/50 text-teal-900 dark:text-teal-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        Tahfidz Pagi
                      </span>
                    )}
                    {formData.selectedSessions.includes('tahfidz_sore') && (
                      <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        Tahfidz Sore
                      </span>
                    )}
                  </div>

                  {/* List yang Tetap Masuk jika ada */}
                  {formData.selectedSessions.length < 3 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-medium pt-0.5">
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                        Tetap Masuk:
                      </span>
                      {!formData.selectedSessions.includes('mengajar') && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          Mengajar
                        </span>
                      )}
                      {!formData.selectedSessions.includes('tahfidz_pagi') && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          Tahfidz Pagi
                        </span>
                      )}
                      {!formData.selectedSessions.includes('tahfidz_sore') && (
                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          Tahfidz Sore
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Keterangan / Alasan</label>
                <input
                  type="text"
                  placeholder="Misal: Tasmi Santri Pagi Hari / Rapat Guru"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 dark:bg-emerald-600 rounded-xl hover:bg-emerald-800 dark:hover:bg-emerald-500 transition shadow-xs cursor-pointer active:scale-95"
                >
                  {editingHoliday ? 'Perbarui Hari Libur' : 'Simpan Hari Libur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS HARI LIBUR */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Hapus Hari Libur
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus data libur <strong className="text-slate-900 dark:text-white">{deleteTarget.title}</strong>?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

