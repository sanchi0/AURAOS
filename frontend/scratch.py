import re

with open('/home/vboxuser/AURA/frontend/src/Desktop.jsx', 'r') as f:
    content = f.read()

taskbar_replacement = """
import { Settings, Image as ImageIcon, Calculator, Mail, Terminal, Calendar, Github, MessageCircle, Twitter, Search, Download, FileText, Music, Play, Pause, SkipForward, SkipBack, Power, RefreshCw, Lock, ChevronUp, Volume2, Battery, Folder } from 'lucide-react';

const Taskbar = ({ openWindows, onWindowFocus, onAuraClick }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => { 
    const t = setInterval(() => setTime(new Date()), 1000); 
    return () => clearInterval(t); 
  }, []);

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 16, zIndex: 100,
    }}>
      {/* Left pill */}
      <div style={{
        background: 'rgba(25, 25, 35, 0.8)', backdropFilter: 'blur(20px)',
        borderRadius: 20, display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 12
      }}>
        <div style={{width: 24, height: 24, background: '#a78bfa', borderRadius: 4}} />
        <div style={{width: 24, height: 24, background: '#f4f4f5', borderRadius: '50%'}} />
      </div>

      {/* Center pill */}
      <div style={{
        background: 'rgba(25, 25, 35, 0.8)', backdropFilter: 'blur(20px)',
        borderRadius: 24, display: 'flex', alignItems: 'center', padding: '8px 24px', gap: 20
      }}>
        <div onClick={onAuraClick} style={{cursor: 'pointer', color: '#a78bfa'}}><Search size={20} /></div>
        <div style={{color: '#e4e4e7'}}><Folder size={20} /></div>
        <div style={{color: '#e4e4e7'}}><Music size={20} /></div>
        <div style={{color: '#e4e4e7'}}><Settings size={20} /></div>
        <div style={{color: '#e4e4e7'}}><MessageCircle size={20} /></div>
        <div style={{color: '#e4e4e7'}}><Play size={20} /></div>
        <div style={{color: '#e4e4e7'}}><Github size={20} /></div>
      </div>

      {/* Right pill */}
      <div style={{
        background: 'rgba(25, 25, 35, 0.8)', backdropFilter: 'blur(20px)',
        borderRadius: 20, display: 'flex', alignItems: 'center', padding: '8px 16px', gap: 12,
        color: '#e4e4e7', fontSize: 13, fontWeight: 500
      }}>
        <ChevronUp size={16} />
        <Volume2 size={16} />
        <Battery size={16} />
        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
"""

