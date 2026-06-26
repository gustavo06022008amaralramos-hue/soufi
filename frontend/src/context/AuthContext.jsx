import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const CREDENCIAIS_VALIDAS = [
  { email: import.meta.env.VITE_AUTH_EMAIL_1 ?? 'agraria',             senha: import.meta.env.VITE_AUTH_PASS_1 ?? '' },
  { email: import.meta.env.VITE_AUTH_EMAIL_2 ?? 'agraria@agraria.com', senha: import.meta.env.VITE_AUTH_PASS_2 ?? '' },
  { email: import.meta.env.VITE_AUTH_EMAIL_3 ?? 'admin',               senha: import.meta.env.VITE_AUTH_PASS_3 ?? '' },
].filter(c => c.email && c.senha);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('soufii_user');
    return saved ? JSON.parse(saved) : null;
  });

  function login(email, password) {
    if (!email || !password) return false;
    const emailLower = email.trim().toLowerCase();
    const match = CREDENCIAIS_VALIDAS.find(
      c => c.email === emailLower && c.senha === password
    );
    if (!match) return false;
    const userData = { email: emailLower, nome: 'Equipe SOUFII' };
    localStorage.setItem('soufii_user', JSON.stringify(userData));
    setUser(userData);
    return true;
  }

  function logout() {
    localStorage.removeItem('soufii_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
