import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Leaf, X, Clock, Thermometer, Droplets, Mountain, CheckCircle, AlertTriangle, Wand2, Calculator, XCircle, Plus, Trash2, Info, MapPin } from 'lucide-react';
import { CULTIVARES, ZARC_PADRAO } from '../components/simulador/CultivaresAgaria.jsx';

/* ── Cadastro de cultivares — armazenamento local ─────────────
   Guardado neste navegador (localStorage), separado do catálogo oficial
   (CULTIVARES, fonte: Portaria SPA/MAPA + Embrapa Trigo 2025). Nunca é
   misturado com o catálogo oficial — cada cultivar cadastrada aqui aparece
   com uma etiqueta clara de "cadastro próprio, não verificado", e entra no
   cálculo de recomendação como qualquer outra cultivar. */
const LOCAL_KEY = 'soufii_cultivares_customizadas';
const UFS_ZONA = ['PR', 'SC', 'RS', 'SP', 'MG', 'GO', 'MS', 'MT', 'BA', 'DF'];
const NIVEIS_RESISTENCIA = ['Não avaliado', 'Resistente', 'Moderadamente resistente', 'Moderadamente suscetível', 'Suscetível', 'Altamente suscetível'];
const DOENCAS_PADRAO = ['Acamamento', 'Oídio', 'Ferrugem da folha', 'Mancha foliar', 'Giberela'];
const CORES_CUSTOM = ['#64748b', '#ec4899', '#f97316', '#0ea5e9', '#84cc16', '#a855f7'];

function carregarCustomizadas() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ── Verificador de aptidão ──────────────────────────────────
   As 4 cultivares reais compartilham os mesmos critérios ZARC gerais
   (não existe fonte oficial com faixa climática diferente por cultivar
   — ver comentário em CultivaresAgaria.jsx). Por isso este painel não
   finge "pontuar" cada cultivar contra o clima informado — em vez
   disso, checa se as condições atendem ao ZARC (um resultado só, real)
   e ordena as cultivares pelo único diferencial documentado: ciclo. */
function checarAptidao(cond) {
  const z = ZARC_PADRAO;
  const criterios = [
    { label: 'Temperatura', ok: cond.temp >= z.tempMin && cond.temp <= z.tempMax, faixa: `${z.tempMin}–${z.tempMax}°C` },
    { label: 'Precipitação', ok: cond.prec >= z.chuvaMin && cond.prec <= z.chuvaMax, faixa: `${z.chuvaMin}–${z.chuvaMax}mm` },
    { label: 'Altitude', ok: cond.alt >= z.altitude, faixa: `≥${z.altitude}m` },
    { label: 'Risco de geada', ok: cond.geada <= z.maxGeada, faixa: `≤${z.maxGeada}%` },
    { label: 'Teor de argila', ok: cond.argila >= z.argila, faixa: `≥${z.argila}%` },
  ];
  const aprovados = criterios.filter(c => c.ok).length;
  return { criterios, aprovados, total: criterios.length, apto: aprovados === criterios.length };
}

/* Ciclo em dias (emergência→maturação), extraído do texto de c.ciclo real
   ("Grupo II · 80 dias até espigamento, 122 dias até maturação"). */
function diasMaturacao(ciclo) {
  const m = ciclo.match(/(\d+) dias até maturação/);
  return m ? Number(m[1]) : 999;
}

/* Junta o catálogo oficial com as cultivares cadastradas pelo usuário numa
   lista única, no mesmo formato { key, c, extra, oficial } usado pelos
   cards e pelo modal de detalhe. */
