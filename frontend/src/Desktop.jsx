import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Image as ImageIcon, Calculator, Mail, Terminal, Calendar, Hash, MessageCircle, Globe, Search, Download, FileText, Music, Play, Pause, SkipForward, SkipBack, Power, RefreshCw, Lock, ChevronUp, Volume2, Battery, Folder, Wifi, Monitor } from 'lucide-react';

import useAura from './hooks/useAura';
import AuraTerminal from './hooks/AuraTerminal';




function useOrb(canvasRef, opts = {}) {
  const stateRef = useRef({ isMic: false, isActive: false });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const SIZE = opts.size || 220;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    const numParticles = opts.particles || 360;
    const particles = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = Math.PI * 2 / goldenRatio;

    for (let i = 0; i < numParticles; i++) {
      const t = i / numParticles;
      const inc = Math.acos(1 - 2 * t);
      const az = angleIncrement * i;
      particles.push({
        x: Math.sin(inc) * Math.cos(az),
        y: Math.sin(inc) * Math.sin(az),
        z: Math.cos(inc),
        br: Math.random() * 1.2 + 0.5,
      });
    }

    let smX = 0, smY = 0;
    const mouse = { x: 0, y: 0, active: false };
    let pulse = 1, pDir = 1, time = 0;

    const onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    };
    const onMouseLeave = () => { mouse.active = false; };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    const render = () => {
      const { isMic, isActive } = stateRef.current;
      time += 0.014;

      if (mouse.active) {
        smX += ((mouse.x / SIZE - 0.5) - smX) * 0.06;
        smY += ((mouse.y / SIZE - 0.5) - smY) * 0.06;
      } else { smX *= 0.97; smY *= 0.97; }

      pulse += pDir * 0.0007;
      if (pulse > 1.04) pDir = -1;
      if (pulse < 0.97) pDir = 1;

      ctx.clearRect(0, 0, SIZE, SIZE);
      const cx = SIZE / 2, cy = SIZE / 2;
      const baseR = SIZE * 0.38 * pulse * ((isActive || isMic) ? 1.12 : 1);
      const rotX = time * 0.25 + smY * 1.2;
      const rotY = time * 0.4 + smX * 1.2;

      const proj = particles.map(p => {
        const y1 = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
        const z1 = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
        const x2 = p.x * Math.cos(rotY) + z1 * Math.sin(rotY);
        const z2 = -p.x * Math.sin(rotY) + z1 * Math.cos(rotY);
        const y2 = y1;
        const fov = 420, zOff = 2.8;
        const sc = fov / (fov + (z2 + zOff) * 100);
        return { sx: cx + x2 * baseR * sc, sy: cy + y2 * baseR * sc, z2, sc, br: p.br, ox: p.x, oy: p.y };
      });
      proj.sort((a, b) => a.z2 - b.z2);

      proj.forEach(({ sx, sy, z2, sc, br, ox, oy }) => {
        const da = Math.max(0.08, (z2 + 1) / 2);
        let pu;
        if (isMic) {
          pu = Math.sin(ox * 10 + time * 12) * Math.cos(oy * 10 + time * 10);
        } else {
          pu = Math.sin(ox * 6 + time * 3.5) * Math.cos(oy * 6 + time * 2.5);
        }
        const isPulsing = pu > 0.75;
        ctx.beginPath();
        if (isPulsing) {
          ctx.arc(sx, sy, br * sc * 4.0, 0, Math.PI * 2);
          if (isMic) {
            ctx.fillStyle = `rgba(255,100,120,${Math.min(1, da * 1.5)})`;
            ctx.shadowBlur = 24;
            ctx.shadowColor = 'rgba(255,80,100,1)';
          } else {
            ctx.fillStyle = `rgba(100,220,255,${Math.min(1, da * 1.5)})`;
            ctx.shadowBlur = 24;
            ctx.shadowColor = 'rgba(80,200,255,1)';
          }
        } else {
          ctx.arc(sx, sy, br * sc * 1.8, 0, Math.PI * 2);
          if (isMic) {
            ctx.fillStyle = `rgba(${Math.floor(200 + da * 55)},${Math.floor(100 + da * 30)},${Math.floor(120 + da * 55)},${Math.min(1, da * 1.2)})`;
          } else {
            ctx.fillStyle = `rgba(${Math.floor(160 + da * 60)},${Math.floor(180 + da * 30)},255,${Math.min(1, da * 1.2)})`;
          }
          ctx.shadowBlur = 4;
          ctx.shadowColor = isMic ? 'rgba(255,80,100,0.4)' : 'rgba(80,200,255,0.4)';
        }
        ctx.fill();
      });

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.55);
      if (isMic) {
        g.addColorStop(0, 'rgba(255,60,80,0.12)');
        g.addColorStop(0.5, 'rgba(200,40,60,0.06)');
      } else {
        g.addColorStop(0, 'rgba(60,100,255,0.09)');
        g.addColorStop(0.5, 'rgba(40,60,200,0.05)');
      }
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.shadowBlur = 0;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.55, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const setMic = useCallback((v) => { stateRef.current.isMic = v; }, []);
  const setActive = useCallback((v) => { stateRef.current.isActive = v; }, []);
  return { setMic, setActive };
}




