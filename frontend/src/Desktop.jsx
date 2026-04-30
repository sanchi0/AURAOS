import React, { useState, useEffect, useRef, useCallback } from 'react';

import useAura from './hooks/useAura';
import AuraTerminal from './hooks/AuraTerminal';

// ============================================================
// ORB RENDERER HOOK
// ============================================================
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
        const pu = Math.sin(ox * 6 + time * 3.5) * Math.cos(oy * 6 + time * 2.5);
        const isPulsing = pu > 0.75;
        ctx.beginPath();
        if (isPulsing) {
          ctx.arc(sx, sy, br * sc * 3.0, 0, Math.PI * 2);
          if (isMic) {
            ctx.fillStyle = `rgba(255,100,120,${da * 1.1})`;
            ctx.shadowBlur = 18;
            ctx.shadowColor = 'rgba(255,80,100,0.9)';
          } else {
            ctx.fillStyle = `rgba(80,200,255,${da * 1.1})`;
            ctx.shadowBlur = 18;
            ctx.shadowColor = 'rgba(60,180,255,0.9)';
          }
        } else {
          ctx.arc(sx, sy, br * sc * 0.95, 0, Math.PI * 2);
          if (isMic) {
            ctx.fillStyle = `rgba(${Math.floor(200 + da * 55)},${Math.floor(100 + da * 30)},${Math.floor(120 + da * 55)},${da * 0.75})`;
          } else {
            ctx.fillStyle = `rgba(${Math.floor(120 + da * 60)},${Math.floor(130 + da * 30)},${Math.floor(200 + da * 55)},${da * 0.75})`;
          }
          ctx.shadowBlur = 0;
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

// ============================================================
// WINDOW COMPONENT
// ============================================================
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
      {/* Header */}
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

      {/* Content */}
      <div style={{ padding: 20, color: '#b8d4f0', height: 'calc(100% - 45px)', overflow: 'auto', fontFamily: "'Exo 2', sans-serif" }}>
        {children}
      </div>

      {/* Resize handle */}
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

// ============================================================
// APP CONTENTS
// ============================================================
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

const SettingsContent = () => (
  <div>
    {[
      <div key="theme" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ color: '#8aaec8' }}>Theme</label>
        <select style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,200,255,0.3)', color: 'white', padding: '4px 8px', borderRadius: 4 }}>
          <option>Dark Aurora</option><option>Light</option>
        </select>
      </div>,
      <div key="anim" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ color: '#8aaec8' }}>Animations</label>
        <input type="checkbox" defaultChecked />
      </div>,
      <div key="sens" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ color: '#8aaec8' }}>AURA Sensitivity</label>
        <input type="range" min="0" max="100" style={{ accentColor: '#64c8ff' }} />
      </div>,
    ]}
  </div>
);

