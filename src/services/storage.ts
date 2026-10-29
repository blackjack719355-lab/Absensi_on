import { 
  AttendanceCheckStatus, DailyAttendanceRecord, DayOfWeek, HolidayItem, 
  HolidayScope, HolidaySessionType, MonthlyRecapRow, Teacher, TeacherScheduleRow, YearlyReportRow 
} from '../types';
import { ALL_DAYS } from './excelService';

const STORAGE_KEY_TEACHERS = 'absensi_on_teachers_v2';
const STORAGE_KEY_SCHEDULES = 'absensi_on_schedules_v2';
const STORAGE_KEY_HOLIDAYS = 'absensi_on_holidays_v2';
const STORAGE_KEY_ATTENDANCE = 'absensi_on_attendance_v2';
const STORAGE_KEY_CONFIG = 'absensi_on_supabase_config_v1';
const STORAGE_KEY_AUTO_SYNC = 'absensi_on_auto_sync_on_launch_v1';

export interface SupabaseConfig {
  connectionString?: string;
  connectionStringMasked?: string;
  url?: string;
  anonKey?: string;
  anonKeyMasked?: string;
  status: 'connected' | 'offline_sync';
  lastSyncedAt: string;
  error?: string | null;
  counts?: {
    teachers: number;
    schedules: number;
    holidays: number;
    attendances: number;
  };
  autoSyncOnLaunch?: boolean;
}

// Backward-compat type alias
export type MongoConfig = SupabaseConfig;

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDayOfWeek(d: Date = new Date()): DayOfWeek {
  const dayNames: DayOfWeek[] = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return dayNames[d.getDay()];
}

