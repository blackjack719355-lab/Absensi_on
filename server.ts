import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import type { Db } from 'mongodb';

// Load .env if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.resolve(__dirname, '.mongodb-runtime.json');

// Connection string fallback from environment
const DEFAULT_MONGO_URI = process.env.MONGODB_URI || '';
const DEFAULT_DB_NAME = process.env.MONGODB_DB_NAME || 'absensi_on_db';

interface MongoRuntimeConfig {
  uri: string;
  databaseName: string;
}

// In-Memory Database Store (for container/offline execution and fallback)
interface StoreData {
  teachers: any[];
  schedules: any[];
  holidays: any[];
  attendances: any[];
}

const memoryStore: StoreData = {
  teachers: [],
  schedules: [],
  holidays: [],
  attendances: [],
};

class InMemoryCollection {
  constructor(private collectionName: keyof StoreData) {}

  find(filter: any = {}, options: any = {}) {
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
      return { acknowledged: true, modifiedCount: 1, upsertedCount: 0 };
    } else if (options.upsert) {
      list.push({ ...filter, ...setData });
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
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  async deleteMany(filter: any = {}) {
    if (!filter || Object.keys(filter).length === 0) {
      const count = (memoryStore[this.collectionName] || []).length;
      memoryStore[this.collectionName] = [];
      return { acknowledged: true, deletedCount: count };
    }
    const before = (memoryStore[this.collectionName] || []).length;
    memoryStore[this.collectionName] = (memoryStore[this.collectionName] || []).filter(item => {
      return !Object.entries(filter).every(([k, v]) => item[k] === v);
    });
    return { acknowledged: true, deletedCount: before - memoryStore[this.collectionName].length };
  }

  async bulkWrite(operations: any[]) {
    for (const op of operations) {
      if (op.updateOne) {
        await this.updateOne(op.updateOne.filter, op.updateOne.update, { upsert: op.updateOne.upsert });
      } else if (op.deleteOne) {
        await this.deleteOne(op.deleteOne.filter);
      }
    }
    return { acknowledged: true };
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

function getActiveDb() {
  return currentDb || inMemoryDb;
}

// Helper to load runtime config if previously saved via UI or fallback to environment
function loadRuntimeConfig(): MongoRuntimeConfig {
  const envUri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;
  const envDb = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (data.uri && !data.uri.includes('username:password') && !data.uri.includes('cluster0.xxxxx')) {
        return {
          uri: data.uri,
          databaseName: data.databaseName || envDb,
        };
      }
    } catch (e) {
      console.warn('Gagal membaca .mongodb-runtime.json:', e);
    }
  }

  return {
    uri: envUri,
    databaseName: envDb,
  };
}

function saveRuntimeConfig(config: MongoRuntimeConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Gagal menyimpan .mongodb-runtime.json:', e);
  }
}

// Global MongoDB Connection State
let mongoClient: MongoClient | null = null;
let currentDb: Db | null = null;
let currentUri = '';
let currentDbName = '';
let isConnecting = false;
let lastError: string | null = null;

// Mask URI for safe UI display (hide password)
function maskUri(uri: string): string {
  if (!uri) return '';
  return uri.replace(/(:\/\/)([^:@]+):([^@]+)@/, '$1$2:••••••••@');
}