desktop_return_replacement = """
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Exo+2:wght@200;300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; user-select:none; }
        body { overflow:hidden; font-family:'Exo 2',sans-serif; background:#000; }
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:rgba(0,0,0,0.2)} ::-webkit-scrollbar-thumb{background:rgba(100,200,255,0.3);border-radius:3px}
      `}</style>

      <IntroPage onEnter={goToDesktop} isHidden={page === 'desktop'} />

      <div style={{
        position: 'fixed', inset: 0,
        background: bgImage ? `url(${bgImage}) center/cover no-repeat` : 'radial-gradient(ellipse at bottom left, #2c1b4d, #140d23 40%, #0d0a1a 100%)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        opacity: page === 'desktop' ? 1 : 0,
        transform: page === 'desktop' ? 'scale(1)' : 'scale(1.04)',
        pointerEvents: page === 'desktop' ? 'all' : 'none',
        zIndex: page === 'desktop' ? 1 : -1,
        overflow: 'hidden',
      }}>
        
        {/* Central Widget Pane */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          display: 'flex', gap: 16, zIndex: 10,
        }}>
          {/* Left Column - Apps */}
          <div style={{
            background: 'rgba(30, 31, 40, 0.8)', backdropFilter: 'blur(30px)',
            borderRadius: 24, width: 220, padding: '24px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {[
              {icon: Settings, label: 'Settings'},
              {icon: ImageIcon, label: 'Photos', bg: 'rgba(167, 139, 250, 0.2)', color: '#c4b5fd'},
              {icon: Calculator, label: 'Calculator'},
              {icon: Mail, label: 'Mail'},
              {icon: Terminal, label: 'Terminal'},
              {icon: Calendar, label: 'Calendar'},
              {icon: Github, label: 'Github'},
              {icon: MessageCircle, label: 'ChatGPT'},
              {icon: MessageCircle, label: 'Whatsapp'},
              {icon: Twitter, label: 'X / Twitter'},
            ].map((app, i) => (
              <div key={i} onClick={() => openApp(app.label.toLowerCase())} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px',
                borderRadius: 12, cursor: 'pointer',
                background: app.bg || 'transparent', color: app.color || '#a1a1aa',
                transition: 'background 0.2s',
              }} onMouseEnter={e => { if(!app.bg) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }} onMouseLeave={e => { if(!app.bg) e.currentTarget.style.background = 'transparent' }}>
                <div style={{background: app.bg ? '#a78bfa' : 'transparent', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <app.icon size={18} color={app.bg ? '#fff' : '#a1a1aa'} />
                </div>
                <span style={{fontSize: 14, fontWeight: 500}}>{app.label}</span>
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

            {/* Folders */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
              <div style={{background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <Download size={24} color="#a1a1aa" />
                <span style={{fontSize: 11, color: '#a1a1aa', fontWeight: 600}}>Downloads</span>
              </div>
              <div style={{background: '#c4b5fd', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <FileText size={24} color="#1e1b4b" />
                <span style={{fontSize: 11, color: '#1e1b4b', fontWeight: 600}}>Documents</span>
              </div>
              <div style={{background: '#c4b5fd', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <ImageIcon size={24} color="#1e1b4b" />
                <span style={{fontSize: 11, color: '#1e1b4b', fontWeight: 600}}>Pictures</span>
              </div>
              <div style={{background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                <Music size={24} color="#a1a1aa" />
                <span style={{fontSize: 11, color: '#a1a1aa', fontWeight: 600}}>Music</span>
              </div>
            </div>

            {/* Storage Progress */}
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div style={{background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{flex: 1, background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3, marginRight: 12}}>
                  <div style={{width: '60%', background: '#c4b5fd', height: '100%', borderRadius: 3}} />
                </div>
                <span style={{fontSize: 11, color: '#a1a1aa', fontWeight: 600}}>302GB/475GB</span>
              </div>
              <div style={{background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{flex: 1, background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3, marginRight: 12}}>
                  <div style={{width: '50%', background: '#c4b5fd', height: '100%', borderRadius: 3}} />
                </div>
                <span style={{fontSize: 11, color: '#a1a1aa', fontWeight: 600}}>4GB/8GB</span>
              </div>
            </div>

            {/* Bottom widgets */}
            <div style={{display: 'flex', gap: 12, height: 100}}>
              {/* Music Player */}
              <div style={{flex: 1, background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'}}>
                <div style={{position: 'absolute', inset: 0, background: 'url(https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92b?w=400&q=80) center/cover', opacity: 0.4}} />
                <span style={{fontSize: 10, color: '#fff', fontWeight: 700, zIndex: 1, letterSpacing: 1}}>DANCING WITH...</span>
                <div style={{display: 'flex', justifyContent: 'center', gap: 16, zIndex: 1}}>
                  <SkipBack size={16} color="#fff" />
                  <Pause size={16} color="#fff" />
                  <SkipForward size={16} color="#fff" />
                </div>
              </div>
              {/* Weather */}
              <div style={{width: 100, background: '#c4b5fd', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <span style={{fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1}}>28</span>
                <span style={{fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: 1}}>HAZE</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
              <div style={{width: 60, height: 60, background: '#c4b5fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16}}>
                99%
              </div>
              <div style={{flex: 1, background: 'rgba(30, 31, 40, 0.8)', borderRadius: 16, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', color: '#a1a1aa'}}>
                <Power size={20} />
                <RefreshCw size={20} />
                <Lock size={20} />
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
        <Taskbar openWindows={openWindows} onWindowFocus={focusWindow} onAuraClick={() => setIsSidePanelOpen(true)} />
      </div>
    </>
  );
"""

# 1. Add imports to the top
if "import { Settings" not in content:
    content = content.replace("import React, { useState, useEffect, useRef, useCallback } from 'react';", "import React, { useState, useEffect, useRef, useCallback } from 'react';\nimport { Settings, Image as ImageIcon, Calculator, Mail, Terminal, Calendar, Github, MessageCircle, Twitter, Search, Download, FileText, Music, Play, Pause, SkipForward, SkipBack, Power, RefreshCw, Lock, ChevronUp, Volume2, Battery, Folder } from 'lucide-react';")

# 2. Replace Taskbar
taskbar_pattern = re.compile(r'const Taskbar = \(\{.*?\}\);', re.DOTALL)
content = taskbar_pattern.sub(taskbar_replacement.split('\n', 2)[2], content)

# 3. Replace Desktop return statement
desktop_return_pattern = re.compile(r'  return \(\n    <>\n      \{\/\* Global Styles \*\/\}[\s\S]*?  \);\n};', re.DOTALL)
# Actually the structure is a bit different, let's just find `  return (\n    <>\n` inside `const Desktop` and replace until `\n};\n\nexport default Desktop;`
desktop_return_pattern2 = re.compile(r'  return \(\n    <>\n.*?\n  \);\n};', re.DOTALL)
content = desktop_return_pattern2.sub(desktop_return_replacement + '\n};', content)

with open('/home/vboxuser/AURA/frontend/src/Desktop.jsx', 'w') as f:
    f.write(content)

