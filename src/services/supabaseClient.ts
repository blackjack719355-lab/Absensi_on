import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DailyAttendanceRecord, HolidayItem, Teacher, TeacherScheduleRow } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
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
}

export const SUPABASE_SQL_SETUP = `-- ==============================================================
-- SKRIP SETUP DATABASE SUPABASE UNTUK ABSENSI-ON
-- Salin dan jalankan seluruh perintah SQL ini di "SQL Editor" Supabase Anda.
-- ==============================================================

-- 1. TABEL GURU (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABEL JADWAL MENGAJAR & TAHFIDZ (schedules)
CREATE TABLE IF NOT EXISTS public.schedules (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  senin INT DEFAULT 0,
  selasa INT DEFAULT 0,
  rabu INT DEFAULT 0,
  kamis INT DEFAULT 0,
  jumat INT DEFAULT 0,
  sabtu INT DEFAULT 0,
  minggu INT DEFAULT 0,
  tahfidz_senin INT DEFAULT 0,
  tahfidz_selasa INT DEFAULT 0,
  tahfidz_rabu INT DEFAULT 0,
  tahfidz_kamis INT DEFAULT 0,
  tahfidz_jumat INT DEFAULT 0,
  tahfidz_sabtu INT DEFAULT 0,
  tahfidz_minggu INT DEFAULT 0
);

-- 3. TABEL HARI LIBUR (holidays)
CREATE TABLE IF NOT EXISTS public.holidays (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'single',
  start_date TEXT NOT NULL,
  end_date TEXT,
  day_of_week TEXT,
  scope TEXT DEFAULT 'Untuk Semuanya',
  is_automatic_weekly BOOLEAN DEFAULT false,
  description TEXT,
  sessions JSONB
);

-- 4. TABEL PRESENSI HARIAN (attendances)
CREATE TABLE IF NOT EXISTS public.attendances (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  status TEXT DEFAULT 'hadir',
  target_mengajar INT DEFAULT 0,
  actual_mengajar INT DEFAULT 0,
  target_tahfidz INT DEFAULT 0,
  actual_tahfidz INT DEFAULT 0,
  mengajar_slots JSONB DEFAULT '[]'::jsonb,
  tahfidz_slots JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABEL AKUN PENGGUNA & HAK AKSES (app_users)
CREATE TABLE IF NOT EXISTS public.app_users (
  username TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- IZINKAN AKSES UNTUK KUNCI ANON
DROP POLICY IF EXISTS "Public access for teachers" ON public.teachers;
CREATE POLICY "Public access for teachers" ON public.teachers FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for schedules" ON public.schedules;
CREATE POLICY "Public access for schedules" ON public.schedules FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for holidays" ON public.holidays;
CREATE POLICY "Public access for holidays" ON public.holidays FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for attendances" ON public.attendances;
CREATE POLICY "Public access for attendances" ON public.attendances FOR ALL TO anon USING (true) WITH CHECK (true);
`;

let clientInstance: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function maskSupabaseKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••';
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

export function getSupabaseClient(url?: string, key?: string): SupabaseClient | null {
  const targetUrl = (url || currentUrl || '').trim();
  const targetKey = (key || currentKey || '').trim();

  if (!targetUrl || !targetKey) {
    return clientInstance;
  }

  if (clientInstance && currentUrl === targetUrl && currentKey === targetKey) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(targetUrl, targetKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    currentUrl = targetUrl;
    currentKey = targetKey;
    return clientInstance;
  } catch (err) {
    console.warn('[Supabase] Gagal membuat client:', err);
    return null;
  }
}

export function resetSupabaseClient() {
  clientInstance = null;
  currentUrl = '';
  currentKey = '';
}

// Convert Teacher to Supabase row
export function teacherToRow(t: Teacher) {
  return {
    id: t.id,
    name: t.name,
    active: t.active,
    created_at: t.createdAt || new Date().toISOString(),
  };
}

