import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminCredentials {
  username: string;
  passwordHash: string; // Stored password
}

interface AuthContextType {
  isAdmin: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  changePassword: (oldPass: string, newPass: string) => { success: boolean; error?: string };
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isChangePasswordModalOpen: boolean;
  openChangePasswordModal: () => void;
  closeChangePasswordModal: () => void;
}

const STORAGE_KEY_AUTH_SESSION = 'absensi_admin_session';
const STORAGE_KEY_CREDENTIALS = 'absensi_admin_credentials';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTH_SESSION) === 'true';
    } catch {
      return false;
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Ambil credentials yang tersimpan atau gunakan default
  const getCredentials = (): AdminCredentials => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CREDENTIALS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.username && parsed.passwordHash) {
          return parsed;
        }
      }
    } catch {}
    return { username: DEFAULT_USERNAME, passwordHash: DEFAULT_PASSWORD };
  };

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const creds = getCredentials();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Terima kredensial tersimpan atau fallback admin / admin & admin / admin123
    const isUserValid = cleanUser === creds.username.toLowerCase() || cleanUser === 'admin';
    const isPassValid = 
      cleanPass === creds.passwordHash || 
      cleanPass === DEFAULT_PASSWORD || 
      cleanPass === 'admin123';

    if (isUserValid && isPassValid) {
      setIsAdmin(true);
      try {
        localStorage.setItem(STORAGE_KEY_AUTH_SESSION, 'true');
      } catch {}
      setIsLoginModalOpen(false);
      return { success: true };
    }

    return { 
      success: false, 
      error: 'Username atau password admin salah. Gunakan default "admin" / "admin".' 
    };
  };

  const logout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
    } catch {}
  };

  const changePassword = (oldPass: string, newPass: string): { success: boolean; error?: string } => {
    const creds = getCredentials();
    const cleanOld = oldPass.trim();
    const cleanNew = newPass.trim();

    if (cleanNew.length < 4) {
      return { success: false, error: 'Password baru minimal 4 karakter.' };
    }

    const isOldValid = cleanOld === creds.passwordHash || cleanOld === DEFAULT_PASSWORD || cleanOld === 'admin123';
    if (!isOldValid) {
      return { success: false, error: 'Password lama salah.' };
    }

    const updated: AdminCredentials = {
      username: creds.username,
      passwordHash: cleanNew,
    };

    try {
      localStorage.setItem(STORAGE_KEY_CREDENTIALS, JSON.stringify(updated));
    } catch {}

    setIsChangePasswordModalOpen(false);
    return { success: true };
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const openChangePasswordModal = () => setIsChangePasswordModalOpen(true);
  const closeChangePasswordModal = () => setIsChangePasswordModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
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
