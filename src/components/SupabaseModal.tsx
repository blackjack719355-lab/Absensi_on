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

  // Auto-sync on launch toggle state
  const [autoSyncOnLaunch, setAutoSyncOnLaunch] = useState<boolean>(
    config.autoSyncOnLaunch ?? storage.isAutoSyncOnLaunch()
  );

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
    if (config.autoSyncOnLaunch !== undefined) {
      setAutoSyncOnLaunch(config.autoSyncOnLaunch);
    }
  }, [config.autoSyncOnLaunch]);

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

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncOnLaunch(enabled);
    storage.setAutoSyncOnLaunch(enabled);
    setSyncStatus(
      enabled
        ? 'Sinkronisasi otomatis saat aplikasi dibuka: DIAKTIFKAN'
        : 'Sinkronisasi otomatis saat aplikasi dibuka: DINONAKTIFKAN (Mode manual)'
    );
    onRefreshData();
    setTimeout(() => setSyncStatus(null), 3000);
  };

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white">
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
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-6 pt-2 gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Koneksi Connection String</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Skrip SQL Skema</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
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
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
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
                      <span>{config.status === 'connected' ? 'Database Terhubung & Aktif' : 'Mode Offline (Penyimpanan Lokal)'}</span>
                      {config.status === 'connected' && (
                        <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold px-2 py-0.5 rounded-md">
                          Permanen &amp; Aman
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-85 mt-0.5 font-mono break-all text-slate-700 dark:text-slate-300">
                      {config.status === 'connected' ? (
                        <span>{displayMasked || 'Database Server Permanen Aktif (Auto-Persist)'}</span>
                      ) : (
                        <span>Data tersimpan di memori browser lokal.</span>
                      )}
                    </div>
                  </div>
                </div>

                {config.status === 'connected' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePullFromSupabase}
                      disabled={isSyncing}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg shadow-2xs hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Tarik data terbaru dari server Supabase"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Segarkan</span>
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-red-200 dark:border-rose-900/60 rounded-lg shadow-2xs hover:bg-red-50 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Putuskan</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Konfirmasi Putus Koneksi */}
              {showDisconnectConfirm && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 rounded-xl text-red-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
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
                      className="px-2.5 py-1 font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Document Statistics if connected */}
              {config.status === 'connected' && config.counts && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Guru Terdaftar</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{config.counts.teachers}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Jadwal Mengajar</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{config.counts.schedules}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Hari Libur</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{config.counts.holidays}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Presensi Tercatat</span>
                    <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{config.counts.attendances}</span>
                  </div>
                </div>
              )}

              {/* Pengaturan Sinkronisasi Otomatis Saat Aplikasi Dibuka */}
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                      autoSyncOnLaunch ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <RefreshCw className={`w-5 h-5 ${autoSyncOnLaunch && isSyncing ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        Sinkronisasi Otomatis Saat Aplikasi Dibuka
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          autoSyncOnLaunch
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {autoSyncOnLaunch ? 'Aktif (Otomatis)' : 'Nonaktif (Manual Saja)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {autoSyncOnLaunch
                        ? 'Aplikasi secara otomatis menarik data guru, jadwal, dan presensi terbaru dari Supabase PostgreSQL setiap kali aplikasi pertama kali dimuat.'
                        : 'Aplikasi memuat data langsung dari memori lokal (offline-first). Sinkronisasi ke Supabase hanya berjalan jika Anda menekan tombol Segarkan / Tarik Data secara manual.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSyncOnLaunch}
                    onClick={() => handleToggleAutoSync(!autoSyncOnLaunch)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      autoSyncOnLaunch ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    title={
                      autoSyncOnLaunch
                        ? 'Klik untuk menonaktifkan sinkronisasi otomatis saat aplikasi dibuka'
                        : 'Klik untuk mengaktifkan sinkronisasi otomatis saat aplikasi dibuka'
                    }
                  >
                    <span className="sr-only">Toggle sinkronisasi otomatis saat aplikasi dibuka</span>
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        autoSyncOnLaunch ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Form Input PostgreSQL Connection String */}
              <form onSubmit={handleConnect} className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>PostgreSQL Connection String</span>
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Format: postgresql://postgres:password@host:5432/postgres</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showConnStr ? 'text' : 'password'}
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                      placeholder="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"
                      className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConnStr(!showConnStr)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
                      title={showConnStr ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showConnStr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Sistem otomatis menghubungkan pool PostgreSQL secara langsung dengan SSL aman ke server Supabase.
                  </p>
                </div>

                {/* Feedback Message */}
                {connectSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{connectSuccess}</span>
                  </div>
                )}

                {connectError && (
                  <div className="p-3.5 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 text-red-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <p className="font-semibold">{connectError}</p>
                      {(connectError.includes('not found') || connectError.includes('ENOTFOUND') || connectError.includes('Paused')) && (
                        <div className="text-[11px] text-red-600 dark:text-rose-400/90 leading-relaxed bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-red-100 dark:border-rose-900/40">
                          <p className="font-bold text-red-700 dark:text-rose-300 mb-1">💡 Cara Mengatasi:</p>
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>Buka <strong>Supabase Dashboard</strong> (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-red-800 dark:hover:text-rose-200">supabase.com/dashboard</a>).</li>
                            <li>Jika proyek berstatus <strong>"Paused"</strong>, klik <strong>"Restore project"</strong> (perlu ~1-2 menit hingga aktif).</li>
                            <li>Masuk ke <strong>Project Settings → Database</strong>, gulir ke <strong>Connection Pooling</strong>.</li>
                            <li>Pilih mode <strong>Session (5432)</strong> atau <strong>Transaction (6543)</strong>, salin connection string tersebut dan tempelkan ke kolom di atas.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {syncStatus && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
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
                    className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    title={config.status !== 'connected' ? 'Hubungkan ke Supabase terlebih dahulu' : 'Upload data lokal ke Supabase'}
                  >
                    <Send className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
                    <span>Unggah Data Lokal ke Supabase</span>
                  </button>
                </div>
              </form>

              {/* Cadangan & Pulihkan Lokal */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Cadangan Berkas Lokal (JSON)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Unduh Cadangan JSON</span>
                  </button>

                  <label className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
                    className="px-3 py-2 bg-red-50 dark:bg-rose-950/40 hover:bg-red-100 dark:hover:bg-rose-900/50 border border-red-200 dark:border-rose-900/60 text-red-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                  >
                    <span>Kosongkan Presensi</span>
                  </button>
                </div>

                {importStatus && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-2">{importStatus}</p>
                )}

                {showClearAttendanceConfirm && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 rounded-xl text-xs text-red-800 dark:text-rose-200 flex items-center justify-between gap-3">
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
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
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
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3">
                <Code className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Skema Database PostgreSQL Supabase</p>
                  <p className="text-emerald-800/90 dark:text-emerald-300/90 mt-1 leading-relaxed">
                    Tabel <code>teachers</code>, <code>schedules</code>, <code>holidays</code>, dan <code>attendances</code> telah otomatis dibuat oleh server saat terhubung. Skrip di bawah ini disediakan sebagai referensi struktur tabel PostgreSQL.
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400 mt-1.5 font-medium">
                    💡 <em>Catatan:</em> Jika Anda menjalankan skrip ini di SQL Editor Supabase dan muncul pesan <strong>"Success. No rows returned."</strong>, artinya perintah <strong>100% BERHASIL</strong> karena skrip ini membuat struktur tabel (DDL), bukan mengambil baris data.
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
                <pre className="bg-slate-900 dark:bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-800 select-all">
                  {SUPABASE_SQL_SETUP}
                </pre>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
                <span>Skema tabel sudah aktif dan tersinkronisasi otomatis dengan server.</span>
                <button
                  onClick={() => setActiveTab('config')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold cursor-pointer"
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
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Koneksi Aktif Langsung</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                      Aplikasi telah dikonfigurasi dengan direct connection string PostgreSQL Supabase (<code>db.ugvxowesvhqjinmqdcje.supabase.co:5432</code>).
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Penyimpanan Otomatis &amp; Permanen</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                      Setiap kali absensi dicentang atau tombol <strong>Simpan Presensi</strong> ditekan, data langsung disimpan ke PostgreSQL Supabase sehingga tidak akan hilang saat redeploy.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Koneksi Terenkripsi (SSL)</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                      Koneksi menggunakan SSL terenkripsi antar-server untuk memastikan keamanan data absensi santri dan guru.
                    </p>
                  </div>
                </div>

                {/* Panduan Khusus Deploy Vercel */}
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    i
                  </span>
                  <div>
                    <h4 className="font-bold text-blue-950 dark:text-blue-100 text-xs">Panduan Pengaturan di Vercel</h4>
                    <p className="text-blue-900/90 dark:text-blue-200/90 text-xs mt-1 leading-relaxed">
                      Saat deploy ke <strong>Vercel</strong>, tambahkan <strong>Environment Variable</strong> di Vercel Dashboard (Settings → Environment Variables):
                    </p>
                    <div className="mt-2 bg-blue-100/70 dark:bg-blue-900/50 p-2 rounded-lg font-mono text-[11px] text-blue-950 dark:text-blue-200 select-all break-all">
                      DATABASE_URL=postgresql://postgres.ugvxowesvhqjinmqdcje:Sehat719355%24@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
                    </div>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-1.5">
                      Gunakan host IPv4 pooler (<code>aws-0-ap-southeast-1.pooler.supabase.com</code>) dan ubah simbol <code>$</code> pada password menjadi <code>%24</code> agar koneksi serverless di Vercel berjalan stabil.
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
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Penyimpanan PostgreSQL Terdistribusi</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
