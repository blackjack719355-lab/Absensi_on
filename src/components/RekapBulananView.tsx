import React, { useState, useEffect } from 'react';
import { Download, Search, Calendar, AlertCircle } from 'lucide-react';
import { MonthlyRecapRow } from '../types';
import { exportMonthlyRecapExcel } from '../services/excelService';
import { storage } from '../services/storage';

interface RekapBulananViewProps {
  onRefreshData?: () => void;
}

export const RekapBulananView: React.FC<RekapBulananViewProps> = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  const [recapData, setRecapData] = useState<MonthlyRecapRow[]>(() =>
    storage.getMonthlyRecap(selectedYear, selectedMonth)
  );

  useEffect(() => {
    setRecapData(storage.getMonthlyRecap(selectedYear, selectedMonth));
    const unsubscribe = storage.subscribe(() => {
      setRecapData(storage.getMonthlyRecap(selectedYear, selectedMonth));
    });
    return unsubscribe;
  }, [selectedYear, selectedMonth]);

  const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const yearOptions = [2024, 2025, 2026, 2027, 2028];

  // Filter
  const filteredRows = recapData.filter(row => {
    if (statusFilter !== 'Semua' && row.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      if (!row.teacherName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const periodLabel = `${monthOptions.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;

  // Hitung total ringkasan
  const totalTargetTeaching = filteredRows.reduce((s, r) => s + r.targetTeaching, 0);
  const totalActualTeaching = filteredRows.reduce((s, r) => s + r.actualTeaching, 0);
  const totalTargetTahfidz = filteredRows.reduce((s, r) => s + r.targetTahfidz, 0);
  const totalActualTahfidz = filteredRows.reduce((s, r) => s + r.actualTahfidz, 0);

  const handleExportExcel = () => {
    exportMonthlyRecapExcel(filteredRows, periodLabel);
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Action & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pemilih Periode Bulan & Tahun */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-1 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-1.5" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value} className="dark:bg-slate-900 dark:text-slate-200">
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y} value={y} className="dark:bg-slate-900 dark:text-slate-200">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['Semua', 'Kurang', 'Lengkap', 'Sangat Lengkap'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-700 dark:bg-emerald-600 text-white hover:bg-emerald-800 dark:hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Akumulasi Bulanan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Target Mengajar</span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
            {totalTargetTeaching} Jam
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Akumulasi seluruh guru</span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Realisasi Mengajar</span>
          <span className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-400 font-mono tabular-nums mt-1 block">
            {totalActualTeaching} Jam
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Capaian: {totalTargetTeaching > 0 ? Math.round((totalActualTeaching / totalTargetTeaching) * 100) : 0}%
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Target Tahfidz</span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
            {totalTargetTahfidz} Jam
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Akumulasi seluruh guru</span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Realisasi Tahfidz</span>
          <span className="text-lg sm:text-xl font-bold text-teal-800 dark:text-teal-400 font-mono tabular-nums mt-1 block">
            {totalActualTahfidz} Jam
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Capaian: {totalTargetTahfidz > 0 ? Math.round((totalActualTahfidz / totalTargetTahfidz) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Tabel Rincian Rekap Bulanan */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tabel Rekap Bulanan ({filteredRows.length} Guru)
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Periode: <strong className="text-slate-800 dark:text-slate-200">{periodLabel}</strong>
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada data rekap yang sesuai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium bg-slate-50/70 dark:bg-slate-800/80">
                  <th className="py-3 px-3.5">Nama Guru</th>
                  <th className="py-3 px-3.5">Periode</th>
                  <th className="py-3 px-3 text-right">Target Mengajar</th>
                  <th className="py-3 px-3 text-right">Realisasi Mengajar</th>
                  <th className="py-3 px-3 text-right">Target Tahfidz</th>
                  <th className="py-3 px-3 text-right">Realisasi Tahfidz</th>
                  <th className="py-3 px-3 text-right">Persentase</th>
                  <th className="py-3 px-3 text-right">Selisih Mengajar</th>
                  <th className="py-3 px-3 text-right">Selisih Tahfidz</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map(row => (
                  <tr key={row.teacherId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* 1. Nama Guru */}
                    <td className="py-3 px-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {row.teacherName}
                    </td>

                    {/* 2. Periode */}
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {row.period}
                    </td>

                    {/* 3. Target Mengajar */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.targetTeaching} Jam
                    </td>

                    {/* 4. Realisasi Mengajar */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-800 dark:text-blue-400 font-semibold whitespace-nowrap">
                      {row.actualTeaching} Jam
                    </td>

                    {/* 5. Target Tahfidz */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.targetTahfidz} Jam
                    </td>

                    {/* 6. Realisasi Tahfidz */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-teal-800 dark:text-teal-400 font-semibold whitespace-nowrap">
                      {row.actualTahfidz} Jam
                    </td>

                    {/* 7. Persentase */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {row.percentage}%
                    </td>

                    {/* 8. Selisih Mengajar */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          row.diffTeaching > 0
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : row.diffTeaching < 0
                            ? 'text-rose-700 dark:text-rose-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {row.diffTeaching > 0 ? `+${row.diffTeaching}` : row.diffTeaching} Jam
                      </span>
                    </td>

                    {/* 9. Selisih Tahfidz */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          row.diffTahfidz > 0
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : row.diffTahfidz < 0
                            ? 'text-rose-700 dark:text-rose-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {row.diffTahfidz > 0 ? `+${row.diffTahfidz}` : row.diffTahfidz} Jam
                      </span>
                    </td>

                    {/* 10. Status (Kurang, Lengkap, Sangat Lengkap) */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                          row.status === 'Sangat Lengkap'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : row.status === 'Lengkap'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
