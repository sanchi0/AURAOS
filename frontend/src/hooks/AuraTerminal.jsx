import React, { useEffect, useRef } from 'react';


const AuraTerminal = ({ output, pendingConfirm, confirmPending, cancelPending, clearOutput, socketConnected }) => {
  const terminalRef = useRef(null);

  
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(100,200,255,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#4cff9e' : '#ff6b6b', boxShadow: `0 0 6px ${socketConnected ? '#4cff9e' : '#ff6b6b'}` }} />
          <span style={{ color: '#8aaec8', fontSize: 11, letterSpacing: 1 }}>{socketConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
        <button
          onClick={clearOutput}
          style={{ background: 'none', border: 'none', color: '#8aaec8', fontSize: 11, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
        >
          Clear
        </button>
      </div>

      {}
      <div
        ref={terminalRef}
        style={{
          flex: 1, overflow: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
          padding: 12, fontFamily: "'Exo 2', monospace", fontSize: 13, lineHeight: 1.6,
        }}
      >
        {output.length === 0 && (
          <div style={{ color: 'rgba(100,200,255,0.4)', textAlign: 'center', padding: 40 }}>
            <span>✦ AURA Terminal Ready ✦</span><br />
            <span style={{ fontSize: 11 }}>Type a command or use voice input</span>
          </div>
        )}
        {output.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <span style={{ color: item.type === 'user' ? '#64c8ff' : '#c8ffb8', fontWeight: 500 }}>
              {item.type === 'user' ? '➤ You:' : '✦ AURA:'}
            </span>
            <span style={{ color: '#b8d4f0', marginLeft: 8 }}>{item.content}</span>
          </div>
        ))}
        {pendingConfirm && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(100,200,255,0.1)', borderRadius: 8 }}>
            <span style={{ color: '#ffaa44' }}>⚠️ Pending confirmation:</span>
            <span style={{ color: '#b8d4f0', marginLeft: 8 }}>{pendingConfirm}</span>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button 
                onClick={() => confirmPending(pendingConfirm)} 
                style={{ background: 'rgba(76,255,158,0.2)', border: '1px solid #4cff9e', color: '#4cff9e', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}
              >
                Confirm
              </button>
              <button 
                onClick={cancelPending} 
                style={{ background: 'rgba(255,107,107,0.2)', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(100,200,255,0.1)', color: 'rgba(100,200,255,0.3)', fontSize: 10, textAlign: 'center', letterSpacing: 1 }}>
        Use the AURA orb to send commands • Voice input supported
      </div>
    </div>
  );
};

export default AuraTerminal;
