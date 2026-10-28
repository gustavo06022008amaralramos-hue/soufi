/* Espiga de cevada: haste central, grãos alternados dos dois lados e as
   aristas longas — o traço que distingue a cevada do trigo à primeira vista.
   A mesma geometria está em public/favicon.svg. */
const GRAOS = [
  // [x, y, rotação, lado]  lado -1 = esquerda, 1 = direita
  [17.2, 13.0, -28, -1], [22.8, 15.2, 28, 1],
  [17.0, 17.6, -28, -1], [23.0, 19.8, 28, 1],
  [17.2, 22.2, -28, -1], [22.8, 24.4, 28, 1],
];

export function SoufiiIcon({ size = 38 }) {
  const id = `g${size}`;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="SOUFII — espiga de cevada">
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      {/* aristas */}
      {GRAOS.map(([x, y, , lado], k) => (
        <line key={`a${k}`} x1={x + lado * 0.6} y1={y - 2.6} x2={x + lado * 6.2} y2={y - 11}
          stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" strokeLinecap="round" />
      ))}
      <line x1="20" y1="9.5" x2="20" y2="2.8" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" strokeLinecap="round" />
      {/* haste */}
      <path d="M20 35 C20.4 29 20 22 20 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      {/* folha */}
      <path d="M20.2 31 C23.5 29.5 26.5 27 28 24 C25 25 22 27.2 20.2 29.2" fill="white" opacity="0.55" />
      {/* grãos */}
      <ellipse cx="20" cy="10.6" rx="1.9" ry="2.9" fill="white" />
      {GRAOS.map(([x, y, r], k) => (
        <ellipse key={`g${k}`} cx={x} cy={y} rx="2.1" ry="3.3" fill="white" opacity={0.95 - k * 0.04}
          transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1B4332"/>
          <stop offset="100%" stopColor="#40916C"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SoufiiWordmark({ size = 'md', light = false }) {
  const sizes = { sm: { title: 13, sub: 8 }, md: { title: 16, sub: 9 }, lg: { title: 22, sub: 11 } };
  const s = sizes[size] ?? sizes.md;
  return (
    <div>
      <p style={{
        fontSize: s.title, fontWeight: 800, letterSpacing: 1.2, lineHeight: 1,
        ...(light
          ? { color: '#fff' }
          : {
              background: 'linear-gradient(90deg, #1B4332, #40916C)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }),
      }}>
        SOUFII
      </p>
      <p style={{
        fontSize: s.sub, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 2,
        color: light ? 'rgba(183,228,199,0.8)' : 'var(--text-faint)',
      }}>
        Cevada · Agrária
      </p>
    </div>
  );
}
