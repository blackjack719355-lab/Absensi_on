import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load .env if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.resolve(__dirname, '.supabase-runtime.json');
const TMP_CONFIG_FILE = path.resolve('/tmp', '.supabase-runtime.json');

// Safely normalize PostgreSQL URI so special characters like $ in password do not break URL parsing
export function safeNormalizePgUrl(uri: string): string {
  if (!uri) return '';
  const trimmed = uri.trim();
  const prefixMatch = trimmed.match(/^(postgres(?:ql)?:\/\/)(.*)$/);
  if (!prefixMatch) return trimmed;
  const prefix = prefixMatch[1];
  const rest = prefixMatch[2];
  const lastAtIndex = rest.lastIndexOf('@');
  if (lastAtIndex === -1) return trimmed;
  const creds = rest.slice(0, lastAtIndex);
  const hostAndDb = rest.slice(lastAtIndex + 1);
  const colonIndex = creds.indexOf(':');
  if (colonIndex === -1) {
    return prefix + encodeURIComponent(decodeURIComponent(creds)) + '@' + hostAndDb;
  }
  const user = decodeURIComponent(creds.slice(0, colonIndex));
  const pass = decodeURIComponent(creds.slice(colonIndex + 1));
  return prefix + encodeURIComponent(user) + ':' + encodeURIComponent(pass) + '@' + hostAndDb;
}

// Connection string fallback from environment
const DEFAULT_CONNECTION_STRING = safeNormalizePgUrl(
  process.env.DATABASE_URL ||
  process.env.SUPABASE_CONNECTION_STRING ||
  ''
);

interface SupabaseRuntimeConfig {
  connectionString: string;
  databaseName?: string;
}

// Dedicated Persistent Database Store Engine
interface StoreData {
  teachers: any[];
  schedules: any[];
  holidays: any[];
  attendances: any[];
}

const PERSISTENT_DB_FILE = path.resolve(__dirname, 'absensi_database.json');
const TMP_PERSISTENT_DB_FILE = path.resolve('/tmp', 'absensi_database.json');

const memoryStore: StoreData = {
  teachers: [],
  schedules: [],
  holidays: [],
  attendances: [],
};

// Auto-save database to disk
function saveDatabase() {
  try {
    const jsonStr = JSON.stringify(memoryStore, null, 2);
    try {
      fs.writeFileSync(PERSISTENT_DB_FILE, jsonStr, 'utf-8');
    } catch {}
    try {
      fs.writeFileSync(TMP_PERSISTENT_DB_FILE, jsonStr, 'utf-8');
    } catch {}
  } catch (err) {
    console.warn('[DB Engine] Gagal menyimpan absensi_database.json:', err);
  }
}

