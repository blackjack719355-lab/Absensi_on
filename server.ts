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

// Connection string bawaan langsung (hardcoded default agar selalu terhubung otomatis tanpa setting manual)
const DEFAULT_MONGO_URI = 'mongodb+srv://blackjack719355_db_user:Sehat719355@cluster0.iercbv8.mongodb.net/absensi_on_db?retryWrites=true&w=majority';
const DEFAULT_DB_NAME = 'absensi_on_db';

interface MongoRuntimeConfig {
  uri: string;
  databaseName: string;
}

// Helper to load runtime config if previously saved via UI or fallback to embedded default
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
  lastError = null;

  try {
    let cleanUri = uri.trim();

    // 1. Cek jika masih ada placeholder teks standar MongoDB Atlas
    if (cleanUri.includes('<password>') || cleanUri.includes('<username>') || cleanUri.includes('<db_password>')) {
      const friendlyMessage = 'URI masih memuat teks placeholder "<password>" atau "<username>". Ganti dengan username & password asli akun database Anda.';
      lastError = friendlyMessage;
      console.warn('[MongoDB] Percobaan koneksi:', friendlyMessage);
      return { success: false, error: friendlyMessage };
    }

    // 2. Deteksi & bersihkan otomatis jika pengguna tidak sengaja membungkus password atau username dengan kurung siku < >
    cleanUri = cleanUri.replace(/:\s*<([^>]+)>\s*@/, (match, pass) => {
      console.log('[MongoDB] Menghapus tanda kurung siku < > pada password secara otomatis.');
      return `:${encodeURIComponent(pass)}@`;
    });
    cleanUri = cleanUri.replace(/\/\/\s*<([^>]+)>\s*:/, (match, user) => {
      console.log('[MongoDB] Menghapus tanda kurung siku < > pada username secara otomatis.');
      return `//${encodeURIComponent(user)}:`;
    });

    // Close existing client if any
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch {}
      mongoClient = null;
      currentDb = null;
    }

    const client = new MongoClient(cleanUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
    });

    await client.connect();
    
    // Ping to verify authentication and database access
    const db = client.db(dbName || 'absensi_on_db');
    await db.command({ ping: 1 });

    mongoClient = client;
    currentDb = db;
    currentUri = cleanUri;
    currentDbName = dbName || 'absensi_on_db';
    lastError = null;

    saveRuntimeConfig({ uri: currentUri, databaseName: currentDbName });

    console.log(`[MongoDB] Berhasil terhubung ke database "${currentDbName}"`);
    return { success: true };
  } catch (err: any) {
    // Gunakan console.warn agar validasi kredensial pengguna tidak dianggap crash server/container
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

// Auto-connect to MongoDB immediately on startup (selalu terkoneksi langsung tanpa perlu setting manual)
export async function connectToMongoDB() {
  const config = loadRuntimeConfig();
  console.log('[MongoDB] Menghubungkan langsung ke MongoDB Atlas...');
  const res = await connectToMongo(config.uri || DEFAULT_MONGO_URI, config.databaseName || DEFAULT_DB_NAME);
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

// Inisialisasi koneksi langsung saat server boot
connectToMongoDB().catch((err) => {
  console.warn('[MongoDB] Percobaan koneksi awal:', err);
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
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = !isProd;
  // Di dev container AI Studio (Nginx di 8080 mem-proxy ke 3000), dev server jalan di 3000.
  // Di Cloud Run (mode produksi), gunakan process.env.PORT yang ditentukan sistem.
  const PORT = parseInt(
    (isProd ? process.env.PORT : (process.env.DEV_PORT || '3000')) || '3000',
    10
  );

  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // API ROUTES: MONGODB CONFIG & STATUS
  // ==========================================

  // Get live DB status
  app.get('/api/db/status', async (req: Request, res: Response) => {
    const isConnected = !!(mongoClient && currentDb);
    let counts = { teachers: 0, schedules: 0, holidays: 0, attendances: 0 };

    if (isConnected && currentDb) {
      try {
        const [teachers, schedules, holidays, attendances] = await Promise.all([
          currentDb.collection('teachers').countDocuments(),
          currentDb.collection('schedules').countDocuments(),
          currentDb.collection('holidays').countDocuments(),
          currentDb.collection('attendances').countDocuments(),
        ]);
        counts = { teachers, schedules, holidays, attendances };
      } catch (e: any) {
        console.warn('Gagal mengambil jumlah dokumen:', e.message);
      }
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
    if (!currentDb) {
      return res.status(503).json({
        connected: false,
        message: 'Database MongoDB belum terhubung.',
      });
    }

    try {
      const [teachers, schedules, holidays, attendances] = await Promise.all([
        currentDb.collection('teachers').find({}, { projection: { _id: 0 } }).toArray(),
        currentDb.collection('schedules').find({}, { projection: { _id: 0 } }).toArray(),
        currentDb.collection('holidays').find({}, { projection: { _id: 0 } }).toArray(),
        currentDb.collection('attendances').find({}, { projection: { _id: 0 } }).toArray(),
      ]);

      res.json({
        connected: true,
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
    if (!currentDb) {
      return res.status(503).json({ success: false, error: 'Database MongoDB belum terhubung.' });
    }

    const { teachers, schedules, holidays, attendances } = req.body;

    try {
      // Upsert teachers
      if (Array.isArray(teachers) && teachers.length > 0) {
        const col = currentDb.collection('teachers');
        await col.deleteMany({});
        await col.insertMany(teachers);
      }

      // Upsert schedules
      if (Array.isArray(schedules) && schedules.length > 0) {
        const col = currentDb.collection('schedules');
        await col.deleteMany({});
        await col.insertMany(schedules);
      }

      // Upsert holidays
      if (Array.isArray(holidays) && holidays.length > 0) {
        const col = currentDb.collection('holidays');
        await col.deleteMany({});
        await col.insertMany(holidays);
      }

      // Upsert attendances
      if (Array.isArray(attendances) && attendances.length > 0) {
        const col = currentDb.collection('attendances');
        await col.deleteMany({});
        await col.insertMany(attendances);
      }

      res.json({ success: true, message: 'Seluruh data berhasil disinkronkan ke MongoDB Atlas.' });
    } catch (err: any) {
      console.error('Error syncing data:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // CRUD TEACHERS
  app.post('/api/teachers', async (req: Request, res: Response) => {
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    const teacher = req.body;
    if (!teacher || !teacher.id) return res.status(400).json({ error: 'Data guru tidak valid' });

    try {
      await currentDb.collection('teachers').updateOne(
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
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    const { id } = req.params;
    try {
      await currentDb.collection('teachers').deleteOne({ id });
      await currentDb.collection('schedules').deleteOne({ teacherId: id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CRUD SCHEDULES
  app.post('/api/schedules', async (req: Request, res: Response) => {
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    const schedule = req.body;
    if (!schedule || !schedule.teacherId) return res.status(400).json({ error: 'Data jadwal tidak valid' });

    try {
      await currentDb.collection('schedules').updateOne(
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
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    const holiday = req.body;
    if (!holiday || !holiday.id) return res.status(400).json({ error: 'Data hari libur tidak valid' });

    try {
      await currentDb.collection('holidays').updateOne(
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
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    const { id } = req.params;
    try {
      await currentDb.collection('holidays').deleteOne({ id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CRUD ATTENDANCES
  app.post('/api/attendance', async (req: Request, res: Response) => {
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    const record = req.body;
    if (!record || !record.id) return res.status(400).json({ error: 'Data presensi tidak valid' });

    try {
      await currentDb.collection('attendances').updateOne(
        { id: record.id },
        { $set: record },
        { upsert: true }
      );
      res.json({ success: true, record });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/attendance/batch', async (req: Request, res: Response) => {
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Records must be array' });

    try {
      const operations = records.map((rec: any) => ({
        updateOne: {
          filter: { id: rec.id },
          update: { $set: rec },
          upsert: true,
        },
      }));
      if (operations.length > 0) {
        await currentDb.collection('attendances').bulkWrite(operations);
      }
      res.json({ success: true, count: operations.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Hapus seluruh presensi (reset murni ke 0)
  app.post('/api/attendance/clear', async (req: Request, res: Response) => {
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    try {
      const result = await currentDb.collection('attendances').deleteMany({});
      res.json({ success: true, deletedCount: result.deletedCount, message: 'Seluruh data presensi berhasil dibersihkan.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/attendance', async (req: Request, res: Response) => {
    if (!currentDb) return res.status(503).json({ error: 'DB not connected' });
    try {
      const result = await currentDb.collection('attendances').deleteMany({});
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
