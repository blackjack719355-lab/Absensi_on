import React, { useState } from 'react';
import { CalendarOff, Plus, Trash2, Edit3, X, AlertCircle, CheckCircle2, Calendar, ShieldAlert } from 'lucide-react';
import { HolidayItem, HolidayScope } from '../types';
import { storage } from '../services/storage';

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
    scope: 'Untuk Semuanya' as HolidayScope,
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
      scope: 'Untuk Semuanya',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (h: HolidayItem) => {
    setEditingHoliday(h);
    setFormData({
      title: h.title,
      type: h.type === 'range' ? 'range' : 'single',
      startDate: h.startDate,
      endDate: h.endDate || h.startDate,
      scope: h.scope,
      description: h.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      return;
    }

    if (formData.type === 'range' && formData.endDate < formData.startDate) {
      return;
    }

    if (editingHoliday) {
      storage.updateHoliday(editingHoliday.id, {
        title: formData.title,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.type === 'range' ? formData.endDate : undefined,
        scope: formData.scope,
        description: formData.description,
      });
    } else {
      storage.addHoliday({
        title: formData.title,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.type === 'range' ? formData.endDate : undefined,
        scope: formData.scope,
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
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
              <CalendarOff className="w-3.5 h-3.5" />
              <span>Kalender Akademik</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Pengaturan Hari Libur
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Atur libur tanggal tunggal (1 hari) maupun rentang tanggal dengan pilihan target libur (Mengajar Saja, Tahfidz Pagi Saja, Tahfidz Sore Saja, atau Untuk Semuanya).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Hari Libur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bagian 1: Libur Pekanan Otomatis (Hasil Analisis Jadwal) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Libur Pekanan Otomatis (Dari Jadwal)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ditandai otomatis oleh sistem karena tidak terdapat sesi mengajar atau tahfidz pada hari tersebut.
            </p>
          </div>
        </div>

        {weeklyHolidays.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Seluruh hari dalam sepekan (Senin s.d. Ahad) memiliki jadwal terisi. Tidak ada libur pekanan otomatis.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-4">
            {weeklyHolidays.map(hol => (
              <div
                key={hol.id}
                className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Hari {hol.dayOfWeek}
                  </h4>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    Libur Pekanan Rutin
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cakupan: <strong className="text-slate-700">{hol.scope}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bagian 2: Libur Khusus / Nasional (Single Date & Rentang Tanggal) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Daftar Libur Khusus & Rentang Tanggal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Libur kegiatan khusus, hari besar nasional, tasmi akbar, atau perayaan sekolah.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {customHolidays.length} Hari Libur Terdaftar
          </span>
        </div>

        {customHolidays.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarOff className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Belum ada hari libur khusus yang ditambahkan</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik tombol "Tambah Hari Libur" di atas untuk menambahkan libur 1 hari atau rentang tanggal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium bg-slate-50/70">
                  <th className="py-3 px-3.5">Nama Hari Libur</th>
                  <th className="py-3 px-3.5">Bentuk Libur</th>
                  <th className="py-3 px-3.5">Tanggal / Periode</th>
                  <th className="py-3 px-3.5">Cakupan Libur</th>
                  <th className="py-3 px-3.5">Keterangan</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customHolidays.map(hol => (
                  <tr key={hol.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                      {hol.title}
                    </td>

                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="text-xs text-slate-600 font-medium">
                        {hol.type === 'range' ? 'Rentang Tanggal' : '1 Hari'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {hol.type === 'range' && hol.endDate
                        ? `${hol.startDate} s.d. ${hol.endDate}`
                        : hol.startDate}
                    </td>

                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                          hol.scope === 'Untuk Semuanya'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : hol.scope === 'Mengajar Saja'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : hol.scope === 'Tahfidz Pagi Saja'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {hol.scope}
                      </span>
                    </td>

                    <td className="py-3.5 px-3.5 text-slate-600">
                      {hol.description || '-'}
                    </td>

                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(hol)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Libur"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(hol.id, hol.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Libur"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT HARI LIBUR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {editingHoliday ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="py-4 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Hari Libur</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tasmi Akbar Santri / Libur Nasional"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              {/* Pilihan Bentuk Libur: 1 Hari vs Rentang Tanggal */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Bentuk Libur</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'single' })}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition ${
                      formData.type === 'single'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    1 Hari (Tanggal Tunggal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'range' })}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition ${
                      formData.type === 'range'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Rentang Tanggal (Beberapa Hari)
                  </button>
                </div>
              </div>

              {/* Tanggal */}
              {formData.type === 'single' ? (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Tanggal Libur</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* PILIHAN LIBUR SESUAI SPESIFIKASI:
                  "pilihan libur untuk mengajar saja, tahfidz pagi saja, tahfidz sore saja atau untuk semuanya" */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Cakupan / Target Libur
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Untuk Semuanya',
                    'Mengajar Saja',
                    'Tahfidz Pagi Saja',
                    'Tahfidz Sore Saja',
                  ].map(option => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                        formData.scope === option
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={formData.scope === option}
                        onChange={() => setFormData({ ...formData, scope: option as HolidayScope })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Keterangan / Alasan</label>
                <input
                  type="text"
                  placeholder="Misal: Peringatan Hari Santri Nasional"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Hari Libur
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus data libur <strong className="text-slate-900">{deleteTarget.title}</strong>?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
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

