"use client";
import { useState, useRef, useEffect, useCallback } from "react";

export default function VoiceAssistant() {
  const [status, setStatus] = useState("idle");
  const [aiText, setAiText] = useState("");
  const [voices, setVoices] = useState([]);
  const mediaRecorderRef = useRef(null);

  const initVoices = useCallback(() => {
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0) {
      setVoices(availableVoices);
    }
  }, []);

  useEffect(() => {
    initVoices();
    window.speechSynthesis.onvoiceschanged = initVoices;
  }, [initVoices]);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const isUrdu = /[\u0600-\u06FF]/.test(text);

    // 🚀 THE MAGIC FIX: Detailed Voice Hunting
    // 1. Look for Urdu (Pakistan or India)
    // 2. Fallback to Hindi (Google हिन्दी is excellent at reading Urdu script)
    // 3. Fallback to Punjabi
    let selectedVoice = voices.find(v => v.lang.startsWith("ur")) || 
                        voices.find(v => v.lang.startsWith("hi")) ||
                        voices.find(v => v.lang.startsWith("pa"));

    const englishVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("en")) || 
                         voices.find(v => v.lang.startsWith("en"));

    if (isUrdu) {
      utterance.lang = "ur-PK"; 
      // If we found a voice that sounds like Urdu/Hindi, use it
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.pitch = 0.9; // Lower pitch makes Urdu sound more natural/human
    } else {
      utterance.lang = "en-US";
      if (englishVoice) utterance.voice = englishVoice;
      utterance.pitch = 1.1;
    }

    utterance.rate = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");

    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        setStatus("thinking");
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "audio.webm");

        try {
          const res = await fetch("/api/voice", { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) {
            setAiText(data.text);
            speak(data.text);
          } else { throw new Error(); }
        } catch (e) {
          setStatus("idle");
          setAiText("Sorry Babar, I missed that.");
        }
      };

      mediaRecorderRef.current.start();
      setStatus("recording");
    } catch (err) {
      alert("Microphone access is required for B-AIR.");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white overflow-hidden p-6 font-sans">
      {/* Visual Background Glow */}
      <div className={`fixed inset-0 transition-opacity duration-1000 blur-[120px] opacity-20
        ${status === 'recording' ? 'bg-red-900' : status === 'thinking' ? 'bg-blue-900' : status === 'speaking' ? 'bg-emerald-900' : 'bg-transparent'}`} 
      />

      <div className="z-10 flex flex-col items-center w-full max-w-2xl">
        <div className="text-center mb-16">
          <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-zinc-600 bg-clip-text text-transparent">
            B-AIR
          </h1>
          <p className="text-zinc-500 tracking-[0.5em] text-[10px] uppercase font-bold mt-2">
            By Babar
          </p>
        </div>
        
        {/* Interaction Orb */}
        <button 
          onMouseDown={startRecording}
          onMouseUp={() => mediaRecorderRef.current?.stop()}
          onTouchStart={startRecording}
          onTouchEnd={() => mediaRecorderRef.current?.stop()}
          className={`group relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border
            ${status === 'recording' ? 'bg-red-500/20 border-red-500 scale-110 shadow-red-900/40' : 
              status === 'thinking' ? 'bg-blue-500/20 border-blue-400 animate-pulse' : 
              status === 'speaking' ? 'bg-emerald-500/20 border-emerald-400 scale-105' : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-500'}
          `}
        >
          {status === 'recording' ? (
             <div className="flex gap-1.5 items-end h-10">
                <span className="w-1.5 h-6 bg-white animate-bounce" />
                <span className="w-1.5 h-12 bg-white animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-8 bg-white animate-bounce [animation-delay:0.4s]" />
             </div>
          ) : (
            <span className="text-5xl transition-transform group-hover:scale-110 duration-300">
                {status === 'thinking' ? '🧠' : '🎙️'}
            </span>
          )}
        </button>

        <div className="mt-12 h-8 text-center">
          <p className="font-bold text-zinc-400 tracking-widest text-xs uppercase">
            {status === 'idle' && "Hold to speak"}
            {status === 'recording' && "I'm Listening..."}
            {status === 'thinking' && "Processing Language..."}
            {status === 'speaking' && "B-AIR Responding..."}
          </p>
        </div>

        {/* Multilingual Display Area */}
        <div className="mt-10 min-h-[120px] w-full text-center flex items-center justify-center">
          {aiText && (
            <p 
              dir={/[\u0600-\u06FF]/.test(aiText) ? 'rtl' : 'ltr'}
              className={`text-3xl md:text-4xl font-light leading-tight transition-all duration-700 animate-in fade-in zoom-in-95
                ${/[\u0600-\u06FF]/.test(aiText) ? 'text-emerald-400' : 'text-zinc-100'}`}
              style={{ fontFamily: /[\u0600-\u06FF]/.test(aiText) ? 'ui-serif, Georgia, serif' : 'inherit' }}
            >
              {aiText}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}