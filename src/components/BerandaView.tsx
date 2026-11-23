import React, { useState } from 'react';
import { 
  Users, Clock, Award, Check, X, RotateCcw, AlertCircle, 
  CheckCircle2, BookOpen, Sparkles, CalendarOff, Calendar,
  Save, Lock, LogIn, Eye
} from 'lucide-react';
import { AttendanceCheckStatus, DayOfWeek, HolidayItem, Teacher, TeacherScheduleRow } from '../types';
import { storage, getLocalDateString, getLocalDayOfWeek } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface BerandaViewProps {
  teachers: Teacher[];
  schedules: TeacherScheduleRow[];
  holidays: HolidayItem[];
  onNavigateTab: (tab: any) => void;
  onRefreshData: () => void;
}

export const BerandaView: React.FC<BerandaViewProps> = ({
  teachers,
  schedules,
  holidays,
  onNavigateTab,
  onRefreshData,
}) => {
  const { isAdmin, canInputAttendance, openLoginModal } = useAuth();
  // Metrik Beranda:
  // 1. Jumlah guru aktif: selaras 100% dengan data pada menu jadwal
  const activeTeachersCount = schedules.length;

  // 2. Jam per minggu (total jam mengajar + tahfidz di semua guru)
  let totalTeachingHours = 0;
  let totalTahfidzHours = 0;
  let tahfidzTeachersSet = new Set<string>();

  schedules.forEach(s => {
    const tTeaching = s.senin + s.selasa + s.rabu + s.kamis + s.jumat + s.sabtu + s.minggu;
    const tTahfidz = s.tahfidzSenin + s.tahfidzSelasa + s.tahfidzRabu + s.tahfidzKamis + s.tahfidzJumat + s.tahfidzSabtu + s.tahfidzMinggu;
    totalTeachingHours += tTeaching;
    totalTahfidzHours += tTahfidz;

    if (tTahfidz > 0) {
      tahfidzTeachersSet.add(s.teacherId);
    }
  });

  const totalWeeklyHours = totalTeachingHours + totalTahfidzHours;
  // 3. Jumlah guru tahfidz
  const tahfidzTeachersCount = tahfidzTeachersSet.size;

  // Tanggal & Hari Hari Ini (Otomatis default ke Hari Ini)
  const todayDateStr = getLocalDateString();
  const todayDayOfWeek = getLocalDayOfWeek();
  const dayNames: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const [quickDate, setQuickDate] = useState<string>(todayDateStr);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDayOfWeek);
  const [sectionFilter, setSectionFilter] = useState<'mengajar' | 'tahfidz'>('mengajar');

  const isToday = quickDate === todayDateStr && selectedDay === todayDayOfWeek;

  const handleResetToToday = () => {
    setQuickDate(todayDateStr);
    setSelectedDay(todayDayOfWeek);
  };

  // Cek libur
  const holidayCheckGeneral = storage.isDateHoliday(quickDate, selectedDay);
  const holidayCheckMengajar = storage.isDateHoliday(quickDate, selectedDay, 'Mengajar');
  const holidayCheckTahfidz = storage.isDateHoliday(quickDate, selectedDay, 'Tahfidz');

  // Ambil presensi harian untuk tanggal terpilih (sudah otomatis menyesuaikan dengan libur)
  const dailyAttendance = storage.getDailyAttendance(quickDate);

  // 1. Filter guru yang memiliki jam mengajar efektif pada hari & tanggal terpilih (otomatis kosong jika tanggal libur)
  const teachingTeachersToday = schedules.filter(sch => {
    const hours = storage.getEffectiveTeacherHoursOnDate(sch, quickDate, selectedDay);
    return hours.mengajar > 0;
  });

  // 2. Filter guru yang memiliki jam tahfidz efektif pada hari & tanggal terpilih (otomatis berkurang jika libur parsial / kosong jika libur penuh)
  const tahfidzTeachersToday = schedules.filter(sch => {
    const hours = storage.getEffectiveTeacherHoursOnDate(sch, quickDate, selectedDay);
    return hours.tahfidz > 0;
  });

  // Status feedback penyimpanan (Auto-Save & Manual)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showSaveSuccess = (message: string) => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3500);
    }, 200);
  };

  const notifyAutoSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
    }, 200);
  };

  // Tombol Simpan Presensi Manual (Memberikan kepastian penuh kepada pengguna)
  const handleManualSave = () => {
    if (!canInputAttendance) {
      openLoginModal();
      return;
    }
    storage.saveAttendances();
    onRefreshData();
    showSaveSuccess(`Presensi hari ${selectedDay}, ${formatIndoDate(quickDate)} berhasil disimpan & disinkronkan!`);
  };

  // Toggle status checkbox per jam/slot sesi
  const handleToggleSlot = (teacherId: string, type: 'mengajar' | 'tahfidz', slotIndex: number) => {
    if (!canInputAttendance) {
      openLoginModal();
      return;
    }
    storage.toggleTeacherSlotAttendance(quickDate, teacherId, type, slotIndex, selectedDay);
    notifyAutoSave();
    onRefreshData();
  };

  // Set semua slot presensi untuk guru tertentu (1-tap pada mobile)
  const handleSetTeacherSlots = (teacherId: string, type: 'mengajar' | 'tahfidz', status: AttendanceCheckStatus) => {
    if (!canInputAttendance) {
      openLoginModal();
      return;
    }
    storage.setTeacherSlotsForSection(quickDate, teacherId, type, status, selectedDay);
    notifyAutoSave();
    onRefreshData();
  };

  // Bulk actions per bagian (Mengajar / Tahfidz)
  const handleMarkSectionHadir = (type: 'mengajar' | 'tahfidz') => {
    if (!canInputAttendance) {
      openLoginModal();
      return;
    }
    storage.setSectionAttendance(quickDate, type, 'hadir', selectedDay);
    notifyAutoSave();
    onRefreshData();
    showSaveSuccess(`Semua guru ${type === 'mengajar' ? 'Mengajar' : 'Tahfidz'} ditandai hadir & tersimpan!`);
  };

  const handleResetSection = (type: 'mengajar' | 'tahfidz') => {
    if (!canInputAttendance) {
      openLoginModal();
      return;
    }
    storage.setSectionAttendance(quickDate, type, 'belum_absen', selectedDay);
    notifyAutoSave();
    onRefreshData();
    showSaveSuccess(`Presensi ${type === 'mengajar' ? 'Mengajar' : 'Tahfidz'} berhasil dikosongkan.`);
  };

  // Tandai semua hadir hari ini
  const handleMarkAllHadir = () => {
    if (!canInputAttendance) {
      openLoginModal();
      return;
    }
    storage.setSectionAttendance(quickDate, 'mengajar', 'hadir', selectedDay);
    storage.setSectionAttendance(quickDate, 'tahfidz', 'hadir', selectedDay);
    notifyAutoSave();
    onRefreshData();
    showSaveSuccess('Semua guru Mengajar & Tahfidz berhasil ditandai hadir dan tersimpan!');
  };

  // Kosongkan semua presensi hari ini
  const handleResetAllAttendance = () => {
    if (!canInputAttendance) {
      openLoginModal();
      return;
    }
    storage.setSectionAttendance(quickDate, 'mengajar', 'belum_absen', selectedDay);
    storage.setSectionAttendance(quickDate, 'tahfidz', 'belum_absen', selectedDay);
    notifyAutoSave();
    onRefreshData();
    showSaveSuccess('Presensi hari ini berhasil direset/dikosongkan.');
  };

  // Helper penamaan sesi Tahfidz (misal: Pagi / Sore saat ada libur parsial)
  const getTahfidzSlotLabel = (slotIdx: number, totalSlots: number) => {
    if (holidayCheckTahfidz.isTahfidzSoreHoliday && !holidayCheckTahfidz.isTahfidzPagiHoliday) {
      return 'Pagi';
    }
    if (holidayCheckTahfidz.isTahfidzPagiHoliday && !holidayCheckTahfidz.isTahfidzSoreHoliday) {
      return 'Sore';
    }
    if (totalSlots === 2) {
      return slotIdx === 0 ? 'Pagi' : 'Sore';
    }
    return `Jam ${slotIdx + 1}`;
  };

  const getTahfidzSlotShortLabel = (slotIdx: number, totalSlots: number) => {
    if (holidayCheckTahfidz.isTahfidzSoreHoliday && !holidayCheckTahfidz.isTahfidzPagiHoliday) {
      return 'Pagi';
    }
    if (holidayCheckTahfidz.isTahfidzPagiHoliday && !holidayCheckTahfidz.isTahfidzSoreHoliday) {
      return 'Sore';
    }
    if (totalSlots === 2) {
      return slotIdx === 0 ? 'Pagi' : 'Sore';
    }
    return `J${slotIdx + 1}`;
  };

  const formatIndoDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(y, m - 1, d));
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 md:pb-6">

      {/* Tiga Metrik Utama Sederhana & Kompak pada Mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6">
        {/* 1. Jumlah Guru Aktif */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-6 shadow-xs">
          <div className="flex items-center sm:items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="sm:hidden">Guru Aktif</span>
                <span className="hidden sm:inline">Jumlah Guru Aktif</span>
              </p>
              <h3 className="text-lg sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-2 font-mono tabular-nums">
                {activeTeachersCount}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">
                Tenaga pendidik aktif di jadwal
              </p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 hidden sm:flex justify-between">
            <span>Sesuai Data Jadwal</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{schedules.length} Guru</span>
          </div>
        </div>

        {/* 2. Jam Per Minggu */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-6 shadow-xs">
          <div className="flex items-center sm:items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="sm:hidden">Jam Pekan</span>
                <span className="hidden sm:inline">Jam Per Minggu</span>
              </p>
              <h3 className="text-lg sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-2 font-mono tabular-nums">
                {totalWeeklyHours} <span className="text-xs sm:text-base font-normal text-slate-500 dark:text-slate-400">Jam</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">
                Total alokasi jam mengajar & tahfidz
              </p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 hidden sm:grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Mengajar: <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{totalTeachingHours} jam</span>
            </div>
            <div>
              Tahfidz: <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{totalTahfidzHours} jam</span>
            </div>
          </div>
        </div>

        {/* 3. Jumlah Guru Tahfidz */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-6 shadow-xs">
          <div className="flex items-center sm:items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="sm:hidden">Tahfidz</span>
                <span className="hidden sm:inline">Jumlah Guru Tahfidz</span>
              </p>
              <h3 className="text-lg sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 sm:mt-2 font-mono tabular-nums">
                {tahfidzTeachersCount}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">
                Guru pembimbing halaqah tahfidz
              </p>
            </div>
            <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
              <Award className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 hidden sm:flex justify-between">
            <span>Alokasi Tahfidz Pekanan</span>
            <span className="font-semibold text-teal-800 dark:text-teal-300 font-mono">{totalTahfidzHours} Jam</span>
          </div>
        </div>
      </div>

      {/* Bagian Presensi & Jadwal Sesi Hari Ini */}
      <div className="space-y-5">
        {/* Kontrol Utama & Petunjuk Presensi Hari Ini */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Presensi & Jadwal Sesi Hari Ini
                </h2>
                {isToday ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Hari Ini
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Pratinjau
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Jadwal sesi hari <strong className="text-slate-700 dark:text-slate-300">{selectedDay}, {formatIndoDate(quickDate)}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canInputAttendance ? (
                <>
                  {/* Indikator Status Auto-Save Real-time */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                      saveStatus === 'saving'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}
                    title="Sistem menyimpan presensi secara otomatis setiap kali Anda mencentang atau mengubah status"
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        saveStatus === 'saving'
                          ? 'text-amber-600 animate-spin'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    />
                    <span>{saveStatus === 'saving' ? 'Menyimpan...' : 'Tersimpan Otomatis'}</span>
                  </div>

                  {/* Tombol Simpan Presensi */}
                  <button
                    type="button"
                    onClick={handleManualSave}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white active:scale-95 transition rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                    title="Simpan & sinkronkan presensi hari ini"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Presensi</span>
                  </button>
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
                  <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Mode Lihat Saja</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={quickDate}
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) return;
                    setQuickDate(val);
                    const [y, m, d] = val.split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    const idx = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
                    setSelectedDay(dayNames[idx]);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  title="Pilih tanggal presensi"
                />
              </div>

              {!isToday && (
                <button
                  type="button"
                  onClick={handleResetToToday}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition flex items-center gap-1 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Hari Ini</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Pilihan 2 Bagian Sederhana: Mengajar & Tahfidz */}
          <div className="mt-4">
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl sm:rounded-2xl gap-1.5 sm:gap-2 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSectionFilter('mengajar')}
                className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base transition-all cursor-pointer ${
                  sectionFilter === 'mengajar'
                    ? 'bg-blue-700 dark:bg-blue-600 text-white shadow-sm shadow-blue-900/25 ring-1 ring-blue-800/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Presensi Mengajar</span>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                  sectionFilter === 'mengajar' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {holidayCheckMengajar.isHoliday ? 'Libur Mengajar' : `${teachingTeachersToday.length} Guru`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSectionFilter('tahfidz')}
                className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base transition-all cursor-pointer ${
                  sectionFilter === 'tahfidz'
                    ? 'bg-teal-700 dark:bg-teal-600 text-white shadow-sm shadow-teal-900/25 ring-1 ring-teal-800/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Presensi Tahfidz</span>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                  sectionFilter === 'tahfidz' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {holidayCheckTahfidz.isHoliday && !holidayCheckTahfidz.isTahfidzPartial
                    ? 'Libur Tahfidz'
                    : holidayCheckTahfidz.isTahfidzPartial
                    ? `${tahfidzTeachersToday.length} Guru (1 Jam)`
                    : `${tahfidzTeachersToday.length} Guru`}
                </span>
              </button>
            </div>
          </div>

          {/* Toolbar: Input Controls (Jika Login) ATAU Notice Read-Only + Tombol Login (Jika Belum Login) */}
          {canInputAttendance ? (
            <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/60 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
              {/* Legend petunjuk status checkbox */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Petunjuk Absen:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span>Centang = Hadir</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center font-bold">
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span>Silang = Tidak Hadir</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center"></span>
                  <span>Kosong = Belum Diabsen</span>
                </div>
              </div>

              {/* Tombol Aksi Cepat Kontekstual Sesuai Pilihan */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllHadir}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  title="Tandai semua guru hadir baik mengajar maupun tahfidz pada hari ini"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Hadirkan Semua (KBM & Tahfidz)</span>
                </button>

                {sectionFilter === 'mengajar' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMarkSectionHadir('mengajar')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                    >
                      Centang Semua Mengajar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetSection('mengajar')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Kosongkan Mengajar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMarkSectionHadir('tahfidz')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                    >
                      Centang Semua Tahfidz
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetSection('tahfidz')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Kosongkan Tahfidz
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-start sm:items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
                <div className="leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Tampilan Read-Only (Belum Login).</strong>{' '}
                  Anda dapat melihat jadwal dan status kehadiran pada tanggal pilihan. Untuk mengisi absensi, silakan login sebagai Pengisi Absensi atau Admin.
                </div>
              </div>
              <button
                type="button"
                onClick={openLoginModal}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login untuk Mengisi Absen</span>
              </button>
            </div>
          )}

          {/* Indikator Status Hari Libur Umum jika ada */}
          {holidayCheckGeneral.isHoliday && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>
                  Hari {selectedDay} ({formatIndoDate(quickDate)}) ada agenda libur: <strong>{holidayCheckGeneral.holiday?.title}</strong> ({holidayCheckGeneral.holiday?.scope}).
                  {holidayCheckGeneral.sessions && holidayCheckGeneral.sessions.length < 3 && (
                    <span className="ml-1 text-slate-700 dark:text-slate-300 font-medium">
                      Sesi yang tidak diliburkan tetap berjalan seperti biasa.
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2 BAGIAN TERPISAH: MENGAJAR & TAHFIDZ (DITAMPILKAN SESUAI PILIHAN) */}
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* BAGIAN 1: PRESENSI MENGAJAR HARI INI                         */}
          {/* ============================================================ */}
          {sectionFilter === 'mengajar' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Tabel Presensi Mengajar */}
              {holidayCheckMengajar.isHoliday ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mx-auto mb-3 border border-blue-200 dark:border-blue-800 shadow-2xs">
                    <CalendarOff className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Hari Ini Libur Mengajar: {holidayCheckMengajar.holiday?.title || 'Agenda Libur'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Jadwal presensi mengajar otomatis tidak ditampilkan karena tercatat pada menu Hari Libur.
                  </p>
                  {holidayCheckMengajar.holiday?.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 italic">
                      "{holidayCheckMengajar.holiday.description}"
                    </p>
                  )}
                </div>
              ) : teachingTeachersToday.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada jadwal jam mengajar pada hari {selectedDay}</p>
                  <p className="mt-1 text-slate-400 dark:text-slate-500">Hari ini tidak ada jam mengajar terjadwal.</p>
                </div>
              ) : (
                <>
                  {/* TAMPILAN KHUSUS MOBILE APP (sm:hidden) - Desain Simpel, Kompak & Cepat */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
                    {teachingTeachersToday.map((sch, index) => {
                      const hours = storage.getEffectiveTeacherHoursOnDate(sch, quickDate, selectedDay);
                      const record = dailyAttendance.find(a => a.teacherId === sch.teacherId);
                      const actualMengajar = record?.actualMengajar ?? 0;
                      const targetMengajar = hours.mengajar;
                      const isAllHadir = actualMengajar === targetMengajar && targetMengajar > 0;

                      return (
                        <div key={sch.id} className="p-3 space-y-2 bg-white dark:bg-slate-900">
                          {/* Info Guru & Status Realisasi */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                                {sch.teacherName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-blue-200/80 dark:border-blue-800/80">
                                {targetMengajar} Jam
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                                  isAllHadir
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : actualMengajar > 0
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : record?.status === 'tidak_hadir'
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {actualMengajar}/{targetMengajar} Hadir
                              </span>
                            </div>
                          </div>

                          {/* Kontrol Input Presensi (Login) atau Status Read-Only (Tamu) */}
                          {canInputAttendance ? (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {/* Tombol Cepat Hadirkan Semua Jam Guru Ini */}
                              <button
                                type="button"
                                onClick={() => handleSetTeacherSlots(sch.teacherId, 'mengajar', isAllHadir ? 'belum_absen' : 'hadir')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0 ${
                                  isAllHadir
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200'
                                    : 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-2xs'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{isAllHadir ? 'Hadir Semua' : 'Set Hadir'}</span>
                              </button>

                              {/* Tombol Cepat Tidak Hadir */}
                              <button
                                type="button"
                                onClick={() => handleSetTeacherSlots(sch.teacherId, 'mengajar', 'tidak_hadir')}
                                title="Set Tidak Hadir"
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition active:scale-95 cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

                              {/* Checkbox per Jam Mengajar */}
                              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 justify-end">
                                {Array.from({ length: targetMengajar }).map((_, slotIdx) => {
                                  const slotStatus = record?.mengajarSlots?.[slotIdx] || 'belum_absen';
                                  return (
                                    <button
                                      key={slotIdx}
                                      type="button"
                                      onClick={() => handleToggleSlot(sch.teacherId, 'mengajar', slotIdx)}
                                      title={`Jam ${slotIdx + 1}: Ketuk ubah status`}
                                      className={`h-8 px-2 rounded-lg border flex items-center gap-1 transition active:scale-95 cursor-pointer text-xs font-semibold shrink-0 ${
                                        slotStatus === 'hadir'
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : slotStatus === 'tidak_hadir'
                                          ? 'bg-rose-600 border-rose-600 text-white'
                                          : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {slotStatus === 'hadir' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      {slotStatus === 'tidak_hadir' && <X className="w-3.5 h-3.5 stroke-[3]" />}
                                      {slotStatus === 'belum_absen' && (
                                        <span className="w-2.5 h-2.5 rounded-xs border border-slate-400 dark:border-slate-500 block bg-white dark:bg-slate-900"></span>
                                      )}
                                      <span className="font-mono text-[11px]">J{slotIdx + 1}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center flex-wrap gap-1.5 pt-0.5 text-[11px]">
                              {Array.from({ length: targetMengajar }).map((_, slotIdx) => {
                                const slotStatus = record?.mengajarSlots?.[slotIdx] || 'belum_absen';
                                return (
                                  <span
                                    key={slotIdx}
                                    className={`px-2 py-1 rounded-lg border inline-flex items-center gap-1 font-medium ${
                                      slotStatus === 'hadir'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                        : slotStatus === 'tidak_hadir'
                                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {slotStatus === 'hadir' && <Check className="w-3 h-3 stroke-[3]" />}
                                    {slotStatus === 'tidak_hadir' && <X className="w-3 h-3 stroke-[3]" />}
                                    <span className="font-mono">J{slotIdx + 1}:</span>
                                    <span>{slotStatus === 'hadir' ? 'Hadir' : slotStatus === 'tidak_hadir' ? 'Absen' : 'Belum'}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* TAMPILAN TABEL TABLET & DESKTOP (hidden sm:block) */}
                  <div className="hidden sm:block overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold bg-slate-50/70 dark:bg-slate-800/80">
                          <th className="py-3 px-3.5 w-12 text-center">No</th>
                          <th className="py-3 px-3.5">Nama Guru</th>
                          <th className="py-3 px-3 text-center w-28 whitespace-nowrap">Jadwal Hari Ini</th>
                          <th className="py-3 px-4 text-center">
                            {canInputAttendance ? 'Presensi (Checkbox per Jam Mengajar)' : 'Status Kehadiran per Jam (Read-Only)'}
                          </th>
                          <th className="py-3 px-3.5 text-center w-28 whitespace-nowrap">Realisasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {teachingTeachersToday.map((sch, index) => {
                          const hours = storage.getEffectiveTeacherHoursOnDate(sch, quickDate, selectedDay);
                          const record = dailyAttendance.find(a => a.teacherId === sch.teacherId);
                          const actualMengajar = record?.actualMengajar ?? 0;
                          const targetMengajar = hours.mengajar;

                          return (
                            <tr key={sch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              {/* No */}
                              <td className="py-3 px-3.5 text-center font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                                {index + 1}
                              </td>

                              {/* Nama Guru */}
                              <td className="py-3 px-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {sch.teacherName}
                              </td>

                              {/* Alokasi Jam Mengajar */}
                              <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-blue-900 dark:text-blue-300">
                                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200/80 dark:border-blue-800/80">
                                  {targetMengajar} Jam
                                </span>
                              </td>

                              {/* Checkbox Interaktif (Jika Login) atau Indikator Status Read-Only (Tamu) */}
                              <td className="py-3 px-4">
                                {canInputAttendance ? (
                                  <div className="flex flex-wrap items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSetTeacherSlots(sch.teacherId, 'mengajar', actualMengajar === targetMengajar && targetMengajar > 0 ? 'belum_absen' : 'hadir')}
                                      className={`h-9 px-2.5 rounded-xl border flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer text-xs font-semibold shrink-0 ${
                                        actualMengajar === targetMengajar && targetMengajar > 0
                                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200'
                                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                                      }`}
                                      title={actualMengajar === targetMengajar && targetMengajar > 0 ? 'Klik untuk reset' : 'Klik untuk hadirkan semua jam'}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>{actualMengajar === targetMengajar && targetMengajar > 0 ? 'Hadir Semua' : 'Set Hadir'}</span>
                                    </button>
                                    {Array.from({ length: targetMengajar }).map((_, slotIdx) => {
                                      const slotStatus = record?.mengajarSlots?.[slotIdx] || 'belum_absen';
                                      return (
                                        <button
                                          key={slotIdx}
                                          type="button"
                                          onClick={() => handleToggleSlot(sch.teacherId, 'mengajar', slotIdx)}
                                          title={`Jam ke-${slotIdx + 1}: Klik untuk ubah Kosong -> Centang (Hadir) -> Silang (Tidak Hadir)`}
                                          className={`min-w-[4.6rem] h-9 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer text-xs font-semibold shadow-2xs ${
                                            slotStatus === 'hadir'
                                              ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                                              : slotStatus === 'tidak_hadir'
                                              ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700'
                                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                          }`}
                                        >
                                          {slotStatus === 'hadir' && <Check className="w-4 h-4 stroke-[3]" />}
                                          {slotStatus === 'tidak_hadir' && <X className="w-4 h-4 stroke-[3]" />}
                                          {slotStatus === 'belum_absen' && (
                                            <span className="w-3.5 h-3.5 rounded-xs border-2 border-slate-300 dark:border-slate-500 block bg-slate-50 dark:bg-slate-900"></span>
                                          )}
                                          <span className="font-mono text-[11px]">Jam {slotIdx + 1}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center justify-center gap-2">
                                    {Array.from({ length: targetMengajar }).map((_, slotIdx) => {
                                      const slotStatus = record?.mengajarSlots?.[slotIdx] || 'belum_absen';
                                      return (
                                        <span
                                          key={slotIdx}
                                          className={`h-8 px-2.5 rounded-lg border inline-flex items-center gap-1.5 text-xs font-medium ${
                                            slotStatus === 'hadir'
                                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                              : slotStatus === 'tidak_hadir'
                                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                          }`}
                                        >
                                          {slotStatus === 'hadir' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                          {slotStatus === 'tidak_hadir' && <X className="w-3.5 h-3.5 stroke-[3]" />}
                                          <span className="font-mono text-[11px]">Jam {slotIdx + 1}:</span>
                                          <span>
                                            {slotStatus === 'hadir' ? 'Hadir' : slotStatus === 'tidak_hadir' ? 'Tidak Hadir' : 'Belum Absen'}
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>

                              {/* Realisasi Kehadiran */}
                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                    actualMengajar === targetMengajar && targetMengajar > 0
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : actualMengajar > 0
                                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : record?.status === 'tidak_hadir'
                                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {actualMengajar}/{targetMengajar} Hadir
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Penjamin & Tombol Simpan Presensi Mengajar */}
                  <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/70 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {canInputAttendance ? (
                      <>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            Status: <strong className="text-emerald-800 dark:text-emerald-300">Tersimpan Otomatis</strong>. Setiap centang kehadiran langsung tercatat ke database.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleManualSave}
                            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white active:scale-95 transition cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                            title="Simpan & pastikan presensi mengajar tersinkron"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan Presensi</span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('rekap-bulanan')}
                              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                              title="Buka Rekap Bulanan"
                            >
                              <span>Buka Rekap Bulanan →</span>
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Mode Baca Saja · Login sebagai Pengisi Absensi atau Admin untuk menginput kehadiran.</span>
                        </div>
                        <button
                          type="button"
                          onClick={openLoginModal}
                          className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition cursor-pointer shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Login</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* BAGIAN 2: PRESENSI TAHFIDZ HARI INI                          */}
          {/* ============================================================ */}
          {sectionFilter === 'tahfidz' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Status Libur Tahfidz Khusus jika ada */}
              {holidayCheckTahfidz.isHoliday && holidayCheckTahfidz.isTahfidzPartial && (
                <div className="m-4 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                    <span>
                      <strong>Penyesuaian Hari Libur:</strong> {holidayCheckTahfidz.isTahfidzSoreHoliday ? 'Tahfidz Sore hari ini diliburkan' : 'Tahfidz Pagi hari ini diliburkan'} ({holidayCheckTahfidz.holiday?.title || 'Agenda Libur'}). 
                      Alokasi presensi tahfidz hari ini dikurangi menjadi hanya <strong>1 Jam ({holidayCheckTahfidz.isTahfidzSoreHoliday ? 'Sesi Pagi Saja' : 'Sesi Sore Saja'})</strong>.
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-200/80 dark:bg-teal-900/80 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 self-start sm:self-auto shrink-0">
                    {holidayCheckTahfidz.isTahfidzSoreHoliday ? 'Hanya Sesi Pagi' : 'Hanya Sesi Sore'}
                  </span>
                </div>
              )}

              {/* Tabel Presensi Tahfidz */}
              {holidayCheckTahfidz.isHoliday && !holidayCheckTahfidz.isTahfidzPartial ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto mb-3 border border-teal-200 dark:border-teal-800 shadow-2xs">
                    <CalendarOff className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Hari Ini Libur Tahfidz: {holidayCheckTahfidz.holiday?.title || 'Agenda Libur'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Jadwal presensi tahfidz otomatis tidak ditampilkan karena tercatat pada menu Hari Libur.
                  </p>
                  {holidayCheckTahfidz.holiday?.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 italic">
                      "{holidayCheckTahfidz.holiday.description}"
                    </p>
                  )}
                </div>
              ) : tahfidzTeachersToday.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada jadwal jam tahfidz pada hari {selectedDay}</p>
                  <p className="mt-1 text-slate-400 dark:text-slate-500">Hari ini tidak ada jam tahfidz terjadwal.</p>
                </div>
              ) : (
                <>
                  {/* TAMPILAN KHUSUS MOBILE APP (sm:hidden) */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
                    {tahfidzTeachersToday.map((sch, index) => {
                      const hours = storage.getEffectiveTeacherHoursOnDate(sch, quickDate, selectedDay);
                      const record = dailyAttendance.find(a => a.teacherId === sch.teacherId);
                      const actualTahfidz = record?.actualTahfidz ?? 0;
                      const targetTahfidz = hours.tahfidz;
                      const isAllHadir = actualTahfidz === targetTahfidz && targetTahfidz > 0;

                      return (
                        <div key={sch.id} className="p-3 space-y-2 bg-white dark:bg-slate-900">
                          {/* Info Guru & Status Realisasi */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                                {sch.teacherName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-teal-200/80 dark:border-teal-800/80">
                                {targetTahfidz} Jam {holidayCheckTahfidz.isTahfidzPartial ? (holidayCheckTahfidz.isTahfidzSoreHoliday ? '(Pagi)' : '(Sore)') : ''}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                                  isAllHadir
                                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                                    : actualTahfidz > 0
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : record?.status === 'tidak_hadir'
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {actualTahfidz}/{targetTahfidz} Hadir
                              </span>
                            </div>
                          </div>

                          {/* Kontrol Input Presensi (Login) atau Status Read-Only (Tamu) */}
                          {canInputAttendance ? (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {/* Tombol Cepat Hadirkan Semua Jam Guru Ini */}
                              <button
                                type="button"
                                onClick={() => handleSetTeacherSlots(sch.teacherId, 'tahfidz', isAllHadir ? 'belum_absen' : 'hadir')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0 ${
                                  isAllHadir
                                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 hover:bg-teal-200'
                                    : 'bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white shadow-2xs'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{isAllHadir ? 'Hadir Semua' : 'Set Hadir'}</span>
                              </button>

                              {/* Tombol Cepat Tidak Hadir */}
                              <button
                                type="button"
                                onClick={() => handleSetTeacherSlots(sch.teacherId, 'tahfidz', 'tidak_hadir')}
                                title="Set Tidak Hadir"
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition active:scale-95 cursor-pointer shrink-0"
                              >
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

                              {/* Checkbox per Jam Tahfidz */}
                              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 justify-end">
                                {Array.from({ length: targetTahfidz }).map((_, slotIdx) => {
                                  const slotStatus = record?.tahfidzSlots?.[slotIdx] || 'belum_absen';
                                  const slotLabel = getTahfidzSlotLabel(slotIdx, targetTahfidz);
                                  const shortLabel = getTahfidzSlotShortLabel(slotIdx, targetTahfidz);

                                  return (
                                    <button
                                      key={slotIdx}
                                      type="button"
                                      onClick={() => handleToggleSlot(sch.teacherId, 'tahfidz', slotIdx)}
                                      title={`Tahfidz ${slotLabel}: Ketuk ubah status`}
                                      className={`h-8 px-2 rounded-lg border flex items-center gap-1 transition active:scale-95 cursor-pointer text-xs font-semibold shrink-0 ${
                                        slotStatus === 'hadir'
                                          ? 'bg-teal-600 border-teal-600 text-white'
                                          : slotStatus === 'tidak_hadir'
                                          ? 'bg-rose-600 border-rose-600 text-white'
                                          : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {slotStatus === 'hadir' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      {slotStatus === 'tidak_hadir' && <X className="w-3.5 h-3.5 stroke-[3]" />}
                                      {slotStatus === 'belum_absen' && (
                                        <span className="w-2.5 h-2.5 rounded-xs border border-slate-400 dark:border-slate-500 block bg-white dark:bg-slate-900"></span>
                                      )}
                                      <span className="font-mono text-[11px]">{shortLabel}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center flex-wrap gap-1.5 pt-0.5 text-[11px]">
                              {Array.from({ length: targetTahfidz }).map((_, slotIdx) => {
                                const slotStatus = record?.tahfidzSlots?.[slotIdx] || 'belum_absen';
                                const shortLabel = getTahfidzSlotShortLabel(slotIdx, targetTahfidz);

                                return (
                                  <span
                                    key={slotIdx}
                                    className={`px-2 py-1 rounded-lg border inline-flex items-center gap-1 font-medium ${
                                      slotStatus === 'hadir'
                                        ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300'
                                        : slotStatus === 'tidak_hadir'
                                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {slotStatus === 'hadir' && <Check className="w-3 h-3 stroke-[3]" />}
                                    {slotStatus === 'tidak_hadir' && <X className="w-3 h-3 stroke-[3]" />}
                                    <span className="font-mono">{shortLabel}:</span>
                                    <span>{slotStatus === 'hadir' ? 'Hadir' : slotStatus === 'tidak_hadir' ? 'Absen' : 'Belum'}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* TAMPILAN TABEL TABLET & DESKTOP (hidden sm:block) */}
                  <div className="hidden sm:block overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold bg-slate-50/70 dark:bg-slate-800/80">
                          <th className="py-3 px-3.5 w-12 text-center">No</th>
                          <th className="py-3 px-3.5">Nama Guru</th>
                          <th className="py-3 px-3 text-center w-28 whitespace-nowrap">Jadwal Hari Ini</th>
                          <th className="py-3 px-4 text-center">
                            {canInputAttendance ? 'Presensi (Checkbox per Jam Tahfidz)' : 'Status Kehadiran Tahfidz (Read-Only)'}
                          </th>
                          <th className="py-3 px-3.5 text-center w-28 whitespace-nowrap">Realisasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {tahfidzTeachersToday.map((sch, index) => {
                          const hours = storage.getEffectiveTeacherHoursOnDate(sch, quickDate, selectedDay);
                          const record = dailyAttendance.find(a => a.teacherId === sch.teacherId);
                          const actualTahfidz = record?.actualTahfidz ?? 0;
                          const targetTahfidz = hours.tahfidz;

                          return (
                            <tr key={sch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              {/* No */}
                              <td className="py-3 px-3.5 text-center font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                                {index + 1}
                              </td>

                              {/* Nama Guru */}
                              <td className="py-3 px-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {sch.teacherName}
                              </td>

                              {/* Alokasi Jam Tahfidz */}
                              <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-teal-900 dark:text-teal-300">
                                <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 px-2.5 py-1 rounded-lg border border-teal-200/80 dark:border-teal-800/80">
                                  {targetTahfidz} Jam
                                  {holidayCheckTahfidz.isTahfidzPartial && (
                                    <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                                      ({holidayCheckTahfidz.isTahfidzSoreHoliday ? 'Sesi Pagi Saja' : 'Sesi Sore Saja'})
                                    </span>
                                  )}
                                </span>
                              </td>

                              {/* Checkbox Interaktif (Jika Login) atau Indikator Status Read-Only (Tamu) */}
                              <td className="py-3 px-4">
                                {canInputAttendance ? (
                                  <div className="flex flex-wrap items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSetTeacherSlots(sch.teacherId, 'tahfidz', actualTahfidz === targetTahfidz && targetTahfidz > 0 ? 'belum_absen' : 'hadir')}
                                      className={`h-9 px-2.5 rounded-xl border flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer text-xs font-semibold shrink-0 ${
                                        actualTahfidz === targetTahfidz && targetTahfidz > 0
                                          ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700 hover:bg-teal-200'
                                          : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100'
                                      }`}
                                      title={actualTahfidz === targetTahfidz && targetTahfidz > 0 ? 'Klik untuk reset' : 'Klik untuk hadirkan semua jam'}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>{actualTahfidz === targetTahfidz && targetTahfidz > 0 ? 'Hadir Semua' : 'Set Hadir'}</span>
                                    </button>
                                    {Array.from({ length: targetTahfidz }).map((_, slotIdx) => {
                                      const slotStatus = record?.tahfidzSlots?.[slotIdx] || 'belum_absen';
                                      const slotLabel = getTahfidzSlotLabel(slotIdx, targetTahfidz);

                                      return (
                                        <button
                                          key={slotIdx}
                                          type="button"
                                          onClick={() => handleToggleSlot(sch.teacherId, 'tahfidz', slotIdx)}
                                          title={`Tahfidz ${slotLabel}: Klik untuk ubah Kosong -> Centang (Hadir) -> Silang (Tidak Hadir)`}
                                          className={`min-w-[4.6rem] h-9 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer text-xs font-semibold shadow-2xs ${
                                            slotStatus === 'hadir'
                                              ? 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700'
                                              : slotStatus === 'tidak_hadir'
                                              ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700'
                                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                          }`}
                                        >
                                          {slotStatus === 'hadir' && <Check className="w-4 h-4 stroke-[3]" />}
                                          {slotStatus === 'tidak_hadir' && <X className="w-4 h-4 stroke-[3]" />}
                                          {slotStatus === 'belum_absen' && (
                                            <span className="w-3.5 h-3.5 rounded-xs border-2 border-slate-300 dark:border-slate-500 block bg-slate-50 dark:bg-slate-900"></span>
                                          )}
                                          <span className="font-mono text-[11px]">{slotLabel}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center justify-center gap-2">
                                    {Array.from({ length: targetTahfidz }).map((_, slotIdx) => {
                                      const slotStatus = record?.tahfidzSlots?.[slotIdx] || 'belum_absen';
                                      const slotLabel = getTahfidzSlotLabel(slotIdx, targetTahfidz);

                                      return (
                                        <span
                                          key={slotIdx}
                                          className={`h-8 px-2.5 rounded-lg border inline-flex items-center gap-1.5 text-xs font-medium ${
                                            slotStatus === 'hadir'
                                              ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300'
                                              : slotStatus === 'tidak_hadir'
                                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                          }`}
                                        >
                                          {slotStatus === 'hadir' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                          {slotStatus === 'tidak_hadir' && <X className="w-3.5 h-3.5 stroke-[3]" />}
                                          <span className="font-mono text-[11px]">{slotLabel}:</span>
                                          <span>
                                            {slotStatus === 'hadir' ? 'Hadir' : slotStatus === 'tidak_hadir' ? 'Tidak Hadir' : 'Belum Absen'}
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>

                              {/* Realisasi Kehadiran */}
                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                    actualTahfidz === targetTahfidz && targetTahfidz > 0
                                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                                      : actualTahfidz > 0
                                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : record?.status === 'tidak_hadir'
                                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {actualTahfidz}/{targetTahfidz} Hadir
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Penjamin & Tombol Simpan Presensi Tahfidz */}
                  <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/70 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {canInputAttendance ? (
                      <>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span>
                            Status: <strong className="text-teal-800 dark:text-teal-300">Tersimpan Otomatis</strong>. Setiap centang halaqah tahfidz langsung tercatat ke database.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleManualSave}
                            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white active:scale-95 transition cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                            title="Simpan & pastikan presensi tahfidz tersinkron"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan Presensi</span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('rekap-bulanan')}
                              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
                              title="Buka Rekap Bulanan"
                            >
                              <span>Buka Rekap Bulanan →</span>
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Mode Baca Saja · Login sebagai Pengisi Absensi atau Admin untuk menginput kehadiran tahfidz.</span>
                        </div>
                        <button
                          type="button"
                          onClick={openLoginModal}
                          className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition cursor-pointer shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Login</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifikasi Feedback Simpan */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 dark:border-slate-600 text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