const AppWindow = ({ win, onClose, onFocus, isFocused, children }) => {
  const [pos, setPos] = useState({ x: win.x, y: win.y });
  const [size, setSize] = useState({ w: 480, h: 360 });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  useEffect(() => {
    const onMouseMove = (e) => {
      if (dragging.current) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (resizing.current) {
        const { mx, my, w, h } = resizeStart.current;
        setSize({ w: Math.max(300, w + e.clientX - mx), h: Math.max(200, h + e.clientY - my) });
      }
    };
    const onMouseUp = () => { dragging.current = false; resizing.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  return (
    <div
      onMouseDown={onFocus}
      style={{
        position: 'absolute', left: pos.x, top: pos.y, width: size.w, height: size.h,
        zIndex: isFocused ? 1000 : 999,
        background: 'rgba(10,20,40,0.95)', backdropFilter: 'blur(20px)',
        borderRadius: 12, border: `1px solid ${isFocused ? 'rgba(100,200,255,0.8)' : 'rgba(100,200,255,0.3)'}`,
        boxShadow: isFocused ? '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(100,200,255,0.2)' : '0 8px 32px rgba(0,0,0,0.4)',
        overflow: 'hidden', transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      { }
      <div
        onMouseDown={(e) => {
          if (e.target.dataset.close) return;
          dragging.current = true;
          dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
          onFocus();
        }}
        style={{
          padding: '12px 16px', background: 'rgba(0,0,0,0.3)', cursor: 'move',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(100,200,255,0.2)',
        }}
      >
        <span style={{ color: '#8aaec8', fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', pointerEvents: 'none', fontFamily: 'Rajdhani, sans-serif' }}>
          {win.title}
        </span>
        <button
          data-close="true"
          onClick={() => onClose(win.id)}
          style={{ background: 'none', border: 'none', color: 'rgba(100,200,255,0.6)', fontSize: 20, cursor: 'pointer', width: 24, height: 24, borderRadius: 4, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,70,70,0.3)'; e.target.style.color = '#ff6b6b'; }}
          onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = 'rgba(100,200,255,0.6)'; }}
        >×</button>
      </div>

      { }
      <div style={{ padding: 20, color: '#b8d4f0', height: 'calc(100% - 45px)', overflow: 'auto', fontFamily: "'Exo 2', sans-serif" }}>
        {children}
      </div>

      { }
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          resizing.current = true;
          resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
          onFocus();
        }}
        style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, cursor: 'nw-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(100,200,255,0.3) 50%)' }}
      />
    </div>
  );
};




const FilesContent = () => (
  <div>
    {['Documents/', 'Downloads/', 'Desktop/', 'Pictures/'].map(f => (
      <div key={f} style={{ padding: '8px 12px', margin: '4px 0', background: 'rgba(255,255,255,0.05)', borderRadius: 6, cursor: 'pointer' }}>{f}</div>
    ))}
  </div>
);

const TasksContent = () => (
  <div>
    {[['System Idle', '0%'], ['AURA Core', '12%'], ['Desktop Shell', '8%'], ['Window Manager', '5%']].map(([n, v]) => (
      <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(100,200,255,0.1)' }}>
        <span>{n}</span><span>{v}</span>
      </div>
    ))}
  </div>
);

const SettingsContent = ({ bgImage, setBgImage, language, setLanguage, theme, setTheme }) => {
  const [tab, setTab] = useState('Personalize');
  
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: "'Exo 2', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 120, borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Personalize', 'Sound', 'Network', 'Language'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ padding: '8px 12px', borderRadius: 8, background: tab === t ? 'rgba(167, 139, 250, 0.2)' : 'transparent', color: tab === t ? '#c4b5fd' : '#8aaec8', cursor: 'pointer', transition: 'all 0.2s', fontSize: 13, fontWeight: 500 }}>
            {t}
          </div>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, paddingLeft: 16, overflowY: 'auto' }}>
        {tab === 'Personalize' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>Background URL</label>
              <input value={bgImage} onChange={e => setBgImage(e.target.value)} placeholder="https://..." style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,200,255,0.3)', color: 'white', padding: '6px 10px', borderRadius: 6, width: '160px', outline: 'none', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>Theme</label>
              <select value={theme} onChange={e => setTheme(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,200,255,0.3)', color: 'white', padding: '6px 10px', borderRadius: 6, outline: 'none', fontSize: 12 }}>
                <option value="Dark Aurora">Dark Aurora</option>
                <option value="Light">Light</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>Animations</label>
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        )}
        {tab === 'Sound' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>Master Volume</label>
              <input type="range" min="0" max="100" defaultValue="80" style={{ accentColor: '#a78bfa', width: 120 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>System Alerts</label>
              <input type="range" min="0" max="100" defaultValue="50" style={{ accentColor: '#a78bfa', width: 120 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>Output Device</label>
              <select style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,200,255,0.3)', color: 'white', padding: '6px 10px', borderRadius: 6, outline: 'none', fontSize: 12 }}>
                <option>Built-in Speakers</option><option>Bluetooth Headphones</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>Spatial Audio</label>
              <input type="checkbox" />
            </div>
          </div>
        )}
        {tab === 'Network' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#e4e4e7', fontWeight: 600, fontSize: 13 }}>Wi-Fi</span><span style={{ color: '#4cff9e', fontSize: 12 }}>Connected</span></div>
              <span style={{ color: '#a1a1aa', fontSize: 12 }}>AURA_Network_5G (Signal: Strong)</span>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#e4e4e7', fontWeight: 600, fontSize: 13 }}>Ethernet</span><span style={{ color: '#ffaa44', fontSize: 12 }}>Not Connected</span></div>
              <span style={{ color: '#a1a1aa', fontSize: 12 }}>Check cable</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>Airplane Mode</label>
              <input type="checkbox" />
            </div>
          </div>
        )}
        {tab === 'Language' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ color: '#e4e4e7', fontSize: 13 }}>System Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,200,255,0.3)', color: 'white', padding: '6px 10px', borderRadius: 6, outline: 'none', fontSize: 12 }}>
                <option value="EN">English</option>
                <option value="ES">Español</option>
                <option value="FR">Français</option>
              </select>
            </div>
            <p style={{ color: '#a1a1aa', fontSize: 11, marginTop: 8 }}>Changing the language updates the UI text immediately.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CalculatorContent = () => {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Rajdhani, sans-serif' }}>
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', fontSize: 28, textAlign: 'right', borderRadius: 8, marginBottom: 12, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
        {val || '0'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flex: 1 }}>
        {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '=', '+'].map(btn => (
          <button key={btn} onClick={() => {
            if (btn === 'C') setVal('');
            else if (btn === '=') { try { setVal(eval(val).toString()) } catch { setVal('Error') } }
            else setVal(v => (v === 'Error' ? btn : v + btn));
          }} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, color: '#fff', fontSize: 20, cursor: 'pointer',
            transition: 'background 0.2s', fontWeight: 600
          }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

const PhotosContent = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    {[1, 2, 3, 4].map(i => (
      <div key={i} style={{
        height: 120, borderRadius: 8, background: `url(https://images.unsplash.com/photo-1506744626753-1fa28f6f5d27?w=400&q=80&sig=${i}) center/cover`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
      }} />
    ))}
  </div>
);