// ============================================================
// SIDE PANEL
// ============================================================
const SidePanel = ({ isOpen, onClose }) => {
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
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Neural Load</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '32%', height: '100%', background: 'linear-gradient(90deg, #64c8ff, #2a6fff)', borderRadius: 3 }} />
                </div>
                <span style={{ fontWeight: 600 }}>32%</span>
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
            [['CPU', '23%', 23], ['Memory', '45%', 45], ['Neural', '78%', 78]].map(([l, v, p]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ minWidth: 60 }}>{l}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${p}%`, height: '100%', background: 'linear-gradient(90deg, #64c8ff, #2a6fff)', borderRadius: 4 }} />
                </div>
                <span style={{ minWidth: 36 }}>{v}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PROMPT PANEL
// ============================================================
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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(100,200,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isMicMode ? '#ff607a' : '#64c8ff', boxShadow: `0 0 8px ${isMicMode ? '#ff607a' : '#64c8ff'}` }} />
            <span style={{ color: '#8aaec8', fontSize: 12, letterSpacing: '1.5px', fontWeight: 500, fontFamily: 'Rajdhani, sans-serif' }}>
              {isMicMode ? 'AURA MIC · Listening' : 'AURA CORE · Prompt'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8aaec8', fontSize: 26, cursor: 'pointer', width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Mic section */}
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

        {/* Text input */}
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

// ============================================================
// TASKBAR
// ============================================================
const Taskbar = ({ openWindows, onWindowFocus, onAuraClick }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(100,200,255,0.2)',
      display: 'flex', alignItems: 'center', padding: '0 16px', zIndex: 100,
    }}>
      <div
        onClick={onAuraClick}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 32, background: 'rgba(100,200,255,0.15)', borderRadius: 8, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,200,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(100,200,255,0.15)'}
      >
        <div style={{ width: 8, height: 8, background: '#64c8ff', borderRadius: '50%', boxShadow: '0 0 8px #64c8ff' }} />
        <span style={{ color: '#64c8ff', fontSize: 12, fontWeight: 600, letterSpacing: 1, fontFamily: 'Rajdhani, sans-serif' }}>AURA OS</span>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 4, marginLeft: 16, overflowX: 'auto' }}>
        {openWindows.map(w => (
          <div
            key={w.id}
            onClick={() => onWindowFocus(w.id)}
            style={{
              padding: '0 12px', height: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              borderBottom: w.isFocused ? '2px solid #64c8ff' : 'none',
              background: w.isFocused ? 'rgba(100,200,255,0.2)' : 'rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ fontSize: 14 }}>{w.icon}</span>
            <span style={{ fontSize: 12, color: '#b8d4f0', fontFamily: "'Exo 2', sans-serif" }}>{w.title}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', paddingLeft: 16, borderLeft: '1px solid rgba(100,200,255,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8aaec8', fontSize: 11, fontFamily: "'Exo 2', sans-serif" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v16h16" /><path d="M8 16v-4" /><path d="M12 16v-8" /><path d="M16 16v-2" /></svg>
          75%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8aaec8', fontSize: 11, fontFamily: "'Exo 2', sans-serif" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M8 12h8" /></svg>
          WiFi
        </div>
        <span style={{ color: '#8aaec8', fontSize: 12, fontFamily: 'monospace' }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};


// INTRO ORB PAGE

const IntroPage = ({ onEnter, isHidden }) => {
  const canvasRef = useRef(null);
  useOrb(canvasRef, { size: 220, particles: 360 });

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 60%, #001840 0%, #000d22 50%, #000005 100%)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        opacity: isHidden ? 0 : 1,
        transform: isHidden ? 'scale(0.96)' : 'scale(1)',
        pointerEvents: isHidden ? 'none' : 'all',
        zIndex: isHidden ? -1 : 50,
      }}
    >
      <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 200, fontSize: 11, letterSpacing: 6, color: 'rgb(100, 201, 255)', textTransform: 'uppercase', marginBottom: 40, animation: 'fadeSlideDown 1.2s ease forwards' }}>
        Neural Intelligence Interface · v2.4.1
      </p>
      <canvas
        ref={canvasRef}
        onClick={onEnter}
        style={{ width: 220, height: 220, borderRadius: '50%', cursor: 'pointer', display: 'block' }}
      />
      <p style={{ marginTop: 36, fontSize: 10, letterSpacing: 4, color: 'rgba(100,200,255,0.3)', textTransform: 'uppercase', fontFamily: "'Exo 2', sans-serif", fontWeight: 300, animation: 'pulseOpacity 2.5s ease-in-out infinite' }}>
        Tap to enter
      </p>
    </div>
  );
};

// ============================================================
// MAIN DESKTOP
// ============================================================
const Desktop = () => {
  const [page, setPage] = useState('intro'); // 'intro' | 'desktop'
  const [iconsVisible, setIconsVisible] = useState(false);
  const [openWindows, setOpenWindows] = useState([]);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isMicMode, setIsMicMode] = useState(false);
  const [focusedWindow, setFocusedWindow] = useState(null);

  const {
    isListening, transcript,
    startListening, stopListening,
    isProcessing, submitPrompt,
    output, clearOutput,
    pendingConfirm, confirmPending, cancelPending,
    socketConnected,
  } = useAura();



  const desktopOrbRef = useRef(null);
  const desktopOrbCanvas = useRef(null);
  const orbControls = useOrb(desktopOrbCanvas, { size: 160, particles: 320 });

  const goToDesktop = useCallback(() => {
    setPage('desktop');
    setTimeout(() => setIconsVisible(true), 500);
  }, []);

  const appDefs = {
    aura: { title: 'AURA Assistant', icon: '✨' },
    files: { title: 'File Explorer', icon: '📁' },
    tasks: { title: 'Task Manager', icon: '📋' },
    settings: { title: 'Settings', icon: '⚙️' },
  };

  const openApp = useCallback((id) => {
    setOpenWindows(prev => {
      const exists = prev.find(w => w.id === id);
      if (exists) return prev.map(w => ({ ...w, isFocused: w.id === id }));
      const count = prev.length;
      return [...prev.map(w => ({ ...w, isFocused: false })), {
        id, ...appDefs[id], isFocused: true, x: 80 + count * 30, y: 80 + count * 30,
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
  }, [orbControls, stopListening]);

  const handlePromptSubmit = useCallback((text) => {
    submitPrompt(text);
    setIsPromptOpen(false);
    setIsMicMode(false);
    orbControls.setMic(false);
    openApp('aura');
  }, [orbControls, openApp, submitPrompt]);

  const prevListening = useRef(isListening);

  useEffect(() => {
    if (prevListening.current && !isListening) {
      // Mic just stopped listening
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
      />
    );
    if (id === 'files') return <FilesContent />;
    if (id === 'tasks') return <TasksContent />;
    if (id === 'settings') return <SettingsContent />;
    return null;
  };

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Exo+2:wght@200;300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; user-select:none; }
        body { overflow:hidden; font-family:'Rajdhani',sans-serif; background:#000; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes pulseOpacity { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes micPulse { 0%{box-shadow:0 0 0 0 rgba(255,80,100,0.5)} 70%{box-shadow:0 0 0 18px rgba(255,80,100,0)} 100%{box-shadow:0 0 0 0 rgba(255,80,100,0)} }
        @keyframes wave { 0%,100%{transform:scaleY(0.5);opacity:0.6} 50%{transform:scaleY(1);opacity:1} }
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)} ::-webkit-scrollbar-thumb{background:rgba(100,200,255,0.3);border-radius:3px}
      `}</style>

      {/* Page 1: Intro */}
      <IntroPage onEnter={goToDesktop} isHidden={page === 'desktop'} />

      {/* Page 2: Desktop */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(135deg, #0a1a3a 0%, #001133 50%, #00001a 100%)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        opacity: page === 'desktop' ? 1 : 0,
        transform: page === 'desktop' ? 'scale(1)' : 'scale(1.04)',
        pointerEvents: page === 'desktop' ? 'all' : 'none',
        zIndex: page === 'desktop' ? 1 : -1,
        overflow: 'hidden',
      }}>
        {/* Icons grid */}
        <div style={{
          position: 'absolute', top: 20, left: 20,
          display: 'grid', gridTemplateColumns: 'repeat(4, 100px)',
          gap: 30, padding: 20, zIndex: 10,
          opacity: iconsVisible ? 1 : 0,
          transform: iconsVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          {iconDefs.map((def, i) => (
            <div
              key={def.id}
              onClick={() => openApp(def.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: `transform 0.2s ease ${i * 0.07}s` }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div
                style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(255,255,255,0.1), 0 0 20px rgba(0,150,255,0.2)', transition: '0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 25px rgba(0,150,255,0.6), inset 0 0 15px rgba(255,255,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(100,200,255,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(255,255,255,0.1), 0 0 20px rgba(0,150,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              >
                {def.svg}
              </div>
              <p style={{ color: 'white', fontSize: 11, letterSpacing: 2, marginTop: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>{def.label}</p>
            </div>
          ))}

          {/* Desktop Orb */}
          <div
            ref={desktopOrbRef}
            onClick={handleOrbClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <canvas ref={desktopOrbCanvas} style={{ width: 110, height: 110, borderRadius: '50%', cursor: 'pointer', display: 'block' }} />
            <span style={{
              color: (isMicMode || isListening) ? 'rgba(255,100,120,0.9)' : 'rgba(100,200,255,0.8)',
              fontSize: 10,
              letterSpacing: '2px',
              marginTop: 8,
              textTransform: 'uppercase',
              fontFamily: 'Rajdhani, sans-serif'
            }}>
              {isListening ? 'AURA MIC' : isProcessing ? 'PROCESSING…' : 'AURA CORE'}
            </span>
          </div>
        </div>

        {/* Windows */}
        {openWindows.map(win => (
          <AppWindow key={win.id} win={win} onClose={closeWindow} onFocus={() => focusWindow(win.id)} isFocused={win.isFocused}>
            {getWindowContent(win.id)}
          </AppWindow>
        ))}

        {/* Side Panel */}
        <SidePanel isOpen={isSidePanelOpen} onClose={() => setIsSidePanelOpen(false)} />

        {/* Prompt Panel */}
        <PromptPanel
          isOpen={isPromptOpen}
          isMicMode={isMicMode}
          isListening={isListening}
          transcript={transcript}
          startListening={startListening}
          stopListening={stopListening}
          onClose={handlePromptClose}
          onSubmit={handlePromptSubmit}
        />

        {/* Taskbar */}
        <Taskbar openWindows={openWindows} onWindowFocus={focusWindow} onAuraClick={() => setIsSidePanelOpen(true)} />
      </div>
    </>
  );
};

export default Desktop;