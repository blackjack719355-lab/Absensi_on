import React, { useState, useRef } from 'react';
import { 
  Upload, Download, Plus, Search, Trash2, Edit3, 
  X, FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { ImportScheduleResult, TeacherScheduleRow } from '../types';
import { downloadScheduleTemplate, parseScheduleExcel } from '../services/excelService';
import { storage } from '../services/storage';

interface JadwalViewProps {
  schedules: TeacherScheduleRow[];
  onRefreshData: () => void;
}

export const JadwalView: React.FC<JadwalViewProps> = ({
  schedules,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State untuk modal impor excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportScheduleResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State untuk modal konfirmasi hapus
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // State untuk modal tambah/edit manual
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TeacherScheduleRow | null>(null);
  const [formData, setFormData] = useState({
    teacherName: '',
    senin: 1,
    selasa: 1,
    rabu: 2,
    kamis: 3,
    jumat: 0,
    sabtu: 1,
    minggu: 2,
    tahfidzSenin: 2,
    tahfidzSelasa: 1,
    tahfidzRabu: 1,
    tahfidzKamis: 2,
    tahfidzJumat: 0,
    tahfidzSabtu: 2,
    tahfidzMinggu: 2,
  });

  const filteredSchedules = schedules.filter(item => {
    if (searchQuery.trim()) {
      return item.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Handle file select untuk import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportLoading(true);
    try {
      const result = await parseScheduleExcel(file);
      setImportPreview(result);
    } catch (err) {
      console.error(err);
      alert('Gagal membaca file Excel. Pastikan format file sesuai template.');
    } finally {
      setImportLoading(false);
    }
  };

  // Konfirmasi proses impor excel
  const handleConfirmImport = () => {
    if (!importPreview || importPreview.schedules.length === 0) return;

    storage.importSchedulesBatch(importPreview.schedules);
    onRefreshData();
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreview(null);
  };

  // Buka modal tambah manual
  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormData({
      teacherName: '',
      senin: 1,
      selasa: 1,
      rabu: 2,
      kamis: 3,
      jumat: 0,
      sabtu: 1,
      minggu: 2,
      tahfidzSenin: 2,
      tahfidzSelasa: 1,
      tahfidzRabu: 1,
      tahfidzKamis: 2,
      tahfidzJumat: 0,
      tahfidzSabtu: 2,
      tahfidzMinggu: 2,
    });
    setIsFormModalOpen(true);
  };

  // Buka modal edit manual
  const handleOpenEditModal = (sch: TeacherScheduleRow) => {
    setEditingSchedule(sch);
    setFormData({
      teacherName: sch.teacherName,
      senin: sch.senin,
      selasa: sch.selasa,
      rabu: sch.rabu,
      kamis: sch.kamis,
      jumat: sch.jumat,
      sabtu: sch.sabtu,
      minggu: sch.minggu,
      tahfidzSenin: sch.tahfidzSenin,
      tahfidzSelasa: sch.tahfidzSelasa,
      tahfidzRabu: sch.tahfidzRabu,
      tahfidzKamis: sch.tahfidzKamis,
      tahfidzJumat: sch.tahfidzJumat,
      tahfidzSabtu: sch.tahfidzSabtu,
      tahfidzMinggu: sch.tahfidzMinggu,
    });
    setIsFormModalOpen(true);
  };

  // Simpan form manual
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherName.trim()) {
      alert('Nama guru wajib diisi');
      return;
    }

    if (editingSchedule) {
      storage.updateSchedule(editingSchedule.id, {
        teacherName: formData.teacherName,
        senin: Number(formData.senin) || 0,
        selasa: Number(formData.selasa) || 0,
        rabu: Number(formData.rabu) || 0,
        kamis: Number(formData.kamis) || 0,
        jumat: Number(formData.jumat) || 0,
        sabtu: Number(formData.sabtu) || 0,
        minggu: Number(formData.minggu) || 0,
        tahfidzSenin: Number(formData.tahfidzSenin) || 0,
        tahfidzSelasa: Number(formData.tahfidzSelasa) || 0,
        tahfidzRabu: Number(formData.tahfidzRabu) || 0,
        tahfidzKamis: Number(formData.tahfidzKamis) || 0,
        tahfidzJumat: Number(formData.tahfidzJumat) || 0,
        tahfidzSabtu: Number(formData.tahfidzSabtu) || 0,
        tahfidzMinggu: Number(formData.tahfidzMinggu) || 0,
      });
    } else {
      storage.addSchedule({
        teacherId: '',
        teacherName: formData.teacherName,
        senin: Number(formData.senin) || 0,
        selasa: Number(formData.selasa) || 0,
        rabu: Number(formData.rabu) || 0,
        kamis: Number(formData.kamis) || 0,
        jumat: Number(formData.jumat) || 0,
        sabtu: Number(formData.sabtu) || 0,
        minggu: Number(formData.minggu) || 0,
        tahfidzSenin: Number(formData.tahfidzSenin) || 0,
        tahfidzSelasa: Number(formData.tahfidzSelasa) || 0,
        tahfidzRabu: Number(formData.tahfidzRabu) || 0,
        tahfidzKamis: Number(formData.tahfidzKamis) || 0,
        tahfidzJumat: Number(formData.tahfidzJumat) || 0,
        tahfidzSabtu: Number(formData.tahfidzSabtu) || 0,
        tahfidzMinggu: Number(formData.tahfidzMinggu) || 0,
      });
    }

    onRefreshData();
    setIsFormModalOpen(false);
    showToast(editingSchedule ? `Jadwal ${formData.teacherName} berhasil diperbarui.` : `Guru & jadwal ${formData.teacherName} berhasil ditambahkan.`);
  };

  const handleDeleteSchedule = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.name;
    storage.deleteSchedule(deleteTarget.id);
    onRefreshData();
    setDeleteTarget(null);
    showToast(`Jadwal untuk ${deletedName} berhasil dihapus.`);
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama guru..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1 hidden lg:inline">
            Total <strong>{filteredSchedules.length}</strong> Guru
          </span>
          <button
            onClick={downloadScheduleTemplate}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Template</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Impor Excel</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Guru</span>
          </button>
        </div>
      </div>

      {/* Tabel Format Jadwal Sesuai Spesifikasi */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Header Kolom Grup */}
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                  Nama Guru
                </th>
                <th colSpan={7} className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
                  Jam Mengajar (Per Hari)
                </th>
                <th colSpan={7} className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-teal-50/60 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300">
                  Jam Tahfidz (Per Hari)
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                  Total Jam
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-right whitespace-nowrap">
                  Aksi
                </th>
              </tr>
              {/* Header Kolom Hari */}
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                {/* Mengajar */}
                <th className="py-1.5 px-2 text-center">Sen</th>
                <th className="py-1.5 px-2 text-center">Sel</th>
                <th className="py-1.5 px-2 text-center">Rab</th>
                <th className="py-1.5 px-2 text-center">Kam</th>
                <th className="py-1.5 px-2 text-center">Jum</th>
                <th className="py-1.5 px-2 text-center">Sab</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800">Min</th>
                {/* Tahfidz */}
                <th className="py-1.5 px-2 text-center">Sen</th>
                <th className="py-1.5 px-2 text-center">Sel</th>
                <th className="py-1.5 px-2 text-center">Rab</th>
                <th className="py-1.5 px-2 text-center">Kam</th>
                <th className="py-1.5 px-2 text-center">Jum</th>
                <th className="py-1.5 px-2 text-center">Sab</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800">Min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSchedules.map(sch => {
                const totalMengajar = sch.senin + sch.selasa + sch.rabu + sch.kamis + sch.jumat + sch.sabtu + sch.minggu;
                const totalTahfidz = sch.tahfidzSenin + sch.tahfidzSelasa + sch.tahfidzRabu + sch.tahfidzKamis + sch.tahfidzJumat + sch.tahfidzSabtu + sch.tahfidzMinggu;
                const totalJam = totalMengajar + totalTahfidz;

                return (
                  <tr key={sch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {sch.teacherName}
                    </td>

                    {/* Jam Mengajar */}
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">{sch.senin}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">{sch.selasa}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">{sch.rabu}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">{sch.kamis}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500">{sch.jumat}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">{sch.sabtu}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">{sch.minggu}</td>

                    {/* Jam Tahfidz */}
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-teal-800 dark:text-teal-400 font-medium">{sch.tahfidzSenin}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-teal-800 dark:text-teal-400 font-medium">{sch.tahfidzSelasa}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-teal-800 dark:text-teal-400 font-medium">{sch.tahfidzRabu}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-teal-800 dark:text-teal-400 font-medium">{sch.tahfidzKamis}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-400 dark:text-slate-500 font-medium">{sch.tahfidzJumat}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-teal-800 dark:text-teal-400 font-medium">{sch.tahfidzSabtu}</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-teal-800 dark:text-teal-400 font-medium border-r border-slate-100 dark:border-slate-800">{sch.tahfidzMinggu}</td>

                    {/* Total Jam */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 whitespace-nowrap tabular-nums">
                      {totalJam} Jam
                    </td>

                    {/* Aksi */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(sch)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition active:scale-95 cursor-pointer"
                          title="Edit Jadwal Guru"
                          aria-label="Edit Jadwal"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sch.id, sch.teacherName)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition active:scale-95 cursor-pointer"
                          title="Hapus Jadwal Guru"
                          aria-label="Hapus Jadwal Guru"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL IMPOR EXCEL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Impor File Excel Jadwal Pekanan
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Format Kolom File Excel:</p>
                <p className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  Nama Guru, Senin, Selasa, Rabu, Kamis, Jum'at, Sabtu, Minggu, Tahfidz Senin, Tahfidz Selasa, Tahfidz Rabu, Tahfidz Kamis, Tahfidz Jum'at, Tahfidz Sabtu, Tahfidz Minggu
                </p>
                <p className="mt-2 text-amber-800 dark:text-amber-300 font-medium">
                  * Deteksi Libur Pekanan Otomatis: Jika suatu hari bernilai 0 di semua guru (misal Jum'at = 0), sistem otomatis menandainya sebagai Libur Pekanan!
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {importFile ? importFile.name : 'Pilih file Excel (.xlsx / .xls) untuk diunggah'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Klik untuk memilih file jadwal mingguan
                </p>
              </div>

              {importLoading && (
                <div className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                  Membaca file Excel...
                </div>
              )}

              {importPreview && (
                <div className="space-y-2 pt-1 text-xs">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    <p className="font-semibold">Hasil Analisis:</p>
                    <p className="mt-1">
                      Terbaca: <strong>{importPreview.schedules.length} Guru</strong>
                    </p>
                    <p className="text-amber-800 dark:text-amber-300 font-medium mt-1">
                      Hari Libur Pekanan Otomatis: <strong>{importPreview.detectedWeeklyHolidays.join(', ') || 'Tidak ada'}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!importPreview || importPreview.schedules.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 dark:bg-emerald-600 rounded-xl hover:bg-emerald-800 dark:hover:bg-emerald-700 transition disabled:opacity-50"
              >
                Terapkan Jadwal ({importPreview?.schedules.length || 0} Guru)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT MANUAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingSchedule ? 'Edit Jadwal Guru' : 'Tambah Guru & Jadwal Baru'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Guru</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I"
                  value={formData.teacherName}
                  onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Input Jam Mengajar */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 space-y-2">
                <span className="font-semibold text-blue-900 dark:text-blue-300 block">Alokasi Jam Mengajar (Per Hari):</span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Senin</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.senin}
                      onChange={e => setFormData({ ...formData, senin: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Selasa</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.selasa}
                      onChange={e => setFormData({ ...formData, selasa: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Rabu</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.rabu}
                      onChange={e => setFormData({ ...formData, rabu: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Kamis</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.kamis}
                      onChange={e => setFormData({ ...formData, kamis: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Jum'at</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.jumat}
                      onChange={e => setFormData({ ...formData, jumat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Sabtu</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.sabtu}
                      onChange={e => setFormData({ ...formData, sabtu: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Minggu</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.minggu}
                      onChange={e => setFormData({ ...formData, minggu: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Input Jam Tahfidz */}
              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/40 rounded-xl border border-teal-100 dark:border-teal-900/60 space-y-2">
                <span className="font-semibold text-teal-900 dark:text-teal-300 block">Alokasi Jam Tahfidz (Per Hari):</span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">T. Senin</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.tahfidzSenin}
                      onChange={e => setFormData({ ...formData, tahfidzSenin: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">T. Selasa</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.tahfidzSelasa}
                      onChange={e => setFormData({ ...formData, tahfidzSelasa: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">T. Rabu</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.tahfidzRabu}
                      onChange={e => setFormData({ ...formData, tahfidzRabu: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">T. Kamis</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.tahfidzKamis}
                      onChange={e => setFormData({ ...formData, tahfidzKamis: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">T. Jum'at</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.tahfidzJumat}
                      onChange={e => setFormData({ ...formData, tahfidzJumat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">T. Sabtu</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.tahfidzSabtu}
                      onChange={e => setFormData({ ...formData, tahfidzSabtu: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">T. Minggu</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.tahfidzMinggu}
                      onChange={e => setFormData({ ...formData, tahfidzMinggu: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 dark:bg-emerald-600 rounded-xl hover:bg-emerald-800 dark:hover:bg-emerald-700 transition shadow-xs"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS JADWAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hapus Jadwal Guru
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal untuk <strong className="text-slate-900 dark:text-slate-100">{deleteTarget.name}</strong>? Data alokasi jadwal mingguan guru ini akan dihapus dari sistem.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFIKASI */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs backdrop-blur-xs border border-slate-700/50 dark:border-slate-600 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};



