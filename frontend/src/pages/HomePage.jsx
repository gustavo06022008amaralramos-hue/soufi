import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Map, Leaf, Newspaper, ArrowRight, CheckCircle,
  Cloud, Thermometer, Droplets, Wind,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';
const WEATHER_KEY  = 'bd5e378503939ddaee76f12ad7a97608';

const ICONES_CLIMA = {
  Clear:'☀️', Clouds:'☁️', Rain:'🌧️', Drizzle:'🌦️',
  Thunderstorm:'⛈️', Snow:'❄️', Mist:'🌫️', default:'🌤️',
};

const NOTICIAS_HOME = [
  { id:1, titulo:'ZARC 2025/26: MAPA amplia regiões aptas para cevada no PR e SC', fonte:'MAPA', categoria:'Zoneamento', dias:5, resumo:'47 novos municípios do Paraná e 23 de Santa Catarina incluídos no zoneamento.' },
  { id:2, titulo:'FAPA registra produtividade recorde de 5,2 t/ha em Guarapuava', fonte:'FAPA', categoria:'Produção', dias:8, resumo:'Cultivar BRS Duquesa em solos argilosos sob condições climáticas ideais no inverno de 2025.' },
  { id:3, titulo:'BRS Imperatriz consolida expansão para o Cerrado Goiano', fonte:'Agrária', categoria:'Mercado', dias:15, resumo:'3.800 ha plantados com média de 3,8 t/ha em lavouras irrigadas de inverno em GO.' },
];

const BADGE_COR = {
  Zoneamento:{ bg:'rgba(45,106,79,0.1)', cor:'#2D6A4F' },
  Produção:  { bg:'rgba(26,122,60,0.1)', cor:'#1A7A3C' },
  Mercado:   { bg:'rgba(212,160,23,0.1)',cor:'#D4A017' },
  Pesquisa:  { bg:'rgba(74,144,196,0.1)',cor:'#4A90C4' },
  Clima:     { bg:'rgba(74,144,196,0.1)',cor:'#4A90C4' },
};

/* ── Hero SVG grain pattern ── */
const GRAIN_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