// Connect to MongoDB function
async function connectToMongo(uri: string, dbName: string): Promise<{ success: boolean; error?: string }> {
  if (!uri || !uri.trim()) {
    return { success: false, error: 'URI MongoDB tidak boleh kosong.' };
  }

  isConnecting = true;

  try {
    let cleanUri = uri.trim();

    // 1. Cek jika masih ada placeholder teks standar MongoDB Atlas
    if (cleanUri.includes('<password>') || cleanUri.includes('<username>') || cleanUri.includes('<db_password>')) {
      const friendlyMessage = 'URI masih memuat teks placeholder "<password>" atau "<username>". Ganti dengan username & password asli akun database Anda.';
      lastError = friendlyMessage;
      console.warn('[MongoDB] Percobaan koneksi:', friendlyMessage);
      return { success: false, error: friendlyMessage };
    }

    // 2. Deteksi jika URI menggunakan teks sensor bintang/titik (••••••••) dari tampilan UI
    if (cleanUri.includes('••••') || cleanUri.includes('***')) {
      const existingUri = currentUri || process.env.MONGODB_URI || '';
      if (existingUri) {
        // Jika sudah ada koneksi aktif dan database dapat di-ping, konfirmasi koneksi masih sehat
        if (mongoClient && currentDb) {
          try {
            await currentDb.command({ ping: 1 });
            lastError = null;
            return { success: true };
          } catch {}
        }
        cleanUri = existingUri;
      } else {
        const friendlyMessage = 'Silakan masukkan password database asli Anda. Tanda sensor "••••••••" tidak dapat digunakan sebagai password.';
        lastError = friendlyMessage;
        return { success: false, error: friendlyMessage };
      }
    }

    // 3. Deteksi & bersihkan otomatis jika pengguna tidak sengaja membungkus password atau username dengan kurung siku < >
    cleanUri = cleanUri.replace(/:\s*<([^>]+)>\s*@/, (match, pass) => {
      console.log('[MongoDB] Menghapus tanda kurung siku < > pada password secara otomatis.');
      return `:${encodeURIComponent(pass)}@`;
    });
    cleanUri = cleanUri.replace(/\/\/\s*<([^>]+)>\s*:/, (match, user) => {
      console.log('[MongoDB] Menghapus tanda kurung siku < > pada username secara otomatis.');
      return `//${encodeURIComponent(user)}:`;
    });

    const client = new MongoClient(cleanUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    
    // Ping to verify authentication and database access
    const targetDbName = dbName || 'absensi_on_db';
    const db = client.db(targetDbName);
    await db.command({ ping: 1 });

    // Hanya tutup client lama setelah client baru berhasil terhubung
    if (mongoClient && mongoClient !== client) {
      try {
        await mongoClient.close();
      } catch {}
    }

    mongoClient = client;
    currentDb = db;
    currentUri = cleanUri;
    currentDbName = targetDbName;
    lastError = null;

    saveRuntimeConfig({ uri: currentUri, databaseName: currentDbName });

    console.log(`[MongoDB] Berhasil terhubung ke database "${currentDbName}"`);
    return { success: true };
  } catch (err: any) {
    console.warn('[MongoDB] Percobaan koneksi belum berhasil:', err.message);
    let friendlyMessage = err.message;

    if (err.message?.includes('bad auth') || err.message?.includes('Authentication failed') || err.message?.includes('auth failed')) {
      friendlyMessage = 'Autentikasi gagal (bad auth): Username atau Password MongoDB Atlas tidak cocok. Pastikan menggunakan Database User dari menu "Database Access" di Atlas (bukan email akun login Anda), dan pastikan tanda kurung siku < > sudah dihapus.';
    } else if (err.message?.includes('Server selection timed out') || err.message?.includes('ETIMEDOUT') || err.message?.includes('ENOTFOUND')) {
      friendlyMessage = 'Waktu koneksi habis (Timeout). Pastikan IP Address 0.0.0.0/0 (Allow Access from Anywhere) sudah ditambahkan di menu "Network Access" MongoDB Atlas.';
    } else if (err.message?.includes('Invalid connection string') || err.message?.includes('Invalid scheme')) {
      friendlyMessage = 'Format Connection String (URI) tidak valid. Pastikan berawalan mongodb+srv:// atau mongodb://.';
    }

    lastError = friendlyMessage;
    return { success: false, error: friendlyMessage };
  } finally {
    isConnecting = false;
  }
}

// Auto-connect to MongoDB if configured in environment
export async function connectToMongoDB() {
  const config = loadRuntimeConfig();
  if (!config.uri || !config.uri.trim()) {
    console.log('[MongoDB] URI tidak diatur — database in-memory aktif secara otomatis.');
    return null;
  }
  console.log('[MongoDB] Mencoba menghubungkan ke MongoDB Atlas...');
  const res = await connectToMongo(config.uri, config.databaseName || DEFAULT_DB_NAME);
  if (res.success) {
    console.log('You successfully connected to MongoDB!');
  }
  return mongoClient;
}

// Call this only when your application terminates
export async function disconnectFromMongoDB() {
  if (mongoClient) {
    try {
      await mongoClient.close();
      console.log('You successfully disconnected from MongoDB!');
    } catch (err) {
      console.dir(err);
    }
    mongoClient = null;
    currentDb = null;
  }
}

// Inisialisasi koneksi saat server boot jika URI ada
connectToMongoDB().catch((err) => {
  console.warn('[MongoDB] Info koneksi awal:', err.message || err);
});

process.on('SIGINT', async () => {
  await disconnectFromMongoDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectFromMongoDB();
  process.exit(0);
});

async function startServer() {
  const app = express();
  const isProd = !!process.env.K_SERVICE || process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
  const isDev = !isProd;
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // API ROUTES: MONGODB CONFIG & STATUS
  // ==========================================

  // Get live DB status
  app.get('/api/db/status', async (req: Request, res: Response) => {
    const isConnected = !!(mongoClient && currentDb);
    const activeDb = getActiveDb();
    let counts = { teachers: 0, schedules: 0, holidays: 0, attendances: 0 };

    try {
      const [teachers, schedules, holidays, attendances] = await Promise.all([
        activeDb.collection('teachers').countDocuments(),
        activeDb.collection('schedules').countDocuments(),
        activeDb.collection('holidays').countDocuments(),
        activeDb.collection('attendances').countDocuments(),
      ]);
      counts = { teachers, schedules, holidays, attendances };
    } catch (e: any) {
      console.warn('Gagal mengambil jumlah dokumen:', e.message);
    }

    const config = loadRuntimeConfig();

    res.json({
      connected: isConnected,
      databaseName: currentDbName || config.databaseName,
      uriMasked: maskUri(currentUri || config.uri),
      hasConfig: !!(currentUri || config.uri),
      isConnecting,
      error: lastError,
      counts,
      isInMemory: !isConnected,
    });
  });

  // Connect or Test connection with user-provided URI
  app.post('/api/db/connect', async (req: Request, res: Response) => {
    const { uri, databaseName } = req.body;
    if (!uri) {
      return res.status(400).json({ success: false, error: 'URI MongoDB wajib diisi' });
    }

    const dbName = databaseName || 'absensi_on_db';
    const result = await connectToMongo(uri, dbName);

    if (result.success) {
      res.json({
        success: true,
        message: 'Koneksi ke MongoDB Atlas berhasil!',
        databaseName: currentDbName,
        uriMasked: maskUri(currentUri),
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  });

  // Disconnect from MongoDB
  app.post('/api/db/disconnect', async (req: Request, res: Response) => {
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch {}
      mongoClient = null;
      currentDb = null;
    }
    currentUri = '';
    currentDbName = '';
    lastError = null;

    if (fs.existsSync(CONFIG_FILE)) {
      try {
        fs.unlinkSync(CONFIG_FILE);
      } catch {}
    }

    res.json({ success: true, message: 'Terputus dari MongoDB. Aplikasi beralih ke mode offline lokal.' });
  });

  // ==========================================
  // API ROUTES: DATA SYNC & CRUD
  // ==========================================

  // GET ALL DATA (Teachers, Schedules, Holidays, Attendances)
  app.get('/api/data', async (req: Request, res: Response) => {
    try {
      const db = getActiveDb();
      const [teachers, schedules, holidays, attendances] = await Promise.all([
        db.collection('teachers').find({}, { projection: { _id: 0 } }).toArray(),
        db.collection('schedules').find({}, { projection: { _id: 0 } }).toArray(),
        db.collection('holidays').find({}, { projection: { _id: 0 } }).toArray(),
        db.collection('attendances').find({}, { projection: { _id: 0 } }).toArray(),
      ]);

      res.json({
        connected: !!currentDb,
        inMemory: !currentDb,
        data: {
          teachers,
          schedules,
          holidays,
          attendances,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // BATCH SYNC: Upload full dataset from client to MongoDB (e.g. initial sync or backup restore)
  app.post('/api/data/sync', async (req: Request, res: Response) => {
    const { teachers, schedules, holidays, attendances } = req.body;
    const db = getActiveDb();

    try {
      // Upsert teachers safely (never delete existing data)
      if (Array.isArray(teachers) && teachers.length > 0) {
        const col = db.collection('teachers');
        const ops = teachers.map((t: any) => {
          const { _id, ...clean } = t;
          return {
            updateOne: {
              filter: { id: clean.id },
              update: { $set: clean },
              upsert: true,
            },
          };
        });
        await col.bulkWrite(ops);
      }

      // Upsert schedules safely (never delete existing data)
      if (Array.isArray(schedules) && schedules.length > 0) {
        const col = db.collection('schedules');
        const ops = schedules.map((s: any) => {
          const { _id, ...clean } = s;
          return {
            updateOne: {
              filter: { teacherId: clean.teacherId },
              update: { $set: clean },
              upsert: true,
            },
          };
        });
        await col.bulkWrite(ops);
      }

      // Upsert holidays safely (never delete existing data)
      if (Array.isArray(holidays) && holidays.length > 0) {
        const col = db.collection('holidays');
        const ops = holidays.map((h: any) => {
          const { _id, ...clean } = h;
          return {
            updateOne: {
              filter: { id: clean.id },
              update: { $set: clean },
              upsert: true,
            },
          };
        });
        await col.bulkWrite(ops);
      }

      // Upsert attendances safely (PERMANENT: Never delete existing attendances)
      if (Array.isArray(attendances) && attendances.length > 0) {
        const col = db.collection('attendances');
        const ops = attendances.map((rec: any) => {
          const { _id, ...clean } = rec;
          return {
            updateOne: {
              filter: { id: clean.id },
              update: { $set: clean },
              upsert: true,
            },
          };
        });
        await col.bulkWrite(ops);
      }

      res.json({
        success: true,
        message: currentDb
          ? 'Seluruh data berhasil disinkronkan ke MongoDB Atlas secara aman.'
          : 'Seluruh data berhasil disinkronkan ke database memori aplikasi.',
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
      const db = getActiveDb();
      await db.collection('teachers').updateOne(
        { id: teacher.id },
        { $set: teacher },
        { upsert: true }
      );
      res.json({ success: true, teacher });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/teachers/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const db = getActiveDb();
      await db.collection('teachers').deleteOne({ id });
      await db.collection('schedules').deleteOne({ teacherId: id });
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
      const db = getActiveDb();
      await db.collection('schedules').updateOne(
        { teacherId: schedule.teacherId },
        { $set: schedule },
        { upsert: true }
      );
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
      const db = getActiveDb();
      await db.collection('holidays').updateOne(
        { id: holiday.id },
        { $set: holiday },
        { upsert: true }
      );
      res.json({ success: true, holiday });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/holidays/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const db = getActiveDb();
      await db.collection('holidays').deleteOne({ id });
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
      const db = getActiveDb();
      const { _id, ...cleanRecord } = record;
      await db.collection('attendances').updateOne(
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
      const db = getActiveDb();
      const operations = records.map((rec: any) => {
        const { _id, ...cleanRec } = rec;
        return {
          updateOne: {
            filter: { id: cleanRec.id },
            update: { $set: cleanRec },
            upsert: true,
          },
        };
      });
      if (operations.length > 0) {
        await db.collection('attendances').bulkWrite(operations);
      }
      res.json({ success: true, count: operations.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Hapus seluruh presensi (reset murni ke 0)
  app.post('/api/attendance/clear', async (req: Request, res: Response) => {
    try {
      const db = getActiveDb();
      const result = await db.collection('attendances').deleteMany({});
      res.json({ success: true, deletedCount: result.deletedCount, message: 'Seluruh data presensi berhasil dibersihkan.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/attendance', async (req: Request, res: Response) => {
    try {
      const db = getActiveDb();
      const result = await db.collection('attendances').deleteMany({});
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
  // VITE / STATIC SERVING
  // ==========================================
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));

  if (!isDev && hasDist) {
    // Mode Produksi: Sajikan file statis dari folder dist
    console.log('[absensi-on] Menjalankan dalam mode produksi (Static dist)');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mode Development: Muat Vite secara dinamis
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[absensi-on] Fullstack Server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Gagal menjalankan server:', err);
});