// Data awal guru terdaftar selaras dengan jadwal aktif
const INITIAL_TEACHERS: Teacher[] = [
  { id: 't-1792055084401-418', name: 'Ust. Ridwan', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-719', name: 'Ust. Muttaqin', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-261', name: 'Ust. Aef', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-998', name: 'Ust. Tiar', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-695', name: 'Ust. Qoshidin', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-521', name: 'Ust. Afrizal', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-984', name: 'Ust. Hafiq', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-10', name: 'Ust. Rahman', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-392', name: 'Ust. Usamah', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084401-404', name: 'Ust. Ade', active: true, createdAt: '2026-10-15T09:04:44.401Z' },
  { id: 't-1792055084402-74', name: 'Ust. Muhsin', active: true, createdAt: '2026-10-15T09:04:44.402Z' },
  { id: 't-1792055084402-781', name: 'Ust. Suryadi', active: true, createdAt: '2026-10-15T09:04:44.402Z' },
  { id: 't-1792055084402-307', name: 'Ust. Husein', active: true, createdAt: '2026-10-15T09:04:44.402Z' },
  { id: 't-1792055084402-290', name: 'Ust. Azzam', active: true, createdAt: '2026-10-15T09:04:44.402Z' },
  { id: 't-1792055084402-230', name: 'Ust. Gilang', active: true, createdAt: '2026-10-15T09:04:44.402Z' },
  { id: 't-1792055084402-819', name: 'Ust. Ahmad', active: true, createdAt: '2026-10-15T09:04:44.402Z' },
];

// Data awal jadwal guru selaras 100% dengan menu Jadwal (16 guru):
const INITIAL_SCHEDULES: TeacherScheduleRow[] = [
  {
    id: 'sch-1792387830616-1',
    teacherId: 't-1792055084401-418',
    teacherName: 'Ust. Ridwan',
    senin: 0, selasa: 1, rabu: 1, kamis: 2, jumat: 0, sabtu: 2, minggu: 0,
    tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0,
  },
  {
    id: 'sch-1792387830616-2',
    teacherId: 't-1792055084401-719',
    teacherName: 'Ust. Muttaqin',
    senin: 2, selasa: 1, rabu: 2, kamis: 2, jumat: 0, sabtu: 1, minggu: 0,
    tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0,
  },
  {
    id: 'sch-1792387830616-3',
    teacherId: 't-1792055084401-261',
    teacherName: 'Ust. Aef',
    senin: 1, selasa: 2, rabu: 0, kamis: 2, jumat: 0, sabtu: 0, minggu: 2,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-4',
    teacherId: 't-1792055084401-998',
    teacherName: 'Ust. Tiar',
    senin: 2, selasa: 2, rabu: 1, kamis: 0, jumat: 0, sabtu: 0, minggu: 0,
    tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0,
  },
  {
    id: 'sch-1792387830616-5',
    teacherId: 't-1792055084401-695',
    teacherName: 'Ust. Qoshidin',
    senin: 1, selasa: 0, rabu: 1, kamis: 1, jumat: 0, sabtu: 0, minggu: 1,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-6',
    teacherId: 't-1792055084401-521',
    teacherName: 'Ust. Afrizal',
    senin: 0, selasa: 2, rabu: 0, kamis: 1, jumat: 0, sabtu: 0, minggu: 0,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-7',
    teacherId: 't-1792055084401-984',
    teacherName: 'Ust. Hafiq',
    senin: 2, selasa: 1, rabu: 2, kamis: 1, jumat: 0, sabtu: 0, minggu: 0,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-8',
    teacherId: 't-1792055084401-10',
    teacherName: 'Ust. Rahman',
    senin: 1, selasa: 2, rabu: 3, kamis: 2, jumat: 0, sabtu: 0, minggu: 0,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-9',
    teacherId: 't-1792055084401-392',
    teacherName: 'Ust. Usamah',
    senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 3, minggu: 3,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-10',
    teacherId: 't-1792055084401-404',
    teacherName: 'Ust. Ade',
    senin: 1, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 2, minggu: 1,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-11',
    teacherId: 't-1792055084402-74',
    teacherName: 'Ust. Muhsin',
    senin: 1, selasa: 0, rabu: 1, kamis: 0, jumat: 0, sabtu: 0, minggu: 1,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-12',
    teacherId: 't-1792055084402-781',
    teacherName: 'Ust. Suryadi',
    senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 3,
    tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0,
  },
  {
    id: 'sch-1792387830616-13',
    teacherId: 't-1792055084402-307',
    teacherName: 'Ust. Husein',
    senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 3, minggu: 0,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-14',
    teacherId: 't-1792055084402-290',
    teacherName: 'Ust. Azzam',
    senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0,
    tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2,
  },
  {
    id: 'sch-1792387830616-15',
    teacherId: 't-1792055084402-230',
    teacherName: 'Ust. Gilang',
    senin: 0, selasa: 0, rabu: 1, kamis: 0, jumat: 0, sabtu: 1, minggu: 1,
    tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0,
  },
  {
    id: 'sch-1792387830616-16',
    teacherId: 't-1792055084402-819',
    teacherName: 'Ust. Ahmad',
    senin: 1, selasa: 1, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0,
    tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0,
  },
];

// Hari Libur
const INITIAL_HOLIDAYS: HolidayItem[] = [
  // Jum'at otomatis libur pekanan karena di jadwal seluruh guru jum'at = 0 dan tahfidz jum'at = 0
  {
    id: 'hol-weekly-jumat',
    title: "Libur Pekanan (Jum'at)",
    type: 'weekly',
    startDate: '2026-01-01',
    dayOfWeek: 'Jumat',
    scope: 'Untuk Semuanya',
    isAutomaticWeekly: true,
    description: "Otomatis ditandai sistem karena tidak ada jadwal mengajar & tahfidz pada hari Jum'at",
  },
  {
    id: 'hol-1',
    title: 'Kajian Akbar / Libur Khusus Mengajar',
    type: 'single',
    startDate: '2026-10-15',
    scope: 'Mengajar Saja',
    isAutomaticWeekly: false,
    description: 'Persiapan wisuda santri, jam mengajar ditiadakan, tahfidz tetap berjalan',
  },
];

// HELPER UNTUK MENGAMBIL ARRAY SESI YANG DILIBURKAN
export function getHolidaySessions(h: HolidayItem): HolidaySessionType[] {
  if (h.sessions && Array.isArray(h.sessions) && h.sessions.length > 0) {
    return h.sessions;
  }
  const scope = (h.scope || '').trim();
  if (scope === 'Untuk Semuanya') {
    return ['mengajar', 'tahfidz_pagi', 'tahfidz_sore'];
  }
  if (scope === 'Mengajar Saja') {
    return ['mengajar'];
  }
  if (scope === 'Tahfidz Saja') {
    return ['tahfidz_pagi', 'tahfidz_sore'];
  }
  if (scope === 'Tahfidz Pagi Saja') {
    return ['tahfidz_pagi'];
  }
  if (scope === 'Tahfidz Sore Saja') {
    return ['tahfidz_sore'];
  }
  if (scope.includes('Mengajar') && scope.includes('Pagi')) {
    return ['mengajar', 'tahfidz_pagi'];
  }
  if (scope.includes('Mengajar') && scope.includes('Sore')) {
    return ['mengajar', 'tahfidz_sore'];
  }
  return ['mengajar', 'tahfidz_pagi', 'tahfidz_sore'];
}

// FORMAT NAMA CAKUPAN BERDASARKAN ARRAY SESI YANG DIPILIH
export function formatHolidayScopeTitle(sessions: HolidaySessionType[]): HolidayScope {
  const hasMengajar = sessions.includes('mengajar');
  const hasTahfidzPagi = sessions.includes('tahfidz_pagi');
  const hasTahfidzSore = sessions.includes('tahfidz_sore');

  if (hasMengajar && hasTahfidzPagi && hasTahfidzSore) {
    return 'Untuk Semuanya';
  }
  if (hasMengajar && hasTahfidzPagi && !hasTahfidzSore) {
    return 'Mengajar & Tahfidz Pagi';
  }
  if (hasMengajar && !hasTahfidzPagi && hasTahfidzSore) {
    return 'Mengajar & Tahfidz Sore';
  }
  if (hasMengajar && !hasTahfidzPagi && !hasTahfidzSore) {
    return 'Mengajar Saja';
  }
  if (!hasMengajar && hasTahfidzPagi && hasTahfidzSore) {
    return 'Tahfidz Saja';
  }
  if (!hasMengajar && hasTahfidzPagi && !hasTahfidzSore) {
    return 'Tahfidz Pagi Saja';
  }
  if (!hasMengajar && !hasTahfidzPagi && hasTahfidzSore) {
    return 'Tahfidz Sore Saja';
  }
  return 'Untuk Semuanya';
}

class StorageRepository {
  private teachers: Teacher[] = [];
  private schedules: TeacherScheduleRow[] = [];
  private holidays: HolidayItem[] = [];
  private attendances: DailyAttendanceRecord[] = [];
  private listeners: Array<() => void> = [];
  private autoSyncOnLaunch: boolean = true;
  private supabaseConfig: SupabaseConfig = {
    url: '',
    anonKey: '',
    anonKeyMasked: '',
    status: 'offline_sync',
    lastSyncedAt: new Date().toISOString(),
    error: null,
    autoSyncOnLaunch: true,
  };

  constructor() {
    this.init();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (err) { console.error('Storage listener error:', err); }
    });
  }

  private init() {
    try {
      const savedTeachers = localStorage.getItem(STORAGE_KEY_TEACHERS);
      if (savedTeachers) {
        this.teachers = JSON.parse(savedTeachers);
      } else {
        this.teachers = INITIAL_TEACHERS;
        this.saveTeachers();
      }

      const savedSchedules = localStorage.getItem(STORAGE_KEY_SCHEDULES);
      if (savedSchedules) {
        this.schedules = JSON.parse(savedSchedules);
      } else {
        this.schedules = INITIAL_SCHEDULES;
        this.saveSchedules();
      }

      const savedHolidays = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
      if (savedHolidays) {
        this.holidays = JSON.parse(savedHolidays);
      } else {
        this.holidays = INITIAL_HOLIDAYS;
        this.saveHolidays();
      }

      const savedAttendance = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
      if (savedAttendance) {
        try {
          const parsed = JSON.parse(savedAttendance);
          this.attendances = Array.isArray(parsed) ? parsed : [];
        } catch {
          this.attendances = [];
        }
      } else {
        this.attendances = [];
      }

      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedConfig) {
        this.supabaseConfig = { ...this.supabaseConfig, ...JSON.parse(savedConfig) };
      }

      const savedAutoSync = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);
      if (savedAutoSync !== null) {
        this.autoSyncOnLaunch = savedAutoSync === 'true';
      } else if (this.supabaseConfig.autoSyncOnLaunch !== undefined) {
        this.autoSyncOnLaunch = Boolean(this.supabaseConfig.autoSyncOnLaunch);
      } else {
        this.autoSyncOnLaunch = true;
      }
      this.supabaseConfig.autoSyncOnLaunch = this.autoSyncOnLaunch;
    } catch (e) {
      this.teachers = INITIAL_TEACHERS;
      this.schedules = INITIAL_SCHEDULES;
      this.holidays = INITIAL_HOLIDAYS;
      this.attendances = [];
    }

    this.syncAutomaticWeeklyHolidays();
    // Sinkronisasi otomatis dengan database Supabase saat aplikasi dibuka jika toggle aktif
    if (this.autoSyncOnLaunch) {
      this.syncWithBackend();
    }
  }

  // Cek status koneksi Supabase di backend dan ambil data jika terhubung (dengan auto-retry saat cold-start)
  public async syncWithBackend(retries = 4, delayMs = 1500) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/supabase/status');
        if (!res.ok) {
          if ((res.status === 404 || res.status === 502 || res.status === 503) && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          return;
        }
        const text = await res.text();
        let statusData: any;
        try {
          statusData = JSON.parse(text);
        } catch {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          return;
        }

        this.supabaseConfig = {
          connectionString: this.supabaseConfig.connectionString && !this.supabaseConfig.connectionString.includes('•••') ? this.supabaseConfig.connectionString : '',
          connectionStringMasked: statusData.connectionStringMasked || this.supabaseConfig.connectionStringMasked,
          url: statusData.url || this.supabaseConfig.url,
          anonKey: this.supabaseConfig.anonKey && !this.supabaseConfig.anonKey.includes('•••') ? this.supabaseConfig.anonKey : '',
          anonKeyMasked: statusData.anonKeyMasked,
          status: statusData.connected ? 'connected' : 'offline_sync',
          lastSyncedAt: new Date().toISOString(),
          error: statusData.connected ? null : (statusData.error || null),
          counts: statusData.counts,
          autoSyncOnLaunch: this.autoSyncOnLaunch,
        };
        if (statusData.connected) {
          this.supabaseConfig.error = null;
        }
        this.saveConfigLocally(this.supabaseConfig);
        this.notifyListeners();

        if (statusData.connected) {
          const totalDocs = (statusData.counts?.teachers || 0) + 
                            (statusData.counts?.schedules || 0) + 
                            (statusData.counts?.holidays || 0);

          if (totalDocs === 0) {
            // Jika database Supabase benar-benar baru dibuat dan masih 0 dokumen sama sekali,
            // kirimkan dataset awal guru & jadwal ke Supabase
            await this.pushAllToSupabase();
          } else {
            // Ambil seluruh data terbaru dari Supabase ke memori aplikasi
            const dataRes = await fetch('/api/data');
            if (dataRes.ok) {
              const dataText = await dataRes.text();
              let result: any = null;
              try {
                result = JSON.parse(dataText);
              } catch {
                result = null;
              }
              if (result && result.data) {
                if (Array.isArray(result.data.schedules) && result.data.schedules.length > 0) {
                  this.schedules = result.data.schedules;
                  this.saveSchedules();
                }
                if (Array.isArray(result.data.teachers) && result.data.teachers.length > 0) {
                  const scheduleNames = new Set(this.schedules.map(s => s.teacherName.toLowerCase().trim()));
                  this.teachers = (result.data.teachers as Teacher[]).filter((t: Teacher) => scheduleNames.has((t.name || '').toLowerCase().trim()));
                  this.saveTeachers();
                }
                if (Array.isArray(result.data.holidays) && result.data.holidays.length > 0) {
                  this.holidays = result.data.holidays;
                  this.saveHolidays();
                }
                if (Array.isArray(result.data.attendances)) {
                  const serverAtts = result.data.attendances as DailyAttendanceRecord[];
                  const attMap = new Map<string, DailyAttendanceRecord>();
                  // 1. Masukkan semua data dari Supabase (sumber kebenaran persisten)
                  serverAtts.forEach((a: any) => {
                    const { _id, ...clean } = a;
                    const key = clean.id || `${clean.date}_${clean.teacherId}`;
                    attMap.set(key, clean);
                  });
                  // 2. Gabungkan data lokal jika ada yang diinput saat offline
                  this.attendances.forEach(localA => {
                    const key = localA.id || `${localA.date}_${localA.teacherId}`;
                    const existing = attMap.get(key);
                    if (!existing) {
                      attMap.set(key, localA);
                    } else {
                      const localTime = new Date(localA.updatedAt || 0).getTime();
                      const serverTime = new Date(existing.updatedAt || 0).getTime();
                      if (localTime > serverTime) {
                        attMap.set(key, localA);
                      }
                    }
                  });
                  this.attendances = Array.from(attMap.values());
                  this.saveAttendancesLocally();

                  // Jika ada data presensi lokal baru yang belum masuk server, upload ke server
                  const unpushed = this.attendances.filter(a => !serverAtts.some((s: any) => s.id === a.id));
                  if (unpushed.length > 0) {
                    const cleanUnpushed = unpushed.map((a: any) => {
                      const { _id, ...clean } = a;
                      return clean;
                    });
                    this.apiPost('/attendance/batch', { records: cleanUnpushed });
                  }
                }
                this.syncAutomaticWeeklyHolidays();
                this.notifyListeners();
              }
            }
          }
        }
        return; // Berhasil sinkronisasi
      } catch (err) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        console.log('[Storage] Backend status check offline, menggunakan data lokal.');
      }
    }
  }

  // Hubungkan ke Supabase dengan Connection String atau URL & Anon Key (dengan auto-retry saat cold-start)
  public async connectSupabase(connectionStringOrUrl: string, anonKey?: string, retries = 6): Promise<{ success: boolean; message?: string; error?: string }> {
    const isConnStr = connectionStringOrUrl.startsWith('postgres') || connectionStringOrUrl.includes('postgres:');
    
    // 1. Jika pengguna mengirim nilai yang dimasker (••••••••) dan database sudah tersambung
    if (typeof connectionStringOrUrl === 'string' && (connectionStringOrUrl.includes('•••') || connectionStringOrUrl.includes('***'))) {
      await this.syncWithBackend();
      if (this.supabaseConfig.status === 'connected') {
        this.supabaseConfig.error = null;
        this.saveConfigLocally(this.supabaseConfig);
        return { success: true, message: 'Database Supabase PostgreSQL sudah terhubung dan aktif!' };
      }
    }

    const payload = isConnStr
      ? { connectionString: connectionStringOrUrl }
      : { url: connectionStringOrUrl, anonKey: anonKey || '' };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/supabase/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Jika server masih cold-start / restarting setelah deploy (404/502/503), coba kembali dengan jeda
        if ((res.status === 404 || res.status === 502 || res.status === 503) && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }

        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
          // Sebelum menyerah, cek apakah backend sebenarnya sudah hidup via /api/supabase/status
          try {
            const checkRes = await fetch('/api/supabase/status');
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.connected) {
                await this.syncWithBackend();
                return { success: true, message: 'Koneksi ke Supabase berhasil!' };
              }
            }
          } catch {}

          if (!res.ok) {
            return {
              success: false,
              error: `Server backend merespons kode status ${res.status}. Server kemungkinan sedang memulai ulang proses deploy. Silakan coba beberapa detik lagi.`,
            };
          }
          return {
            success: false,
            error: 'Respons dari server bukan format JSON yang valid.',
          };
        }

        if (res.ok && data.success) {
          this.supabaseConfig.error = null;
          await this.syncWithBackend();
          return { success: true, message: data.message };
        } else {
          return { success: false, error: data.error || 'Gagal terhubung ke Supabase' };
        }
      } catch (e: any) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        return { success: false, error: e.message || 'Gagal menghubungi server backend' };
      }
    }
    return { success: false, error: 'Gagal menghubungi server backend setelah beberapa percobaan.' };
  }

  // Putuskan koneksi Supabase
  public async disconnectSupabase(): Promise<{ success: boolean }> {
    try {
      await fetch('/api/supabase/disconnect', { method: 'POST' });
    } catch {}
    this.supabaseConfig = {
      ...this.supabaseConfig,
      status: 'offline_sync',
      error: null,
    };
    this.saveConfigLocally(this.supabaseConfig);
    this.notifyListeners();
    return { success: true };
  }

  // Kirim seluruh dataset lokal saat ini ke Supabase
  public async pushAllToSupabase(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teachers: this.teachers,
          schedules: this.schedules,
          holidays: this.holidays,
          attendances: this.attendances,
        }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        return { success: false, error: `Respons server tidak valid (Status ${res.status})` };
      }
      if (res.ok && data.success) {
        await this.syncWithBackend();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // Backward compatibility aliases
  public async connectMongo(url: string, key: string, retries = 6) {
    return this.connectSupabase(url, key, retries);
  }

  public async disconnectMongo() {
    return this.disconnectSupabase();
  }

  public async pushAllToMongo() {
    return this.pushAllToSupabase();
  }

  // Helper background POST ke API tanpa memblokir UI
  private apiPost(endpoint: string, body: any) {
    fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  // Helper background DELETE ke API tanpa memblokir UI
  private apiDelete(endpoint: string) {
    fetch(`/api${endpoint}`, { method: 'DELETE' }).catch(() => {});
  }

  private saveTeachers() {
    try {
      localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(this.teachers));
    } catch {}
  }

  private saveSchedules() {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(this.schedules));
    } catch {}
  }

  private saveHolidays() {
    try {
      localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(this.holidays));
    } catch {}
  }

  private saveAttendancesLocally() {
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(this.attendances));
    } catch {}
  }

  public saveAttendances() {
    this.saveAttendancesLocally();
    const cleanRecords = this.attendances.map((a: any) => {
      const { _id, ...clean } = a;
      return clean;
    });
    this.apiPost('/attendance/batch', { records: cleanRecords });
    this.notifyListeners();
  }

  private saveConfigLocally(config: Partial<SupabaseConfig>) {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch {}
  }

  public saveConfig(config: Partial<SupabaseConfig>) {
    this.supabaseConfig = { ...this.supabaseConfig, ...config };
    if (config.autoSyncOnLaunch !== undefined) {
      this.autoSyncOnLaunch = config.autoSyncOnLaunch;
      try {
        localStorage.setItem(STORAGE_KEY_AUTO_SYNC, String(this.autoSyncOnLaunch));
      } catch {}
    }
    this.saveConfigLocally(this.supabaseConfig);
  }

  public getConfig(): SupabaseConfig {
    return { ...this.supabaseConfig, autoSyncOnLaunch: this.autoSyncOnLaunch };
  }

  public isAutoSyncOnLaunch(): boolean {
    return this.autoSyncOnLaunch;
  }

  public setAutoSyncOnLaunch(enabled: boolean): void {
    this.autoSyncOnLaunch = enabled;
    this.supabaseConfig.autoSyncOnLaunch = enabled;
    try {
      localStorage.setItem(STORAGE_KEY_AUTO_SYNC, String(enabled));
      this.saveConfigLocally(this.supabaseConfig);
    } catch {}
    this.notifyListeners();
  }

  public resetAllAttendances() {
    this.attendances = [];
    this.saveAttendancesLocally();
    this.apiPost('/attendance/clear', {});
    this.notifyListeners();
  }

  // DETEKSI LIBUR PEKANAN OTOMATIS:
  // "jika pada jadwal terdapat hari yang didalamnya tidak ada jadwal sama sekali berarti itu adalah libur pekanan dan secara otomatis sistem akan menandainya sebagai hari libur"
  public syncAutomaticWeeklyHolidays() {
    const dayTotals: Record<DayOfWeek, number> = {
      Senin: 0,
      Selasa: 0,
      Rabu: 0,
      Kamis: 0,
      Jumat: 0,
      Sabtu: 0,
      Minggu: 0,
    };

    this.schedules.forEach(s => {
      dayTotals.Senin += (s.senin + s.tahfidzSenin);
      dayTotals.Selasa += (s.selasa + s.tahfidzSelasa);
      dayTotals.Rabu += (s.rabu + s.tahfidzRabu);
      dayTotals.Kamis += (s.kamis + s.tahfidzKamis);
      dayTotals.Jumat += (s.jumat + s.tahfidzJumat);
      dayTotals.Sabtu += (s.sabtu + s.tahfidzSabtu);
      dayTotals.Minggu += (s.minggu + s.tahfidzMinggu);
    });

    const nonWeeklyHolidays = this.holidays.filter(h => !h.isAutomaticWeekly);
    const newWeeklyHolidays: HolidayItem[] = [];

    ALL_DAYS.forEach(day => {
      if (dayTotals[day] === 0) {
        newWeeklyHolidays.push({
          id: `hol-weekly-${day.toLowerCase()}`,
          title: `Libur Pekanan (${day})`,
          type: 'weekly',
          startDate: '2026-01-01',
          dayOfWeek: day,
          scope: 'Untuk Semuanya',
          isAutomaticWeekly: true,
          description: `Otomatis ditandai sistem karena total jam mengajar & tahfidz adalah 0 pada hari ${day}`,
        });
      }
    });

    this.holidays = [...nonWeeklyHolidays, ...newWeeklyHolidays];
    this.saveHolidays();
  }

  // Ambil jam jadwal guru pada hari tertentu
  public getTeacherHoursOnDay(schedule: TeacherScheduleRow, day: DayOfWeek): { mengajar: number; tahfidz: number; total: number } {
    let mengajar = 0;
    let tahfidz = 0;

    switch (day) {
      case 'Senin':
        mengajar = schedule.senin;
        tahfidz = schedule.tahfidzSenin;
        break;
      case 'Selasa':
        mengajar = schedule.selasa;
        tahfidz = schedule.tahfidzSelasa;
        break;
      case 'Rabu':
        mengajar = schedule.rabu;
        tahfidz = schedule.tahfidzRabu;
        break;
      case 'Kamis':
        mengajar = schedule.kamis;
        tahfidz = schedule.tahfidzKamis;
        break;
      case 'Jumat':
        mengajar = schedule.jumat;
        tahfidz = schedule.tahfidzJumat;
        break;
      case 'Sabtu':
        mengajar = schedule.sabtu;
        tahfidz = schedule.tahfidzSabtu;
        break;
      case 'Minggu':
        mengajar = schedule.minggu;
        tahfidz = schedule.tahfidzMinggu;
        break;
    }

    return {
      mengajar,
      tahfidz,
      total: mengajar + tahfidz,
    };
  }

  // Jam efektif mengajar & tahfidz guru pada tanggal tertentu dengan memperhitungkan hari libur:
  // 1. Jika tanggal tercatat libur mengajar (atau libur semuanya), jadwal mengajar otomatis tidak ditampilkan (jam mengajar = 0).
  // 2. Jika tanggal tercatat libur tahfidz penuh (atau libur semuanya), jadwal tahfidz otomatis tidak ditampilkan (jam tahfidz = 0).
  // 3. Jika hanya salah satu sesi tahfidz yang libur (misal: hanya tahfidz sore saja), maka jam tahfidz dikurangi menjadi hanya 1 jam tahfidz saja.
  public getEffectiveTeacherHoursOnDate(
    schedule: TeacherScheduleRow,
    dateStr: string,
    dayOfWeek: DayOfWeek
  ): {
    mengajar: number;
    tahfidz: number;
    total: number;
    isMengajarHoliday: boolean;
    isTahfidzHoliday: boolean;
    isTahfidzPartial: boolean;
    activeTahfidzSession?: 'pagi' | 'sore' | 'both' | 'none';
    holidayTitle?: string;
  } {
    const baseHours = this.getTeacherHoursOnDay(schedule, dayOfWeek);
    let mengajar = baseHours.mengajar;
    let tahfidz = baseHours.tahfidz;

    const holGeneral = this.isDateHoliday(dateStr, dayOfWeek);
    const holMengajar = this.isDateHoliday(dateStr, dayOfWeek, 'Mengajar');
    const holTahfidz = this.isDateHoliday(dateStr, dayOfWeek, 'Tahfidz');

    let isMengajarHoliday = false;
    let isTahfidzHoliday = false;
    let isTahfidzPartial = false;
    let activeTahfidzSession: 'pagi' | 'sore' | 'both' | 'none' = 'both';

    // 1. Cek Libur Mengajar
    if (holMengajar.isHoliday) {
      isMengajarHoliday = true;
      mengajar = 0; // Jadwal mengajar otomatis ditiadakan / tidak ditampilkan
    }

    // 2. Cek Libur Tahfidz
    if (holTahfidz.isHoliday) {
      isTahfidzHoliday = true;
      if (holTahfidz.isTahfidzPartial) {
        isTahfidzPartial = true;
        // Kasus spesifik: jika libur hanya tahfidz sore, kurangi menjadi hanya 1 jam tahfidz saja (sesi pagi)
        if (holTahfidz.isTahfidzSoreHoliday && !holTahfidz.isTahfidzPagiHoliday) {
          tahfidz = baseHours.tahfidz > 0 ? 1 : 0;
          activeTahfidzSession = 'pagi';
        } else if (holTahfidz.isTahfidzPagiHoliday && !holTahfidz.isTahfidzSoreHoliday) {
          tahfidz = baseHours.tahfidz > 0 ? 1 : 0;
          activeTahfidzSession = 'sore';
        }
      } else {
        // Libur tahfidz penuh (pagi & sore libur)
        tahfidz = 0; // Jadwal tahfidz otomatis ditiadakan / tidak ditampilkan
        activeTahfidzSession = 'none';
      }
    } else {
      activeTahfidzSession = tahfidz > 0 ? 'both' : 'none';
    }

    return {
      mengajar,
      tahfidz,
      total: mengajar + tahfidz,
      isMengajarHoliday,
      isTahfidzHoliday,
      isTahfidzPartial,
      activeTahfidzSession,
      holidayTitle: holGeneral.holiday?.title,
    };
  }

  // Generate sampel presensi - dikosongkan agar presensi 100% murni dari input pengguna
  private generateSampleAttendances(): DailyAttendanceRecord[] {
    return [];
  }

  // TEACHERS (diselaraskan 100% dengan guru yang aktif di jadwal)
  public getTeachers(): Teacher[] {
    const scheduleTeacherNames = new Set(this.schedules.map(s => s.teacherName.toLowerCase().trim()));
    const validTeachers = this.teachers.filter(t => scheduleTeacherNames.has(t.name.toLowerCase().trim()));
    // Jika ada guru di jadwal yang belum ada di list teachers lokal, lengkapi otomatis
    this.schedules.forEach(s => {
      if (!validTeachers.some(t => t.name.toLowerCase().trim() === s.teacherName.toLowerCase().trim())) {
        validTeachers.push({
          id: s.teacherId || `t-${s.id}`,
          name: s.teacherName,
          active: true,
          createdAt: '2026-01-01',
        });
      }
    });
    return validTeachers;
  }

  // Bersihkan seluruh data presensi (reset murni ke 0 untuk semua guru)
  public async clearAllAttendances(): Promise<boolean> {
    this.attendances = [];
    this.saveAttendances();
    try {
      await fetch('/api/attendance/clear', { method: 'POST' });
    } catch {}
    this.notifyListeners();
    return true;
  }

  public addTeacher(teacher: Omit<Teacher, 'id' | 'createdAt'>): Teacher {
    const newTeacher: Teacher = {
      ...teacher,
      id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.teachers.push(newTeacher);
    this.saveTeachers();
    this.apiPost('/teachers', newTeacher);
    return newTeacher;
  }

  // SCHEDULES
  public getSchedules(): TeacherScheduleRow[] {
    return [...this.schedules];
  }

  public addSchedule(schedule: Omit<TeacherScheduleRow, 'id'>): TeacherScheduleRow {
    let teacher = this.teachers.find(t => t.name.toLowerCase() === schedule.teacherName.toLowerCase());
    let teacherId = schedule.teacherId;
    if (!teacher) {
      const newT = this.addTeacher({
        name: schedule.teacherName,
        active: true,
      });
      teacherId = newT.id;
    } else {
      teacherId = teacher.id;
    }

    const newSch: TeacherScheduleRow = {
      ...schedule,
      teacherId,
      id: `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    this.schedules.push(newSch);
    this.saveSchedules();
    this.syncAutomaticWeeklyHolidays();
    this.apiPost('/schedules', newSch);
    return newSch;
  }

  public updateSchedule(id: string, updates: Partial<TeacherScheduleRow>): TeacherScheduleRow | null {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.schedules[idx] = { ...this.schedules[idx], ...updates };
    this.saveSchedules();
    this.syncAutomaticWeeklyHolidays();
    this.apiPost('/schedules', this.schedules[idx]);
    return this.schedules[idx];
  }

  public deleteSchedule(id: string): boolean {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const removed = this.schedules[idx];
    this.schedules.splice(idx, 1);
    this.saveSchedules();
    this.syncAutomaticWeeklyHolidays();
    if (removed?.teacherId) {
      this.apiDelete(`/teachers/${removed.teacherId}`);
    }
    return true;
  }

  public importSchedulesBatch(newSchedules: TeacherScheduleRow[]) {
    this.schedules = [];
    newSchedules.forEach((item, idx) => {
      let teacher = this.teachers.find(t => t.name.toLowerCase().trim() === item.teacherName.toLowerCase().trim());
      if (!teacher) {
        teacher = this.addTeacher({
          name: item.teacherName,
          active: true,
        });
      }

      this.schedules.push({
        ...item,
        id: `sch-${Date.now()}-${idx + 1}`,
        teacherId: teacher.id,
      });
    });

    this.saveSchedules();
    this.syncAutomaticWeeklyHolidays();
    this.pushAllToMongo();
  }

  // HOLIDAYS
  public getHolidays(): HolidayItem[] {
    return [...this.holidays];
  }

  public addHoliday(holiday: Omit<HolidayItem, 'id'>): HolidayItem {
    const sessions = holiday.sessions && holiday.sessions.length > 0 
      ? holiday.sessions 
      : getHolidaySessions(holiday as HolidayItem);
    const scope = holiday.scope || formatHolidayScopeTitle(sessions);

    const newHoliday: HolidayItem = {
      ...holiday,
      scope,
      sessions,
      id: `hol-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isAutomaticWeekly: holiday.type === 'weekly',
    };
    this.holidays.push(newHoliday);
    this.saveHolidays();
    this.apiPost('/holidays', newHoliday);
    return newHoliday;
  }

  public updateHoliday(id: string, updates: Partial<HolidayItem>): HolidayItem | null {
    const idx = this.holidays.findIndex(h => h.id === id);
    if (idx === -1) return null;

    let sessions = updates.sessions || this.holidays[idx].sessions;
    if (!sessions && updates.scope) {
      sessions = getHolidaySessions({ ...this.holidays[idx], ...updates } as HolidayItem);
    }
    const scope = updates.scope || (sessions ? formatHolidayScopeTitle(sessions) : this.holidays[idx].scope);

    this.holidays[idx] = { 
      ...this.holidays[idx], 
      ...updates,
      scope,
      sessions,
    };
    this.saveHolidays();
    this.apiPost('/holidays', this.holidays[idx]);
    return this.holidays[idx];
  }

  public deleteHoliday(id: string): boolean {
    const idx = this.holidays.findIndex(h => h.id === id);
    if (idx === -1) return false;
    this.holidays.splice(idx, 1);
    this.saveHolidays();
    this.apiDelete(`/holidays/${id}`);
    return true;
  }

  public isDateHoliday(
    dateStr: string, 
    dayOfWeek: DayOfWeek, 
    scopeCheck?: 'Mengajar' | 'Tahfidz' | 'Tahfidz_Pagi' | 'Tahfidz_Sore'
  ): { 
    isHoliday: boolean; 
    holiday?: HolidayItem;
    sessions?: HolidaySessionType[];
    isTahfidzPagiHoliday?: boolean;
    isTahfidzSoreHoliday?: boolean;
    isTahfidzPartial?: boolean;
    isMengajarHoliday?: boolean;
  } {
    // Cari semua agenda libur yang cocok dengan tanggal & hari ini
    // Urutkan agenda khusus terlebih dahulu di atas libur pekanan otomatis
    const list = [...this.holidays].sort((a, b) => (a.isAutomaticWeekly ? 1 : 0) - (b.isAutomaticWeekly ? 1 : 0));
    
    const matching: HolidayItem[] = [];
    for (const h of list) {
      let dateMatches = false;
      if (h.type === 'weekly' && h.dayOfWeek === dayOfWeek) {
        dateMatches = true;
      } else if (h.type === 'single' && h.startDate === dateStr) {
        dateMatches = true;
      } else if (h.type === 'range' && h.startDate && h.endDate) {
        if (dateStr >= h.startDate && dateStr <= h.endDate) {
          dateMatches = true;
        }
      }
      if (dateMatches) {
        matching.push(h);
      }
    }

    if (matching.length === 0) {
      return { isHoliday: false };
    }

    // Gabungkan seluruh sesi yang diliburkan pada tanggal tersebut
    const mergedSessions = new Set<HolidaySessionType>();
    for (const h of matching) {
      const sList = getHolidaySessions(h);
      for (const s of sList) {
        mergedSessions.add(s);
      }
    }

    const hasMengajar = mergedSessions.has('mengajar');
    const hasTahfidzPagi = mergedSessions.has('tahfidz_pagi');
    const hasTahfidzSore = mergedSessions.has('tahfidz_sore');
    const isTahfidzPartial = (hasTahfidzPagi && !hasTahfidzSore) || (!hasTahfidzPagi && hasTahfidzSore);
    const primaryHoliday = matching[0];
    const sessionsArray = Array.from(mergedSessions);

    if (!scopeCheck) {
      return { 
        isHoliday: true, 
        holiday: primaryHoliday,
        sessions: sessionsArray,
        isTahfidzPagiHoliday: hasTahfidzPagi,
        isTahfidzSoreHoliday: hasTahfidzSore,
        isTahfidzPartial,
        isMengajarHoliday: hasMengajar,
      };
    }

    if (scopeCheck === 'Mengajar' && hasMengajar) {
      return { 
        isHoliday: true, 
        holiday: primaryHoliday,
        sessions: sessionsArray,
        isMengajarHoliday: true,
      };
    }

    if (scopeCheck === 'Tahfidz' && (hasTahfidzPagi || hasTahfidzSore)) {
      return { 
        isHoliday: true, 
        holiday: primaryHoliday,
        sessions: sessionsArray,
        isTahfidzPagiHoliday: hasTahfidzPagi,
        isTahfidzSoreHoliday: hasTahfidzSore,
        isTahfidzPartial,
      };
    }

    if (scopeCheck === 'Tahfidz_Pagi' && hasTahfidzPagi) {
      return { isHoliday: true, holiday: primaryHoliday, sessions: sessionsArray };
    }

    if (scopeCheck === 'Tahfidz_Sore' && hasTahfidzSore) {
      return { isHoliday: true, holiday: primaryHoliday, sessions: sessionsArray };
    }

    return { isHoliday: false };
  }

  public getAttendances(): DailyAttendanceRecord[] {
    return [...this.attendances];
  }

  // ATTENDANCES (Tri-state: centang (hadir), silang (tidak_hadir), kosong (belum_absen))
  public getDailyAttendance(date: string): DailyAttendanceRecord[] {
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = ALL_DAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]; // or getLocalDayOfWeek

    return this.schedules.map(sch => {
      const hours = this.getEffectiveTeacherHoursOnDate(sch, date, dayOfWeek);
      const existing = this.attendances.find(a => a.date === date && (a.teacherId === sch.teacherId || a.teacherName === sch.teacherName));

      if (existing) {
        // Sinkronisasi slot dengan jam jadwal efektif hari tersebut (memperhitungkan libur)
        let modified = false;
        if (!existing.mengajarSlots || existing.mengajarSlots.length !== hours.mengajar) {
          existing.mengajarSlots = Array(hours.mengajar).fill(
            existing.status === 'hadir' ? 'hadir' : existing.status === 'tidak_hadir' ? 'tidak_hadir' : 'belum_absen'
          );
          modified = true;
        }
        if (!existing.tahfidzSlots || existing.tahfidzSlots.length !== hours.tahfidz) {
          existing.tahfidzSlots = Array(hours.tahfidz).fill(
            existing.status === 'hadir' ? 'hadir' : existing.status === 'tidak_hadir' ? 'tidak_hadir' : 'belum_absen'
          );
          modified = true;
        }
        if (modified || existing.targetMengajar !== hours.mengajar || existing.targetTahfidz !== hours.tahfidz) {
          existing.targetMengajar = hours.mengajar;
          existing.targetTahfidz = hours.tahfidz;
          existing.actualMengajar = existing.mengajarSlots.filter(s => s === 'hadir').length;
          existing.actualTahfidz = existing.tahfidzSlots.filter(s => s === 'hadir').length;
        }
        return existing;
      }

      // Default jika belum ada record
      return {
        id: `att-${date}-${sch.teacherId}`,
        date,
        teacherId: sch.teacherId,
        teacherName: sch.teacherName,
        status: 'belum_absen' as AttendanceCheckStatus,
        targetMengajar: hours.mengajar,
        actualMengajar: 0,
        targetTahfidz: hours.tahfidz,
        actualTahfidz: 0,
        mengajarSlots: Array(hours.mengajar).fill('belum_absen' as AttendanceCheckStatus),
        tahfidzSlots: Array(hours.tahfidz).fill('belum_absen' as AttendanceCheckStatus),
      };
    });
  }

  // Toggle status pada sesi jam tertentu (sesuai slot checkbox)
  public toggleTeacherSlotAttendance(
    date: string,
    teacherId: string,
    type: 'mengajar' | 'tahfidz',
    slotIndex: number,
    dayOfWeek: DayOfWeek
  ) {
    const sch = this.schedules.find(s => s.teacherId === teacherId);
    if (!sch) return;

    const hours = this.getEffectiveTeacherHoursOnDate(sch, date, dayOfWeek);
    let recIdx = this.attendances.findIndex(a => a.date === date && a.teacherId === teacherId);
    let record: DailyAttendanceRecord;

    if (recIdx === -1) {
      record = {
        id: `att-${date}-${teacherId}`,
        date,
        teacherId,
        teacherName: sch.teacherName,
        status: 'belum_absen',
        targetMengajar: hours.mengajar,
        actualMengajar: 0,
        targetTahfidz: hours.tahfidz,
        actualTahfidz: 0,
        mengajarSlots: Array(hours.mengajar).fill('belum_absen'),
        tahfidzSlots: Array(hours.tahfidz).fill('belum_absen'),
        updatedAt: new Date().toISOString(),
      };
      this.attendances.push(record);
      recIdx = this.attendances.length - 1;
    } else {
      record = { ...this.attendances[recIdx] };
      if (!record.mengajarSlots || record.mengajarSlots.length !== hours.mengajar) {
        record.mengajarSlots = Array(hours.mengajar).fill(record.status === 'hadir' ? 'hadir' : record.status === 'tidak_hadir' ? 'tidak_hadir' : 'belum_absen');
      }
      if (!record.tahfidzSlots || record.tahfidzSlots.length !== hours.tahfidz) {
        record.tahfidzSlots = Array(hours.tahfidz).fill(record.status === 'hadir' ? 'hadir' : record.status === 'tidak_hadir' ? 'tidak_hadir' : 'belum_absen');
      }
    }

    // Toggle: belum_absen -> hadir -> tidak_hadir -> belum_absen
    if (type === 'mengajar') {
      const slots = [...(record.mengajarSlots || [])];
      const curr = slots[slotIndex] || 'belum_absen';
      const next: AttendanceCheckStatus = curr === 'belum_absen' ? 'hadir' : curr === 'hadir' ? 'tidak_hadir' : 'belum_absen';
      slots[slotIndex] = next;
      record.mengajarSlots = slots;
    } else {
      const slots = [...(record.tahfidzSlots || [])];
      const curr = slots[slotIndex] || 'belum_absen';
      const next: AttendanceCheckStatus = curr === 'belum_absen' ? 'hadir' : curr === 'hadir' ? 'tidak_hadir' : 'belum_absen';
      slots[slotIndex] = next;
      record.tahfidzSlots = slots;
    }

    record.actualMengajar = (record.mengajarSlots || []).filter(s => s === 'hadir').length;
    record.actualTahfidz = (record.tahfidzSlots || []).filter(s => s === 'hadir').length;

    const allSlots = [...(record.mengajarSlots || []), ...(record.tahfidzSlots || [])];
    if (allSlots.length === 0) {
      record.status = 'belum_absen';
    } else if (allSlots.every(s => s === 'hadir')) {
      record.status = 'hadir';
    } else if (allSlots.every(s => s === 'tidak_hadir')) {
      record.status = 'tidak_hadir';
    } else if (allSlots.every(s => s === 'belum_absen')) {
      record.status = 'belum_absen';
    } else {
      record.status = record.actualMengajar + record.actualTahfidz > 0 ? 'hadir' : 'tidak_hadir';
    }

    record.updatedAt = new Date().toISOString();
    this.attendances[recIdx] = record;
    this.saveAttendances();
  }

  // Update presensi per bagian (misal: Centang Semua Mengajar atau Kosongkan Tahfidz)
  public setSectionAttendance(
    date: string,
    type: 'mengajar' | 'tahfidz',
    status: AttendanceCheckStatus,
    dayOfWeek: DayOfWeek
  ) {
    this.schedules.forEach(sch => {
      const hours = this.getEffectiveTeacherHoursOnDate(sch, date, dayOfWeek);
      const slotCount = type === 'mengajar' ? hours.mengajar : hours.tahfidz;
      if (slotCount === 0) return;

      let recIdx = this.attendances.findIndex(a => a.date === date && a.teacherId === sch.teacherId);
      let record: DailyAttendanceRecord;

      if (recIdx === -1) {
        record = {
          id: `att-${date}-${sch.teacherId}`,
          date,
          teacherId: sch.teacherId,
          teacherName: sch.teacherName,
          status: 'belum_absen',
          targetMengajar: hours.mengajar,
          actualMengajar: 0,
          targetTahfidz: hours.tahfidz,
          actualTahfidz: 0,
          mengajarSlots: Array(hours.mengajar).fill('belum_absen'),
          tahfidzSlots: Array(hours.tahfidz).fill('belum_absen'),
          updatedAt: new Date().toISOString(),
        };
        this.attendances.push(record);
        recIdx = this.attendances.length - 1;
      } else {
        record = { ...this.attendances[recIdx] };
        if (!record.mengajarSlots || record.mengajarSlots.length !== hours.mengajar) {
          record.mengajarSlots = Array(hours.mengajar).fill(record.status === 'hadir' ? 'hadir' : 'belum_absen');
        }
        if (!record.tahfidzSlots || record.tahfidzSlots.length !== hours.tahfidz) {
          record.tahfidzSlots = Array(hours.tahfidz).fill(record.status === 'hadir' ? 'hadir' : 'belum_absen');
        }
      }

      if (type === 'mengajar') {
        record.mengajarSlots = Array(hours.mengajar).fill(status);
      } else {
        record.tahfidzSlots = Array(hours.tahfidz).fill(status);
      }

      record.actualMengajar = (record.mengajarSlots || []).filter(s => s === 'hadir').length;
      record.actualTahfidz = (record.tahfidzSlots || []).filter(s => s === 'hadir').length;

      const allSlots = [...(record.mengajarSlots || []), ...(record.tahfidzSlots || [])];
      if (allSlots.length === 0) {
        record.status = 'belum_absen';
      } else if (allSlots.every(s => s === 'hadir')) {
        record.status = 'hadir';
      } else if (allSlots.every(s => s === 'tidak_hadir')) {
        record.status = 'tidak_hadir';
      } else if (allSlots.every(s => s === 'belum_absen')) {
        record.status = 'belum_absen';
      } else {
        record.status = record.actualMengajar + record.actualTahfidz > 0 ? 'hadir' : 'tidak_hadir';
      }

      record.updatedAt = new Date().toISOString();
      this.attendances[recIdx] = record;
    });

    this.saveAttendances();
  }

  // Set semua slot presensi untuk guru tertentu pada sesi mengajar atau tahfidz (untuk kemudahan input mobile)
  public setTeacherSlotsForSection(
    date: string,
    teacherId: string,
    type: 'mengajar' | 'tahfidz',
    status: AttendanceCheckStatus,
    dayOfWeek: DayOfWeek
  ) {
    const sch = this.schedules.find(s => s.teacherId === teacherId);
    if (!sch) return;

    const hours = this.getEffectiveTeacherHoursOnDate(sch, date, dayOfWeek);
    let recIdx = this.attendances.findIndex(a => a.date === date && a.teacherId === teacherId);
    let record: DailyAttendanceRecord;

    if (recIdx === -1) {
      record = {
        id: `att-${date}-${teacherId}`,
        date,
        teacherId,
        teacherName: sch.teacherName,
        status: 'belum_absen',
        targetMengajar: hours.mengajar,
        actualMengajar: 0,
        targetTahfidz: hours.tahfidz,
        actualTahfidz: 0,
        mengajarSlots: Array(hours.mengajar).fill('belum_absen'),
        tahfidzSlots: Array(hours.tahfidz).fill('belum_absen'),
        updatedAt: new Date().toISOString(),
      };
      this.attendances.push(record);
      recIdx = this.attendances.length - 1;
    } else {
      record = { ...this.attendances[recIdx] };
      if (!record.mengajarSlots || record.mengajarSlots.length !== hours.mengajar) {
        record.mengajarSlots = Array(hours.mengajar).fill(record.status === 'hadir' ? 'hadir' : 'belum_absen');
      }
      if (!record.tahfidzSlots || record.tahfidzSlots.length !== hours.tahfidz) {
        record.tahfidzSlots = Array(hours.tahfidz).fill(record.status === 'hadir' ? 'hadir' : 'belum_absen');
      }
    }

    if (type === 'mengajar') {
      record.mengajarSlots = Array(hours.mengajar).fill(status);
    } else {
      record.tahfidzSlots = Array(hours.tahfidz).fill(status);
    }

    record.actualMengajar = (record.mengajarSlots || []).filter(s => s === 'hadir').length;
    record.actualTahfidz = (record.tahfidzSlots || []).filter(s => s === 'hadir').length;

    const allSlots = [...(record.mengajarSlots || []), ...(record.tahfidzSlots || [])];
    if (allSlots.length === 0) {
      record.status = 'belum_absen';
    } else if (allSlots.every(s => s === 'hadir')) {
      record.status = 'hadir';
    } else if (allSlots.every(s => s === 'tidak_hadir')) {
      record.status = 'tidak_hadir';
    } else if (allSlots.every(s => s === 'belum_absen')) {
      record.status = 'belum_absen';
    } else {
      record.status = record.actualMengajar + record.actualTahfidz > 0 ? 'hadir' : 'tidak_hadir';
    }

    record.updatedAt = new Date().toISOString();
    this.attendances[recIdx] = record;
    this.saveAttendances();
  }

  // Update presensi guru (klik toggle centang -> silang -> kosong untuk semua jam)
  public toggleTeacherAttendance(date: string, teacherId: string, currentStatus: AttendanceCheckStatus, dayOfWeek: DayOfWeek) {
    let nextStatus: AttendanceCheckStatus = 'hadir';
    if (currentStatus === 'belum_absen') {
      nextStatus = 'hadir';
    } else if (currentStatus === 'hadir') {
      nextStatus = 'tidak_hadir';
    } else {
      nextStatus = 'belum_absen';
    }

    this.setTeacherAttendance(date, teacherId, nextStatus, dayOfWeek);
  }

  public setTeacherAttendance(date: string, teacherId: string, status: AttendanceCheckStatus, dayOfWeek: DayOfWeek) {
    const sch = this.schedules.find(s => s.teacherId === teacherId);
    if (!sch) return;

    const hours = this.getTeacherHoursOnDay(sch, dayOfWeek);
    const actualMengajar = status === 'hadir' ? hours.mengajar : 0;
    const actualTahfidz = status === 'hadir' ? hours.tahfidz : 0;

    const existingIdx = this.attendances.findIndex(a => a.date === date && a.teacherId === teacherId);

    if (existingIdx !== -1) {
      this.attendances[existingIdx] = {
        ...this.attendances[existingIdx],
        status,
        targetMengajar: hours.mengajar,
        actualMengajar,
        targetTahfidz: hours.tahfidz,
        actualTahfidz,
        mengajarSlots: Array(hours.mengajar).fill(status),
        tahfidzSlots: Array(hours.tahfidz).fill(status),
        updatedAt: new Date().toISOString(),
      };
    } else {
      this.attendances.push({
        id: `att-${date}-${teacherId}`,
        date,
        teacherId,
        teacherName: sch.teacherName,
        status,
        targetMengajar: hours.mengajar,
        actualMengajar,
        targetTahfidz: hours.tahfidz,
        actualTahfidz,
        mengajarSlots: Array(hours.mengajar).fill(status),
        tahfidzSlots: Array(hours.tahfidz).fill(status),
        updatedAt: new Date().toISOString(),
      });
    }

    this.saveAttendances();
  }

  public markAllAttendance(date: string, status: AttendanceCheckStatus, dayOfWeek: DayOfWeek) {
    this.schedules.forEach(sch => {
      this.setTeacherAttendance(date, sch.teacherId, status, dayOfWeek);
    });
  }

  // HITUNG REKAP BULANAN
  public getMonthlyRecap(year: number, month: number): MonthlyRecapRow[] {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const periodName = `${monthNames[month - 1]} ${year}`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayMap: Record<number, DayOfWeek> = {
      0: 'Minggu',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };

    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthlyAttendances = this.attendances.filter(a => a.date.startsWith(prefix));

    return this.schedules.map(sch => {
      let targetTeaching = 0;
      let targetTahfidz = 0;

      // Iterasi hari dalam sebulan
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dayMap[dateObj.getDay()];
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const eff = this.getEffectiveTeacherHoursOnDate(sch, dateStr, dayOfWeek);
        targetTeaching += eff.mengajar;
        targetTahfidz += eff.tahfidz;
      }

      // Hitung realisasi murni dari input presensi guru yang tercatat
      const teacherRecords = monthlyAttendances.filter(a => 
        (a.teacherId && a.teacherId === sch.teacherId) ||
        (a.teacherName && sch.teacherName && a.teacherName.toLowerCase().trim() === sch.teacherName.toLowerCase().trim())
      );
      let actualTeaching = 0;
      let actualTahfidz = 0;

      // Dedup per tanggal agar per tanggal tidak terhitung ganda
      const recordsByDate = new Map<string, DailyAttendanceRecord>();
      teacherRecords.forEach(rec => {
        recordsByDate.set(rec.date, rec);
      });

      recordsByDate.forEach(rec => {
        // 1. Hitung jam mengajar hadir
        let mengajarHadir = 0;
        if (Array.isArray(rec.mengajarSlots) && rec.mengajarSlots.length > 0) {
          mengajarHadir = rec.mengajarSlots.filter(s => s === 'hadir').length;
        } else if (typeof rec.actualMengajar === 'number' && rec.actualMengajar > 0) {
          mengajarHadir = rec.actualMengajar;
        } else if (rec.status === 'hadir') {
          mengajarHadir = rec.targetMengajar || 0;
        }
        actualTeaching += mengajarHadir;

        // 2. Hitung jam tahfidz hadir
        let tahfidzHadir = 0;
        if (Array.isArray(rec.tahfidzSlots) && rec.tahfidzSlots.length > 0) {
          tahfidzHadir = rec.tahfidzSlots.filter(s => s === 'hadir').length;
        } else if (typeof rec.actualTahfidz === 'number' && rec.actualTahfidz > 0) {
          tahfidzHadir = rec.actualTahfidz;
        } else if (rec.status === 'hadir') {
          tahfidzHadir = rec.targetTahfidz || 0;
        }
        actualTahfidz += tahfidzHadir;
      });

      const totalTarget = targetTeaching + targetTahfidz;
      const totalActual = actualTeaching + actualTahfidz;
      const percentage = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
      const diffTeaching = actualTeaching - targetTeaching;
      const diffTahfidz = actualTahfidz - targetTahfidz;

      let status: 'Kurang' | 'Lengkap' | 'Sangat Lengkap' = 'Kurang';
      if (totalTarget === 0) {
        status = 'Lengkap';
      } else if (percentage >= 105) {
        status = 'Sangat Lengkap';
      } else if (percentage >= 95) {
        status = 'Lengkap';
      } else {
        status = 'Kurang';
      }

      return {
        teacherId: sch.teacherId,
        teacherName: sch.teacherName,
        period: periodName,
        targetTeaching,
        actualTeaching,
        targetTahfidz,
        actualTahfidz,
        totalTarget,
        totalActual,
        percentage,
        diffTeaching,
        diffTahfidz,
        status,
      };
    });
  }

  // HITUNG LAPORAN TAHUNAN
  public getYearlyReport(year: number): YearlyReportRow[] {
    const periodName = `Tahun ${year}`;
    const maxMonth = 12;

    return this.schedules.map(sch => {
      let targetTotalHours = 0;
      let actualTeaching = 0;
      let actualTahfidz = 0;

      for (let m = 1; m <= maxMonth; m++) {
        const monthly = this.getMonthlyRecap(year, m).find(r => r.teacherId === sch.teacherId);
        if (monthly) {
          targetTotalHours += monthly.totalTarget;
          actualTeaching += monthly.actualTeaching;
          actualTahfidz += monthly.actualTahfidz;
        }
      }

      const actualTotalHours = actualTeaching + actualTahfidz;
      const percentage = targetTotalHours > 0 ? Math.round((actualTotalHours / targetTotalHours) * 100) : 0;

      let status: 'Kurang' | 'Lengkap' | 'Sangat Lengkap' = 'Kurang';
      if (targetTotalHours === 0) {
        status = 'Lengkap';
      } else if (percentage >= 105) {
        status = 'Sangat Lengkap';
      } else if (percentage >= 95) {
        status = 'Lengkap';
      } else {
        status = 'Kurang';
      }

      return {
        teacherId: sch.teacherId,
        teacherName: sch.teacherName,
        period: periodName,
        targetTotalHours,
        actualTotalHours,
        percentage,
        actualTeaching,
        actualTahfidz,
        status,
      };
    });
  }

  public resetToDefault() {
    this.teachers = INITIAL_TEACHERS;
    this.schedules = INITIAL_SCHEDULES;
    this.holidays = INITIAL_HOLIDAYS;
    this.attendances = this.generateSampleAttendances();
    this.saveTeachers();
    this.saveSchedules();
    this.saveHolidays();
    this.saveAttendances();
    this.syncAutomaticWeeklyHolidays();
  }

  public exportDatabaseJSON(): string {
    return JSON.stringify({
      appName: 'absensi-on',
      exportedAt: new Date().toISOString(),
      collections: {
        teachers: this.teachers,
        schedules: this.schedules,
        holidays: this.holidays,
        attendances: this.attendances,
      },
      supabaseConfig: this.supabaseConfig,
    }, null, 2);
  }

  public importDatabaseJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.collections) {
        if (Array.isArray(parsed.collections.teachers)) this.teachers = parsed.collections.teachers;
        if (Array.isArray(parsed.collections.schedules)) this.schedules = parsed.collections.schedules;
        if (Array.isArray(parsed.collections.holidays)) this.holidays = parsed.collections.holidays;
        if (Array.isArray(parsed.collections.attendances)) this.attendances = parsed.collections.attendances;
        this.saveTeachers();
        this.saveSchedules();
        this.saveHolidays();
        this.saveAttendances();
        this.syncAutomaticWeeklyHolidays();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const storage = new StorageRepository();