export default function HomePage({ municipios = [], apiOnline }) {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [weather,  setWeather]  = useState(null);
  const [progresso,setProgresso]= useState(null);
  const [statsApi, setStatsApi] = useState(null);

  useEffect(() => {
    if (apiOnline) {
      fetch(`${API}/coleta/progresso`)
        .then(r=>r.json()).then(setProgresso).catch(()=>{});
      fetch(`${API}/municipios/estatisticas`)
        .then(r=>r.json()).then(setStatsApi).catch(()=>{});
      fetch(`${API}/municipios/top?limit=5`)
        .then(r=>r.json()).then(d=>setTopApi(d.municipios??[])).catch(()=>{});
    }
  }, [apiOnline]);

  const [topApi, setTopApi] = useState([]);

  useEffect(() => {
    const load = (lat, lon, city) =>
      fetch(`https://api.openweathermap.org/data/2.5/weather?${lat!=null?`lat=${lat}&lon=${lon}`:`q=${city},BR`}&appid=${WEATHER_KEY}&units=metric&lang=pt_br`)
        .then(r=>r.json())
        .then(d => {
          if (!d.main) throw new Error();
          setWeather({ temp:Math.round(d.main.temp), feels:Math.round(d.main.feels_like), humidity:d.main.humidity, wind:Math.round(d.wind.speed*3.6), desc:d.weather[0].description, city:d.name, icon:ICONES_CLIMA[d.weather[0].main]??ICONES_CLIMA.default });
        })
        .catch(()=>{});
    navigator.geolocation?.getCurrentPosition(
      ({coords})=>load(coords.latitude, coords.longitude, null),
      ()=>load(null,null,'Guarapuava'),
    );
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite';

  const stats = useMemo(() => {
    if (statsApi) return {
      total:   statsApi.total,
      aptos:   statsApi.aptos,
      parciais:statsApi.parciais,
      melhor:  statsApi.melhor_municipio
        ? { score_aptidao: statsApi.score_max, nome_display: statsApi.melhor_municipio }
        : null,
    };
    const total   = municipios.length;
    const aptos   = municipios.filter(m=>(m.score_aptidao??0)>=70).length;
    const parciais= municipios.filter(m=>(m.score_aptidao??0)>=40&&(m.score_aptidao??0)<70).length;
    const melhor  = [...municipios].sort((a,b)=>(b.score_aptidao??0)-(a.score_aptidao??0))[0];
    return { total, aptos, parciais, melhor };
  }, [municipios, statsApi]);

  const top5 = topApi.length > 0 ? topApi :
    [...municipios].filter(m=>m.score_aptidao!=null)
      .sort((a,b)=>b.score_aptidao-a.score_aptidao).slice(0,5);

  const processados = progresso?.processados ?? statsApi?.total ?? municipios.length;
  const pctColeta   = ((processados/5571)*100).toFixed(1);

  const scoreCor = (s) => s>=70?'#1A7A3C':s>=40?'#D4A017':'#4A90C4';
  const scoreLabel = (s) => s>=70?'Apto':s>=40?'Parc. Apto':'Inapto';

  return (
    <div style={{ maxWidth:1080, margin:'0 auto' }}>

      {/* ── Saudação ── */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#1B4332', marginBottom:4, letterSpacing:'-0.5px' }}>
          {saudacao}, {user?.nome?.split(' ')[0]}
        </h1>
        <p style={{ fontSize:12, color:'#6B7280' }}>
          {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
        </p>
      </div>

      {/* ── Hero com vídeo ── */}
      <div className="video-hero" style={{
        borderRadius:16, marginBottom:20, minHeight:220,
        display:'flex', alignItems:'center',
        overflow:'hidden',
      }}>
        {/* Fallback gradiente */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#071a0e 0%,#1B4332 50%,#0d3320 100%)', backgroundImage:GRAIN_PATTERN }} />
        {/* Vídeo */}
        <video autoPlay muted loop playsInline
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.4 }}
          onError={e => { e.target.style.display='none'; }}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
        <div className="video-hero-overlay" style={{ borderRadius:16, background:'linear-gradient(135deg,rgba(7,26,14,0.7) 0%,rgba(27,67,50,0.5) 60%,rgba(5,20,10,0.75) 100%)' }} />
        <div className="video-hero-content" style={{ padding:'36px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:24, width:'100%' }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:11, color:'#B7E4C7', fontWeight:600, textTransform:'uppercase', letterSpacing:1.3, marginBottom:10 }}>
            Sistema de Aptidão Agrícola
          </p>
          <h2 style={{ fontSize:26, fontWeight:800, color:'#fff', lineHeight:1.25, marginBottom:12, letterSpacing:'-0.5px' }}>
            Encontre as melhores regiões<br />para cevada cervejeira
          </h2>
          <p style={{ fontSize:13, color:'rgba(183,228,199,0.85)', lineHeight:1.6, marginBottom:20, maxWidth:480 }}>
            Analise {(5571).toLocaleString('pt-BR')} municípios com critérios técnicos ZARC / EMBRAPA — temperatura, solo, altitude, geada e período seco.
          </p>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button className="stagger-1" onClick={()=>navigate('/zoneamento')} style={{
              display:'flex', alignItems:'center', gap:7,
              background:'#B7E4C7', color:'#1B4332', border:'none',
              borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.background='#fff'}
            onMouseLeave={e=>e.currentTarget.style.background='#B7E4C7'}
            >
              <Map size={14} /> Explorar o mapa <ArrowRight size={13} />
            </button>
            <button className="stagger-2" onClick={()=>navigate('/historicos')} style={{
              display:'flex', alignItems:'center', gap:7,
              background:'transparent', color:'rgba(255,255,255,0.75)',
              border:'1px solid rgba(255,255,255,0.25)', borderRadius:8,
              padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.75)'; }}
            >
              Ver estatísticas
            </button>
          </div>
          <p style={{ fontSize:11, color:'rgba(183,228,199,0.6)', marginTop:16 }}>
            ↓ {processados.toLocaleString('pt-BR')} municípios analisados até agora · {pctColeta}% do Brasil
          </p>
        </div>

        {/* Barômetro de progresso */}
        <div style={{
          flexShrink:0, width:160, height:160,
          background:'rgba(255,255,255,0.07)', borderRadius:14,
          border:'1px solid rgba(255,255,255,0.12)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
        }}>
          <p style={{ fontSize:36, fontWeight:800, color:'#B7E4C7', lineHeight:1 }}>{pctColeta}%</p>
          <p style={{ fontSize:11, color:'rgba(183,228,199,0.7)', textAlign:'center', lineHeight:1.4 }}>
            do Brasil<br />mapeado
          </p>
          <div style={{ width:100, height:5, background:'rgba(255,255,255,0.15)', borderRadius:3, marginTop:6, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(parseFloat(pctColeta),100)}%`, background:'#B7E4C7', borderRadius:3 }} />
          </div>
        </div>
        </div>{/* fecha video-hero-content */}
      </div>{/* fecha video-hero */}

      {/* ── Stats ── */}
      <div style={{ background:'#F0F7F2', borderRadius:12, padding:'20px 24px', marginBottom:20, border:'1px solid rgba(45,106,79,0.15)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
          {[
            { val:processados.toLocaleString('pt-BR'), label:'Municípios analisados', cor:'#2D6A4F', cls:'stagger-1' },
            { val:stats.aptos>0?stats.aptos.toLocaleString('pt-BR'):'—', label:'Municípios aptos (score ≥70)', cor:'#1A7A3C', cls:'stagger-2' },
            { val:stats.parciais>0?stats.parciais.toLocaleString('pt-BR'):'—', label:'Parcialmente aptos (40–69)', cor:'#D4A017', cls:'stagger-3' },
            { val:stats.melhor?`${stats.melhor.score_aptidao ?? stats.melhor.score_aptidao}/100`:'—', label:stats.melhor?(stats.melhor.nome_display ?? `${stats.melhor.nome_municipio}/${stats.melhor.uf}`):'Melhor score', cor:'#1B4332', cls:'stagger-4' },
          ].map(s => (
            <div key={s.label} className={s.cls} style={{ textAlign:'center' }}>
              <p style={{ fontSize:30, fontWeight:800, color:s.cor, lineHeight:1, marginBottom:5, fontVariantNumeric:'tabular-nums' }}>{s.val}</p>
              <p style={{ fontSize:11, color:'#6B7280', lineHeight:1.35 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Como funciona + clima ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16, marginBottom:20 }}>

        {/* Como funciona */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'20px 22px' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#1B4332', marginBottom:16, letterSpacing:'-0.3px' }}>Como funciona</p>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { n:'01', title:'Coleta climática', desc:'30 anos de dados mensais NASA POWER — temperatura, precipitação e risco de geada para cada município.' },
              { n:'02', title:'Análise de solo', desc:'Teor de argila via SoilGrids (ISRIC) e classificação ZARC Tipo 1/2/3 para cevada cervejeira.' },
              { n:'03', title:'Score de aptidão', desc:'6 critérios ZARC/EMBRAPA calculam um score 0–100. Score ≥ 70 = Apto; 40–69 = Parcialmente Apto.' },
            ].map(p => (
              <div key={p.n} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{
                  width:32, height:32, borderRadius:8, flexShrink:0,
                  background:'#F0F7F2', border:'1px solid rgba(45,106,79,0.2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:800, color:'#2D6A4F',
                }}>
                  {p.n}
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:3 }}>{p.title}</p>
                  <p style={{ fontSize:11, color:'#6B7280', lineHeight:1.55 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clima */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {weather ? (
            <div style={{ background:'linear-gradient(135deg,#EFF6FF,#fff)', border:'1px solid #BFDBFE', borderRadius:12, padding:'18px 20px', flex:1 }}>
              <p style={{ fontSize:10, color:'#6B7280', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
                <Cloud size={10} style={{ display:'inline', marginRight:4 }} />Clima Agora · {weather.city}
              </p>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <p style={{ fontSize:38, fontWeight:800, color:'#1E40AF', lineHeight:1 }}>{weather.temp}°C</p>
                  <p style={{ fontSize:12, color:'#374151', marginTop:4, textTransform:'capitalize' }}>{weather.desc}</p>
                </div>
                <span style={{ fontSize:46 }}>{weather.icon}</span>
              </div>
              <div style={{ display:'flex', gap:14 }}>
                {[
                  { icon:Thermometer, label:'Sensação', val:`${weather.feels}°C`, cor:'#D97706' },
                  { icon:Droplets,    label:'Umidade',  val:`${weather.humidity}%`, cor:'#2563EB' },
                  { icon:Wind,        label:'Vento',    val:`${weather.wind} km/h`, cor:'#7C3AED' },
                ].map(({ icon:Ic, label, val, cor }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:26, height:26, borderRadius:7, background:`${cor}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Ic size={12} color={cor} />
                    </div>
                    <div>
                      <p style={{ fontSize:9, color:'#9CA3AF' }}>{label}</p>
                      <p style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'18px 20px', flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <p style={{ fontSize:12, color:'#9CA3AF' }}>Clima indisponível</p>
            </div>
          )}

          {/* Critérios rápidos */}
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'16px 18px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#1B4332', marginBottom:10 }}>Critérios ZARC (cevada)</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label:'Temperatura',    val:'10 – 22°C' },
                { label:'Precipitação',   val:'400 – 1200mm/ano' },
                { label:'Altitude',       val:'≥ 700m' },
                { label:'Solo ZARC',      val:'Tipo 2 ou 3' },
              ].map(c => (
                <div key={c.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <CheckCircle size={10} color="#1A7A3C" />
                    <span style={{ fontSize:11, color:'#374151' }}>{c.label}</span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:'#2D6A4F' }}>{c.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top municípios + Notícias ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:16, marginBottom:20 }}>

        {/* Top 5 */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#1B4332' }}>Top Municípios</p>
            <button onClick={()=>navigate('/zoneamento')} style={{
              background:'none', border:'none', fontSize:11, color:'#2D6A4F',
              cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontWeight:500,
            }}>
              Ver mapa <ArrowRight size={11} />
            </button>
          </div>

          {top5.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ width:24, height:24, border:'2px solid #E5E7EB', borderTopColor:'#2D6A4F', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
              <p style={{ fontSize:12, color:'#9CA3AF' }}>Carregando...</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {/* Header */}
              <div style={{ display:'grid', gridTemplateColumns:'24px 1fr 48px 72px', gap:8, padding:'0 0 7px', borderBottom:'1px solid #F3F4F6' }}>
                {['#','Município','Score','Classe'].map(h => (
                  <p key={h} style={{ fontSize:9, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.8 }}>{h}</p>
                ))}
              </div>
              {top5.map((m,i) => {
                const cor = scoreCor(m.score_aptidao);
                return (
                  <div key={m.codigo_ibge} style={{
                    display:'grid', gridTemplateColumns:'24px 1fr 48px 72px', gap:8,
                    padding:'9px 0', borderBottom:i<top5.length-1?'1px solid #F9FAFB':'none',
                    alignItems:'center',
                  }}>
                    <span style={{ fontSize:11, color:'#9CA3AF', fontWeight:600 }}>#{i+1}</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:600, color:'#374151', lineHeight:1.2 }}>{m.nome_municipio}</p>
                      <p style={{ fontSize:10, color:'#9CA3AF' }}>{m.uf}</p>
                    </div>
                    <span style={{ fontSize:13, fontWeight:800, color:cor }}>{m.score_aptidao}</span>
                    <span style={{ fontSize:9, fontWeight:600, color:cor, background:`${cor}15`, border:`1px solid ${cor}30`, borderRadius:5, padding:'2px 6px', textAlign:'center' }}>
                      {scoreLabel(m.score_aptidao)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notícias */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <Newspaper size={13} color="#374151" />
              <p style={{ fontSize:13, fontWeight:700, color:'#1B4332' }}>Últimas Notícias</p>
            </div>
            <button onClick={()=>navigate('/noticias')} style={{
              background:'none', border:'none', fontSize:11, color:'#2D6A4F',
              cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontWeight:500,
            }}>
              Ver todas <ArrowRight size={11} />
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {NOTICIAS_HOME.map((n,i) => {
              const badge = BADGE_COR[n.categoria] ?? { bg:'rgba(100,100,100,0.1)', cor:'#888' };
              return (
                <div key={n.id} style={{
                  padding:'12px 0',
                  borderBottom: i<NOTICIAS_HOME.length-1?'1px solid #F3F4F6':'none',
                }}>
                  <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:9, fontWeight:600, color:badge.cor, background:badge.bg, borderRadius:4, padding:'2px 7px' }}>
                      {n.categoria}
                    </span>
                    <span style={{ fontSize:9, color:'#9CA3AF' }}>{n.fonte} · há {n.dias} dias</span>
                  </div>
                  <p style={{ fontSize:12, fontWeight:600, color:'#374151', lineHeight:1.45, marginBottom:4 }}>{n.titulo}</p>
                  <p style={{ fontSize:11, color:'#6B7280', lineHeight:1.5 }}>{n.resumo}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Progresso coleta (compacto) ── */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#1B4332' }}>Cobertura Nacional — 5.571 Municípios</p>
            <p style={{ fontSize:11, color:'#6B7280' }}>IBGE · Open-Meteo · SoilGrids · NASA POWER · 30 anos de dados climáticos</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(45,106,79,0.07)', border:'1px solid rgba(45,106,79,0.18)', borderRadius:20, padding:'4px 12px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#2D6A4F', display:'inline-block' }} />
            <span style={{ fontSize:11, color:'#2D6A4F', fontWeight:500 }}>100% Concluída</span>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
          <span style={{ fontSize:11, color:'#6B7280' }}>{processados.toLocaleString('pt-BR')} de 5.571 municípios</span>
          <span style={{ fontSize:20, fontWeight:800, color:'#2D6A4F' }}>{pctColeta}%</span>
        </div>
        <div style={{ height:7, background:'#F3F4F6', borderRadius:7, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${Math.min(parseFloat(pctColeta),100)}%`, background:'linear-gradient(90deg,#1B4332,#40916C)', borderRadius:7, transition:'width 0.8s ease' }} />
        </div>
      </div>
    </div>
  );
}
