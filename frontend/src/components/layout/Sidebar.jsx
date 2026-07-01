import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, BarChart2, Leaf,
  Newspaper, LogOut, Handshake, TrendingUp, BookOpen,
  Calculator,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { SoufiiIcon, SoufiiWordmark } from '../ui/SoufiiLogo.jsx';
import { useState } from 'react';

const NAV = [
  { to:'/home',         icon:LayoutDashboard, label:'Dashboard'    },
  { to:'/zoneamento',   icon:Map,             label:'Zoneamento'   },
  { to:'/historicos',   icon:BarChart2,       label:'Históricos'   },
  { to:'/custos',       icon:Calculator,      label:'Custos & ROI', destaque: true },
  { to:'/variedades',   icon:Leaf,            label:'Variedades'   },
  { to:'/noticias',     icon:Newspaper,       label:'Notícias'     },
  { to:'/parceiros',    icon:Handshake,       label:'Parceiros'    },
  { to:'/oportunidades',icon:TrendingUp,      label:'Oportunidades'},
  { to:'/manual',       icon:BookOpen,        label:'Manual'       },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  function handleLogout() {
    if (!confirm) { setConfirm(true); return; }
    logout(); navigate('/login');
  }

  const initials = (user?.nome ?? 'U').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();

  return (
    <aside style={{
      width: 220, flexShrink: 0, height: '100vh',
      background: '#1B4332',
      borderRight: 'none',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0,
      boxShadow: '2px 0 16px rgba(0,0,0,0.18)',
    }}>

      {/* Logo */}
      <div style={{
        padding: '18px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <SoufiiIcon size={36} />
        <SoufiiWordmark size="md" light />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label, destaque }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? '#fff' : destaque ? '#86efac' : 'rgba(255,255,255,0.65)',
            background: isActive ? 'rgba(255,255,255,0.12)' : destaque ? 'rgba(134,239,172,0.08)' : 'transparent',
            borderLeft: isActive ? '3px solid #B7E4C7' : destaque ? '3px solid #86efac55' : '3px solid transparent',
            textDecoration: 'none', transition: 'all 0.15s',
          })}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = destaque ? 'rgba(134,239,172,0.08)' : 'transparent'; }}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} style={{ opacity: isActive ? 1 : 0.85 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {destaque && !isActive && (
                  <span style={{ fontSize: 8, fontWeight: 800, background: '#16a34a', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>NOVO</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuário + logout */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 8, marginBottom: 6,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(183,228,199,0.2)', border: '1px solid rgba(183,228,199,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#B7E4C7',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.nome}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          onBlur={() => setConfirm(false)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            background: confirm ? 'rgba(220,38,38,0.15)' : 'transparent',
            border: `1px solid ${confirm ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.12)'}`,
            color: confirm ? '#FCA5A5' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s',
          }}
        >
          <LogOut size={13} />
          {confirm ? 'Confirmar saída?' : 'Sair'}
        </button>
      </div>
    </aside>
  );
}
