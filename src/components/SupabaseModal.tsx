import React, { useState, useEffect } from 'react';
import { 
  Database, X, Check, Download, Upload, 
  ShieldCheck, ExternalLink, Copy, HelpCircle,
  RefreshCw, AlertTriangle, Unlink, Send, Eye, EyeOff, Code, Layers, FileSpreadsheet, Server
} from 'lucide-react';
import { SupabaseConfig, storage } from '../services/storage';
import { SUPABASE_SQL_SETUP } from './../services/supabaseClient';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onRefreshData: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'guide'>('config');

  // Direct Connection String state
  const [connectionString, setConnectionString] = useState(
    config.connectionString || 'postgresql://postgres:Sehat719355$@db.ugvxowesvhqjinmqdcje.supabase.co:5432/postgres'
  );
  const [showConnStr, setShowConnStr] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showClearAttendanceConfirm, setShowClearAttendanceConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      storage.syncWithBackend().then(() => onRefreshData());
    }
  }, [isOpen]);

  useEffect(() => {
    if (config.status === 'connected') {
      setConnectError(null);
    } else if (config.error) {
      setConnectError(config.error);
    }
    if (config.connectionString && !connectionString.includes('Sehat719355')) {
      setConnectionString(config.connectionString);
    }
  }, [config.status, config.error, config.connectionString]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionString.trim()) {
      setConnectError('Connection string PostgreSQL Supabase wajib diisi.');
      return;
    }

    setIsConnecting(true);
    setConnectSuccess(null);
    setConnectError(null);

    const result = await storage.connectSupabase(connectionString.trim());
    setIsConnecting(false);

    if (result.success) {
      setConnectSuccess(result.message || 'Koneksi ke Supabase PostgreSQL berhasil!');
      onRefreshData();
      setTimeout(() => setConnectSuccess(null), 5000);
    } else {
      setConnectError(result.error || 'Gagal terhubung ke Supabase PostgreSQL.');
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectConfirm(false);
    await storage.disconnectSupabase();
    setConnectSuccess('Koneksi Supabase diputuskan. Beralih ke mode offline lokal.');
    onRefreshData();
    setTimeout(() => setConnectSuccess(null), 3000);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const res = await storage.pushAllToSupabase();
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus('Semua data lokal berhasil diunggah dan disimpan ke Supabase PostgreSQL!');
      onRefreshData();
      setTimeout(() => setSyncStatus(null), 4000);
    } else {
      setSyncStatus(`Gagal sinkronisasi: ${res.error || 'Kesalahan jaringan'}`);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    await storage.syncWithBackend();
    setIsSyncing(false);
    setSyncStatus('Data terbaru dari Supabase PostgreSQL berhasil ditarik ke aplikasi!');
    onRefreshData();
    setTimeout(() => setSyncStatus(null), 3500);
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `backup-absensi-on-supabase-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const ok = storage.importDatabaseJSON(content);
      if (ok) {
        setImportStatus('Cadangan database berhasil dipulihkan!');
        onRefreshData();
        storage.pushAllToSupabase();
      } else {
        setImportStatus('Format file cadangan tidak valid.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAttendances = async () => {
    setShowClearAttendanceConfirm(false);
    try {
      await fetch('/api/attendance/clear', { method: 'POST' });
    } catch {}
    storage.resetAllAttendances();
    onRefreshData();
    setSyncStatus('Seluruh data presensi telah dikosongkan.');
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const displayMasked = config.connectionStringMasked || (
    connectionString.includes('@')
      ? connectionString.replace(/(:\/\/)([^:@]+):([^@]+)@/, '$1$2:••••••••@')
      : connectionString
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Database Supabase PostgreSQL</h2>
              <p className="text-xs text-emerald-200/90 font-medium">
                Koneksi database PostgreSQL terkelola &amp; terdistribusi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigasi */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Koneksi Connection String</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Skrip SQL Skema</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Informasi Database</span>
          </button>
        </div>

        {/* Body Konten */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* TAB 1: KONEKSI CONNECTION STRING */}
          {activeTab === 'config' && (
            <>
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  config.status === 'connected'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      config.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{config.status === 'connected' ? 'Supabase PostgreSQL Terhubung & Aktif' : 'Mode Offline (Penyimpanan Lokal)'}</span>
                      {config.status === 'connected' && (
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                          PostgreSQL 15+
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-85 mt-0.5 font-mono break-all">
                      {config.status === 'connected' ? (
                        <span>{displayMasked}</span>
                      ) : (
                        <span>Data tersimpan di memori browser lokal. Hubungkan ke Supabase agar data permanen antar perangkat.</span>
                      )}
                    </div>
                  </div>
                </div>

                {config.status === 'connected' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePullFromSupabase}
                      disabled={isSyncing}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 rounded-lg shadow-2xs hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Tarik data terbaru dari server Supabase"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Segarkan</span>
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg shadow-2xs hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Putuskan</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Konfirmasi Putus Koneksi */}
              {showDisconnectConfirm && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between gap-3">
                  <span>Putuskan koneksi dari Supabase? Aplikasi akan beralih ke penyimpanan lokal.</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDisconnect}
                      className="px-2.5 py-1 font-bold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                    >
                      Ya, Putuskan
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="px-2.5 py-1 font-medium bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Document Statistics if connected */}
              {config.status === 'connected' && config.counts && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 font-medium block">Guru Terdaftar</span>
                    <span className="text-base font-bold text-slate-800">{config.counts.teachers}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 font-medium block">Jadwal Mengajar</span>
                    <span className="text-base font-bold text-slate-800">{config.counts.schedules}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 font-medium block">Hari Libur</span>
                    <span className="text-base font-bold text-slate-800">{config.counts.holidays}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 font-medium block">Presensi Tercatat</span>
                    <span className="text-base font-bold text-emerald-700">{config.counts.attendances}</span>
                  </div>
                </div>
              )}

              {/* Form Input PostgreSQL Connection String */}
              <form onSubmit={handleConnect} className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      <span>PostgreSQL Connection String</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Format: postgresql://postgres:password@host:5432/postgres</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showConnStr ? 'text' : 'password'}
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                      placeholder="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"
                      className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConnStr(!showConnStr)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title={showConnStr ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showConnStr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sistem otomatis menghubungkan pool PostgreSQL secara langsung dengan SSL aman ke server Supabase.
                  </p>
                </div>

                {/* Feedback Message */}
                {connectSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{connectSuccess}</span>
                  </div>
                )}

                {connectError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{connectError}</p>
                    </div>
                  </div>
                )}

                {syncStatus && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{syncStatus}</span>
                  </div>
                )}

                {/* Tombol Simpan & Uji Koneksi */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menguji & Menghubungkan...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{config.status === 'connected' ? 'Uji Ulang Koneksi PostgreSQL' : 'Hubungkan ke Supabase PostgreSQL'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={isSyncing || config.status !== 'connected'}
                    className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    title={config.status !== 'connected' ? 'Hubungkan ke Supabase terlebih dahulu' : 'Upload data lokal ke Supabase'}
                  >
                    <Send className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
                    <span>Unggah Data Lokal ke Supabase</span>
                  </button>
                </div>
              </form>

              {/* Cadangan & Pulihkan Lokal */}
              <div className="pt-4 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Cadangan Berkas Lokal (JSON)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Unduh Cadangan JSON</span>
                  </button>

                  <label className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pulihkan dari JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => setShowClearAttendanceConfirm(true)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                  >
                    <span>Kosongkan Presensi</span>
                  </button>
                </div>

                {importStatus && (
                  <p className="text-xs text-emerald-700 font-medium mt-2">{importStatus}</p>
                )}

                {showClearAttendanceConfirm && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-3">
                    <span>Apakah Anda yakin ingin menghapus seluruh data presensi? (Guru & jadwal tetap aman)</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleClearAttendances}
                        className="px-2.5 py-1 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 cursor-pointer"
                      >
                        Ya, Kosongkan
                      </button>
                      <button
                        onClick={() => setShowClearAttendanceConfirm(false)}
                        className="px-2.5 py-1 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: SKRIP SQL SKEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-900 text-xs flex items-start gap-3">
                <Code className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Skema Database PostgreSQL Supabase</p>
                  <p className="text-emerald-800/90 mt-1 leading-relaxed">
                    Tabel <code>teachers</code>, <code>schedules</code>, <code>holidays</code>, dan <code>attendances</code> telah otomatis dibuat oleh server saat terhubung. Skrip di bawah ini disediakan sebagai referensi struktur tabel PostgreSQL.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute right-3 top-3 z-10">
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-800 select-all">
                  {SUPABASE_SQL_SETUP}
                </pre>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>Skema tabel sudah aktif dan tersinkronisasi otomatis dengan server.</span>
                <button
                  onClick={() => setActiveTab('config')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold cursor-pointer"
                >
                  Kembali ke Koneksi
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN SINGKAT */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Koneksi Aktif Langsung</h4>
                    <p className="text-slate-600 text-xs mt-1">
                      Aplikasi telah dikonfigurasi dengan direct connection string PostgreSQL Supabase (<code>db.ugvxowesvhqjinmqdcje.supabase.co:5432</code>).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Penyimpanan Otomatis &amp; Permanen</h4>
                    <p className="text-slate-600 text-xs mt-1">
                      Setiap kali absensi dicentang atau tombol <strong>Simpan Presensi</strong> ditekan, data langsung disimpan ke PostgreSQL Supabase sehingga tidak akan hilang saat redeploy.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Koneksi Terenkripsi (SSL)</h4>
                    <p className="text-slate-600 text-xs mt-1">
                      Koneksi menggunakan SSL terenkripsi antar-server untuk memastikan keamanan data absensi santri dan guru.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setActiveTab('config')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Kembali ke Form Koneksi
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Penyimpanan PostgreSQL Terdistribusi</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
