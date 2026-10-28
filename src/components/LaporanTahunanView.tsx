import React, { useState, useEffect } from 'react';
import { Download, Search, FileSpreadsheet, Calendar, TrendingUp, AlertCircle, Award } from 'lucide-react';
import { YearlyReportRow } from '../types';
import { exportYearlyReportExcel } from '../services/excelService';
import { storage } from '../services/storage';

interface LaporanTahunanViewProps {
  onRefreshData?: () => void;
}

export const LaporanTahunanView: React.FC<LaporanTahunanViewProps> = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  const [yearlyData, setYearlyData] = useState<YearlyReportRow[]>(() =>
    storage.getYearlyReport(selectedYear)
  );

  useEffect(() => {
    setYearlyData(storage.getYearlyReport(selectedYear));
    const unsubscribe = storage.subscribe(() => {
      setYearlyData(storage.getYearlyReport(selectedYear));
    });
    return unsubscribe;
  }, [selectedYear]);

  const yearOptions = [2024, 2025, 2026, 2027, 2028];

  // Filter
  const filteredRows = yearlyData.filter(row => {
    if (statusFilter !== 'Semua' && row.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      if (!row.teacherName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const periodLabel = `Tahun ${selectedYear}`;

  const handleExportExcel = () => {
    exportYearlyReportExcel(filteredRows, periodLabel);
  };

  // Ringkasan tahunan
  const totalTargetYear = filteredRows.reduce((s, r) => s + r.targetTotalHours, 0);
  const totalActualYear = filteredRows.reduce((s, r) => s + r.actualTotalHours, 0);
  const overallPercentage = totalTargetYear > 0 ? Math.round((totalActualYear / totalTargetYear) * 100) : 0;

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Action & Filter Toolbar (Tanpa Banner Hero) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pemilih Tahun */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <span className="text-xs text-slate-500 font-medium">Tahun:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold bg-transparent text-slate-800 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['Semua', 'Kurang', 'Lengkap', 'Sangat Lengkap'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 shadow-2xs"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Akumulasi Tahunan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Total Target Jam Jadwal</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
            {totalTargetYear} Jam
          </span>
          <span className="text-[11px] text-slate-400">Total jam dinas terjadwal</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Total Realisasi Jam Jadwal</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-800 font-mono tabular-nums mt-1 block">
            {totalActualYear} Jam
          </span>
          <span className="text-[11px] text-slate-400">Jam terlaksana & terverifikasi</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Persentase Capaian Lembaga</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
            {overallPercentage}%
          </span>
          <span className="text-[11px] text-slate-400">Rata-rata kehadiran tahunan</span>
        </div>
      </div>

      {/* Tabel Laporan Tahunan Sesuai Rincian Spesifikasi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tabel Laporan Tahunan ({filteredRows.length} Guru)
          </span>
          <span className="text-xs text-slate-500">
            Periode: <strong className="text-slate-800">{periodLabel}</strong>
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada data laporan yang sesuai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium bg-slate-50/70">
                  <th className="py-3 px-3.5">Nama Guru</th>
                  <th className="py-3 px-3.5">Periode</th>
                  <th className="py-3 px-3.5 text-right">Target Jam Jadwal</th>
                  <th className="py-3 px-3.5 text-right">Realisasi Jam Jadwal</th>
                  <th className="py-3 px-3.5 text-right">Persentase</th>
                  <th className="py-3 px-3.5 text-right">Realisasi Mengajar</th>
                  <th className="py-3 px-3.5 text-right">Realisasi Tahfidz</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(row => (
                  <tr key={row.teacherId} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Nama Guru */}
                    <td className="py-3 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                      {row.teacherName}
                    </td>

                    {/* 2. Periode */}
                    <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                      {row.period}
                    </td>

                    {/* 3. Target Jam Jadwal */}
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.targetTotalHours} Jam
                    </td>

                    {/* 4. Realisasi Jam Jadwal */}
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-900 font-semibold whitespace-nowrap">
                      {row.actualTotalHours} Jam
                    </td>

                    {/* 5. Persentase */}
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      {row.percentage}%
                    </td>

                    {/* 6. Realisasi Mengajar */}
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-blue-800 font-semibold whitespace-nowrap">
                      {row.actualTeaching} Jam
                    </td>

                    {/* 7. Realisasi Tahfidz */}
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-teal-800 font-semibold whitespace-nowrap">
                      {row.actualTahfidz} Jam
                    </td>

                    {/* 8. Status (Kurang, Lengkap, Sangat Lengkap) */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                          row.status === 'Sangat Lengkap'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : row.status === 'Lengkap'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
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