function unificarCultivares(customizadas) {
  const oficiais = Object.entries(CULTIVARES).map(([key, c]) => ({
    key, c, extra: INFO_EXTRA[key], oficial: true,
  }));
  const custom = customizadas.map(c => ({
    key: c.id,
    c: {
      nome: c.nome, obtentor: c.obtentor || 'Cadastro próprio', icon: Leaf, cor: c.cor,
      ciclo: `${c.grupo} · ${c.diasEsp} dias até espigamento, ${c.diasMat} dias até maturação`,
      desc: c.desc || 'Cultivar cadastrada localmente — sem fonte oficial verificada ainda.',
      zarc: ZARC_PADRAO,
    },
    extra: { zonas: c.zonas ?? [], img: '📝', caracteristicas: c.caracteristicas ?? [] },
    oficial: false,
  }));
  return [...oficiais, ...custom];
}

/* Recomendador reativo: reordena a lista conforme os inputs mudam.
   1º critério — zona real documentada (extra.zonas) bate com o estado
   selecionado, quando informado; 2º critério — ciclo mais curto primeiro,
   que é o que reduz janela de exposição quando o risco de geada é alto.
   Os dois são diferenciais REAIS (zona e ciclo são documentados por
   cultivar); não inventa nota climática por cultivar. */
function recomendarCultivares(lista, uf) {
  return lista
    .map(item => ({ ...item, dias: diasMaturacao(item.c.ciclo), zonaOk: !uf || uf === 'Todos' || (item.extra.zonas ?? []).includes(uf) }))
    .sort((a, b) => {
      if (a.zonaOk !== b.zonaOk) return a.zonaOk ? -1 : 1;
      return a.dias - b.dias;
    });
}

const FILTROS = ['Todas', 'Grupo I', 'Grupo II', 'Grupo III'];

// Reação a doenças/acamamento — Tabela 3.1, Embrapa Trigo (2025), ensaios
// Passo Fundo/RS e Guarapuava/PR, 2015–2024. R=resistente, MR=moderadamente
// resistente, MS=moderadamente suscetível, S=suscetível, AS=altamente suscetível.
const INFO_EXTRA = {
  Condessa: {
    zonas: ['PR'],
    img: '👸',
    cor: '#c026d3',
    caracteristicas: [
      { label: 'Acamamento', val: 'Resistente', ok: true },
      { label: 'Ferrugem da folha', val: '1/9 (escala Agrária, 0=resistente)', ok: true },
      { label: 'Oídio', val: '0/9 (escala Agrária, 0=resistente)', ok: true },
      { label: 'Mancha marrom', val: '4/9 (escala Agrária, 0=resistente)', ok: false },
      { label: 'Mancha em rede', val: '2/9 (escala Agrária, 0=resistente)', ok: true },
      { label: 'Nível de DON', val: '3/9 (escala Agrária, 0=baixo)', ok: true },
    ],
  },
  Princesa: {
    zonas: ['PR', 'SC', 'RS'],
    img: '🌾',
    cor: '#f59e0b',
    caracteristicas: [
      { label: 'Acamamento', val: 'Moderadamente suscetível', ok: false },
      { label: 'Oídio', val: 'Resistente', ok: true },
      { label: 'Ferrugem da folha', val: 'Moderadamente resistente', ok: true },
      { label: 'Mancha-reticular', val: 'Moderadamente resistente', ok: true },
      { label: 'Giberela', val: 'Moderadamente suscetível', ok: false },
    ],
  },
  'BRS Cauê': {
    zonas: ['RS', 'PR', 'SC'],
    img: '👑',
    cor: '#8b5cf6',
    caracteristicas: [
      { label: 'Altura de planta', val: '72cm (genes de nanismo)', ok: true },
      { label: 'Acamamento', val: 'Moderadamente resistente', ok: true },
      { label: 'Oídio', val: 'Altamente suscetível', ok: false },
      { label: 'Giberela', val: 'Suscetível', ok: false },
      { label: 'Mancha-reticular', val: 'Moderadamente resistente', ok: true },
    ],
  },
  Duquesa: {
    zonas: ['PR', 'SC'],
    img: '💎',
    cor: '#06b6d4',
    caracteristicas: [
      { label: 'Acamamento', val: 'Moderadamente resistente', ok: true },
      { label: 'Oídio', val: 'Resistente', ok: true },
      { label: 'Ferrugem da folha', val: 'Moderadamente resistente', ok: true },
      { label: 'Mancha-marrom', val: 'Moderadamente suscetível', ok: false },
      { label: 'Giberela', val: 'Suscetível', ok: false },
    ],
  },
  Imperatriz: {
    zonas: ['GO', 'MG', 'SP', 'MS', 'MT', 'BA', 'PR', 'RS'],
    img: '🌿',
    cor: '#10b981',
    caracteristicas: [
      { label: 'Acamamento', val: 'Moderadamente resistente', ok: true },
      { label: 'Oídio', val: 'Moderadamente resistente', ok: true },
      { label: 'Ferrugem da folha', val: 'Moderadamente resistente', ok: true },
      { label: 'Mancha-marrom', val: 'Moderadamente suscetível', ok: false },
      { label: 'Giberela', val: 'Suscetível', ok: false },
    ],
  },
};

