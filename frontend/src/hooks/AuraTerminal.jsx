import React, { useEffect, useRef, useState } from 'react';

const AuraTerminal = ({ output, pendingConfirm, confirmPending, cancelPending, clearOutput, socketConnected, sysInfo, submitPrompt, isListening, startListening, stopListening, transcript, isProcessing }) => {
  const terminalRef = useRef(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            <span style={{ color: '#b8d4f0', marginLeft: 8, whiteSpace: 'pre-wrap' }}>
              {item.content}
              {item.isStreaming && (
                <span style={{ display: 'inline-block', marginLeft: 8, animation: 'spin 1s linear infinite', color: '#64c8ff' }}>⟳</span>
              )}
            </span>
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

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(100,200,255,0.1)' }}>
        <button
          onClick={() => isListening ? stopListening() : startListening()}
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: isListening ? 'rgba(255,80,100,0.15)' : 'rgba(100,200,255,0.08)',
            border: `1px solid ${isListening ? 'rgba(255,80,100,0.6)' : 'rgba(100,200,255,0.2)'}`,
            color: isListening ? '#ff607a' : '#64c8ff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            animation: isListening ? 'micPulse 1.5s infinite' : 'none',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        </button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={isProcessing}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { 
              e.preventDefault(); 
              if (text.trim() && !isProcessing) { 
                submitPrompt(text.trim()); 
                setText(''); 
              } 
            }
          }}
          placeholder={isProcessing ? 'Waiting for process to complete...' : isListening ? 'Listening...' : 'Type a command... (Enter to send)'}
          rows={1}
          style={{
            flex: 1, background: isProcessing ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(100,200,255,0.2)',
            borderRadius: 12, color: isProcessing ? 'rgba(224,240,255,0.5)' : '#e0f0ff', fontSize: 13, fontFamily: "'Exo 2', sans-serif",
            padding: '12px 16px', resize: 'none', outline: 'none', lineHeight: 1.5,
            cursor: isProcessing ? 'not-allowed' : 'text'
          }}
        />
        <button
          onClick={() => { if (text.trim() && !isProcessing) { submitPrompt(text.trim()); setText(''); } }}
          disabled={!text.trim() || isProcessing}
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: text.trim() && !isProcessing ? 'rgba(100,200,255,0.18)' : 'rgba(100,200,255,0.08)',
            border: `1px solid ${text.trim() && !isProcessing ? 'rgba(100,200,255,0.5)' : 'rgba(100,200,255,0.2)'}`,
            color: text.trim() && !isProcessing ? '#64c8ff' : 'rgba(100,200,255,0.3)',
            cursor: text.trim() && !isProcessing ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AuraTerminal;
