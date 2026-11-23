import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';

export type UserRole = 'guest' | 'petugas' | 'admin';

interface EnvOverrides {
  admin: boolean;
  petugas: boolean;
}

interface AuthContextType {
  role: UserRole;
  username: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPetugas: boolean;
  canInputAttendance: boolean;
  needsAdminSetup: boolean;
  hasPetugasAccount: boolean;
  envOverrides: EnvOverrides;
  isAuthLoading: boolean;
  refreshAuthStatus: () => Promise<void>;
  setupInitialAccounts: (adminPassword: string, petugasPassword?: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; role?: 'admin' | 'petugas'; error?: string }>;
  logout: () => void;
  changePassword: (
    targetUsername: 'admin' | 'petugas',
    oldPass: string,
    newPass: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isChangePasswordModalOpen: boolean;
  openChangePasswordModal: () => void;
  closeChangePasswordModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('guest');
  const [username, setUsername] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [needsAdminSetup, setNeedsAdminSetup] = useState<boolean>(false);
  const [hasPetugasAccount, setHasPetugasAccount] = useState<boolean>(false);
  const [envOverrides, setEnvOverrides] = useState<EnvOverrides>({ admin: false, petugas: false });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Sync in-memory token with StorageRepository
  useEffect(() => {
    storage.setAuthSession(authToken, role);
  }, [authToken, role]);

  const refreshAuthStatus = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/auth/status', { headers });
      if (!res.ok) return;
      const data = await res.json();
      setNeedsAdminSetup(Boolean(data.needsAdminSetup));
      setHasPetugasAccount(Boolean(data.hasPetugasAccount));
      if (data.envOverrides) {
        setEnvOverrides({
          admin: Boolean(data.envOverrides.admin),
          petugas: Boolean(data.envOverrides.petugas),
        });
      }
      if (authToken && !data.session?.authenticated) {
        setAuthToken(null);
        setRole('guest');
        setUsername(null);
      }
    } catch {
      // Ignore network errors silently during status check
    } finally {
      setIsAuthLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    refreshAuthStatus();
  }, [refreshAuthStatus]);

  const setupInitialAccounts = async (
    adminPassword: string,
    petugasPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword: adminPassword.trim(),
          petugasPassword: petugasPassword ? petugasPassword.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Gagal mengaktifkan akun awal.' };
      }

      setAuthToken(data.token);
      setRole('admin');
      setUsername(data.user?.username || 'admin');
      storage.setAuthSession(data.token, 'admin');
      setNeedsAdminSetup(false);
      setHasPetugasAccount(Boolean(data.hasPetugasAccount));
      setIsLoginModalOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Gagal menghubungi server untuk aktivasi awal.' };
    }
  };

  const login = async (
    inputUsername: string,
    password: string
  ): Promise<{ success: boolean; role?: 'admin' | 'petugas'; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: inputUsername.trim().toLowerCase(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Username atau password salah.' };
      }

      const loggedRole: 'admin' | 'petugas' = data.user?.role === 'admin' ? 'admin' : 'petugas';
      setAuthToken(data.token);
      setRole(loggedRole);
      setUsername(data.user?.username || loggedRole);
      storage.setAuthSession(data.token, loggedRole);
      setIsLoginModalOpen(false);
      return { success: true, role: loggedRole };
    } catch {
      return { success: false, error: 'Gagal menghubungi server autentikasi.' };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setRole('guest');
    setUsername(null);
    storage.setAuthSession(null, 'guest');
    setIsChangePasswordModalOpen(false);
  };

  const changePassword = async (
    targetUsername: 'admin' | 'petugas',
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!authToken || role !== 'admin') {
      return { success: false, error: 'Hanya Admin yang dapat mengubah password akun.' };
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          targetUsername,
          oldPassword: oldPass.trim(),
          newPassword: newPass.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Gagal memperbarui password.' };
      }
      if (targetUsername === 'petugas') {
        setHasPetugasAccount(true);
      }
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Gagal menghubungi server saat mengubah password.' };
    }
  };

  const openLoginModal = () => {
    refreshAuthStatus();
    setIsLoginModalOpen(true);
  };
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const openChangePasswordModal = () => {
    refreshAuthStatus();
    setIsChangePasswordModalOpen(true);
  };
  const closeChangePasswordModal = () => setIsChangePasswordModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        role,
        username,
        isAuthenticated: role !== 'guest',
        isAdmin: role === 'admin',
        isPetugas: role === 'petugas',
        canInputAttendance: role === 'admin' || role === 'petugas',
        needsAdminSetup,
        hasPetugasAccount,
        envOverrides,
        isAuthLoading,
        refreshAuthStatus,
        setupInitialAccounts,
        login,
        logout,
        changePassword,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        isChangePasswordModalOpen,
        openChangePasswordModal,
        closeChangePasswordModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
