import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogIn,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    closeLoginModal,
    login,
    setupInitialAccounts,
    isAdmin,
    needsAdminSetup,
    hasPetugasAccount,
    envOverrides,
    isChangePasswordModalOpen,
    closeChangePasswordModal,
    changePassword,
  } = useAuth();

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // First-Run Setup State
  const [setupAdminPass, setSetupAdminPass] = useState('');
  const [setupAdminConfirm, setSetupAdminConfirm] = useState('');
  const [setupPetugasPass, setSetupPetugasPass] = useState('');
  const [showSetupAdminPass, setShowSetupAdminPass] = useState(false);
  const [showSetupPetugasPass, setShowSetupPetugasPass] = useState(false);

  // Change Password Form State (Admin only)
  const [targetAccount, setTargetAccount] = useState<'petugas' | 'admin'>('petugas');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (isLoginModalOpen) {
      setErrorMsg(null);
      setUsername('');
      setPassword('');
    }
  }, [isLoginModalOpen]);

  useEffect(() => {
    if (isChangePasswordModalOpen) {
      setChangeError(null);
      setChangeSuccess(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isChangePasswordModalOpen, targetAccount]);

  if (!isLoginModalOpen && !isChangePasswordModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const res = await login(username, password);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Username atau password salah.');
    } else {
      setPassword('');
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (setupAdminPass.trim().length < 4) {
      setErrorMsg('Password Admin minimal 4 karakter.');
      return;
    }
    if (setupAdminPass.trim() !== setupAdminConfirm.trim()) {
      setErrorMsg('Konfirmasi password Admin tidak cocok.');
      return;
    }
    if (setupPetugasPass.trim() && setupPetugasPass.trim().length < 4) {
      setErrorMsg('Password Pengisi Absensi minimal 4 karakter jika diisi.');
      return;
    }

    setIsLoading(true);
    const res = await setupInitialAccounts(setupAdminPass, setupPetugasPass);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Gagal melakukan aktivasi awal akun.');
    } else {
      setSetupAdminPass('');
      setSetupAdminConfirm('');
      setSetupPetugasPass('');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);

    if (newPassword.trim().length < 4) {
      setChangeError('Password baru minimal 4 karakter.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setChangeError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setIsSavingPassword(true);
    const res = await changePassword(targetAccount, oldPassword, newPassword);
    setIsSavingPassword(false);

    if (res.success) {
      setChangeSuccess(res.message || 'Password berhasil diperbarui!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setChangeError(res.error || 'Gagal mengubah password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">

        {/* MODAL 1A: AKTIVASI AWAL AKUN (JIKA BELUM ADA ADMIN DI SERVER) */}
        {isLoginModalOpen && !isChangePasswordModalOpen && needsAdminSetup && (
          <div>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-800 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-100 border border-white/15">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Aktivasi Awal Akun</h3>
                  <p className="text-xs text-emerald-100/90 font-medium">
                    Tetapkan kata sandi Admin &amp; Pengisi Absensi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeLoginModal}
                className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetupSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Sistem belum memiliki kata sandi tersimpan. Buat kata sandi akun <strong className="text-slate-900 dark:text-white">admin</strong> (akses penuh) dan akun <strong className="text-slate-900 dark:text-white">petugas</strong> (khusus pengisi absensi di Beranda).
              </p>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                  Password Administrator (Username: admin)
                </label>
                <div className="relative">
                  <input
                    type={showSetupAdminPass ? 'text' : 'password'}
                    required
                    value={setupAdminPass}
                    onChange={(e) => setSetupAdminPass(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupAdminPass(!showSetupAdminPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showSetupAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                  Ulangi Password Administrator
                </label>
                <input
                  type="password"
                  required
                  value={setupAdminConfirm}
                  onChange={(e) => setSetupAdminConfirm(e.target.value)}
                  placeholder="Ketik ulang password admin"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {!envOverrides.petugas && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                    Password Pengisi Absensi (Username: petugas)
                  </label>
                  <div className="relative">
                    <input
                      type={showSetupPetugasPass ? 'text' : 'password'}
                      value={setupPetugasPass}
                      onChange={(e) => setSetupPetugasPass(e.target.value)}
                      placeholder="Opsional, dapat diatur nanti oleh Admin"
                      className="w-full px-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPetugasPass(!showSetupPetugasPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showSetupPetugasPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeLoginModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoading ? 'Mengaktifkan...' : 'Aktifkan & Masuk'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL 1B: FORM LOGIN TERPADU (PETUGAS & ADMINISTRATOR) */}
        {isLoginModalOpen && !isChangePasswordModalOpen && !needsAdminSetup && (
          <div>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-800 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-100 border border-white/15">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Login Sistem Absensi</h3>
                  <p className="text-xs text-emerald-100/90 font-medium">
                    Masukkan username &amp; password akun Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeLoginModal}
                className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Gunakan username <strong className="text-slate-700 dark:text-slate-200">petugas</strong> untuk mengisi absensi di Beranda, atau <strong className="text-slate-700 dark:text-slate-200">admin</strong> untuk akses penuh seluruh menu.
              </p>

              {username.trim().toLowerCase() === 'petugas' && !hasPetugasAccount && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Password akun <strong>petugas</strong> belum diatur. Login menggunakan akun <strong>admin</strong> terlebih dahulu untuk mengatur password Pengisi Absensi.
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Username Field */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username (petugas atau admin)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeLoginModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL 2: KELOLA PASSWORD AKUN (KHUSUS ADMIN - PETUGAS & ADMIN) */}
        {isChangePasswordModalOpen && isAdmin && (
          <div>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-800 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-100 border border-white/15">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Kelola Password Akun</h3>
                  <p className="text-xs text-emerald-100/90 font-medium">
                    Atur password Pengisi Absensi &amp; Administrator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeChangePasswordModal}
                className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              {/* Pilihan Akun Target */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
                <button
                  type="button"
                  onClick={() => setTargetAccount('petugas')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    targetAccount === 'petugas'
                      ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Pengisi Absensi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAccount('admin')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    targetAccount === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Administrator</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>
                  Username: <strong className="font-mono text-slate-900 dark:text-white">{targetAccount}</strong>
                </span>
                <span>
                  Status:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {targetAccount === 'petugas'
                      ? envOverrides.petugas
                        ? 'Dikelola Server Env'
                        : hasPetugasAccount
                        ? 'Aktif'
                        : 'Belum Diatur'
                      : envOverrides.admin
                      ? 'Dikelola Server Env'
                      : 'Aktif'}
                  </strong>
                </span>
              </div>

              {changeSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              {changeError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{changeError}</span>
                </div>
              )}

              {(targetAccount === 'admin' && envOverrides.admin) || (targetAccount === 'petugas' && envOverrides.petugas) ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Password akun <strong>{targetAccount}</strong> saat ini diatur melalui variabel environment server (
                  <code className="font-mono">{targetAccount === 'admin' ? 'ADMIN_PASSCODE' : 'PETUGAS_PASSCODE'}</code>
                  ). Ubah nilai variabel tersebut di pengaturan server untuk menggantinya.
                </div>
              ) : (
                <>
                  {targetAccount === 'admin' && (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                        Password Lama Admin
                      </label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Masukkan password admin saat ini"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                      {targetAccount === 'petugas' ? 'Password Baru Pengisi Absensi' : 'Password Baru Admin'}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 4 karakter"
                        className="w-full px-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                      Ulangi Password Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeChangePasswordModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  Tutup
                </button>
                {!((targetAccount === 'admin' && envOverrides.admin) || (targetAccount === 'petugas' && envOverrides.petugas)) && (
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {isSavingPassword ? 'Menyimpan...' : 'Simpan Password'}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
