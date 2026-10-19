import React, { useState } from 'react';
import { 
  Database, X, Check, Download, Upload, 
  ShieldCheck, ExternalLink, Copy, HelpCircle, Settings2,
  RefreshCw, AlertTriangle, Unlink, Send, Eye, EyeOff, Wand2, KeyRound, Server
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
  const [inputMode, setInputMode] = useState<'uri' | 'builder'>('uri');

  // Direct URI inputs
  const [uri, setUri] = useState(config.uri || '');
  const [dbName, setDbName] = useState(config.databaseName || 'absensi_on_db');

  // Form Builder inputs (anti bad-auth / auto encode)
  const [builderHost, setBuilderHost] = useState('');
  const [builderUser, setBuilderUser] = useState('');
  const [builderPass, setBuilderPass] = useState('');
  const [showBuilderPass, setShowBuilderPass] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(config.error || null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  // Deteksi apakah URI memuat tanda kurung siku < >
  const hasBrackets = uri.includes('<') || uri.includes('>');

  const handleCleanBrackets = () => {
    // Hapus tanda kurung siku < dan > di sekitar password atau teks
    const cleaned = uri.replace(/<([^>]+)>/g, '$1').replace(/[<>]/g, '');
    setUri(cleaned);
  };

  const handleApplyBuilder = () => {
    if (!builderHost.trim()) {
      setConnectError('Host/Cluster MongoDB Atlas belum diisi (contoh: cluster0.abcde.mongodb.net).');
      return;
    }
    if (!builderUser.trim()) {
      setConnectError('Username Database belum diisi.');
      return;
    }
    if (!builderPass.trim()) {
      setConnectError('Password Database belum diisi.');
      return;
    }

    // Bersihkan host jika pengguna menempelkan URI penuh ke kolom host
    let cleanHost = builderHost.trim();
    if (cleanHost.includes('@')) {
      cleanHost = cleanHost.split('@')[1];
    }
    if (cleanHost.includes('/')) {
      cleanHost = cleanHost.split('/')[0];
    }
    cleanHost = cleanHost.replace('mongodb+srv://', '').replace('mongodb://', '');

    const encodedUser = encodeURIComponent(builderUser.trim().replace(/[<>]/g, ''));
    const encodedPass = encodeURIComponent(builderPass.trim().replace(/[<>]/g, ''));
    const targetDb = (dbName.trim() || 'absensi_on_db');

    const assembledUri = `mongodb+srv://${encodedUser}:${encodedPass}@${cleanHost}/${targetDb}?retryWrites=true&w=majority`;
    setUri(assembledUri);
    setInputMode('uri');
    setConnectError(null);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uri.trim()) {
      setConnectError('URI Connection String MongoDB wajib diisi.');
      return;
    }

    setIsConnecting(true);
    setConnectSuccess(null);
    setConnectError(null);

    const result = await storage.connectMongo(uri.trim(), dbName.trim());
    setIsConnecting(false);

    if (result.success) {
      setConnectSuccess(result.message || 'Koneksi ke MongoDB Atlas berhasil!');
      onRefreshData();
      setTimeout(() => setConnectSuccess(null), 5000);
    } else {
      setConnectError(result.error || 'Gagal terhubung ke MongoDB Atlas.');
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectConfirm(false);
    await storage.disconnectMongo();
    setUri('');
    setConnectSuccess('Koneksi MongoDB diputuskan. Beralih ke penyimpanan lokal.');
    onRefreshData();
    setTimeout(() => setConnectSuccess(null), 3000);
  };

  const handlePushAllToMongo = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const result = await storage.pushAllToMongo();
    setIsSyncing(false);
    if (result.success) {
      setSyncStatus('Semua data lokal berhasil dikirim dan disinkronkan ke MongoDB Atlas!');
      onRefreshData();
      setTimeout(() => setSyncStatus(null), 4000);
    } else {
      setSyncStatus(`Gagal sinkronisasi: ${result.error || 'Terjadi kesalahan'}`);
    }
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

  const isConnected = config.status === 'connected';
  const teachersCount = config.counts?.teachers ?? storage.getTeachers().length;
  const schedulesCount = config.counts?.schedules ?? storage.getSchedules().length;
  const holidaysCount = config.counts?.holidays ?? storage.getHolidays().length;
  const attendancesCount = config.counts?.attendances ?? storage.getAttendances().length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Koneksi Database MongoDB Atlas
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Database cloud terpusat untuk sinkronisasi antar HP & Laptop
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 pt-3 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Koneksi & Status Database</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Panduan Cara Dapat URI MongoDB</span>
          </button>
        </div>

        {/* Konten Tab */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {activeTab === 'config' && (
            <>
              {/* Status Banner */}
              {isConnected ? (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <div>
                        <p className="font-bold text-emerald-950 text-xs sm:text-sm">
                          MongoDB Atlas Terhubung & Aktif
                        </p>
                        <p className="text-[11px] text-emerald-800 font-mono mt-0.5">
                          Database: <strong>{config.databaseName}</strong>
                        </p>
                      </div>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  </div>

                  {config.uriMasked && (
                    <div className="p-2 bg-emerald-100/70 rounded-lg text-[11px] font-mono text-emerald-900 break-all select-all">
                      {config.uriMasked}
                    </div>
                  )}

                  {showDisconnectConfirm ? (
                    <div className="p-2.5 bg-white rounded-lg border border-rose-200 space-y-2 mt-2">
                      <p className="text-xs font-semibold text-rose-900">
                        Putuskan koneksi ke MongoDB? Aplikasi akan beralih ke mode penyimpanan memori lokal.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Ya, Putuskan
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDisconnectConfirm(false)}
                          className="px-3 py-1 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-emerald-700">
                        Perubahan data tersimpan langsung ke cloud database MongoDB.
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDisconnectConfirm(true)}
                        className="text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer shrink-0"
                      >
                        <Unlink className="w-3 h-3" />
                        <span>Putuskan Koneksi</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950 text-xs sm:text-sm">
                        Database Belum Terhubung (Mode Memori Lokal)
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                        Saat ini data tersimpan di memori browser perangkat ini. Masukkan <strong>Connection String (URI)</strong> MongoDB Atlas Anda di bawah agar data tersimpan di cloud dan otomatis sinkron antar HP & Laptop.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner jika ada */}
              {connectError && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-950">
                        Gagal Terhubung ke MongoDB Atlas
                      </p>
                      <p className="text-[11px] leading-relaxed font-mono mt-1 text-rose-800 whitespace-pre-line">
                        {connectError}
                      </p>
                    </div>
                  </div>

                  {(connectError.includes('bad auth') || connectError.includes('Autentikasi')) && (
                    <div className="mt-2 p-3 bg-white/90 rounded-xl border border-rose-300 text-slate-800 space-y-2">
                      <p className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                        <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                        <span>Solusi Mengatasi "bad auth : authentication failed":</span>
                      </p>
                      <ul className="space-y-1.5 text-[11px] text-slate-700 pl-1">
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-rose-700">1.</span>
                          <span>
                            <strong>Bukan Email Login Atlas:</strong> Username di sini BUKAN email akun Google/Atlas Anda. Pastikan menggunakan <strong>Database User</strong> yang dibuat di menu <em>Security &gt; Database Access</em> di MongoDB Atlas.
                          </span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-rose-700">2.</span>
                          <span>
                            <strong>Hilangkan Kurung Siku &lt; &gt;:</strong> Jika URI Anda tertulis <code>&lt;password&gt;</code>, hilangkan tanda <code>&lt;</code> dan <code>&gt;</code>. Contoh: tulis <code>mypassword123</code>, bukan <code>&lt;mypassword123&gt;</code>.
                          </span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-rose-700">3.</span>
                          <span>
                            <strong>Password Ada Simbol Khusus (@, #, $)?</strong> Gunakan opsi <em>"Bantu Susun Kredensial"</em> di bawah agar karakter khusus otomatis disandikan dengan benar.
                          </span>
                        </li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => setInputMode('builder')}
                        className="mt-1 w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Gunakan Form Bantu Susun Kredensial Sekarang</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Success Banner */}
              {connectSuccess && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{connectSuccess}</span>
                </div>
              )}

              {/* Ringkasan Koleksi Dokumen MongoDB */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                    Koleksi Dokumen ({isConnected ? 'Di Cloud MongoDB' : 'Di Memori Lokal'}):
                  </h4>
                  {isConnected && (
                    <button
                      type="button"
                      onClick={handlePushAllToMongo}
                      disabled={isSyncing}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      <span>{isSyncing ? 'Mengirim Data...' : 'Kirim Data Lokal ke MongoDB'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-mono text-[11px]">teachers</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{teachersCount} Dokumen</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-mono text-[11px]">schedules</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{schedulesCount} Dokumen</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-mono text-[11px]">holidays</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{holidaysCount} Dokumen</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-mono text-[11px]">attendances</span>
                    <span className="block font-bold text-slate-900 mt-0.5">{attendancesCount} Dokumen</span>
                  </div>
                </div>

                {syncStatus && (
                  <p className="text-xs font-semibold text-emerald-700 mt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    {syncStatus}
                  </p>
                )}
              </div>

              {/* Mode Pemilihan Form: Tempel URI vs Bantu Susun */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setInputMode('uri')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                        inputMode === 'uri'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tempel URI Langsung
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('builder')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                        inputMode === 'builder'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Bantu Susun Kredensial</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('guide')}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Panduan Lengkap</span>
                  </button>
                </div>

                {inputMode === 'builder' ? (
                  /* Form Bantuan Susun Kredensial (Auto-encode, Anti Bad-Auth) */
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Asisten Pembuat URI Anti Salah Format</span>
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Masukkan kredensial terpisah. Karakter khusus (@, #, $) dan kurung siku &lt; &gt; akan disandikan otomatis.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-xs">
                          Username Database
                        </label>
                        <input
                          type="text"
                          value={builderUser}
                          onChange={e => setBuilderUser(e.target.value)}
                          placeholder="misal: admin atau guru"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">Dari menu Database Access</p>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1 text-xs">
                          Password Database
                        </label>
                        <div className="relative">
                          <input
                            type={showBuilderPass ? 'text' : 'password'}
                            value={builderPass}
                            onChange={e => setBuilderPass(e.target.value)}
                            placeholder="password user database"
                            className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowBuilderPass(!showBuilderPass)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showBuilderPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Jangan pakai tanda &lt; &gt;</p>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-semibold mb-1 text-xs">
                          Host / Cluster Domain MongoDB Atlas
                        </label>
                        <input
                          type="text"
                          value={builderHost}
                          onChange={e => setBuilderHost(e.target.value)}
                          placeholder="cluster0.abcde.mongodb.net (atau tempel link dari Atlas)"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleApplyBuilder}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Rakit & Terapkan ke URI</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Form Input URI & Koneksi */}
                <form onSubmit={handleConnect} className="space-y-3 pt-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">
                      Nama Database (Database Name)
                    </label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={e => setDbName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="absensi_on_db"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-semibold text-xs">
                        MongoDB Connection String (URI)
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyExample}
                        className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedFormat ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedFormat ? 'Format tersalin!' : 'Salin Contoh URI'}</span>
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={uri}
                      onChange={e => setUri(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/absensi_on_db?retryWrites=true&w=majority"
                      required
                    />

                    {/* Deteksi Otomatis Kurung Siku */}
                    {hasBrackets && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Ditemukan tanda <strong>&lt; &gt;</strong> pada URI. Hapus sebelum menghubungkan.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCleanBrackets}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] shrink-0 cursor-pointer"
                        >
                          Hapus &lt; &gt; Otomatis
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mt-1">
                      Ganti <code>&lt;username&gt;</code> dan <code>&lt;password&gt;</code> dengan kredensial database Anda tanpa tanda kurung siku.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isConnecting}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menguji & Menghubungkan...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5" />
                          <span>{isConnected ? 'Uji & Perbarui Koneksi' : 'Hubungkan ke MongoDB Atlas'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Backup & Restore JSON */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cadangkan (JSON)</span>
                  </button>

                  <label className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pulihkan (JSON)</span>
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>

                {showResetConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-rose-700 font-semibold text-[11px]">Yakin reset ke data awal?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetConfirm(false);
                        storage.resetToDefault();
                        onRefreshData();
                        setResetStatus('Database berhasil dikembalikan ke data awal.');
                        setTimeout(() => setResetStatus(null), 3000);
                      }}
                      className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700 cursor-pointer"
                    >
                      Ya, Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2 py-1 border border-slate-300 rounded text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-rose-600 hover:text-rose-700 font-medium hover:underline text-xs cursor-pointer"
                  >
                    Reset Data Awal
                  </button>
                )}
              </div>

              {resetStatus && (
                <p className="text-xs text-center font-semibold text-emerald-700">{resetStatus}</p>
              )}

              {importStatus && (
                <p className="text-xs text-center font-semibold text-emerald-700">{importStatus}</p>
              )}
            </>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
                <p className="font-bold text-xs sm:text-sm">Panduan Menghubungkan ke MongoDB Atlas (Gratis 100%):</p>
                <p className="mt-1 text-slate-600 text-[11px] sm:text-xs">
                  MongoDB Atlas menyediakan database cloud gratis (M0 Free Tier 512MB) yang dapat diakses online tanpa kartu kredit.
                </p>
              </div>

              {/* Langkah 1 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Buat Akun & Cluster di MongoDB Atlas</span>
                </div>
                <p className="pl-7 text-slate-600">
                  Buka{' '}
                  <a
                    href="https://www.mongodb.com/cloud/atlas/register"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline font-semibold inline-flex items-center gap-0.5"
                  >
                    <span>mongodb.com/cloud/atlas/register</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  dan pilih opsi <strong>Shared / Free (M0)</strong>.
                </p>
              </div>

              {/* Langkah 2 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Buat Database User & Password (Paling Penting!)</span>
                </div>
                <div className="pl-7 space-y-1 text-slate-600">
                  <p>
                    • Di menu sebelah kiri <strong>Security &gt; Database Access</strong>, klik tombol <strong>"Add New Database User"</strong>.
                  </p>
                  <p>
                    • <strong>PENTING:</strong> Ini BUKAN email login web Atlas Anda. Ini adalah username dan password khusus akses database (contoh: username <code>admin</code> atau <code>guru</code>).
                  </p>
                  <p>
                    • Berikan izin (Built-in Role): <strong>Read and write to any database</strong>.
                  </p>
                </div>
              </div>

              {/* Langkah 3: PENTING IP */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Izinkan Akses IP (Network Access)</span>
                </div>
                <div className="pl-7 space-y-1 text-slate-600">
                  <p>
                    • Di menu sebelah kiri <strong>Security &gt; Network Access</strong>, klik <strong>"Add IP Address"</strong>.
                  </p>
                  <p>
                    • Klik tombol <strong>"Allow Access from Anywhere"</strong> (akan mengisi IP <code>0.0.0.0/0</code>), lalu klik Confirm.
                  </p>
                  <p className="text-amber-800 font-medium">
                    * Wajib diisi agar aplikasi yang dideploy dapat menjangkau server MongoDB Anda dari mana saja.
                  </p>
                </div>
              </div>

              {/* Langkah 4 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                    4
                  </span>
                  <span>Salin Connection String (URI)</span>
                </div>
                <div className="pl-7 space-y-1.5 text-slate-600">
                  <p>
                    • Pada halaman <strong>Deployment &gt; Database</strong>, klik tombol <strong>"Connect"</strong>.
                  </p>
                  <p>
                    • Pilih opsi <strong>"Drivers"</strong> (Node.js).
                  </p>
                  <p>
                    • Salin Connection String yang muncul, contoh:
                  </p>
                  <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-800 break-all select-all border border-slate-200">
                    mongodb+srv://admin:&lt;password&gt;@cluster0.xxxxx.mongodb.net/absensi_on_db?retryWrites=true&w=majority
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    * Ganti <code>&lt;password&gt;</code> dengan password yang Anda buat di Langkah 2 (jangan sertakan tanda kurung siku <code>&lt; &gt;</code>).
                  </p>
                </div>
              </div>

              {/* Langkah 5 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                    5
                  </span>
                  <span>Tempel URI & Klik "Hubungkan ke MongoDB"</span>
                </div>
                <p className="pl-7 text-slate-600">
                  Kembali ke tab <strong>Koneksi & Status Database</strong> di atas, tempel URI tersebut, lalu klik tombol hijau <strong>"Hubungkan ke MongoDB Atlas"</strong>.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                >
                  Buka Form Input URI Sekarang
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
