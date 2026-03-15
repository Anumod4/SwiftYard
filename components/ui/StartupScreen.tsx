import React, { useState, useEffect } from "react";
import { Loader2, Server, ShieldCheck, Zap } from "lucide-react";

export const StartupScreen: React.FC = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 1: Initial load
    const t1 = setTimeout(() => setStage(1), 3000);
    // Stage 2: Waiting for wake up (Render sleeping)
    const t2 = setTimeout(() => setStage(2), 10000);
    // Stage 3: Taking a bit longer
    const t3 = setTimeout(() => setStage(3), 25000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const messages = [
    { text: "Connecting to secure server...", icon: <Zap className="w-5 h-5 text-blue-400" />, desc: "Establishing initial connection" },
    { text: "Verifying credentials...", icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />, desc: "Securing your session" },
    { text: "Waking up cloud services...", icon: <Server className="w-5 h-5 text-amber-400 animate-pulse" />, desc: "This may take up to 40 seconds" },
    { text: "Almost there...", icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />, desc: "Finalizing secure connection" },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f1c] overflow-hidden relative selection:bg-blue-500/30">
      {/* Animated background glowing orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse delay-700"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full p-8 md:p-10 rounded-3xl bg-[#111827]/60 border border-slate-800 backdrop-blur-2xl shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]">
        
        {/* Glow behind the logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Logo / Icon Area */}
        <div className="relative flex items-center justify-center w-28 h-28 mb-8">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-[2rem] rotate-6 opacity-20 blur-md"></div>
          <div className="absolute inset-0 bg-[#1e293b] rounded-[2rem] flex items-center justify-center border border-slate-700/80 shadow-inner">
            <svg 
              className="w-14 h-14 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="absolute -bottom-3 -right-3 bg-[#1e293b] rounded-full p-2 border border-slate-700 shadow-xl">
             <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight mb-10 drop-shadow-sm">
          SwiftYard
        </h1>

        {/* Dynamic Loading Status */}
        <div className="w-full">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner relative">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 shadow-sm shrink-0">
              {messages[stage].icon}
            </div>
            <div className="flex flex-col min-w-0">
               <p className="text-sm font-semibold text-slate-200 truncate transition-colors duration-300">
                 {messages[stage].text}
               </p>
               <p className="text-xs font-medium text-slate-500 truncate mt-0.5 transition-colors duration-300">
                 {messages[stage].desc}
               </p>
            </div>
          </div>
          
          <div className="w-full h-1 mt-6 bg-slate-800 rounded-full overflow-hidden">
             <div 
               className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-[3000ms] ease-out relative" 
               style={{ width: stage === 0 ? '25%' : stage === 1 ? '50%' : stage === 2 ? '75%' : '90%' }}
             >
                <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/20 blur-[2px] rounded-full animate-pulse"></div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
