import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { SoufiiIcon } from '../components/ui/SoufiiLogo.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [senha, setSenha]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [modo, setModo]         = useState('login'); // 'login' | 'cadastro' | 'reset'

  if (user) return <Navigate to="/home" replace />;

  function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!email.trim()) { setErro('Informe seu usuário.'); return; }
    if (modo !== 'reset' && !senha) { setErro('Informe sua senha.'); return; }
    if (modo !== 'reset' && senha.length < 4) { setErro('Senha muito curta (mínimo 4 caracteres).'); return; }

    setLoading(true);
    setTimeout(() => {
      if (modo === 'reset') {
        setErro('');
        setModo('login');
        setLoading(false);
        return;
      }
      const ok = login(email.trim(), senha);
      if (ok) navigate('/home');
      else { setErro('Credenciais inválidas.'); setLoading(false); }
    }, 600);
  }

  const titulo = { login: 'Entrar na plataforma', cadastro: 'Criar conta', reset: 'Recuperar senha' };
  const botao  = { login: 'Entrar', cadastro: 'Criar conta', reset: 'Enviar link' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>

      {/* ── Vídeo / fallback de fundo ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #071a0e 0%, #0d2b1a 40%, #071410 100%)',
        }} />
        <video autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }}
          onError={e => { e.target.style.display = 'none'; }}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(7,26,14,0.75) 0%, rgba(13,43,26,0.60) 50%, rgba(7,20,16,0.80) 100%)',
        }} />
        {/* Partículas decorativas */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: [300,200,400,250,180,350][i],
            height: [300,200,400,250,180,350][i],
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${['5,150,105','16,185,129','52,211,153','6,95,70','4,120,87','20,160,110'][i]},0.${[6,5,4,7,5,4][i]}) 0%, transparent 70%)`,
            top: `${[10,60,20,70,35,50][i]}%`,
            left: `${[10,70,40,20,60,80][i]}%`,
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            animation: `pulse ${[4,5,6,4.5,5.5,3.5][i]}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* ── Painel esquerdo (info) — visível em telas largas ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 60px', position: 'relative', zIndex: 1,
        display: 'none',
      }}
        className="login-left"
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(134,239,172,0.8)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>
          Cooperativa Agrária · Sistema SOUFII
        </p>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>
          Zoneamento inteligente<br />para cevada cervejeira
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 400, marginBottom: 40 }}>
          Análise agroclimática de 5.570 municípios brasileiros com dados NASA POWER, SoilGrids e critérios ZARC/EMBRAPA.
        </p>
        {[
          { n: '5.570', label: 'Municípios analisados' },
          { n: '32',    label: 'Anos de dados climáticos' },
          { n: '6',     label: 'Critérios ZARC' },
        ].map(({ n, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#86efac', lineHeight: 1 }}>{n}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Formulário ── */}
      <div style={{
        width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, position: 'relative', zIndex: 1, margin: '0 auto',
      }}>

        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 24, padding: '40px 36px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)',
          animation: 'fadeUp 0.4s ease',
        }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ margin: '0 auto 14px', width: 'fit-content' }}>
            <SoufiiIcon size={56} />
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: 1.2,
            background: 'linear-gradient(90deg, #1a5c38, #2daa67)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 4,
          }}>SOUFII</h1>
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Aptidão Cevada · Cooperativa Agrária</p>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'center' }}>
          {titulo[modo]}
        </h2>

        {modo === 'login' && (
          <div style={{
            background: 'rgba(26,107,66,0.07)', border: '1px solid rgba(26,107,66,0.2)',
            borderRadius: 8, padding: '8px 12px', marginBottom: 8, textAlign: 'center',
          }}>
            <p style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 600, marginBottom: 2 }}>Credenciais</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              <strong>agraria</strong> / <strong>cevada2025</strong>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>
              E-mail
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} color="var(--text-faint)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" value={email} onChange={e => { setEmail(e.target.value); setErro(''); }}
                placeholder="agraria" autoComplete="username"
                style={{
                  width: '100%', padding: '10px 12px 10px 36px',
                  background: 'var(--bg-card2)', border: `1px solid ${erro && !email ? '#ef4444' : 'var(--border2)'}`,
                  borderRadius: 9, color: 'var(--text-primary)', fontSize: 13,
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>
          </div>

          {/* Senha */}
          {modo !== 'reset' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="var(--text-faint)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPw ? 'text' : 'password'} value={senha}
                  onChange={e => { setSenha(e.target.value); setErro(''); }}
                  placeholder="••••••••" autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
                  style={{
                    width: '100%', padding: '10px 36px 10px 36px',
                    background: 'var(--bg-card2)', border: `1px solid ${erro && !senha ? '#ef4444' : 'var(--border2)'}`,
                    borderRadius: 9, color: 'var(--text-primary)', fontSize: 13,
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                }}>
                  {showPw ? <EyeOff size={14} color="var(--text-faint)" /> : <Eye size={14} color="var(--text-faint)" />}
                </button>
              </div>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 7, padding: '8px 10px',
            }}>
              <AlertCircle size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444' }}>{erro}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px 0', borderRadius: 9, border: 'none',
            background: loading ? 'var(--bg-card3)' : 'linear-gradient(90deg, #059669, #0891b2)',
            color: loading ? 'var(--text-faint)' : '#fff',
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s', boxShadow: loading ? 'none' : '0 4px 20px rgba(8,145,178,0.35)',
            marginTop: 4,
          }}>
            {loading ? 'Aguarde...' : botao[modo]}
          </button>
        </form>

        {/* Links secundários */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {modo === 'login' && (
            <>
              <button onClick={() => setModo('reset')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-faint)', cursor: 'pointer', textDecoration: 'underline' }}>
                Esqueci minha senha
              </button>
              <button onClick={() => setModo('cadastro')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--cyan)', cursor: 'pointer' }}>
                Criar nova conta
              </button>
            </>
          )}
          {(modo === 'cadastro' || modo === 'reset') && (
            <button onClick={() => setModo('login')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-faint)', cursor: 'pointer' }}>
              ← Voltar para login
            </button>
          )}
        </div>
        </div>{/* fecha card */}
      </div>{/* fecha painel formulário */}
    </div>
  );
}