function CultivarCard({ cultivarKey, c, extra, oficial, onClick }) {
  const Icon = c.icon;
  return (
    <div
      onClick={() => onClick(cultivarKey)}
      style={{
        background: 'var(--bg-card)', border: `1px solid var(--border)`,
        borderRadius: 16, padding: 20, cursor: 'pointer', position: 'relative',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = c.cor;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 30px ${c.cor}25`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {!oficial && (
        <span style={{
          position: 'absolute', top: 12, right: 12, fontSize: 8, fontWeight: 800,
          padding: '2px 7px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280',
          border: '1px solid #E5E7EB', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>Cadastro próprio</span>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, fontSize: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${c.cor}18`, border: `1px solid ${c.cor}35`, flexShrink: 0,
        }}>
          {extra.img}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: c.cor, marginBottom: 3 }}>{c.nome}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={10} color="var(--text-faint)" />
            <p style={{ fontSize: 10, color: 'var(--text-faint)' }}>{c.ciclo}</p>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>{c.desc}</p>

      {/* Parâmetros ZARC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
        {[
          { icon: Thermometer, label: 'Temp', val: `${c.zarc.tempMin}–${c.zarc.tempMax}°C`, cor: '#f59e0b' },
          { icon: Droplets,    label: 'Chuva', val: `${c.zarc.chuvaMin}–${c.zarc.chuvaMax}mm`, cor: '#06b6d4' },
          { icon: Mountain,    label: 'Altitude', val: `≥${c.zarc.altitude}m`, cor: '#8b5cf6' },
          { icon: Leaf,        label: 'Argila', val: `≥${c.zarc.argila}%`, cor: '#10b981' },
        ].map(({ icon: Ic, label, val, cor }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-card2)', borderRadius: 7, padding: '6px 8px',
          }}>
            <Ic size={11} color={cor} />
            <div>
              <p style={{ fontSize: 9, color: 'var(--text-faint)' }}>{label}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Zonas */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {extra.zonas.map(z => (
          <span key={z} style={{
            fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
            background: `${c.cor}15`, color: c.cor, border: `1px solid ${c.cor}30`,
          }}>{z}</span>
        ))}
      </div>
    </div>
  );
}

