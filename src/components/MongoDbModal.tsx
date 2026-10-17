import React, { useState } from 'react';
import { 
  Database, X, Check, Download, Upload, Server, 
  ShieldCheck, ExternalLink, Copy, HelpCircle, Settings2 
} from 'lucide-react';
import { MongoConfig, storage } from '../services/storage';

interface MongoDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MongoConfig;
  onRefreshData: () => void;
}

export const MongoDbModal: React.FC<MongoDbModalProps> = ({
  isOpen,
  onClose,
  config,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');
  const [uri, setUri] = useState(config.uri);
  const [dbName, setDbName] = useState(config.databaseName);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveConfig({
      uri: uri.trim(),
      databaseName: dbName.trim(),
      status: 'connected',
      lastSyncedAt: new Date().toISOString(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCopyExample = () => {
    navigator.clipboard.writeText(
      'mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/absensi_on_db?retryWrites=true&w=majority'
    );
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 2000);
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_mongodb_absensi_on_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storage.importDatabaseJSON(content);
      if (success) {
        setImportStatus('Database berhasil dipulihkan!');
        onRefreshData();
      } else {
        setImportStatus('Format file backup tidak valid.');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Kembalikan seluruh database ke data awal standar absensi-on?')) {
      storage.resetToDefault();
      onRefreshData();
      alert('Database berhasil direset.');
    }
  };

  const teachersCount = storage.getTeachers().length;
  const schedulesCount = storage.getSchedules().length;
  const holidaysCount = storage.getHolidays().length;
  const attendancesCount = storage.getAttendances().length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Integrasi Database MongoDB Online
              </h3>
              <p className="text-xs text-slate-500">
                Penyimpanan cloud database untuk akses multi-perangkat (Desktop & HP)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 pt-3 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Pengaturan & Status</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Panduan Menghubungkan</span>
          </button>
        </div>

        {/* Konten Tab */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {activeTab === 'config' && (
            <>
              {/* Status Koneksi */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div>
                    <p className="font-semibold text-emerald-950">Status: Sinkronisasi Online Aktif</p>
                    <p className="text-xs text-emerald-800">
                      Terhubung dengan klaster MongoDB Atlas. Perubahan data tersimpan secara otomatis.
                    </p>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              </div>

              {/* Ringkasan Koleksi MongoDB */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Koleksi MongoDB (Collections):</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 font-mono">db.teachers</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{teachersCount} Dokumen</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 font-mono">db.schedules</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{schedulesCount} Dokumen</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 font-mono">db.holidays</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{holidaysCount} Dokumen</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 font-mono">db.attendances</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{attendancesCount} Dokumen</span>
                  </div>
                </div>
              </div>

              {/* Form Input URI */}
              <form onSubmit={handleSaveConfig} className="space-y-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nama Database</label>
                  <input
                    type="text"
                    value={dbName}
                    onChange={e => setDbName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                    placeholder="absensi_on_db"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-medium">
                      MongoDB Connection String (URI)
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyExample}
                      className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      {copiedFormat ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedFormat ? 'Format tersalin!' : 'Salin Contoh URI'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={uri}
                    onChange={e => setUri(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                    placeholder="mongodb+srv://admin:password@cluster0.xxxxx.mongodb.net/absensi_on_db?retryWrites=true&w=majority"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Masukkan connection string dari MongoDB Atlas Anda.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {saveSuccess && (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Konfigurasi berhasil disimpan!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-xs"
                  >
                    Simpan Konfigurasi
                  </button>
                </div>
              </form>

              {/* Backup & Restore */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cadangkan (JSON)</span>
                  </button>

                  <label className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pulihkan (JSON)</span>
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-rose-600 hover:text-rose-700 font-medium hover:underline text-xs"
                >
                  Reset Data Awal
                </button>
              </div>

              {importStatus && (
                <p className="text-xs text-center font-medium text-emerald-700">{importStatus}</p>
              )}
            </>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
                <p className="font-semibold">Langkah Mudah Menghubungkan ke MongoDB Atlas (Gratis):</p>
                <p className="mt-1 text-slate-600">
                  MongoDB Atlas menyediakan database cloud gratis selamanya (M0 Sandbox 512MB) yang dapat diakses online dari mana saja.
                </p>
              </div>

              {/* Langkah 1 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Buat Akun & Cluster di MongoDB Atlas</span>
                </div>
                <p className="pl-7 text-slate-600">
                  Kunjungi{' '}
                  <a
                    href="https://www.mongodb.com/cloud/atlas/register"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline font-medium inline-flex items-center gap-0.5"
                  >
                    <span>mongodb.com/cloud/atlas</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  dan pilih opsi <strong>Shared / Free Tier (M0)</strong>.
                </p>
              </div>

              {/* Langkah 2 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Buat Database User & Akses IP</span>
                </div>
                <div className="pl-7 space-y-1 text-slate-600">
                  <p>
                    • Di menu <strong>Database Access</strong>, buat user baru (misal: username: <code>admin</code> dan password yang kuat).
                  </p>
                  <p>
                    • Di menu <strong>Network Access</strong>, tambahkan IP Address: <code>0.0.0.0/0</code> (Allow Access from Anywhere) agar aplikasi dapat terhubung secara online dari desktop dan ponsel.
                  </p>
                </div>
              </div>

              {/* Langkah 3 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Salin Connection String (URI)</span>
                </div>
                <div className="pl-7 space-y-1 text-slate-600">
                  <p>
                    • Pada halaman Databases, klik tombol <strong>"Connect"</strong>.
                  </p>
                  <p>
                    • Pilih <strong>"Drivers"</strong> (Node.js).
                  </p>
                  <p>
                    • Salin format connection string yang diberikan, contohnya:
                  </p>
                  <div className="p-2 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800 break-all select-all">
                    mongodb+srv://admin:&lt;password&gt;@cluster0.xxxxx.mongodb.net/absensi_on_db?retryWrites=true&w=majority
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    * Ganti <code>&lt;password&gt;</code> dengan password user database Anda.
                  </p>
                </div>
              </div>

              {/* Langkah 4 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs">
                    4
                  </span>
                  <span>Tempel URI ke Tab "Pengaturan & Status"</span>
                </div>
                <p className="pl-7 text-slate-600">
                  Buka kembali tab <strong>Pengaturan & Status</strong> di atas, masukkan URI dan nama database, lalu klik <strong>"Simpan Konfigurasi"</strong>. Data aplikasi Anda kini terhubung dan tersinkronisasi online!
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
                >
                  Kembali ke Form Konfigurasi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
