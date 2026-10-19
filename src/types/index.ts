export type ScheduleType = 'Mengajar' | 'Tahfidz';

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type AttendanceCheckStatus = 'hadir' | 'tidak_hadir' | 'belum_absen';

export type RecapStatus = 'Kurang' | 'Lengkap' | 'Sangat Lengkap';

export type HolidaySessionType = 'mengajar' | 'tahfidz_pagi' | 'tahfidz_sore';

export type HolidayScope = 
  | 'Untuk Semuanya' 
  | 'Mengajar Saja' 
  | 'Tahfidz Saja' 
  | 'Tahfidz Pagi Saja' 
  | 'Tahfidz Sore Saja' 
  | 'Mengajar & Tahfidz Pagi' 
  | 'Mengajar & Tahfidz Sore'
  | string;

export interface Teacher {
  id: string;
  name: string;
  nip?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

// Format jadwal per guru dalam 1 pekan:
// senin, selasa, rabu, kamis, jum'at, sabtu, minggu
// tahfidz senin, tahfidz selasa, tahfidz rabu, tahfidz kamis, tahfidz jum'at, tahfidz sabtu, tahfidz minggu
export interface TeacherScheduleRow {
  id: string;
  teacherId: string;
  teacherName: string;
  // Jam Mengajar per hari
  senin: number;
  selasa: number;
  rabu: number;
  kamis: number;
  jumat: number;
  sabtu: number;
  minggu: number;
  // Jam Tahfidz per hari
  tahfidzSenin: number;
  tahfidzSelasa: number;
  tahfidzRabu: number;
  tahfidzKamis: number;
  tahfidzJumat: number;
  tahfidzSabtu: number;
  tahfidzMinggu: number;
}

export interface HolidayItem {
  id: string;
  title: string;
  type: 'single' | 'range' | 'weekly'; // single = 1 hari, range = rentang tanggal, weekly = libur pekanan otomatis
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD jika range
  dayOfWeek?: DayOfWeek; // Jika weekly
  scope: HolidayScope;
  sessions?: HolidaySessionType[]; // Array sesi spesifik yang diliburkan: 'mengajar', 'tahfidz_pagi', 'tahfidz_sore'
  isAutomaticWeekly?: boolean;
  description?: string;
}

// Catatan presensi harian per guru
export interface DailyAttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  teacherId: string;
  teacherName: string;
  status: AttendanceCheckStatus; // 'hadir' (centang), 'tidak_hadir' (silang), 'belum_absen' (kosong)
  targetMengajar: number;
  actualMengajar: number;
  targetTahfidz: number;
  actualTahfidz: number;
  mengajarSlots?: AttendanceCheckStatus[]; // Status masing-masing sesi jam mengajar pada hari tersebut
  tahfidzSlots?: AttendanceCheckStatus[]; // Status masing-masing sesi jam tahfidz pada hari tersebut
  updatedAt?: string;
}

export interface MonthlyRecapRow {
  teacherId: string;
  teacherName: string;
  period: string; // e.g. "Oktober 2026"
  targetTeaching: number;
  actualTeaching: number;
  targetTahfidz: number;
  actualTahfidz: number;
  totalTarget: number;
  totalActual: number;
  percentage: number;
  diffTeaching: number; // Realisasi - Target
  diffTahfidz: number; // Realisasi - Target
  status: RecapStatus;
}

export interface YearlyReportRow {
  teacherId: string;
  teacherName: string;
  period: string; // e.g. "Tahun 2026"
  targetTotalHours: number;
  actualTotalHours: number;
  percentage: number;
  actualTeaching: number;
  actualTahfidz: number;
  status: RecapStatus;
}

export interface ImportScheduleResult {
  schedules: TeacherScheduleRow[];
  detectedWeeklyHolidays: DayOfWeek[];
  activeDays: DayOfWeek[];
  errors: string[];
}