// Convert Supabase row to Teacher
export function rowToTeacher(row: any): Teacher {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    active: row.active ?? true,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

// Convert TeacherScheduleRow to Supabase row
export function scheduleToRow(s: TeacherScheduleRow) {
  return {
    id: s.id || `sch-${s.teacherId}`,
    teacher_id: s.teacherId,
    teacher_name: s.teacherName,
    senin: Number(s.senin) || 0,
    selasa: Number(s.selasa) || 0,
    rabu: Number(s.rabu) || 0,
    kamis: Number(s.kamis) || 0,
    jumat: Number(s.jumat) || 0,
    sabtu: Number(s.sabtu) || 0,
    minggu: Number(s.minggu) || 0,
    tahfidz_senin: Number(s.tahfidzSenin) || 0,
    tahfidz_selasa: Number(s.tahfidzSelasa) || 0,
    tahfidz_rabu: Number(s.tahfidzRabu) || 0,
    tahfidz_kamis: Number(s.tahfidzKamis) || 0,
    tahfidz_jumat: Number(s.tahfidzJumat) || 0,
    tahfidz_sabtu: Number(s.tahfidzSabtu) || 0,
    tahfidz_minggu: Number(s.tahfidzMinggu) || 0,
  };
}

// Convert Supabase row to TeacherScheduleRow
export function rowToSchedule(row: any): TeacherScheduleRow {
  return {
    id: String(row.id),
    teacherId: String(row.teacher_id ?? row.teacherId ?? ''),
    teacherName: String(row.teacher_name ?? row.teacherName ?? ''),
    senin: Number(row.senin) || 0,
    selasa: Number(row.selasa) || 0,
    rabu: Number(row.rabu) || 0,
    kamis: Number(row.kamis) || 0,
    jumat: Number(row.jumat) || 0,
    sabtu: Number(row.sabtu) || 0,
    minggu: Number(row.minggu) || 0,
    tahfidzSenin: Number(row.tahfidz_senin ?? row.tahfidzSenin) || 0,
    tahfidzSelasa: Number(row.tahfidz_selasa ?? row.tahfidzSelasa) || 0,
    tahfidzRabu: Number(row.tahfidz_rabu ?? row.tahfidzRabu) || 0,
    tahfidzKamis: Number(row.tahfidz_kamis ?? row.tahfidzKamis) || 0,
    tahfidzJumat: Number(row.tahfidz_jumat ?? row.tahfidzJumat) || 0,
    tahfidzSabtu: Number(row.tahfidz_sabtu ?? row.tahfidzSabtu) || 0,
    tahfidzMinggu: Number(row.tahfidz_minggu ?? row.tahfidzMinggu) || 0,
  };
}

// Convert HolidayItem to Supabase row
export function holidayToRow(h: HolidayItem) {
  return {
    id: h.id,
    title: h.title,
    type: h.type || 'single',
    start_date: h.startDate,
    end_date: h.endDate || null,
    day_of_week: h.dayOfWeek || null,
    scope: h.scope || 'Untuk Semuanya',
    is_automatic_weekly: !!h.isAutomaticWeekly,
    description: h.description || '',
    sessions: h.sessions || null,
  };
}

// Convert Supabase row to HolidayItem
export function rowToHoliday(row: any): HolidayItem {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    type: row.type || 'single',
    startDate: row.start_date ?? row.startDate ?? '',
    endDate: row.end_date ?? row.endDate,
    dayOfWeek: row.day_of_week ?? row.dayOfWeek,
    scope: row.scope || 'Untuk Semuanya',
    isAutomaticWeekly: !!(row.is_automatic_weekly ?? row.isAutomaticWeekly),
    description: row.description || '',
    sessions: row.sessions,
  };
}

// Convert DailyAttendanceRecord to Supabase row
export function attendanceToRow(a: DailyAttendanceRecord) {
  return {
    id: a.id,
    date: a.date,
    teacher_id: a.teacherId,
    teacher_name: a.teacherName,
    status: a.status || 'hadir',
    target_mengajar: Number(a.targetMengajar) || 0,
    actual_mengajar: Number(a.actualMengajar) || 0,
    target_tahfidz: Number(a.targetTahfidz) || 0,
    actual_tahfidz: Number(a.actualTahfidz) || 0,
    mengajar_slots: a.mengajarSlots || [],
    tahfidz_slots: a.tahfidzSlots || [],
    updated_at: a.updatedAt || new Date().toISOString(),
  };
}

// Convert Supabase row to DailyAttendanceRecord
export function rowToAttendance(row: any): DailyAttendanceRecord {
  return {
    id: String(row.id),
    date: String(row.date),
    teacherId: String(row.teacher_id ?? row.teacherId ?? ''),
    teacherName: String(row.teacher_name ?? row.teacherName ?? ''),
    status: (row.status || 'hadir') as any,
    targetMengajar: Number(row.target_mengajar ?? row.targetMengajar) || 0,
    actualMengajar: Number(row.actual_mengajar ?? row.actualMengajar) || 0,
    targetTahfidz: Number(row.target_tahfidz ?? row.targetTahfidz) || 0,
    actualTahfidz: Number(row.actual_tahfidz ?? row.actualTahfidz) || 0,
    mengajarSlots: row.mengajar_slots ?? row.mengajarSlots ?? [],
    tahfidzSlots: row.tahfidz_slots ?? row.tahfidzSlots ?? [],
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  };
}

// Test connection and count documents
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; counts?: SupabaseConfig['counts']; error?: string }> {
  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Test teachers table
    const { count: teachersCount, error: tErr } = await client
      .from('teachers')
      .select('*', { count: 'exact', head: true });

    if (tErr) {
      if (tErr.message?.includes('does not exist') || tErr.code === '42P01') {
        return {
          success: false,
          error: 'Tabel "teachers" belum dibuat di Supabase. Silakan buka menu "SQL Editor" di Supabase dan jalankan skrip SQL di bawah.',
        };
      }
      return { success: false, error: `Supabase Error: ${tErr.message}` };
    }

    // Schedules count
    const { count: schedulesCount } = await client
      .from('schedules')
      .select('*', { count: 'exact', head: true });

    // Holidays count
    const { count: holidaysCount } = await client
      .from('holidays')
      .select('*', { count: 'exact', head: true });

    // Attendances count
    const { count: attendancesCount } = await client
      .from('attendances')
      .select('*', { count: 'exact', head: true });

    return {
      success: true,
      counts: {
        teachers: teachersCount || 0,
        schedules: schedulesCount || 0,
        holidays: holidaysCount || 0,
        attendances: attendancesCount || 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Gagal menghubungi server Supabase.',
    };
  }
}