const TerminalContent = () => {
  const [lines, setLines] = useState(['user@aura:~$']);
  return (
    <div style={{ fontFamily: 'monospace', color: '#4cff9e', height: '100%', overflow: 'auto' }} onClick={e => e.currentTarget.querySelector('input').focus()}>
      {lines.map((l, i) => <div key={i}>{l}</div>)}
      <div style={{ display: 'flex' }}>
        <span>user@aura:~$ </span>
        <input type="text" autoFocus style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', flex: 1, marginLeft: 8, fontFamily: 'monospace' }} onKeyDown={e => {
          if (e.key === 'Enter') {
            const val = e.target.value;
            setLines(prev => [...prev, val, val ? 'Command not found: ' + val : '', 'user@aura:~$'].filter(Boolean));
            e.target.value = '';
          }
        }} />
      </div>
    </div>
  );
};

const CalendarContent = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12, fontFamily: "'Exo 2', sans-serif" }}>
    <div style={{ fontSize: 24, fontWeight: 600, color: '#c4b5fd', textAlign: 'center', marginBottom: 8 }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
      {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>{d}</div>)}
      {Array.from({length: 31}, (_, i) => (
        <div key={i} style={{ 
          padding: 8, background: i + 1 === new Date().getDate() ? '#a78bfa' : 'rgba(255,255,255,0.05)', 
          borderRadius: 8, color: i + 1 === new Date().getDate() ? '#fff' : '#e4e4e7', cursor: 'pointer',
          transition: 'background 0.2s'
        }} onMouseEnter={e => { if (i + 1 !== new Date().getDate()) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }} onMouseLeave={e => { if (i + 1 !== new Date().getDate()) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
          {i + 1}
        </div>
      ))}
    </div>
  </div>
);




const SidePanel = ({ isOpen, onClose, sysHistory = [] }) => {
  const [tab, setTab] = useState('dashboard');
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, animation: 'fadeIn 0.2s ease' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 320,
          background: 'rgba(5,10,25,0.95)', backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(100,200,255,0.3)', boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease', fontFamily: "'Exo 2', sans-serif",
        }}
      >
        <div style={{ padding: 20, borderBottom: '1px solid rgba(100,200,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#64c8ff', fontSize: 18, fontWeight: 500, fontFamily: 'Rajdhani, sans-serif' }}>AURA Intelligence</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8aaec8', fontSize: 28, cursor: 'pointer', borderRadius: 8, width: 32, height: 32 }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(100,200,255,0.2)' }}>
          {['dashboard', 'processes', 'resources'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: 12, background: 'none', border: 'none',
                color: tab === t ? '#64c8ff' : '#8aaec8', cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #64c8ff' : 'none',
                fontFamily: 'Rajdhani, sans-serif', fontSize: 13, letterSpacing: 1,
              }}
            >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        <div style={{ padding: 20, color: '#b8d4f0' }}>
          {tab === 'dashboard' && (
            <>
              {[['System Status', <span style={{ color: '#4cff9e' }}>● ACTIVE</span>], ['Active Tasks', '4'], ['AURA Version', 'v2.4.1']].map(([l, v]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Neural Load</span>
                  <span style={{ fontWeight: 600, color: '#64c8ff' }}>{sysHistory[sysHistory.length - 1]?.memUsed || 0}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
                  {sysHistory.map((pt, i) => (
                    <div key={i} style={{ flex: 1, background: 'linear-gradient(0deg, #2a6fff, #64c8ff)', height: `${Math.max(4, pt.memUsed)}%`, borderRadius: 2, opacity: 0.3 + (i / sysHistory.length) * 0.7, transition: 'height 0.3s ease' }} />
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === 'processes' && (
            [['AURA Core', 'running'], ['Desktop Shell', 'running'], ['Window Manager', 'running'], ['Neural Engine', 'idle']].map(([n, s]) => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid rgba(100,200,255,0.1)' }}>
                <span>{n}</span>
                <span style={{ color: s === 'running' ? '#4cff9e' : '#ffaa44' }}>{s === 'running' ? '● RUNNING' : '○ IDLE'}</span>
              </div>
            ))
          )}
          {tab === 'resources' && (
            [['CPU', `${Math.round(sysHistory[sysHistory.length - 1]?.cpuLoad || 0)}%`, sysHistory[sysHistory.length - 1]?.cpuLoad || 0],
            ['Memory', `${sysHistory[sysHistory.length - 1]?.memUsed || 0}%`, sysHistory[sysHistory.length - 1]?.memUsed || 0]].map(([l, v, p]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ minWidth: 60 }}>{l}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${p}%`, height: '100%', background: 'linear-gradient(90deg, #64c8ff, #2a6fff)', transition: 'width 0.3s ease', borderRadius: 4 }} />
                </div>
                <span style={{ minWidth: 36, textAlign: 'right' }}>{v}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};




const PromptPanel = ({ isOpen, isMicMode, isListening, transcript, startListening, stopListening, onClose, onSubmit }) => {
  const [text, setText] = useState('');
  const taRef = useRef(null);

  useEffect(() => {
    if (isOpen && taRef.current) setTimeout(() => taRef.current?.focus(), 300);
    if (!isOpen) { setText(''); }
  }, [isOpen]);

  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720,
          background: 'rgba(5,12,30,0.97)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(100,200,255,0.25)', borderBottom: 'none',
          borderRadius: '20px 20px 0 0', overflow: 'hidden',
          animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
          boxShadow: '0 -8px 40px rgba(0,0,100,0.4)',
        }}
      >
        { }
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(100,200,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isMicMode ? '#ff607a' : '#64c8ff', boxShadow: `0 0 8px ${isMicMode ? '#ff607a' : '#64c8ff'}` }} />
            <span style={{ color: '#8aaec8', fontSize: 12, letterSpacing: '1.5px', fontWeight: 500, fontFamily: 'Rajdhani, sans-serif' }}>
              {isMicMode ? 'AURA MIC · Listening' : 'AURA CORE · Prompt'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8aaec8', fontSize: 26, cursor: 'pointer', width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        { }
        {isMicMode && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 8px', gap: 10 }}>
              <button
                onClick={() => isListening ? stopListening() : startListening()}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: isListening ? 'rgba(255,80,100,0.15)' : 'rgba(100,200,255,0.1)',
                  border: `2px solid ${isListening ? 'rgba(255,80,100,0.6)' : 'rgba(100,200,255,0.3)'}`,
                  color: isListening ? '#ff607a' : '#64c8ff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: isListening ? 'micPulse 1.5s infinite' : 'none',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              </button>
              <span style={{ color: '#8aaec8', fontSize: 12, letterSpacing: 1, fontFamily: "'Exo 2', sans-serif" }}>
                {isListening ? 'Listening… speak now' : 'Tap to speak'}
              </span>
              {isListening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28 }}>
                  {[0, 0.1, 0.2, 0.3, 0.4].map((d, i) => (
                    <span key={i} style={{ display: 'block', width: 4, borderRadius: 2, background: '#ff607a', height: [10, 20, 28, 20, 10][i], animation: `wave 1s ease-in-out ${d}s infinite` }} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(100,200,255,0.15)' }} />
              <span style={{ color: 'rgba(100,200,255,0.35)', fontSize: 11, letterSpacing: 1, fontFamily: "'Exo 2', sans-serif" }}>or type below</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(100,200,255,0.15)' }} />
            </div>
          </>
        )}

        { }
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '14px 20px' }}>
          <textarea
            ref={taRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) { onSubmit(text.trim()); setText(''); } }
              if (e.key === 'Escape') onClose();
            }}
            placeholder={isMicMode ? 'Or type your prompt here…' : 'Ask AURA anything… (Enter to send, Shift+Enter for newline)'}
            rows={3}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(100,200,255,0.2)',
              borderRadius: 12, color: '#e0f0ff', fontSize: 14, fontFamily: "'Exo 2', sans-serif",
              padding: '12px 16px', resize: 'none', outline: 'none', lineHeight: 1.6, userSelect: 'text',
            }}
          />
          <button
            onClick={() => { if (text.trim()) { onSubmit(text.trim()); setText(''); } }}
            disabled={!text.trim()}
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: text.trim() ? 'rgba(100,200,255,0.18)' : 'rgba(100,200,255,0.08)',
              border: `1px solid ${text.trim() ? 'rgba(100,200,255,0.5)' : 'rgba(100,200,255,0.2)'}`,
              color: text.trim() ? '#64c8ff' : 'rgba(100,200,255,0.3)',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 20px 14px' }}>
          <span style={{ color: 'rgba(100,200,255,0.25)', fontSize: 10, letterSpacing: '0.8px', fontFamily: "'Exo 2', sans-serif" }}>
            ESC to dismiss · Enter to send · Shift+Enter for newline
          </span>
        </div>
      </div>
    </div>
  );
};





const Taskbar = ({ openWindows, onWindowFocus, onMenuToggle, isMenuOpen, searchText }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 16, zIndex: 100,
      }}
    >
      {/* Search Bar / Menu Toggle */}
      <div onClick={onMenuToggle} style={{
        background: isMenuOpen ? 'rgba(100, 200, 255, 0.2)' : 'rgba(25, 25, 35, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24, display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 12,
        cursor: 'pointer', transition: 'all 0.2s',
        border: isMenuOpen ? '1px solid rgba(100, 200, 255, 0.4)' : '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ color: isMenuOpen ? '#64c8ff' : '#a78bfa' }}><Search size={18} /></div>
        <span style={{ color: '#e4e4e7', fontSize: 13, fontWeight: 500, letterSpacing: 1, fontFamily: 'Rajdhani, sans-serif' }}>
          {searchText}
        </span>
      </div>

      {/* Open Apps */}
      {openWindows.length > 0 && (
        <div style={{
          background: 'rgba(25, 25, 35, 0.8)', backdropFilter: 'blur(20px)',
          borderRadius: 20, display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8,
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {openWindows.map(win => (
            <div key={win.id} onClick={() => onWindowFocus(win.id)} style={{
              width: 36, height: 36, borderRadius: 12, background: win.isFocused ? 'rgba(167, 139, 250, 0.2)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              border: win.isFocused ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid transparent',
              color: win.isFocused ? '#c4b5fd' : '#a1a1aa', transition: 'all 0.2s'
            }}>
              {win.Icon ? <win.Icon size={18} /> : <span>{win.icon}</span>}
            </div>
          ))}
        </div>
      )}

      {/* System Status */}
      <div style={{
        background: 'rgba(25, 25, 35, 0.8)', backdropFilter: 'blur(20px)',
        borderRadius: 20, display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 16,
        color: '#e4e4e7', fontSize: 13, fontWeight: 600, fontFamily: 'Rajdhani, sans-serif',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', gap: 12, opacity: 0.8, color: '#a1a1aa' }}>
          <Wifi size={16} />
          <Battery size={16} />
        </div>
        <span style={{ letterSpacing: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 16 }}>
          {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};




const IntroPage = ({ onEnter, isHidden }) => {
  const canvasRef = useRef(null);
  useOrb(canvasRef, { size: 400, particles: 500 });

  useEffect(() => {
    if (!isHidden) {
      const timer = setTimeout(() => {
        onEnter();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [onEnter, isHidden]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 50%, #050814 0%, #000000 100%)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        opacity: isHidden ? 0 : 1,
        transform: isHidden ? 'scale(0.96)' : 'scale(1)',
        pointerEvents: isHidden ? 'none' : 'all',
        zIndex: isHidden ? -1 : 50,
      }}
    >
      <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 200, fontSize: 13, letterSpacing: 8, color: 'rgb(100, 201, 255)', textTransform: 'uppercase', marginBottom: 40, animation: 'fadeSlideDown 1.2s ease forwards' }}>
        Neural Intelligence Interface
      </p>
      <div style={{ animation: 'introSlide 4.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}>
        <canvas
          ref={canvasRef}
          onClick={onEnter}
          style={{ width: 400, height: 400, borderRadius: '50%', cursor: 'pointer', display: 'block' }}
        />
      </div>
      <p style={{ marginTop: 36, fontSize: 11, letterSpacing: 5, color: 'rgba(100,200,255,0.4)', textTransform: 'uppercase', fontFamily: "'Exo 2', sans-serif", fontWeight: 300, animation: 'pulseOpacity 1.5s ease-in-out infinite' }}>
        Authenticating...
      </p>
    </div>
  );
};




const Desktop = () => {
  const [page, setPage] = useState('intro');
  const [iconsVisible, setIconsVisible] = useState(false);
  const [openWindows, setOpenWindows] = useState([]);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isMicMode, setIsMicMode] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [focusedWindow, setFocusedWindow] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuApp, setActiveMenuApp] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(99);
  const [language, setLanguage] = useState('EN');
  const [theme, setTheme] = useState('Dark Aurora');

  const dict = {
    EN: { search: 'SEARCH THIS PC', settings: 'Settings', photos: 'Photos', calculator: 'Calculator', mail: 'Mail', terminal: 'Terminal', calendar: 'Calendar', github: 'Github', chatgpt: 'ChatGPT', whatsapp: 'Whatsapp', twitter: 'X / Twitter' },
    ES: { search: 'BUSCAR EN ESTA PC', settings: 'Configuración', photos: 'Fotos', calculator: 'Calculadora', mail: 'Correo', terminal: 'Terminal', calendar: 'Calendario', github: 'Github', chatgpt: 'ChatGPT', whatsapp: 'Whatsapp', twitter: 'X / Twitter' },
    FR: { search: 'CHERCHER SUR CE PC', settings: 'Paramètres', photos: 'Photos', calculator: 'Calculatrice', mail: 'Courrier', terminal: 'Terminal', calendar: 'Calendrier', github: 'Github', chatgpt: 'ChatGPT', whatsapp: 'Whatsapp', twitter: 'X / Twitter' },
  };
  const t = (key) => dict[language]?.[key] || key;

  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        setBatteryLevel(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
      });
    }
  }, []);

  const {
    isListening, transcript,
    startListening, stopListening,
    isProcessing, submitPrompt, executeCommand,
    output, clearOutput,
    pendingConfirm, confirmPending, cancelPending,
    socketConnected, sysHistory, desktopFiles, stopSpeech,
    wakeWordEvent
  } = useAura(page === 'desktop');



  const desktopOrbRef = useRef(null);
  const desktopOrbCanvas = useRef(null);
  const orbControls = useOrb(desktopOrbCanvas, { size: 160, particles: 320 });

  const goToDesktop = useCallback(() => {
    setPage('desktop');
    setTimeout(() => setIconsVisible(true), 500);
  }, []);

  const APP_DEFS = {
    aura: { title: 'AURA Assistant', Icon: MessageCircle },
    files: { title: 'File Explorer', Icon: Folder },
    tasks: { title: 'Task Manager', Icon: Hash },
    settings: { title: t('settings'), Icon: Settings },
    terminal: { title: t('terminal'), Icon: Terminal },
    calculator: { title: t('calculator'), Icon: Calculator },
    photos: { title: t('photos'), Icon: ImageIcon },
    calendar: { title: t('calendar'), Icon: Calendar },
  };

  const openApp = useCallback((id) => {
    setOpenWindows(prev => {
      const exists = prev.find(w => w.id === id);
      if (exists) return prev.map(w => ({ ...w, isFocused: w.id === id }));
      const count = prev.length;
      return [...prev.map(w => ({ ...w, isFocused: false })), {
        id, ...APP_DEFS[id], isFocused: true, x: 80 + count * 30, y: 80 + count * 30,
      }];
    });
    setFocusedWindow(id);
  }, []);

  const closeWindow = useCallback((id) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const focusWindow = useCallback((id) => {
    setOpenWindows(prev => prev.map(w => ({ ...w, isFocused: w.id === id })));
    setFocusedWindow(id);
  }, []);

  const handleOrbClick = useCallback(() => {
    orbControls.setMic(true);
    orbControls.setActive(true);
    setIsMicMode(true);
    setIsPromptOpen(true);
    startListening();
    setTimeout(() => { orbControls.setActive(false); }, 2000);
  }, [orbControls, startListening]);

  const handlePromptClose = useCallback(() => {
    setIsPromptOpen(false);
    setIsMicMode(false);
    orbControls.setMic(false);
    stopListening();
    stopSpeech();
  }, [orbControls, stopListening, stopSpeech]);

  const lastWakeWordRef = useRef(0);

  useEffect(() => {
    if (wakeWordEvent > lastWakeWordRef.current) {
      lastWakeWordRef.current = wakeWordEvent;
      if (!isPromptOpen) {
        handleOrbClick();
        openApp('aura');
      }
    }
  }, [wakeWordEvent, handleOrbClick, openApp, isPromptOpen]);

  const handlePromptSubmit = useCallback((text) => {
    submitPrompt(text);
    setIsPromptOpen(false);
    setIsMicMode(false);
    orbControls.setMic(false);
    stopListening();
    openApp('aura');
  }, [orbControls, openApp, submitPrompt, stopListening]);

  const prevListening = useRef(isListening);

  useEffect(() => {
    if (prevListening.current && !isListening) {

      if (transcript && transcript.trim() && isPromptOpen && isMicMode) {
        handlePromptSubmit(transcript);
      }
    }
    prevListening.current = isListening;
  }, [isListening, transcript, isPromptOpen, isMicMode, handlePromptSubmit]);

  const iconDefs = [
    { id: 'aura', label: 'AURA', svg: <svg width="38" height="38" viewBox="0 0 24 24" stroke="white" fill="none" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7" opacity="0.6" /><path d="M4 12a8 8 0 0 1 8-8" /></svg> },
    { id: 'tasks', label: 'TASKS', svg: <svg width="38" height="38" viewBox="0 0 24 24" stroke="white" fill="none" strokeWidth="1.5"><rect x="4" y="6" width="16" height="4" rx="1" /><rect x="6" y="12" width="12" height="4" rx="1" /></svg> },
    { id: 'files', label: 'FILES', svg: <svg width="38" height="38" viewBox="0 0 24 24" stroke="white" fill="none" strokeWidth="1.5"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 3 13 9 19 9" /></svg> },
    { id: 'settings', label: 'SETTINGS', svg: <svg width="38" height="38" viewBox="0 0 24 24" stroke="white" fill="none" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 4.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
  ];

  const getWindowContent = (id) => {
    if (id === 'aura') return (
      <AuraTerminal
        output={output}
        pendingConfirm={pendingConfirm}
        confirmPending={confirmPending}
        cancelPending={cancelPending}
        clearOutput={clearOutput}
        socketConnected={socketConnected}
        submitPrompt={submitPrompt}
        isListening={isListening}
        startListening={startListening}
        stopListening={stopListening}
        transcript={transcript}
        isProcessing={isProcessing}
      />
    );
    if (id === 'terminal') return <TerminalContent />;
    if (id === 'calculator') return <CalculatorContent />;
    if (id === 'photos') return <PhotosContent />;
    if (id === 'calendar') return <CalendarContent />;
    if (id === 'files') return <FilesContent />;
    if (id === 'tasks') return <TasksContent />;
    if (id === 'settings') return <SettingsContent bgImage={bgImage} setBgImage={setBgImage} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} />;
    return null;
  };


  return (
    <div className={theme === 'Light' ? 'light-theme' : ''} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Exo+2:wght@200;300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; user-select:none; }
        body { overflow:hidden; font-family:'Exo 2',sans-serif; background:#000; }
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)} ::-webkit-scrollbar-thumb{background:rgba(100,200,255,0.3);border-radius:3px}
        @keyframes introSlide {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          40% { transform: translateX(0) scale(1.1); opacity: 1; }
          100% { transform: translateX(40vw) scale(3); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
          50% { transform: scaleY(1.2); opacity: 1; }
        }
      `}</style>

      <IntroPage onEnter={goToDesktop} isHidden={page === 'desktop'} />

      <div 
        onClick={() => setIsMenuOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          backgroundImage: bgImage ? `url("${bgImage}")` : 'radial-gradient(ellipse at bottom left, #2c1b4d, #140d23 40%, #0d0a1a 100%)',
          backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          opacity: page === 'desktop' ? 1 : 0,
          transform: page === 'desktop' ? 'scale(1)' : 'scale(1.04)',
          pointerEvents: page === 'desktop' ? 'all' : 'none',
          zIndex: page === 'desktop' ? 1 : -1,
          overflow: 'hidden',
        }}
      >

        {/* Desktop Icons */}
        <div style={{ position: 'absolute', top: 32, left: 32, bottom: 120, display: 'flex', flexDirection: 'column', flexWrap: 'wrap', gap: 24, alignContent: 'flex-start', zIndex: 5 }}>
          <div
            onDoubleClick={() => openApp('files')}
            onContextMenu={(e) => { e.preventDefault(); openApp('files'); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 100,
              cursor: 'pointer', padding: '16px 12px', borderRadius: 20,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              const svgGroup = e.currentTarget.querySelector('g');
              if (svgGroup) {
                svgGroup.style.filter = 'drop-shadow(0 0 16px rgba(100, 200, 255, 1))';
                svgGroup.style.stroke = '#fff';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1) translateY(0)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              const svgGroup = e.currentTarget.querySelector('g');
              if (svgGroup) {
                svgGroup.style.filter = 'drop-shadow(0 0 8px rgba(100, 200, 255, 0.4))';
                svgGroup.style.stroke = 'rgba(255, 255, 255, 0.85)';
              }
            }}
          >
            <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="56" height="56" viewBox="0 0 100 100" fill="none" style={{ overflow: 'visible' }}>
                <g style={{ stroke: 'rgba(255, 255, 255, 0.85)', strokeWidth: 6, transition: 'all 0.3s ease', filter: 'drop-shadow(0 0 8px rgba(100, 200, 255, 0.4))' }}>
                  <circle cx="50" cy="50" r="32" />
                  <ellipse cx="50" cy="50" rx="44" ry="12" />
                </g>
              </svg>
            </div>
            <span style={{ color: '#e4e4e7', fontSize: 13, fontWeight: 600, letterSpacing: 1, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontFamily: 'Rajdhani, sans-serif' }}>
              THIS PC
            </span>
          </div>

          {desktopFiles && desktopFiles.map((file, i) => (
            <div
              key={i}
              onDoubleClick={() => {
                if (file.isDir) {
                  openApp('files');
                } else if (file.isExec) {
                  openApp('aura');
                  setTimeout(() => executeCommand('~/Desktop/' + file.name), 500);
                } else {
                  openApp('aura');
                  setTimeout(() => executeCommand(`[ -s ~/Desktop/${file.name} ] && cat ~/Desktop/${file.name} || echo "(File is empty)"`), 500);
                }
              }}
              onContextMenu={(e) => { 
                e.preventDefault(); 
                if (file.isDir) openApp('files');
                else openApp('aura');
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 100,
                cursor: 'pointer', padding: '16px 12px', borderRadius: 20,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              {file.isDir ? <Folder size={42} color="#64c8ff" style={{ opacity: 0.9, filter: 'drop-shadow(0 4px 8px rgba(100,200,255,0.3))' }} /> : 
               file.isExec ? <Terminal size={42} color="#a78bfa" style={{ opacity: 0.9, filter: 'drop-shadow(0 4px 8px rgba(167,139,250,0.3))' }} /> :
               <FileText size={42} color="#e4e4e7" style={{ opacity: 0.9, filter: 'drop-shadow(0 4px 8px rgba(255,255,255,0.2))' }} />}
              <span style={{ color: '#e4e4e7', fontSize: 12, fontWeight: 500, textAlign: 'center', wordBreak: 'break-word', textShadow: '0 2px 4px rgba(0,0,0,0.8)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {file.name}
              </span>
            </div>
          ))}
        </div>

        {/* Central Widget Pane */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 80, left: '50%', transform: isMenuOpen ? 'translate(-50%, 0) scale(1)' : 'translate(-50%, 20px) scale(0.95)',
            display: 'flex', gap: 16, zIndex: 10,
            opacity: isMenuOpen ? 1 : 0,
            pointerEvents: isMenuOpen ? 'all' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Left Column - Apps */}
          <div style={{
            background: 'rgba(30, 31, 40, 0.8)', backdropFilter: 'blur(30px)',
            borderRadius: 24, width: 220, padding: '24px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {[
              { icon: Settings, label: t('settings'), id: 'settings' },
              { icon: ImageIcon, label: t('photos'), id: 'photos' },
              { icon: Calculator, label: t('calculator'), id: 'calculator' },
              { icon: Mail, label: t('mail'), id: 'mail', link: 'mailto:' },
              { icon: Terminal, label: t('terminal'), id: 'terminal' },
              { icon: Calendar, label: t('calendar'), id: 'calendar' },
              { icon: Hash, label: t('github'), id: 'github', link: 'https://github.com' },
              { icon: MessageCircle, label: t('chatgpt'), id: 'chatgpt', link: 'https://chatgpt.com' },
              { icon: MessageCircle, label: t('whatsapp'), id: 'whatsapp', link: 'https://web.whatsapp.com' },
              { icon: Globe, label: t('twitter'), id: 'twitter', link: 'https://twitter.com' },
            ].map((app, i) => (
              <div key={i}
                onMouseDown={() => setActiveMenuApp(app.label)}
                onMouseUp={() => setTimeout(() => setActiveMenuApp(null), 200)}
                onMouseEnter={e => { if (activeMenuApp !== app.label) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { setActiveMenuApp(null); e.currentTarget.style.background = 'transparent'; }}
                onClick={() => {
                  if (app.link) window.open(app.link, '_blank');
                  else openApp(app.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px',
                  borderRadius: 12, cursor: 'pointer',
                  background: activeMenuApp === app.label ? 'rgba(167, 139, 250, 0.2)' : 'transparent',
                  color: activeMenuApp === app.label ? '#c4b5fd' : '#a1a1aa',
                  transition: 'all 0.1s',
                }}>
                <div style={{ background: activeMenuApp === app.label ? '#a78bfa' : 'transparent', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <app.icon size={18} color={activeMenuApp === app.label ? '#fff' : '#a1a1aa'} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{app.label}</span>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div style={{
            background: 'rgba(20, 21, 28, 0.6)', backdropFilter: 'blur(30px)',
            borderRadius: 24, width: 380, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {/* Search Bar */}
            <div style={{
              background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12, color: '#a1a1aa'
            }}>
              <Search size={18} />
              <input type="text" placeholder="SEARCH THIS PC" style={{
                background: 'transparent', border: 'none', outline: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, width: '100%', fontFamily: 'Rajdhani, sans-serif', letterSpacing: 1
              }} />
            </div>

            {/* Resources Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600, minWidth: 40 }}>MEM</span>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3, margin: '0 12px' }}>
                  <div style={{ width: `${sysHistory[sysHistory.length - 1]?.memUsed || 0}%`, background: '#c4b5fd', height: '100%', borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>{(sysHistory[sysHistory.length - 1]?.memUsed || 0).toFixed(1)}%</span>
              </div>
              <div style={{ background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600, minWidth: 40 }}>CPU</span>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3, margin: '0 12px' }}>
                  <div style={{ width: `${sysHistory[sysHistory.length - 1]?.cpuLoad || 0}%`, background: '#c4b5fd', height: '100%', borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>{(sysHistory[sysHistory.length - 1]?.cpuLoad || 0).toFixed(1)}%</span>
              </div>
            </div>

            {/* Bottom widgets */}
            <div style={{ display: 'flex', gap: 12, height: 100 }}>
              {/* Date Block */}
              <div style={{ flex: 1, background: '#563eb6ff', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{new Date().getDate()}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long' })}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 60, height: 60, background: '#563eb6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, boxShadow: 'inset 0 0 10px rgba(255,255,255,0.3)' }}>
                {batteryLevel}%
              </div>
              <div style={{ flex: 1, background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', color: '#a1a1aa' }}>
                <Power size={20} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} onClick={() => window.location.reload()} />
                <RefreshCw size={20} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} onClick={() => window.location.reload()} />
                <Lock size={20} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'} onClick={() => { setIsMenuOpen(false); setPage('intro'); }} />
              </div>
            </div>
          </div>
        </div>

        {/* Aura Core Orb - Floating */}
        <div
          ref={desktopOrbRef}
          onClick={handleOrbClick}
          style={{ position: 'absolute', bottom: 80, right: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s', zIndex: 50 }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <canvas ref={desktopOrbCanvas} style={{ width: 140, height: 140, borderRadius: '50%', cursor: 'pointer', display: 'block' }} />
          <span style={{
            color: (isMicMode || isListening) ? 'rgba(255,100,120,0.9)' : 'rgba(100,200,255,0.8)',
            fontSize: 11, letterSpacing: '2px', marginTop: 8, textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600,
            background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: 12, backdropFilter: 'blur(4px)'
          }}>
            {isListening ? 'AURA MIC' : isProcessing ? 'PROCESSING…' : 'AURA CORE'}
          </span>
        </div>

        {openWindows.map(win => (
          <AppWindow key={win.id} win={win} onClose={closeWindow} onFocus={() => focusWindow(win.id)} isFocused={win.isFocused}>
            {getWindowContent(win.id)}
          </AppWindow>
        ))}

        <SidePanel isOpen={isSidePanelOpen} onClose={() => setIsSidePanelOpen(false)} sysHistory={sysHistory} />
        <PromptPanel isOpen={isPromptOpen} isMicMode={isMicMode} isListening={isListening} transcript={transcript} startListening={startListening} stopListening={stopListening} onClose={handlePromptClose} onSubmit={handlePromptSubmit} />
        <Taskbar openWindows={openWindows} onWindowFocus={focusWindow} onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} isMenuOpen={isMenuOpen} searchText={t('search')} />
      </div>
    </div>
  );

};

export default Desktop;