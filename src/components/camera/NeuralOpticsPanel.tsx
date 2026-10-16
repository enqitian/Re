import React from 'react';
import { Cpu, Eye, Sparkles, Sun, ShieldCheck } from 'lucide-react';
import { BeautyParameters } from '../../types/camera';

interface NeuralOpticsPanelProps {
  isAiActive: boolean;
  faceDetected: boolean;
  faceCount?: number;
  landmarkCount: number;
  beautyParams: BeautyParameters;
  exposureValue: string;
  gemCount?: number;
  isPinching?: boolean;
}

export const NeuralOpticsPanel: React.FC<NeuralOpticsPanelProps> = ({
  isAiActive,
  faceDetected,
  faceCount = 0,
  landmarkCount,
  beautyParams,
  exposureValue,
  gemCount = 0,
  isPinching = false,
}) => {
  return (
    <div className="relative bg-[#0d100d] border-2 border-stone-800 rounded-xl p-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9),0_4px_12px_rgba(0,0,0,0.7)] text-emerald-400 font-mono text-[11px] overflow-hidden select-none">
      {/* CRT Scanline & Grain Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(0,255,100,0.08) 0px, rgba(0,255,100,0.08) 1px, transparent 1px, transparent 2px)`,
        }}
      />

      {/* Screen Glare Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/[0.03] to-white/[0.04] pointer-events-none" />

      {/* Chip Header Bar */}
      <div className="flex items-center justify-between border-b border-emerald-950 pb-1.5 mb-2 text-stone-400">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Cpu size={13} className="text-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider text-[10px] uppercase">
            NEURAL OPTICS REV-24
          </span>
        </div>
        <span className="text-[9px] text-stone-500 tracking-tighter">
          CO-PROCESSOR // BIO-OPTIC
        </span>
      </div>

      {/* AI Telemetry Readout Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* 1. AI Face Detection */}
        <div className="flex items-start gap-1.5 p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30">
          <Eye size={12} className={faceDetected ? 'text-emerald-400 shrink-0 mt-0.5' : 'text-stone-600 shrink-0 mt-0.5'} />
          <div className="flex flex-col">
            <span className="text-[9px] text-stone-400 font-bold uppercase">
              AI Face Detection
            </span>
            <span className={`text-[10px] font-bold ${faceDetected ? 'text-emerald-300' : 'text-stone-500'}`}>
              {faceCount > 1
                ? `MULTI-LOCK [${faceCount} FACES]`
                : faceDetected
                ? `LOCKED [${landmarkCount} PTS]`
                : 'SCANNING SCENE...'}
            </span>
          </div>
        </div>

        {/* 2. Smart Beauty Engine */}
        <div className="flex items-start gap-1.5 p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30">
          <Sparkles size={12} className={isAiActive ? 'text-amber-400 shrink-0 mt-0.5' : 'text-stone-600 shrink-0 mt-0.5'} />
          <div className="flex flex-col">
            <span className="text-[9px] text-stone-400 font-bold uppercase">
              Smart Beauty
            </span>
            <span className="text-[10px] text-amber-300 font-bold">
              {isAiActive ? `ACTIVE · MESH LVL ${(beautyParams.smoothSkin + beautyParams.skinTone) / 2}` : 'BYPASS'}
            </span>
          </div>
        </div>

        {/* 3. Auto Lighting / Exposure Meter */}
        <div className="flex items-start gap-1.5 p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30">
          <Sun size={12} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-[9px] text-stone-400 font-bold uppercase">
              Auto Lighting
            </span>
            <span className="text-[10px] text-emerald-300 font-bold">
              EV {exposureValue} [BALANCED]
            </span>
          </div>
        </div>

        {/* 4. Gesture AR Telemetry */}
        <div className="flex items-start gap-1.5 p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30">
          <ShieldCheck size={12} className={gemCount > 0 || isPinching ? 'text-amber-400 shrink-0 mt-0.5' : 'text-sky-400 shrink-0 mt-0.5'} />
          <div className="flex flex-col">
            <span className="text-[9px] text-stone-400 font-bold uppercase">
              Gesture AR Bio
            </span>
            <span className={`text-[10px] font-bold ${isPinching ? 'text-amber-300 animate-pulse' : 'text-sky-300'}`}>
              {isPinching ? 'PINCH ACTIVE ✨' : gemCount > 0 ? `${gemCount} GEMS ON FACE` : 'READY TO PINCH'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