function Detalhe({ cultivarKey, c, extra, oficial, onClose, onDelete }) {
  const Icon = c.icon;
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: `1px solid ${c.cor}50`,
          borderRadius: 20, padding: 28, maxWidth: 560, width: '100%',
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${c.cor}20`,
          animation: 'fadeUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16, fontSize: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${c.cor}18`,
            }}>{extra.img}</div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.cor }}>{c.nome}</p>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{c.ciclo}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!oficial && (
              <button onClick={() => { onDelete(cultivarKey); onClose(); }} title="Excluir cadastro" style={{
                background: 'var(--bg-card2)', border: '1px solid #fecaca',
                borderRadius: 8, padding: 7, cursor: 'pointer', color: '#dc2626',
                display: 'flex',
              }}><Trash2 size={14} /></button>
            )}
            <button onClick={onClose} style={{
              background: 'var(--bg-card2)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-faint)',
              display: 'flex',
            }}><X size={14} /></button>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>{c.desc}</p>

        {/* Zonas indicadas */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
          {extra.zonas.map(z => (
            <span key={z} style={{
              fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: `${c.cor}15`, color: c.cor, border: `1px solid ${c.cor}30`,
            }}>{z}</span>
          ))}
        </div>

        {!oficial && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', marginBottom: 18 }}>
            <Info size={13} color="#92400e" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: '#92400e' }}>Cadastro próprio, salvo neste navegador — não é dado verificado em fonte oficial (Embrapa/MAPA/FAPA).</p>
          </div>
        )}

        {/* Ciclo e reação a doenças */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Ciclo e reação a doenças {oficial ? '— Embrapa Trigo (2025)' : '— informado no cadastro'}
        </p>
        {extra.caracteristicas.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 20 }}>Nenhuma característica de doença informada no cadastro.</p>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {extra.caracteristicas.map(({ label, val, ok }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {ok ? <CheckCircle size={13} color="#10b981" /> : <AlertTriangle size={13} color="#f59e0b" />}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--text-primary)' : '#f59e0b' }}>{val}</span>
            </div>
          ))}
        </div>
        )}

        {/* Parâmetros ZARC */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Parâmetros ZARC
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Temperatura', val: `${c.zarc.tempMin}–${c.zarc.tempMax}°C` },
            { label: 'Precipitação', val: `${c.zarc.chuvaMin}–${c.zarc.chuvaMax}mm` },
            { label: 'Altitude mín.', val: `${c.zarc.altitude}m` },
            { label: 'Argila mín.', val: `${c.zarc.argila}%` },
            { label: 'Geada máx.', val: `${c.zarc.maxGeada}%` },
            { label: 'Chuva colheita', val: `≤${c.zarc.maxChuvaColheita}mm` },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Formulário de cadastro de cultivar ───────────────────────
   Salva localmente (localStorage) — não sobrescreve nem se mistura com o
   catálogo oficial. O objetivo é permitir registrar cultivares que a
   FAPA/Agrária conhece mas que ainda não estão no catálogo verificado
   deste app, pra já entrarem no recomendador enquanto isso não é validado. */
function CadastroCultivar({ onClose, onSave }) {
  const [form, setForm] = useState({
    nome: '', obtentor: '', grupo: 'Grupo II', diasEsp: 80, diasMat: 125,
    desc: '', zonas: [], cor: CORES_CUSTOM[Math.floor(Math.random() * CORES_CUSTOM.length)],
    caracteristicas: DOENCAS_PADRAO.map(d => ({ label: d, val: 'Não avaliado' })),
  });
  const [erro, setErro] = useState('');

  function toggleZona(uf) {
    setForm(f => ({ ...f, zonas: f.zonas.includes(uf) ? f.zonas.filter(z => z !== uf) : [...f.zonas, uf] }));
  }
  function setCaracteristica(idx, val) {
    setForm(f => {
      const c = [...f.caracteristicas];
      c[idx] = { ...c[idx], val };
      return { ...f, caracteristicas: c };
    });
  }
  function submit() {
    if (!form.nome.trim()) { setErro('Informe o nome da cultivar.'); return; }
    onSave({
      ...form,
      nome: form.nome.trim(),
      id: `custom-${Date.now()}`,
      caracteristicas: form.caracteristicas.map(c => ({
        ...c, ok: ['Resistente', 'Moderadamente resistente'].includes(c.val),
      })),
    });
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 12, color: '#374151', outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, padding: 26, maxWidth: 620, width: '100%',
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#1B4332' }}>Cadastrar cultivar</p>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: 7, cursor: 'pointer', color: '#6B7280', display: 'flex' }}><X size={14} /></button>
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 18 }}>
          Salvo só neste navegador, separado do catálogo oficial verificado — aparece marcado como "cadastro próprio" e já entra no recomendador de cultivares.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Nome da cultivar *</label>
            <input style={inputStyle} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Condessa" />
          </div>
          <div>
            <label style={labelStyle}>Obtentor</label>
            <input style={inputStyle} value={form.obtentor} onChange={e => setForm(f => ({ ...f, obtentor: e.target.value }))} placeholder="Ex: FAPA" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Grupo ZARC</label>
            <select style={inputStyle} value={form.grupo} onChange={e => setForm(f => ({ ...f, grupo: e.target.value }))}>
              <option>Grupo I</option><option>Grupo II</option><option>Grupo III</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Dias até espigamento</label>
            <input style={inputStyle} type="number" min={1} value={form.diasEsp} onChange={e => setForm(f => ({ ...f, diasEsp: +e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Dias até maturação</label>
            <input style={inputStyle} type="number" min={1} value={form.diasMat} onChange={e => setForm(f => ({ ...f, diasMat: +e.target.value }))} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Descrição</label>
          <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }}
            value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
            placeholder="Características gerais, altura de planta, observações de campo..." />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Zonas indicadas (estados)</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {UFS_ZONA.map(uf => (
              <button key={uf} type="button" onClick={() => toggleZona(uf)} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 20, cursor: 'pointer',
                background: form.zonas.includes(uf) ? '#1B433218' : '#F9FAFB',
                color: form.zonas.includes(uf) ? '#1B4332' : '#6B7280',
                border: `1px solid ${form.zonas.includes(uf) ? '#1B433250' : '#E5E7EB'}`,
              }}>{uf}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Reação a doenças (opcional)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.caracteristicas.map((c, i) => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>{c.label}</span>
                <select style={{ ...inputStyle, width: 210 }} value={c.val} onChange={e => setCaracteristica(i, e.target.value)}>
                  {NIVEIS_RESISTENCIA.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {erro && <p style={{ fontSize: 11, color: '#dc2626', marginBottom: 10 }}>{erro}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}>Cancelar</button>
          <button onClick={submit} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#1B4332', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Salvar cultivar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function VariedadesPage() {
  const [filtro, setFiltro]     = useState('Todas');
  const [detalhe, setDetalhe]   = useState(null);

  /* Recomendador */
  const [recomAtivo, setRecomAtivo] = useState(false);
  const [rcond, setRcond] = useState({ temp: 16, prec: 1200, alt: 800, geada: 20, argila: 25 });
  const [rUf, setRUf] = useState('Todos');
  const aptidao  = useMemo(() => checarAptidao(rcond), [rcond]);

  /* Cultivares cadastradas pelo usuário — vivem só neste navegador */
  const [customCultivares, setCustomCultivares] = useState(carregarCustomizadas);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(customCultivares));
  }, [customCultivares]);
  function salvarCultivar(nova) {
    setCustomCultivares(prev => [...prev, nova]);
    setCadastroAberto(false);
  }
  function excluirCultivar(id) {
    setCustomCultivares(prev => prev.filter(c => c.id !== id));
  }

  const todasCultivares = useMemo(() => unificarCultivares(customCultivares), [customCultivares]);
  const recomendados = useMemo(() => recomendarCultivares(todasCultivares, rUf), [todasCultivares, rUf]);

  /* Calculadora de sementes */
  const [calcAtivo, setCalcAtivo]     = useState(false);
  const [calcArea,  setCalcArea]      = useState(50);
  const [calcDens,  setCalcDens]      = useState(250); // plantas/m²
  const [calcPMG,   setCalcPMG]       = useState(45);  // peso mil grãos (g)
  const [calcPod,   setCalcPod]       = useState(85);  // poder germinativo (%)
  const semKgHa = useMemo(() => {
    // Kg/ha = (densidade[plantas/m²] × PMG[g/1000 sementes]) / PG[%]
    // Verificado numericamente: density=250, PMG=45g, PG=85% -> 132,4 kg/ha,
    // dentro da faixa real de referência para cevada (100-150 kg/ha). A
    // versão anterior dividia por um fator 10 a mais (bug), entregando
    // ~13 kg/ha — sub-dimensionaria a semeadura em 10x.
    const kgHa = (calcDens * calcPMG) / calcPod;
    return { kgHa: kgHa.toFixed(1), total: (kgHa * calcArea).toFixed(0), sacos: Math.ceil(kgHa * calcArea / 50) };
  }, [calcArea, calcDens, calcPMG, calcPod]);

  const filtrados = todasCultivares.filter(({ c }) => {
    if (filtro === 'Todas') return true;
    return c.ciclo.startsWith(`${filtro} ·`);
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Variedades</h1>
          <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Catálogo de cultivares Agrária / Embrapa para cevada cervejeira</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Botões de ferramentas */}
          <button onClick={() => { setRecomAtivo(v => !v); setCalcAtivo(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: recomAtivo ? '#1B4332' : 'rgba(27,67,50,0.07)', color: recomAtivo ? '#fff' : '#1B4332',
            border: '1px solid rgba(27,67,50,0.25)', transition: 'all 0.15s',
          }}>
            <Wand2 size={12} /> Recomendador
          </button>
          <button onClick={() => { setCalcAtivo(v => !v); setRecomAtivo(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: calcAtivo ? '#0284c7' : 'rgba(2,132,199,0.07)', color: calcAtivo ? '#fff' : '#0284c7',
            border: '1px solid rgba(2,132,199,0.25)', transition: 'all 0.15s',
          }}>
            <Calculator size={12} /> Calc. Sementes
          </button>
          <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '5px 12px', fontSize: 11, borderRadius: 7, cursor: 'pointer',
              background: filtro === f ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)',
              color: filtro === f ? 'var(--emerald)' : 'var(--text-faint)',
              border: `1px solid ${filtro === f ? 'rgba(16,185,129,0.3)' : 'var(--border2)'}`,
              transition: 'all 0.15s',
            }}>{f}</button>
          ))}
          <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />
          <button onClick={() => setCadastroAberto(true)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            fontSize: 11, fontWeight: 600, background: '#fff', color: '#374151', border: '1px dashed #9CA3AF',
          }}>
            <Plus size={12} /> Cadastrar cultivar
          </button>
        </div>
      </div>

      {/* ── Verificador de Aptidão + Cultivares por Ciclo ── */}
      {recomAtivo && (
        <div style={{ background: '#fff', border: '1px solid rgba(27,67,50,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 16, boxShadow: '0 4px 16px rgba(27,67,50,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Wand2 size={14} color="#1B4332" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1B4332' }}>Verificador de Aptidão</p>
          </div>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 16, marginLeft: 22 }}>
            Informe as condições do seu município e, se quiser, o estado — os critérios climáticos são os
            mesmos para todas as cultivares (não há tabela oficial com faixa climática diferente por
            cultivar); o que muda entre elas, e o que a recomendação abaixo usa de verdade, é a zona
            indicada e o ciclo (mais curto reduz a exposição quando o risco de geada é alto).
          </p>
          <div style={{ marginBottom: 16, marginLeft: 22 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', fontWeight: 600, marginBottom: 5 }}>
              <MapPin size={11} color="#1B4332" /> Estado (opcional, refina por zona indicada)
            </span>
            <select value={rUf} onChange={e => setRUf(e.target.value)} style={{
              padding: '6px 10px', borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB',
              color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none',
            }}>
              <option value="Todos">Todos os estados</option>
              {UFS_ZONA.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Temp. média (°C)', key:'temp', min:5, max:30, step:0.5, fmt:v=>`${v}°C` },
              { label: 'Precipit. anual (mm)', key:'prec', min:200, max:2500, step:50, fmt:v=>`${v}mm` },
              { label: 'Altitude (m)', key:'alt', min:100, max:1800, step:50, fmt:v=>`${v}m` },
              { label: 'Risco geada (%)', key:'geada', min:0, max:80, step:5, fmt:v=>`${v}%` },
              { label: 'Argila (%)', key:'argila', min:5, max:60, step:5, fmt:v=>`${v}%` },
            ].map(({ label, key, min, max, step, fmt }) => (
              <div key={key}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'#374151', fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#1B4332' }}>{fmt(rcond[key])}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={rcond[key]}
                  onChange={e => setRcond(p => ({ ...p, [key]: Number(e.target.value) }))}
                  style={{ accentColor: '#1B4332' }} />
              </div>
            ))}
          </div>

          {/* Resultado do checklist */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            padding: '12px 16px', borderRadius: 10,
            background: aptidao.apto ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${aptidao.apto ? '#BBF7D0' : '#FDE68A'}`,
          }}>
            {aptidao.apto ? <CheckCircle size={20} color="#16a34a" /> : <AlertTriangle size={20} color="#d97706" />}
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: aptidao.apto ? '#15803d' : '#92400e' }}>
                {aptidao.apto ? 'Condições dentro do padrão ZARC' : `${aptidao.aprovados} de ${aptidao.total} critérios atendidos`}
              </p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>
                {aptidao.criterios.filter(c => !c.ok).map(c => c.label).join(', ') || 'Todos os critérios agronômicos gerais foram atendidos.'}
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 22 }}>
            {aptidao.criterios.map(c => (
              <div key={c.label} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                borderRadius: 7, background: c.ok ? '#F0FDF4' : '#FEF2F2',
              }}>
                {c.ok ? <CheckCircle size={11} color="#16a34a" /> : <XCircle size={11} color="#dc2626" />}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 9, color: '#6B7280' }}>{c.label}</p>
                  <p style={{ fontSize: 9, color: '#9CA3AF' }}>{c.faixa}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cultivares reais + cadastradas, ranqueadas por zona indicada e ciclo —
              recalcula sempre que rcond ou rUf mudam, sem pontuação fictícia */}
          <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform:'uppercase', letterSpacing: 0.6 }}>
            Recomendação {rUf !== 'Todos' ? `para ${rUf}` : ''} — zona indicada, depois ciclo mais curto primeiro
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {recomendados.map(({ key, c, extra, dias, zonaOk, oficial }, i) => {
              const Icon = c.icon;
              const geadaAlta = !!aptidao.criterios.find(cr => cr.label==='Risco de geada' && !cr.ok);
              return (
                <div key={key} style={{
                  border: `2px solid ${i === 0 ? c.cor : '#E5E7EB'}`,
                  borderRadius: 12, padding: '14px 16px',
                  background: i === 0 ? `${c.cor}06` : '#F9FAFB',
                  position: 'relative',
                }}>
                  {i === 0 && (
                    <span style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:c.cor, color:'#fff', fontSize:8, fontWeight:800, padding:'2px 8px', borderRadius:10 }}>
                      RECOMENDADA
                    </span>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <Icon size={16} color={c.cor} />
                    <span style={{ fontSize:12, fontWeight:700, color:c.cor }}>{c.nome}</span>
                    {!oficial && <span style={{ fontSize:7, fontWeight:800, color:'#6B7280', background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:20, padding:'1px 5px' }}>PRÓPRIA</span>}
                  </div>
                  <p style={{ fontSize:16, fontWeight:800, color:'#111827', marginBottom:2 }}>{dias} dias</p>
                  <p style={{ fontSize:9, color:'#9CA3AF', marginBottom:6 }}>até maturação · {c.obtentor}</p>
                  <p style={{ fontSize:10, color:'#6B7280', lineHeight:1.5 }}>
                    {rUf !== 'Todos' && zonaOk && `Zona indicada pra ${rUf}. `}
                    {rUf !== 'Todos' && !zonaOk && `Sem indicação documentada pra ${rUf}. `}
                    {geadaAlta ? 'Geada acima do padrão — ciclo mais curto reduz a janela de exposição.' : 'Dentro do padrão de geada informado.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calculadora de Sementes ── */}
      {calcAtivo && (
        <div style={{ background: '#fff', border: '1px solid rgba(2,132,199,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 16, boxShadow: '0 4px 16px rgba(2,132,199,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calculator size={14} color="#0284c7" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>Calculadora de Sementes</p>
            <span style={{ fontSize: 10, color: '#6B7280' }}>— Fórmula agronômica padrão (EMBRAPA)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 16 }}>
            {[
              { label:'Área (ha)', min:10, max:2000, step:10, val:calcArea, set:setCalcArea, fmt:v=>`${v} ha` },
              { label:'Densidade (plantas/m²)', min:100, max:450, step:10, val:calcDens, set:setCalcDens, fmt:v=>`${v}/m²` },
              { label:'PMG — peso 1000 grãos (g)', min:30, max:65, step:1, val:calcPMG, set:setCalcPMG, fmt:v=>`${v} g` },
              { label:'Poder germinativo (%)', min:60, max:100, step:1, val:calcPod, set:setCalcPod, fmt:v=>`${v}%` },
            ].map(({ label, min, max, step, val, set, fmt }) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:10, color:'#374151', fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#0284c7' }}>{fmt(val)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => set(Number(e.target.value))}
                  style={{ accentColor: '#0284c7' }} />
              </div>
            ))}
            {/* Resultado */}
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:6, background:'#EFF6FF', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(2,132,199,0.2)' }}>
              <p style={{ fontSize:9, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.7 }}>Resultado</p>
              <p style={{ fontSize:18, fontWeight:900, color:'#0284c7', lineHeight:1 }}>{semKgHa.kgHa} kg/ha</p>
              <p style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{semKgHa.total} kg total</p>
              <p style={{ fontSize:10, color:'#6B7280' }}>{semKgHa.sacos} sacos × 50 kg</p>
            </div>
          </div>
          <div style={{ marginTop:14, padding:'9px 12px', background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, fontSize:10, color:'#0369a1' }}>
            <strong>Fórmula:</strong> Kg/ha = (Densidade[plantas/m²] × PMG[g/1000 sementes]) ÷ PG[%] —
            fórmula agronômica padrão de taxa de semeadura, comum a cereais de inverno
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {filtrados.map(({ key, c, extra, oficial }) => (
          <CultivarCard
            key={key}
            cultivarKey={key}
            c={c}
            extra={extra}
            oficial={oficial}
            onClick={setDetalhe}
          />
        ))}
      </div>

      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Leaf size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          {(filtro === 'Grupo I' || filtro === 'Grupo III') ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Ainda não temos cultivares verificadas do {filtro}</p>
              <p style={{ fontSize: 12, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
                O catálogo oficial (Portaria SPA/MAPA + Embrapa Trigo 2025) só documenta cultivares
                de <strong>Grupo II</strong> pra cevada cervejeira nas fontes que verificamos até agora —
                não encontramos dado confiável de {filtro} pra não arriscar inventar. Se vocês souberem de
                uma cultivar real desse grupo, dá pra cadastrar no botão "+ Cadastrar cultivar" acima.
              </p>
            </>
          ) : (
            <p>Nenhuma cultivar encontrada com este filtro.</p>
          )}
        </div>
      )}

      {detalhe && (() => {
        const item = todasCultivares.find(t => t.key === detalhe);
        if (!item) return null;
        return (
          <Detalhe
            cultivarKey={item.key} c={item.c} extra={item.extra} oficial={item.oficial}
            onClose={() => setDetalhe(null)} onDelete={excluirCultivar}
          />
        );
      })()}

      {cadastroAberto && (
        <CadastroCultivar onClose={() => setCadastroAberto(false)} onSave={salvarCultivar} />
      )}
    </div>
  );
}
