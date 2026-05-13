import { useState, useCallback, useEffect, useRef } from 'react';


export function useAura(wakeWordEnabled = false) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState([]);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [desktopFiles, setDesktopFiles] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [sysHistory, setSysHistory] = useState(Array(20).fill({ cpuLoad: 0, memUsed: 0 }));
  const [isMuted, setIsMuted] = useState(false);
  const [networks, setNetworks] = useState([]);
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [displayInfo, setDisplayInfo] = useState('');
  const [fileExplorerItems, setFileExplorerItems] = useState([]);
  const [currentPath, setCurrentPath] = useState('/home/vboxuser/Desktop');

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeWordRecRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const [wakeWordEvent, setWakeWordEvent] = useState(0);
  const [openAppRequest, setOpenAppRequest] = useState(null);
  const isListeningRef = useRef(false);
  const wakeWordEnabledRef = useRef(false);

  useEffect(() => {
    wakeWordEnabledRef.current = wakeWordEnabled;
  }, [wakeWordEnabled]);

  useEffect(() => {
    isListeningRef.current = isListening;
    if (isListening) {
      if (wakeWordRecRef.current) {
        try { wakeWordRecRef.current.abort(); } catch(e) {}
      }
    } else if (wakeWordEnabled) {
      setTimeout(() => {
        if (!isListeningRef.current && wakeWordRecRef.current) {
          try { wakeWordRecRef.current.start(); } catch(e) {}
        }
      }, 500);
    }
  }, [isListening, wakeWordEnabled]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      // Main Active Recognition
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Use previous transcript state to append new final results if continuous is true,
        // but since a new session starts each time, we just set the combination.
        setTranscript(finalTranscript + interimTranscript);

        // Reset the 3-second silence timeout
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
          }
        }, 3000);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech') {
          setTranscript('⚠️ No audio detected. Please check your VM microphone settings!');
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      // Wake Word Recognition
      wakeWordRecRef.current = new SpeechRecognition();
      wakeWordRecRef.current.continuous = true;
      wakeWordRecRef.current.interimResults = true;
      wakeWordRecRef.current.lang = 'en-US';

      wakeWordRecRef.current.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        const lowerText = text.toLowerCase();
        console.log("Background listening:", lowerText); // Help debug
        
        // Check if wake word is present
        if (lowerText.match(/\b(hey aura|hello aura|aura|ara|ora|laura)\b/)) {
           setWakeWordEvent(Date.now());
           try { wakeWordRecRef.current.stop(); } catch(e) {}
        }
      };

      wakeWordRecRef.current.onerror = (e) => {
         console.warn("Wake word recognition error:", e.error);
      };

      wakeWordRecRef.current.onend = () => {
         if (!isListeningRef.current && wakeWordRecRef.current && wakeWordEnabledRef.current) {
            setTimeout(() => {
               try {
                  if (!isListeningRef.current && wakeWordEnabledRef.current) {
                     wakeWordRecRef.current.start();
                  }
               } catch (e) {}
            }, 300);
         }
      };

      if (wakeWordEnabledRef.current) {
         try { wakeWordRecRef.current.start(); } catch (e) {}
      }

    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
  }, []);

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (isMuted) return;

    
    const cleanText = text.replace(/> Executing: .*\n\n/g, '').replace(/[#*`]/g, '').trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (!newMuted && 'speechSynthesis' in window) {
        // Unlock API
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
      if (newMuted && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return newMuted;
    });
  }, []);

  
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:5000');

        wsRef.current.onopen = () => {
          console.log('✅ WebSocket connected');
          setSocketConnected(true);
        };

        wsRef.current.onclose = () => {
          console.log('❌ WebSocket disconnected');
          setSocketConnected(false);
          
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'stream') {
              
              setOutput(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.isStreaming) {
                  return prev.map((msg, idx) =>
                    idx === prev.length - 1
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  );
                }
                return [...prev, { type: 'aura', content: data.content, isStreaming: true }];
              });
            } else if (data.type === 'stream_end') {
              setIsProcessing(false);
              setOutput(prev => {
                const finalOutput = prev.map(msg =>
                  msg.isStreaming ? { ...msg, isStreaming: false } : msg
                );

                const lastMsg = finalOutput[finalOutput.length - 1];
                if (lastMsg && lastMsg.type === 'aura') {
                  speakText(lastMsg.content);
                }

                return finalOutput;
              });
            } else if (data.type === 'response') {
              setOutput(prev => [...prev, { type: 'aura', content: data.content }]);
              setIsProcessing(false);
              speakText(data.content);
            } else if (data.type === 'error') {
              setOutput(prev => [...prev, { type: 'aura', content: `Error: ${data.content}` }]);
              setIsProcessing(false);
              speakText("I encountered an error processing your request.");
            } else if (data.type === 'require_password') {
              setPendingConfirm({ type: 'password', command: data.command });
              setIsProcessing(false);
              speakText("This command requires administrator privileges. Please enter your password.");
            } else if (data.type === 'open_app') {
              setOpenAppRequest({ app: data.app, ts: Date.now() });
              setIsProcessing(false);
              speakText(`Opening ${data.app}.`);
            } else if (data.type === 'sysinfo') {
              setSysHistory(prev => [...prev.slice(1), { memUsed: data.memUsed, cpuLoad: parseFloat(data.cpuLoad) * 20 }]); // Scale load avg
              if (data.desktopFiles) setDesktopFiles(data.desktopFiles);
            } else if (data.type === 'network_list') {
              setNetworks(data.networks);
            } else if (data.type === 'bluetooth_list') {
              setBluetoothDevices(data.devices);
            } else if (data.type === 'display_info') {
              setDisplayInfo(data.raw);
            } else if (data.type === 'explore_results') {
              setFileExplorerItems(data.items);
              setCurrentPath(data.path);
            } else if (data.type === 'file_op_success') {
               if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                 wsRef.current.send(JSON.stringify({ type: 'file_explore', path: currentPath }));
               }
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setSocketConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setIsListening(true);
      setTranscript('');
      
      // Stop background listener explicitly before starting main listener
      if (wakeWordRecRef.current) {
        try { wakeWordRecRef.current.abort(); } catch(e) {}
      }

      // Small delay to let browser release mic to the new instance
      setTimeout(() => {
        try {
          if (recognitionRef.current) recognitionRef.current.start();
          
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch(e) {}
            }
          }, 5000);
        } catch (e) {
          console.error("Failed to start active speech recognition:", e);
          setIsListening(false);
        }
      }, 300);
    } else {
      console.warn("Speech Recognition not available.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    setIsListening(false);
  }, []);

  const submitPrompt = useCallback((text) => {
    if (!text || !text.trim()) return;

    // Add user message immediately
    setOutput(prev => [...prev, { type: 'user', content: text.trim() }]);
    setIsProcessing(true);

    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'prompt',
        content: text.trim()
      }));
    } else {
      
      console.log('WebSocket not connected, using local fallback');
      setTimeout(() => {
        const lowerText = text.toLowerCase();
        let response = '';

        if (lowerText.includes('hello') || lowerText.includes('hi')) {
          response = 'Hello! I am AURA, your personal assistant. How can I help you?';
        } else if (lowerText.includes('time')) {
          response = `The current time is ${new Date().toLocaleTimeString()}.`;
        } else if (lowerText.includes('date')) {
          response = `Today is ${new Date().toLocaleDateString()}.`;
        } else if (lowerText.includes('open')) {
          response = 'Opening application...';
        } else {
          response = `I received: "${text}". I am learning new commands every day!`;
        }

        setOutput(prev => [...prev, { type: 'aura', content: response }]);
        setIsProcessing(false);
      }, 1000);
    }
  }, []);

  const executeCommand = useCallback((cmd) => {
    if (!cmd || !cmd.trim()) return;
    setIsProcessing(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'execute',
        content: cmd.trim()
      }));
    }
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  const confirmPending = useCallback((pendingData) => {
    if (pendingData && pendingData.type === 'password') {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'execute_sudo',
          command: pendingData.command,
          password: pendingData.password
        }));
      }
      setPendingConfirm(null);
    } else {
      const content = typeof pendingData === 'string' ? pendingData : (pendingConfirm && pendingConfirm.command ? pendingConfirm.command : pendingConfirm);
      submitPrompt(content);
      setPendingConfirm(null);
    }
  }, [pendingConfirm, submitPrompt]);

  const cancelPending = useCallback(() => {
    setPendingConfirm(null);
  }, []);

  const requestSystemData = useCallback((action, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'system_control', action, ...payload }));
    }
  }, []);

  const requestFileExplore = useCallback((path) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'file_explore', path }));
    }
  }, []);

  const performFileOp = useCallback((action, payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'file_op', action, ...payload }));
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isProcessing,
    submitPrompt,
    output,
    clearOutput,
    pendingConfirm,
    confirmPending,
    cancelPending,
    socketConnected,
    sysHistory,
    desktopFiles,
    stopSpeech,
    executeCommand,
    wakeWordEvent,
    openAppRequest,
    isMuted,
    toggleMute,
    networks,
    bluetoothDevices,
    displayInfo,
    fileExplorerItems,
    currentPath,
    requestSystemData,
    requestFileExplore,
    performFileOp
  };
}

export default useAura;
