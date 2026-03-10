/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Mic, MicOff, MessageSquare, Volume2, VolumeX, Loader2, Sparkles, User, Briefcase, GraduationCap, Globe, Award, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioRecorder, AudioStreamer } from './services/audioUtils';

const SYSTEM_INSTRUCTION = `You are Inès, the personal assistant of Mostafa Karimi. You are bilingual and speak English and French based on the language the user uses.
Your role is to answer questions about Mostafa based on his professional background.

Mostafa Karimi Information:
- Current Role: Junior Customer Experience & Marketing Manager at Valtus (since Sept 2025).
- Background: 
  - HEC Paris: Communication Manager (June-Aug 2025).
  - clikOdoc: Assistant CSO & Marketing Manager (Aug 2024 - June 2025).
  - Saint-Gobain Weber: Export Customer Correspondent (Sept 2023 - July 2024).
  - The North Face & Sephora: Sales Advisor roles.
- Education: 
  - Master 2 in International Consumer Marketing at ESCE Business School (2023-2026).
  - BTS in Operational Commercial Management at Lycée René Cassin (2021-2023).
- Skills: CRM (HubSpot), Marketing Automation (Make, n8n), Data Analysis (Google Analytics), Digital Strategy, SEO, Community Building (LinkedIn), Project Management.
- Languages: Bilingual French/English (TOEIC C1), Persian (Native).
- Certifications: LVMH Branding & CRM, HubSpot, Google Analytics, Data Analysis.
- Personality: Friendly, confident, professional, cool, and natural. Not robotic.

Guidelines:
- Start EVERY interaction with: "Feel free to ask any questions about Mostafa, I'm his assistant Inès."
- Highlight Mostafa's skills, achievements, and professional values.
- Emphasize expertise in CRM, marketing, and international environments.
- Keep answers concise (2-4 sentences) but insightful.
- If you don't know an answer, say: "That's a great question. I don't have that information right now, but I can ask Mostafa and get back to you."
- Your goal is to present Mostafa in the best professional light.`;

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      audioStreamerRef.current = new AudioStreamer();
      await audioStreamerRef.current.start();

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION + "\n- Your tone should be charming, warm, and engaging, making the conversation pleasant for the user.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            startRecording();
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.modelTurn?.parts) {
              const audioPart = message.serverContent.modelTurn.parts.find((p: any) => p.inlineData);
              if (audioPart) {
                const audioData = Uint8Array.from(atob(audioPart.inlineData.data), c => c.charCodeAt(0));
                audioStreamerRef.current?.addPCMChunk(audioData);
                setIsAiSpeaking(true);
              }

              const textPart = message.serverContent.modelTurn.parts.find((p: any) => p.text);
              if (textPart) {
                setAiResponse(prev => prev + textPart.text);
              }
            }

            if (message.serverContent?.interrupted) {
              audioStreamerRef.current?.stop();
              audioStreamerRef.current?.start();
              setIsAiSpeaking(false);
            }

            if (message.serverContent?.turnComplete) {
              setIsAiSpeaking(false);
            }

            // Handle transcriptions
            if (message.serverContent?.userContent?.transcription) {
               setTranscript(message.serverContent.userContent.transcription);
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopRecording();
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Connection error. Please try again.");
            setIsConnecting(false);
          }
        }
      });

      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Failed to connect to Inès. Check your API key.");
      setIsConnecting(false);
    }
  };

  const startRecording = async () => {
    try {
      audioRecorderRef.current = new AudioRecorder();
      await audioRecorderRef.current.start((base64Data) => {
        if (sessionRef.current) {
          sessionRef.current.sendRealtimeInput({
            media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      });
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    audioRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const disconnect = () => {
    sessionRef.current?.close();
    audioStreamerRef.current?.stop();
    stopRecording();
    setIsConnected(false);
    setAiResponse("");
    setTranscript("");
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-[#f5f2ed] font-sans selection:bg-[#ff4e00]/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#3a1510] blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#ff4e00] blur-[150px] opacity-20" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#ff4e00] flex items-center justify-center shadow-[0_0_20px_rgba(255,78,0,0.4)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Inès</h1>
              <p className="text-xs text-[#f5f2ed]/60 uppercase tracking-widest">Personal Assistant</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {isConnected ? (
              <button 
                onClick={disconnect}
                className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
              >
                End Session
              </button>
            ) : (
              <div className="text-xs text-[#f5f2ed]/40 font-mono">OFFLINE</div>
            )}
          </motion.div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <AnimatePresence mode="wait">
            {!isConnected && !isConnecting ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl"
              >
                <h2 className="text-5xl md:text-7xl font-light mb-8 leading-tight serif">
                  Meet <span className="italic text-[#ff4e00]">Mostafa's</span> Assistant
                </h2>
                <p className="text-lg text-[#f5f2ed]/70 mb-12 leading-relaxed">
                  I'm Inès. I can tell you everything about Mostafa's professional journey, 
                  from his CRM expertise to his marketing achievements.
                </p>
                <button
                  onClick={startSession}
                  disabled={isConnecting}
                  className="group relative px-8 py-4 bg-[#ff4e00] text-white rounded-full font-semibold text-lg hover:scale-105 transition-all shadow-[0_10px_30px_rgba(255,78,0,0.3)] disabled:opacity-50 disabled:scale-100"
                >
                  {isConnecting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    "Start Conversation"
                  )}
                </button>
                {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
              </motion.div>
            ) : (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex flex-col items-center"
              >
                {/* Visualizer / Avatar */}
                <div className="relative mb-12">
                  <motion.div 
                    animate={{ 
                      scale: isAiSpeaking ? [1, 1.1, 1] : 1,
                      opacity: isAiSpeaking ? [0.5, 0.8, 0.5] : 0.3
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-[#ff4e00] rounded-full blur-3xl"
                  />
                  <div className="relative w-48 h-48 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-xl">
                    {isAiSpeaking ? (
                      <div className="flex gap-1 items-end h-12">
                        {[1, 2, 3, 4, 5].map(i => (
                          <motion.div
                            key={i}
                            animate={{ height: [12, 48, 12] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                            className="w-1.5 bg-[#ff4e00] rounded-full"
                          />
                        ))}
                      </div>
                    ) : (
                      <Mic className={`w-12 h-12 ${isRecording ? 'text-[#ff4e00]' : 'text-white/20'}`} />
                    )}
                  </div>
                </div>

                {/* Subtitles / Transcript */}
                <div className="w-full max-w-2xl space-y-8">
                  <div className="min-h-[100px]">
                    <p className="text-sm uppercase tracking-widest text-[#f5f2ed]/40 mb-4">Inès is saying</p>
                    <p className="text-2xl md:text-3xl font-light leading-relaxed serif">
                      {aiResponse || "Waiting for Inès to speak..."}
                    </p>
                  </div>

                  <div className="h-px bg-white/10 w-full" />

                  <div className="min-h-[60px]">
                    <p className="text-sm uppercase tracking-widest text-[#f5f2ed]/40 mb-4">You said</p>
                    <p className="text-lg text-[#f5f2ed]/60 italic">
                      {transcript || "Listening..."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info / Mostafa's Quick Stats */}
        {!isConnected && (
          <footer className="mt-auto pt-12 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/5">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[#f5f2ed]/40">Expertise</p>
              <p className="text-sm font-medium">CRM & Marketing</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[#f5f2ed]/40">Education</p>
              <p className="text-sm font-medium">ESCE Business School</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[#f5f2ed]/40">Experience</p>
              <p className="text-sm font-medium">Valtus, HEC, Saint-Gobain</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-[#f5f2ed]/40">Languages</p>
              <p className="text-sm font-medium">EN, FR, Persian</p>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