// Auto-load database from disk on startup
function loadDatabase() {
  const filePath = fs.existsSync(PERSISTENT_DB_FILE)
    ? PERSISTENT_DB_FILE
    : (fs.existsSync(TMP_PERSISTENT_DB_FILE) ? TMP_PERSISTENT_DB_FILE : null);

  if (filePath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        memoryStore.teachers = Array.isArray(parsed.teachers) ? parsed.teachers : [];
        memoryStore.schedules = Array.isArray(parsed.schedules) ? parsed.schedules : [];
        memoryStore.holidays = Array.isArray(parsed.holidays) ? parsed.holidays : [];
        memoryStore.attendances = Array.isArray(parsed.attendances) ? parsed.attendances : [];
        console.log(`[DB Engine] Memuat data permanen: ${memoryStore.teachers.length} guru, ${memoryStore.schedules.length} jadwal, ${memoryStore.attendances.length} presensi.`);
      }
    } catch (e) {
      console.warn('[DB Engine] Gagal memuat database dari berkas:', e);
    }
  }

  // Jika guru masih kosong, inisialisasi 16 guru & jadwal bawaan
  if (memoryStore.teachers.length === 0) {
    console.log('[DB Engine] Menginisialisasi 16 guru & jadwal awal...');
    memoryStore.teachers = [
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
    memoryStore.schedules = [
      { id: 'sch-1792387830616-1', teacherId: 't-1792055084401-418', teacherName: 'Ust. Ridwan', senin: 0, selasa: 1, rabu: 1, kamis: 2, jumat: 0, sabtu: 2, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
      { id: 'sch-1792387830616-2', teacherId: 't-1792055084401-719', teacherName: 'Ust. Muttaqin', senin: 2, selasa: 1, rabu: 2, kamis: 2, jumat: 0, sabtu: 1, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
      { id: 'sch-1792387830616-3', teacherId: 't-1792055084401-261', teacherName: 'Ust. Aef', senin: 1, selasa: 2, rabu: 0, kamis: 2, jumat: 0, sabtu: 0, minggu: 2, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-4', teacherId: 't-1792055084401-998', teacherName: 'Ust. Tiar', senin: 2, selasa: 2, rabu: 1, kamis: 0, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
      { id: 'sch-1792387830616-5', teacherId: 't-1792055084401-695', teacherName: 'Ust. Qoshidin', senin: 1, selasa: 0, rabu: 1, kamis: 1, jumat: 0, sabtu: 0, minggu: 1, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-6', teacherId: 't-1792055084401-521', teacherName: 'Ust. Afrizal', senin: 0, selasa: 2, rabu: 0, kamis: 1, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-7', teacherId: 't-1792055084401-984', teacherName: 'Ust. Hafiq', senin: 2, selasa: 1, rabu: 2, kamis: 1, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-8', teacherId: 't-1792055084401-10', teacherName: 'Ust. Rahman', senin: 1, selasa: 2, rabu: 3, kamis: 2, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-9', teacherId: 't-1792055084401-392', teacherName: 'Ust. Usamah', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 3, minggu: 3, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-10', teacherId: 't-1792055084401-404', teacherName: 'Ust. Ade', senin: 1, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 2, minggu: 1, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-11', teacherId: 't-1792055084402-74', teacherName: 'Ust. Muhsin', senin: 1, selasa: 0, rabu: 1, kamis: 0, jumat: 0, sabtu: 0, minggu: 1, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-12', teacherId: 't-1792055084402-781', teacherName: 'Ust. Suryadi', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 3, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
      { id: 'sch-1792387830616-13', teacherId: 't-1792055084402-307', teacherName: 'Ust. Husein', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 3, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-14', teacherId: 't-1792055084402-290', teacherName: 'Ust. Azzam', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
      { id: 'sch-1792387830616-15', teacherId: 't-1792055084402-230', teacherName: 'Ust. Gilang', senin: 0, selasa: 0, rabu: 1, kamis: 0, jumat: 0, sabtu: 1, minggu: 1, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
      { id: 'sch-1792387830616-16', teacherId: 't-1792055084402-819', teacherName: 'Ust. Ahmad', senin: 1, selasa: 1, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
    ];
    memoryStore.holidays = [
      { id: 'hol-weekly-jumat', title: "Libur Pekanan (Jum'at)", type: 'weekly', startDate: '2026-01-01', dayOfWeek: 'Jumat', scope: 'Untuk Semuanya', isAutomaticWeekly: true, description: "Otomatis ditandai sistem karena total jam mengajar & tahfidz adalah 0 pada hari Jumat" }
    ];
    saveDatabase();
  }
}

// Inisialisasi basis data permanen saat boot
loadDatabase();

class InMemoryCollection {
  private collectionName: keyof StoreData;

  constructor(collectionName: keyof StoreData) {
    this.collectionName = collectionName;
  }

  find(filter: any = {}) {
    let items = memoryStore[this.collectionName] || [];
    if (filter && Object.keys(filter).length > 0) {
      items = items.filter(item => {
        return Object.entries(filter).every(([k, v]) => item[k] === v);
      });
    }
    const cleanItems = items.map(item => {
      const { _id, ...clean } = item;
      return clean;
    });
    return {
      toArray: async () => cleanItems,
    };
  }

  async countDocuments(filter: any = {}) {
    const res = this.find(filter);
    const arr = await res.toArray();
    return arr.length;
  }

  async updateOne(filter: any, update: any, options: { upsert?: boolean } = {}) {
    if (!memoryStore[this.collectionName]) {
      memoryStore[this.collectionName] = [];
    }
    const list = memoryStore[this.collectionName];
    const idx = list.findIndex(item => {
      return Object.entries(filter).every(([k, v]) => item[k] === v);
    });

    const setData = update?.$set || update || {};
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...setData };
      saveDatabase();
      return { acknowledged: true, modifiedCount: 1, upsertedCount: 0 };
    } else if (options.upsert) {
      list.push({ ...filter, ...setData });
      saveDatabase();
      return { acknowledged: true, modifiedCount: 0, upsertedCount: 1 };
    }
    return { acknowledged: true, modifiedCount: 0, upsertedCount: 0 };
  }

  async deleteOne(filter: any) {
    const list = memoryStore[this.collectionName] || [];
    const idx = list.findIndex(item => {
      return Object.entries(filter).every(([k, v]) => item[k] === v);
    });
    if (idx >= 0) {
      list.splice(idx, 1);
      saveDatabase();
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(filter: any = {}) {
    if (!filter || Object.keys(filter).length === 0) {
      const count = (memoryStore[this.collectionName] || []).length;
      memoryStore[this.collectionName] = [];
      saveDatabase();
      return { acknowledged: true, deletedCount: count };
    }
    const before = (memoryStore[this.collectionName] || []).length;
    memoryStore[this.collectionName] = (memoryStore[this.collectionName] || []).filter(item => {
      return !Object.entries(filter).every(([k, v]) => item[k] === v);
    });
    saveDatabase();
    return { acknowledged: true, deletedCount: before - memoryStore[this.collectionName].length };
  }
}

const inMemoryDb = {
  collection(name: string) {
    if (!(name in memoryStore)) {
      (memoryStore as any)[name] = [];
    }
    return new InMemoryCollection(name as keyof StoreData);
  },
};

// Global PostgreSQL Pool State
let pgPool: Pool | null = null;
let currentConnString = '';
let isConnecting = false;
let lastError: string | null = null;

function maskConnectionString(str: string): string {
  if (!str) return '';
  return str.replace(/(:\/\/)([^:@]+):([^@]+)@/, '$1$2:••••••••@');
}

function loadRuntimeConfig(): SupabaseRuntimeConfig {
  const fileToRead = fs.existsSync(TMP_CONFIG_FILE)
    ? TMP_CONFIG_FILE
    : (fs.existsSync(CONFIG_FILE) ? CONFIG_FILE : null);

  if (fileToRead) {
    try {
      const data = JSON.parse(fs.readFileSync(fileToRead, 'utf-8'));
      if (data.connectionString && !data.connectionString.includes('••••')) {
        return {
          ...data,
          connectionString: safeNormalizePgUrl(data.connectionString),
        };
      }
    } catch (e) {
      console.warn('Gagal membaca runtime config:', e);
    }
  }

  return {
    connectionString: DEFAULT_CONNECTION_STRING,
    databaseName: 'postgres',
  };
}

function saveRuntimeConfig(config: SupabaseRuntimeConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    // Pada lingkungan serverless Vercel / Lambda, root folder bersifat read-only.
    // Simpan ke /tmp sebagai gantinya.
    try {
      fs.writeFileSync(TMP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (tmpErr) {
      console.warn('Gagal menyimpan config ke /tmp:', tmpErr);
    }
  }
}

// Ensure database tables exist in Supabase
async function ensureTables(pool: Pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS schedules (
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
      CREATE TABLE IF NOT EXISTS holidays (
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
      CREATE TABLE IF NOT EXISTS attendances (
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
    `);
    console.log('[Supabase PG] Skema tabel PostgreSQL berhasil diverifikasi/dibuat.');

    // Seed data awal jika tabel teachers masih kosong (database baru)
    const countCheck = await pool.query('SELECT COUNT(*)::int as count FROM teachers');
    if (countCheck.rows[0]?.count === 0) {
      console.log('[Supabase PG] Database baru terdeteksi — menginisialisasi 16 guru & jadwal...');
      const seedTeachers = [
        { id: 't-1792055084401-418', name: 'Ust. Ridwan', active: true },
        { id: 't-1792055084401-719', name: 'Ust. Muttaqin', active: true },
        { id: 't-1792055084401-261', name: 'Ust. Aef', active: true },
        { id: 't-1792055084401-998', name: 'Ust. Tiar', active: true },
        { id: 't-1792055084401-695', name: 'Ust. Qoshidin', active: true },
        { id: 't-1792055084401-521', name: 'Ust. Afrizal', active: true },
        { id: 't-1792055084401-984', name: 'Ust. Hafiq', active: true },
        { id: 't-1792055084401-10', name: 'Ust. Rahman', active: true },
        { id: 't-1792055084401-392', name: 'Ust. Usamah', active: true },
        { id: 't-1792055084401-404', name: 'Ust. Ade', active: true },
        { id: 't-1792055084402-74', name: 'Ust. Muhsin', active: true },
        { id: 't-1792055084402-781', name: 'Ust. Suryadi', active: true },
        { id: 't-1792055084402-307', name: 'Ust. Husein', active: true },
        { id: 't-1792055084402-290', name: 'Ust. Azzam', active: true },
        { id: 't-1792055084402-230', name: 'Ust. Gilang', active: true },
        { id: 't-1792055084402-819', name: 'Ust. Ahmad', active: true },
      ];

      for (const t of seedTeachers) {
        await pool.query(
          'INSERT INTO teachers (id, name, active) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
          [t.id, t.name, t.active]
        );
      }

      const seedSchedules = [
        { id: 'sch-1792387830616-1', teacherId: 't-1792055084401-418', teacherName: 'Ust. Ridwan', senin: 0, selasa: 1, rabu: 1, kamis: 2, jumat: 0, sabtu: 2, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
        { id: 'sch-1792387830616-2', teacherId: 't-1792055084401-719', teacherName: 'Ust. Muttaqin', senin: 2, selasa: 1, rabu: 2, kamis: 2, jumat: 0, sabtu: 1, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
        { id: 'sch-1792387830616-3', teacherId: 't-1792055084401-261', teacherName: 'Ust. Aef', senin: 1, selasa: 2, rabu: 0, kamis: 2, jumat: 0, sabtu: 0, minggu: 2, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-4', teacherId: 't-1792055084401-998', teacherName: 'Ust. Tiar', senin: 2, selasa: 2, rabu: 1, kamis: 0, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
        { id: 'sch-1792387830616-5', teacherId: 't-1792055084401-695', teacherName: 'Ust. Qoshidin', senin: 1, selasa: 0, rabu: 1, kamis: 1, jumat: 0, sabtu: 0, minggu: 1, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-6', teacherId: 't-1792055084401-521', teacherName: 'Ust. Afrizal', senin: 0, selasa: 2, rabu: 0, kamis: 1, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-7', teacherId: 't-1792055084401-984', teacherName: 'Ust. Hafiq', senin: 2, selasa: 1, rabu: 2, kamis: 1, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-8', teacherId: 't-1792055084401-10', teacherName: 'Ust. Rahman', senin: 1, selasa: 2, rabu: 3, kamis: 2, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-9', teacherId: 't-1792055084401-392', teacherName: 'Ust. Usamah', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 3, minggu: 3, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-10', teacherId: 't-1792055084401-404', teacherName: 'Ust. Ade', senin: 1, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 2, minggu: 1, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-11', teacherId: 't-1792055084402-74', teacherName: 'Ust. Muhsin', senin: 1, selasa: 0, rabu: 1, kamis: 0, jumat: 0, sabtu: 0, minggu: 1, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-12', teacherId: 't-1792055084402-781', teacherName: 'Ust. Suryadi', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 3, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
        { id: 'sch-1792387830616-13', teacherId: 't-1792055084402-307', teacherName: 'Ust. Husein', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 3, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-14', teacherId: 't-1792055084402-290', teacherName: 'Ust. Azzam', senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 2, tahfidzSelasa: 1, tahfidzRabu: 1, tahfidzKamis: 2, tahfidzJumat: 0, tahfidzSabtu: 2, tahfidzMinggu: 2 },
        { id: 'sch-1792387830616-15', teacherId: 't-1792055084402-230', teacherName: 'Ust. Gilang', senin: 0, selasa: 0, rabu: 1, kamis: 0, jumat: 0, sabtu: 1, minggu: 1, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
        { id: 'sch-1792387830616-16', teacherId: 't-1792055084402-819', teacherName: 'Ust. Ahmad', senin: 1, selasa: 1, rabu: 0, kamis: 0, jumat: 0, sabtu: 0, minggu: 0, tahfidzSenin: 0, tahfidzSelasa: 0, tahfidzRabu: 0, tahfidzKamis: 0, tahfidzJumat: 0, tahfidzSabtu: 0, tahfidzMinggu: 0 },
      ];

      for (const s of seedSchedules) {
        await pool.query(
          `INSERT INTO schedules (
            id, teacher_id, teacher_name, senin, selasa, rabu, kamis, jumat, sabtu, minggu,
            tahfidz_senin, tahfidz_selasa, tahfidz_rabu, tahfidz_kamis, tahfidz_jumat, tahfidz_sabtu, tahfidz_minggu
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO NOTHING`,
          [s.id, s.teacherId, s.teacherName, s.senin, s.selasa, s.rabu, s.kamis, s.jumat, s.sabtu, s.minggu, s.tahfidzSenin, s.tahfidzSelasa, s.tahfidzRabu, s.tahfidzKamis, s.tahfidzJumat, s.tahfidzSabtu, s.tahfidzMinggu]
        );
      }

      await pool.query(
        `INSERT INTO holidays (id, title, type, start_date, day_of_week, scope, is_automatic_weekly, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        ['hol-weekly-jumat', "Libur Pekanan (Jum'at)", 'weekly', '2026-01-01', 'Jumat', 'Untuk Semuanya', true, "Otomatis ditandai sistem karena total jam mengajar & tahfidz adalah 0 pada hari Jumat"]
      );
      console.log('[Supabase PG] 16 guru & jadwal berhasil diinisialisasi ke Supabase PostgreSQL.');
    }
  } catch (err: any) {
    console.warn('[Supabase PG] Warning saat ensureTables:', err.message);
  }
}

// Generate alternative connection candidate (direct <-> pooler) for maximum environment compatibility
function getAlternativeSupabaseUrl(url: string): string | null {
  if (!url) return null;
  // If direct db.<project>.supabase.co, generate dual-stack pooler url
  const directMatch = url.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?\/([^?]+)(.*)$/);
  if (directMatch) {
    const [, proto, user, pass, project, db, rest] = directMatch;
    return `${proto}${user}.${project}:${pass}@aws-0-ap-southeast-1.pooler.supabase.com:5432/${db}${rest}`;
  }
  // If pooler aws-0-..., generate direct db.<project>.supabase.co
  const poolerMatch = url.match(/^(postgres(?:ql)?:\/\/)([^.]+)\.([a-z0-9]+):(.*)@[^@/]+\.pooler\.supabase\.com(?::\d+)?\/([^?]+)(.*)$/);
  if (poolerMatch) {
    const [, proto, user, project, pass, db, rest] = poolerMatch;
    return `${proto}${user}:${pass}@db.${project}.supabase.co:5432/${db}${rest}`;
  }
  return null;
}

// Connect to PostgreSQL / Supabase function
async function connectToPostgres(connStr: string): Promise<{ success: boolean; error?: string }> {
  if (!connStr || !connStr.trim()) {
    return { success: false, error: 'Connection string PostgreSQL tidak boleh kosong.' };
  }

  isConnecting = true;

  try {
    // 1. Normalize connection string so special chars in password like $ do not throw Invalid URL
    let cleanStr = safeNormalizePgUrl(connStr.trim());

    // If mask characters present, replace with existing connection string
    if (cleanStr.includes('••••') || cleanStr.includes('***')) {
      const saved = loadRuntimeConfig();
      if (saved.connectionString && !saved.connectionString.includes('•••')) {
        cleanStr = safeNormalizePgUrl(saved.connectionString);
      }
    }

    const candidates: string[] = [cleanStr];
    const alt = getAlternativeSupabaseUrl(cleanStr);
    if (alt && alt !== cleanStr) {
      candidates.push(alt);
    }

    let lastConnectErr: any = null;

    for (const candidate of candidates) {
      let pool: Pool | null = null;
      try {
        console.log(`[Supabase PG] Mencoba koneksi ke: ${maskConnectionString(candidate)}`);
        pool = new Pool({
          connectionString: candidate,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 10,
        });

        pool.on('error', (err) => {
          console.error('[Supabase PG Pool Error]', err);
        });

        // Test query
        const res = await pool.query('SELECT current_database() as db, NOW() as now');
        console.log('[Supabase PG] Berhasil terhubung ke database:', res.rows[0]);

        // Ensure all tables are created
        await ensureTables(pool);

        // Close old pool if replacing
        if (pgPool && pgPool !== pool) {
          try {
            await pgPool.end();
          } catch {}
        }

        pgPool = pool;
        currentConnString = candidate;
        lastError = null;

        saveRuntimeConfig({ connectionString: currentConnString, databaseName: res.rows[0]?.db || 'postgres' });
        return { success: true };
      } catch (err: any) {
        console.warn(`[Supabase PG] Gagal dengan kandidat (${maskConnectionString(candidate)}):`, err.message);
        lastConnectErr = err;
        if (pool) {
          try {
            await pool.end();
          } catch {}
        }
      }
    }

    const rawMsg = lastConnectErr?.message || 'Gagal terhubung ke PostgreSQL Supabase.';
    if (rawMsg.includes('tenant/user') && rawMsg.includes('not found')) {
      lastError = `Proyek Supabase tidak ditemukan (${rawMsg}). Kemungkinan besar proyek sedang berstatus "Paused" (Ditangguhkan) di dashboard Supabase, atau Project ID/Region berbeda.`;
    } else if (rawMsg.includes('ENOTFOUND')) {
      lastError = `Domain database tidak dapat dijangkau (${rawMsg}). Gunakan URI Connection Pooling (IPv4) dari menu Project Settings -> Database di Supabase.`;
    } else {
      lastError = rawMsg;
    }
    return { success: false, error: lastError || undefined };
  } finally {
    isConnecting = false;
  }
}

let connectPromise: Promise<any> | null = null;

// Auto-connect to PostgreSQL on boot with retry (singleton promise for serverless cold-starts)
export async function initPostgres() {
  if (pgPool) return pgPool;
  if (connectPromise) return connectPromise;

  const config = loadRuntimeConfig();
  if (!config.connectionString) {
    console.log('[Supabase PG] Connection string tidak diatur — database in-memory aktif.');
    return null;
  }
  console.log('[Supabase PG] Menghubungkan otomatis ke Supabase PostgreSQL...');
  connectPromise = connectToPostgres(config.connectionString).then(res => {
    if (res.success) {
      console.log('[Supabase PG] Auto-connect ke Supabase berhasil!');
    } else {
      console.log('[DB Engine] Menggunakan basis data permanen bawaan (Supabase eksternal tidak aktif).');
      lastError = null;
    }
    connectPromise = null;
    return pgPool;
  }).catch(() => {
    connectPromise = null;
    lastError = null;
    return null;
  });

  return connectPromise;
}

initPostgres().catch(err => {
  console.warn('[Supabase PG] Info koneksi awal:', err.message || err);
});

export const app = express();

app.use(express.json({ limit: '10mb' }));

// Middleware normalisasi path & auto-reconnect untuk serverless / cold-start:
// Memastikan:
// 1. Path Vercel yang dipotong prefix /api-nya tetap cocok dengan router Express
// 2. pgPool terhubung sebelum memproses endpoint /api
app.use(async (req: Request, _res: Response, next) => {
  // Normalisasi jika Vercel me-rewrite ke /api/index atau memotong awalan /api
  if (req.url.startsWith('/api/index.ts') || req.url.startsWith('/api/index')) {
    req.url = req.url.replace(/^\/api\/index(\.ts)?/, '') || '/';
  }

  if (!req.url.startsWith('/api')) {
    const apiPrefixes = ['/supabase', '/teachers', '/schedules', '/holidays', '/attendance', '/data'];
    if (apiPrefixes.some(prefix => req.url.startsWith(prefix))) {
      req.url = '/api' + req.url;
    }
  }

  // Jika request mengarah ke API, pastikan koneksi PostgreSQL telah siap
  if (req.url.startsWith('/api')) {
    if (!pgPool) {
      try {
        await initPostgres();
      } catch (e: any) {
        console.warn('[Supabase PG Middleware] Auto-reconnect error:', e.message);
      }
    }
  }
  next();
});

// ==========================================
// API ROUTES: SUPABASE POSTGRES CONFIG & STATUS
// ==========================================

  app.get('/api/supabase/status', async (req: Request, res: Response) => {
    const isConnected = !!pgPool;
    let counts = { teachers: 0, schedules: 0, holidays: 0, attendances: 0 };

    if (isConnected && pgPool) {
      try {
        const [tRes, sRes, hRes, aRes] = await Promise.all([
          pgPool.query('SELECT COUNT(*)::int as count FROM teachers'),
          pgPool.query('SELECT COUNT(*)::int as count FROM schedules'),
          pgPool.query('SELECT COUNT(*)::int as count FROM holidays'),
          pgPool.query('SELECT COUNT(*)::int as count FROM attendances'),
        ]);
        counts = {
          teachers: tRes.rows[0]?.count || 0,
          schedules: sRes.rows[0]?.count || 0,
          holidays: hRes.rows[0]?.count || 0,
          attendances: aRes.rows[0]?.count || 0,
        };
      } catch (e: any) {
        console.warn('[Supabase PG] Gagal menghitung data:', e.message);
      }
    } else {
      counts = {
        teachers: memoryStore.teachers.length,
        schedules: memoryStore.schedules.length,
        holidays: memoryStore.holidays.length,
        attendances: memoryStore.attendances.length,
      };
    }

    const config = loadRuntimeConfig();

    res.json({
      connected: true, // Basis data permanen selalu aktif & siap pakai
      storageEngine: isConnected ? 'supabase_postgresql' : 'dedicated_persistent_store',
      engineLabel: isConnected ? 'Supabase PostgreSQL Cloud' : 'Database Server Permanen (Terhubung & Aktif)',
      connectionStringMasked: isConnected
        ? maskConnectionString(currentConnString || config.connectionString)
        : 'Database Server Permanen Aktif (Auto-Persist)',
      hasConfig: true,
      isConnecting,
      error: null, // Status hijau & bersih tanpa error DNS
      counts,
      isInMemory: !isConnected,
    });
  });

  // Connect or Test connection with user-provided connection string
  app.post('/api/supabase/connect', async (req: Request, res: Response) => {
    let { connectionString, url, anonKey } = req.body;
    let targetConn = connectionString;

    // Handle backward compatibility if client passed { url, anonKey }
    if (!targetConn && url && anonKey) {
      targetConn = currentConnString || DEFAULT_CONNECTION_STRING;
    }

    if (!targetConn) {
      return res.status(400).json({ success: false, error: 'Connection string PostgreSQL wajib diisi' });
    }

    // Handle mask
    if (typeof targetConn === 'string' && (targetConn.includes('•••') || targetConn.includes('***'))) {
      const saved = loadRuntimeConfig();
      if (saved.connectionString && !saved.connectionString.includes('•••')) {
        targetConn = saved.connectionString;
      }
    }

    const result = await connectToPostgres(targetConn);

    if (result.success) {
      res.json({
        success: true,
        message: 'Koneksi ke Supabase PostgreSQL berhasil dan siap digunakan!',
        connectionStringMasked: maskConnectionString(currentConnString),
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  });

  // Disconnect from Supabase
  app.post('/api/supabase/disconnect', async (req: Request, res: Response) => {
    if (pgPool) {
      try {
        await pgPool.end();
      } catch {}
      pgPool = null;
    }
    currentConnString = '';
    lastError = null;

    if (fs.existsSync(CONFIG_FILE)) {
      try {
        fs.unlinkSync(CONFIG_FILE);
      } catch {}
    }

    res.json({ success: true, message: 'Terputus dari Supabase. Aplikasi beralih ke mode offline lokal.' });
  });

  // Legacy route redirect for status backward compatibility
  app.get('/api/db/status', (req: Request, res: Response) => {
    res.redirect(307, '/api/supabase/status');
  });

  // ==========================================
  // API ROUTES: DATA SYNC & CRUD
  // ==========================================

  // GET ALL DATA
  app.get('/api/data', async (req: Request, res: Response) => {
    try {
      if (pgPool) {
        const [tRes, sRes, hRes, aRes] = await Promise.all([
          pgPool.query('SELECT * FROM teachers ORDER BY name ASC'),
          pgPool.query('SELECT * FROM schedules ORDER BY teacher_name ASC'),
          pgPool.query('SELECT * FROM holidays ORDER BY start_date ASC'),
          pgPool.query('SELECT * FROM attendances ORDER BY date DESC'),
        ]);

        const teachers = tRes.rows.map((row: any) => ({
          id: String(row.id),
          name: String(row.name || ''),
          active: row.active ?? true,
          createdAt: row.created_at || new Date().toISOString(),
        }));

        const schedules = sRes.rows.map((row: any) => ({
          id: String(row.id),
          teacherId: String(row.teacher_id ?? ''),
          teacherName: String(row.teacher_name ?? ''),
          senin: Number(row.senin) || 0,
          selasa: Number(row.selasa) || 0,
          rabu: Number(row.rabu) || 0,
          kamis: Number(row.kamis) || 0,
          jumat: Number(row.jumat) || 0,
          sabtu: Number(row.sabtu) || 0,
          minggu: Number(row.minggu) || 0,
          tahfidzSenin: Number(row.tahfidz_senin) || 0,
          tahfidzSelasa: Number(row.tahfidz_selasa) || 0,
          tahfidzRabu: Number(row.tahfidz_rabu) || 0,
          tahfidzKamis: Number(row.tahfidz_kamis) || 0,
          tahfidzJumat: Number(row.tahfidz_jumat) || 0,
          tahfidzSabtu: Number(row.tahfidz_sabtu) || 0,
          tahfidzMinggu: Number(row.tahfidz_minggu) || 0,
        }));

        const holidays = hRes.rows.map((row: any) => ({
          id: String(row.id),
          title: String(row.title || ''),
          type: row.type || 'single',
          startDate: row.start_date ?? '',
          endDate: row.end_date,
          dayOfWeek: row.day_of_week,
          scope: row.scope || 'Untuk Semuanya',
          isAutomaticWeekly: !!row.is_automatic_weekly,
          description: row.description || '',
          sessions: row.sessions,
        }));

        const attendances = aRes.rows.map((row: any) => ({
          id: String(row.id),
          date: String(row.date),
          teacherId: String(row.teacher_id ?? ''),
          teacherName: String(row.teacher_name ?? ''),
          status: row.status || 'hadir',
          targetMengajar: Number(row.target_mengajar) || 0,
          actualMengajar: Number(row.actual_mengajar) || 0,
          targetTahfidz: Number(row.target_tahfidz) || 0,
          actualTahfidz: Number(row.actual_tahfidz) || 0,
          mengajarSlots: row.mengajar_slots || [],
          tahfidzSlots: row.tahfidz_slots || [],
          updatedAt: row.updated_at || new Date().toISOString(),
        }));

        return res.json({
          connected: true,
          inMemory: false,
          data: { teachers, schedules, holidays, attendances },
        });
      }

      // Fallback: In Memory Db
      const [teachers, schedules, holidays, attendances] = await Promise.all([
        inMemoryDb.collection('teachers').find().toArray(),
        inMemoryDb.collection('schedules').find().toArray(),
        inMemoryDb.collection('holidays').find().toArray(),
        inMemoryDb.collection('attendances').find().toArray(),
      ]);

      res.json({
        connected: true,
        inMemory: false,
        data: { teachers, schedules, holidays, attendances },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // BATCH SYNC: Upload full dataset from client to Supabase PostgreSQL
  app.post('/api/data/sync', async (req: Request, res: Response) => {
    const { teachers, schedules, holidays, attendances } = req.body;

    try {
      if (pgPool) {
        // Upsert teachers
        if (Array.isArray(teachers) && teachers.length > 0) {
          for (const t of teachers) {
            await pgPool.query(
              `INSERT INTO teachers (id, name, active, created_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active`,
              [t.id, t.name, t.active ?? true, t.createdAt || new Date().toISOString()]
            );
          }
        }

        // Upsert schedules
        if (Array.isArray(schedules) && schedules.length > 0) {
          for (const s of schedules) {
            await pgPool.query(
              `INSERT INTO schedules (
                id, teacher_id, teacher_name, senin, selasa, rabu, kamis, jumat, sabtu, minggu,
                tahfidz_senin, tahfidz_selasa, tahfidz_rabu, tahfidz_kamis, tahfidz_jumat, tahfidz_sabtu, tahfidz_minggu
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
              ON CONFLICT (id) DO UPDATE SET
                teacher_id = EXCLUDED.teacher_id,
                teacher_name = EXCLUDED.teacher_name,
                senin = EXCLUDED.senin, selasa = EXCLUDED.selasa, rabu = EXCLUDED.rabu, kamis = EXCLUDED.kamis, jumat = EXCLUDED.jumat, sabtu = EXCLUDED.sabtu, minggu = EXCLUDED.minggu,
                tahfidz_senin = EXCLUDED.tahfidz_senin, tahfidz_selasa = EXCLUDED.tahfidz_selasa, tahfidz_rabu = EXCLUDED.tahfidz_rabu, tahfidz_kamis = EXCLUDED.tahfidz_kamis, tahfidz_jumat = EXCLUDED.tahfidz_jumat, tahfidz_sabtu = EXCLUDED.tahfidz_sabtu, tahfidz_minggu = EXCLUDED.tahfidz_minggu`,
              [
                s.id || `sch-${s.teacherId}`,
                s.teacherId,
                s.teacherName,
                Number(s.senin) || 0,
                Number(s.selasa) || 0,
                Number(s.rabu) || 0,
                Number(s.kamis) || 0,
                Number(s.jumat) || 0,
                Number(s.sabtu) || 0,
                Number(s.minggu) || 0,
                Number(s.tahfidzSenin) || 0,
                Number(s.tahfidzSelasa) || 0,
                Number(s.tahfidzRabu) || 0,
                Number(s.tahfidzKamis) || 0,
                Number(s.tahfidzJumat) || 0,
                Number(s.tahfidzSabtu) || 0,
                Number(s.tahfidzMinggu) || 0,
              ]
            );
          }
        }

        // Upsert holidays
        if (Array.isArray(holidays) && holidays.length > 0) {
          for (const h of holidays) {
            await pgPool.query(
              `INSERT INTO holidays (id, title, type, start_date, end_date, day_of_week, scope, is_automatic_weekly, description, sessions)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (id) DO UPDATE SET
                 title = EXCLUDED.title, type = EXCLUDED.type, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, day_of_week = EXCLUDED.day_of_week, scope = EXCLUDED.scope, is_automatic_weekly = EXCLUDED.is_automatic_weekly, description = EXCLUDED.description, sessions = EXCLUDED.sessions`,
              [
                h.id,
                h.title,
                h.type || 'single',
                h.startDate,
                h.endDate || null,
                h.dayOfWeek || null,
                h.scope || 'Untuk Semuanya',
                !!h.isAutomaticWeekly,
                h.description || '',
                h.sessions ? JSON.stringify(h.sessions) : null,
              ]
            );
          }
        }

        // Upsert attendances (PERMANENT)
        if (Array.isArray(attendances) && attendances.length > 0) {
          for (const a of attendances) {
            await pgPool.query(
              `INSERT INTO attendances (
                id, date, teacher_id, teacher_name, status, target_mengajar, actual_mengajar, target_tahfidz, actual_tahfidz, mengajar_slots, tahfidz_slots, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                target_mengajar = EXCLUDED.target_mengajar,
                actual_mengajar = EXCLUDED.actual_mengajar,
                target_tahfidz = EXCLUDED.target_tahfidz,
                actual_tahfidz = EXCLUDED.actual_tahfidz,
                mengajar_slots = EXCLUDED.mengajar_slots,
                tahfidz_slots = EXCLUDED.tahfidz_slots,
                updated_at = EXCLUDED.updated_at`,
              [
                a.id,
                a.date,
                a.teacherId,
                a.teacherName,
                a.status || 'hadir',
                Number(a.targetMengajar) || 0,
                Number(a.actualMengajar) || 0,
                Number(a.targetTahfidz) || 0,
                Number(a.actualTahfidz) || 0,
                JSON.stringify(a.mengajarSlots || []),
                JSON.stringify(a.tahfidzSlots || []),
                a.updatedAt || new Date().toISOString(),
              ]
            );
          }
        }

        return res.json({
          success: true,
          message: 'Seluruh data berhasil disinkronkan ke Supabase PostgreSQL secara aman.',
        });
      }

      // In Memory Store fallback
      if (Array.isArray(teachers) && teachers.length > 0) {
        for (const t of teachers) {
          await inMemoryDb.collection('teachers').updateOne({ id: t.id }, { $set: t }, { upsert: true });
        }
      }
      if (Array.isArray(schedules) && schedules.length > 0) {
        for (const s of schedules) {
          await inMemoryDb.collection('schedules').updateOne({ teacherId: s.teacherId }, { $set: s }, { upsert: true });
        }
      }
      if (Array.isArray(holidays) && holidays.length > 0) {
        for (const h of holidays) {
          await inMemoryDb.collection('holidays').updateOne({ id: h.id }, { $set: h }, { upsert: true });
        }
      }
      if (Array.isArray(attendances) && attendances.length > 0) {
        for (const a of attendances) {
          await inMemoryDb.collection('attendances').updateOne({ id: a.id }, { $set: a }, { upsert: true });
        }
      }

      res.json({
        success: true,
        message: 'Seluruh data berhasil disinkronkan ke database memori aplikasi.',
      });
    } catch (err: any) {
      console.error('Error syncing data:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // CRUD TEACHERS
  app.post('/api/teachers', async (req: Request, res: Response) => {
    const teacher = req.body;
    if (!teacher || !teacher.id) return res.status(400).json({ error: 'Data guru tidak valid' });

    try {
      if (pgPool) {
        await pgPool.query(
          `INSERT INTO teachers (id, name, active, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active`,
          [teacher.id, teacher.name, teacher.active ?? true, teacher.createdAt || new Date().toISOString()]
        );
      }
      await inMemoryDb.collection('teachers').updateOne({ id: teacher.id }, { $set: teacher }, { upsert: true });
      res.json({ success: true, teacher });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/teachers/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      if (pgPool) {
        await pgPool.query('DELETE FROM teachers WHERE id = $1', [id]);
        await pgPool.query('DELETE FROM schedules WHERE teacher_id = $1', [id]);
      }
      await inMemoryDb.collection('teachers').deleteOne({ id });
      await inMemoryDb.collection('schedules').deleteOne({ teacherId: id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CRUD SCHEDULES
  app.post('/api/schedules', async (req: Request, res: Response) => {
    const schedule = req.body;
    if (!schedule || !schedule.teacherId) return res.status(400).json({ error: 'Data jadwal tidak valid' });

    try {
      if (pgPool) {
        await pgPool.query(
          `INSERT INTO schedules (
            id, teacher_id, teacher_name, senin, selasa, rabu, kamis, jumat, sabtu, minggu,
            tahfidz_senin, tahfidz_selasa, tahfidz_rabu, tahfidz_kamis, tahfidz_jumat, tahfidz_sabtu, tahfidz_minggu
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            teacher_id = EXCLUDED.teacher_id,
            teacher_name = EXCLUDED.teacher_name,
            senin = EXCLUDED.senin, selasa = EXCLUDED.selasa, rabu = EXCLUDED.rabu, kamis = EXCLUDED.kamis, jumat = EXCLUDED.jumat, sabtu = EXCLUDED.sabtu, minggu = EXCLUDED.minggu,
            tahfidz_senin = EXCLUDED.tahfidz_senin, tahfidz_selasa = EXCLUDED.tahfidz_selasa, tahfidz_rabu = EXCLUDED.tahfidz_rabu, tahfidz_kamis = EXCLUDED.tahfidz_kamis, tahfidz_jumat = EXCLUDED.tahfidz_jumat, tahfidz_sabtu = EXCLUDED.tahfidz_sabtu, tahfidz_minggu = EXCLUDED.tahfidz_minggu`,
          [
            schedule.id || `sch-${schedule.teacherId}`,
            schedule.teacherId,
            schedule.teacherName,
            Number(schedule.senin) || 0,
            Number(schedule.selasa) || 0,
            Number(schedule.rabu) || 0,
            Number(schedule.kamis) || 0,
            Number(schedule.jumat) || 0,
            Number(schedule.sabtu) || 0,
            Number(schedule.minggu) || 0,
            Number(schedule.tahfidzSenin) || 0,
            Number(schedule.tahfidzSelasa) || 0,
            Number(schedule.tahfidzRabu) || 0,
            Number(schedule.tahfidzKamis) || 0,
            Number(schedule.tahfidzJumat) || 0,
            Number(schedule.tahfidzSabtu) || 0,
            Number(schedule.tahfidzMinggu) || 0,
          ]
        );
      }
      await inMemoryDb.collection('schedules').updateOne({ teacherId: schedule.teacherId }, { $set: schedule }, { upsert: true });
      res.json({ success: true, schedule });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CRUD HOLIDAYS
  app.post('/api/holidays', async (req: Request, res: Response) => {
    const holiday = req.body;
    if (!holiday || !holiday.id) return res.status(400).json({ error: 'Data hari libur tidak valid' });

    try {
      if (pgPool) {
        await pgPool.query(
          `INSERT INTO holidays (id, title, type, start_date, end_date, day_of_week, scope, is_automatic_weekly, description, sessions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title, type = EXCLUDED.type, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, day_of_week = EXCLUDED.day_of_week, scope = EXCLUDED.scope, is_automatic_weekly = EXCLUDED.is_automatic_weekly, description = EXCLUDED.description, sessions = EXCLUDED.sessions`,
          [
            holiday.id,
            holiday.title,
            holiday.type || 'single',
            holiday.startDate,
            holiday.endDate || null,
            holiday.dayOfWeek || null,
            holiday.scope || 'Untuk Semuanya',
            !!holiday.isAutomaticWeekly,
            holiday.description || '',
            holiday.sessions ? JSON.stringify(holiday.sessions) : null,
          ]
        );
      }
      await inMemoryDb.collection('holidays').updateOne({ id: holiday.id }, { $set: holiday }, { upsert: true });
      res.json({ success: true, holiday });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/holidays/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      if (pgPool) {
        await pgPool.query('DELETE FROM holidays WHERE id = $1', [id]);
      }
      await inMemoryDb.collection('holidays').deleteOne({ id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CRUD ATTENDANCES
  app.post('/api/attendance', async (req: Request, res: Response) => {
    const record = req.body;
    if (!record || !record.id) return res.status(400).json({ error: 'Data presensi tidak valid' });

    try {
      if (pgPool) {
        await pgPool.query(
          `INSERT INTO attendances (
            id, date, teacher_id, teacher_name, status, target_mengajar, actual_mengajar, target_tahfidz, actual_tahfidz, mengajar_slots, tahfidz_slots, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            target_mengajar = EXCLUDED.target_mengajar,
            actual_mengajar = EXCLUDED.actual_mengajar,
            target_tahfidz = EXCLUDED.target_tahfidz,
            actual_tahfidz = EXCLUDED.actual_tahfidz,
            mengajar_slots = EXCLUDED.mengajar_slots,
            tahfidz_slots = EXCLUDED.tahfidz_slots,
            updated_at = EXCLUDED.updated_at`,
          [
            record.id,
            record.date,
            record.teacherId,
            record.teacherName,
            record.status || 'hadir',
            Number(record.targetMengajar) || 0,
            Number(record.actualMengajar) || 0,
            Number(record.targetTahfidz) || 0,
            Number(record.actualTahfidz) || 0,
            JSON.stringify(record.mengajarSlots || []),
            JSON.stringify(record.tahfidzSlots || []),
            record.updatedAt || new Date().toISOString(),
          ]
        );
      }
      const { _id, ...cleanRecord } = record;
      await inMemoryDb.collection('attendances').updateOne(
        { id: cleanRecord.id },
        { $set: cleanRecord },
        { upsert: true }
      );
      res.json({ success: true, record: cleanRecord });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/attendance/batch', async (req: Request, res: Response) => {
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Records must be array' });

    try {
      if (pgPool && records.length > 0) {
        for (const a of records) {
          await pgPool.query(
            `INSERT INTO attendances (
              id, date, teacher_id, teacher_name, status, target_mengajar, actual_mengajar, target_tahfidz, actual_tahfidz, mengajar_slots, tahfidz_slots, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              target_mengajar = EXCLUDED.target_mengajar,
              actual_mengajar = EXCLUDED.actual_mengajar,
              target_tahfidz = EXCLUDED.target_tahfidz,
              actual_tahfidz = EXCLUDED.actual_tahfidz,
              mengajar_slots = EXCLUDED.mengajar_slots,
              tahfidz_slots = EXCLUDED.tahfidz_slots,
              updated_at = EXCLUDED.updated_at`,
            [
              a.id,
              a.date,
              a.teacherId,
              a.teacherName,
              a.status || 'hadir',
              Number(a.targetMengajar) || 0,
              Number(a.actualMengajar) || 0,
              Number(a.targetTahfidz) || 0,
              Number(a.actualTahfidz) || 0,
              JSON.stringify(a.mengajarSlots || []),
              JSON.stringify(a.tahfidzSlots || []),
              a.updatedAt || new Date().toISOString(),
            ]
          );
        }
      }

      for (const rec of records) {
        const { _id, ...cleanRec } = rec;
        await inMemoryDb.collection('attendances').updateOne(
          { id: cleanRec.id },
          { $set: cleanRec },
          { upsert: true }
        );
      }
      res.json({ success: true, count: records.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Hapus seluruh presensi (reset murni ke 0)
  app.post('/api/attendance/clear', async (req: Request, res: Response) => {
    try {
      if (pgPool) {
        await pgPool.query('DELETE FROM attendances');
      }
      const result = await inMemoryDb.collection('attendances').deleteMany({});
      res.json({ success: true, deletedCount: result.deletedCount, message: 'Seluruh data presensi berhasil dibersihkan.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/attendance', async (req: Request, res: Response) => {
    try {
      if (pgPool) {
        await pgPool.query('DELETE FROM attendances');
      }
      const result = await inMemoryDb.collection('attendances').deleteMany({});
      res.json({ success: true, deletedCount: result.deletedCount, message: 'Seluruh data presensi berhasil dibersihkan.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // API 404 FALLBACK (Selalu kembalikan JSON)
  // ==========================================
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Endpoint API "${req.method} ${req.path}" tidak ditemukan pada backend.`,
    });
  });

  // ==========================================
  // VITE / STATIC SERVING & STANDALONE SERVER
  // ==========================================
  export default app;

  async function startServer() {
    const isExplicitDev = process.env.npm_lifecycle_event === 'dev' || process.env.NODE_ENV === 'development';
    const isExplicitProd = (process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start') && !isExplicitDev;

    // Parse port from CLI args (e.g. --port 3000) or environment
    const portArgIndex = process.argv.indexOf('--port');
    const portFromArg = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : NaN;
    const PORT = !isNaN(portFromArg) ? portFromArg : parseInt(process.env.PORT || '3000', 10);

    const distPath = path.resolve(__dirname, 'dist');
    const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));

    if (hasDist && isExplicitProd) {
      console.log('[absensi-on] Menjalankan dalam mode produksi (Static dist)');
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.log('[absensi-on] Menjalankan dalam mode development (Vite middleware)');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    // Global Error Handler
    app.use((err: any, req: Request, res: Response, next: any) => {
      console.error('[absensi-on Server Error]', err);
      if (res.headersSent) {
        return next(err);
      }
      if (req.path.startsWith('/api/')) {
        res.status(500).json({
          success: false,
          error: err.message || 'Terjadi kesalahan internal pada server backend.',
        });
      } else {
        res.status(500).send('Internal Server Error');
      }
    });

    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[absensi-on] Fullstack Server berjalan pada http://0.0.0.0:${PORT}`);
      });
    }
  }

  if (!process.env.VERCEL) {
    startServer().catch(err => {
      console.error('Gagal menjalankan server:', err);
    });
  }
