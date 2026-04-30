import { useState, useCallback, useEffect, useRef } from 'react';


export function useAura() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState([]);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
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
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
  }, []);

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;

    
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
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setIsListening(false);
      }
    } else {
      console.warn("Speech Recognition not available.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
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

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  const confirmPending = useCallback((pendingContent) => {
    if (pendingContent) {
      submitPrompt(pendingContent);
      setPendingConfirm(null);
    } else if (pendingConfirm) {
      submitPrompt(pendingConfirm);
      setPendingConfirm(null);
    }
  }, [pendingConfirm, submitPrompt]);

  const cancelPending = useCallback(() => {
    setPendingConfirm(null);
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
  };
}

export default useAura;
