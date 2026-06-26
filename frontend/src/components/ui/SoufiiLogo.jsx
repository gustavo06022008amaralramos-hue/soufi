export function SoufiiIcon({ size = 38 }) {
  const id = `g${size}`;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      <line x1="20" y1="32" x2="20" y2="11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round"/>
      <ellipse cx="20" cy="11.5" rx="4.5" ry="2.6" fill="white" opacity="0.95"/>
      <ellipse cx="16" cy="16" rx="3.4" ry="2"   fill="white" opacity="0.82" transform="rotate(-18 16 16)"/>
      <ellipse cx="24" cy="16" rx="3.4" ry="2"   fill="white" opacity="0.82" transform="rotate(18 24 16)"/>
      <ellipse cx="14.5" cy="21" rx="2.8" ry="1.7" fill="white" opacity="0.65" transform="rotate(-22 14.5 21)"/>
      <ellipse cx="25.5" cy="21" rx="2.8" ry="1.7" fill="white" opacity="0.65" transform="rotate(22 25.5 21)"/>
      <path d="M9 31 Q14 25 20 19 Q26 14 31 9"
            stroke="rgba(255,255,255,0.45)" strokeWidth="1.3"
            fill="none" strokeLinecap="round" strokeDasharray="2 2"/>
      <circle cx="9"  cy="31" r="1.8" fill="white" opacity="0.7"/>
      <circle cx="20" cy="19" r="1.8" fill="white" opacity="0.82"/>
      <circle cx="31" cy="9"  r="1.8" fill="white" opacity="0.7"/>
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
