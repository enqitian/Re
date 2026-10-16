import React from 'react';
import { FilmPreset } from '../../utils/filmPresets';
import { cameraAudio } from '../../utils/cameraAudio';
import { Zap, Volume2, VolumeX, Sparkles, BatteryMedium, Download } from 'lucide-react';

interface TopStatusPanelProps {
  currentFilm: FilmPreset;
  shutterSpeed: string;
  aperture: string;
  batteryLevel: number;
  filmCounter: number;
  maxFrames?: number;
  flashMode: 'off' | 'on' | 'auto';
  onToggleFlash: () => void;
  isAiActive: boolean;
  onToggleAi: () => void;
  isFocusLocked: boolean;
  faceCount?: number;
  isCameraActive: boolean;
  onTogglePower: () => void;
}

export const TopStatusPanel: React.FC<TopStatusPanelProps> = ({
  currentFilm,
  shutterSpeed,
  aperture,
  batteryLevel,
  filmCounter,
  maxFrames = 36,
  flashMode,
  onToggleFlash,
  isAiActive,
  onToggleAi,
  isFocusLocked,
  faceCount = 0,
  isCameraActive,
  onTogglePower,
}) => {
  const [isMuted, setIsMuted] = React.useState<boolean>(cameraAudio.isMuted());

  const handleToggleMute = () => {
    const next = cameraAudio.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className="relative w-full bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border-b-2 border-stone-800 shadow-[0_4px_20px_rgba(0,0,0,0.9)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* 1. Camera Brand Wordmark & Mechanical Engraving */}
      <div className="flex items-center gap-3">
        {/* Leica/Fujifilm Red Dot Inspired Vintage Emblem */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-600 to-rose-700 border border-red-500/50 flex items-center justify-center shadow-[0_0_8px_rgba(225,29,72,0.5)]">
            <span className="font-serif italic font-bold text-white text-[11px] tracking-tighter">
              L
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-sm tracking-widest text-stone-100 uppercase">
              LUMINA 35
            </span>
            <span className="text-[8px] font-mono text-stone-500 tracking-wider uppercase -mt-0.5">
              RANGEFINDER · AI BIOCAM
            </span>
          </div>
        </div>

        {/* Micro LED Cluster */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-stone-950/80 border border-stone-800/80">
          {/* AF Lock LED */}
          <div className="flex items-center gap-1.5" title="Autofocus Rangefinder Lock">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isFocusLocked
                  ? faceCount > 1
                    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]'
                    : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]'
                  : 'bg-stone-700'
              }`}
            />
            <span className="text-[8px] font-mono text-stone-400 uppercase">
              {faceCount > 1 ? `MULTI-AF (${faceCount})` : 'AF LOCK'}
            </span>
          </div>

          <span className="text-stone-700">|</span>

          {/* AI Neural Chip LED */}
          <div className="flex items-center gap-1.5" title="AI Face Mesh Neural Engine">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isAiActive
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)]'
                  : 'bg-stone-700'
              }`}
            />
            <span className="text-[8px] font-mono text-stone-400 uppercase">
              AI CHIP
            </span>
          </div>
        </div>
      </div>

      {/* 2. Vintage Amber LCD Exposure Status Display */}
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#14120f] border-2 border-stone-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_0_12px_rgba(245,158,11,0.06)] font-mono">
        {/* ISO Display */}
        <div className="flex flex-col items-center border-r border-stone-800/80 pr-2.5">
          <span className="text-[8px] text-stone-500 tracking-wider">ISO</span>
          <span className="text-xs font-bold text-amber-300 tabular-nums">
            {currentFilm.iso}
          </span>
        </div>

        {/* Shutter Speed */}
        <div className="flex flex-col items-center border-r border-stone-800/80 pr-2.5">
          <span className="text-[8px] text-stone-500 tracking-wider">SPEED</span>
          <span className="text-xs font-bold text-amber-300 tabular-nums">
            {shutterSpeed}
          </span>
        </div>

        {/* Aperture */}
        <div className="flex flex-col items-center border-r border-stone-800/80 pr-2.5">
          <span className="text-[8px] text-stone-500 tracking-wider">APERTURE</span>
          <span className="text-xs font-bold text-amber-300 tabular-nums">
            {aperture}
          </span>
        </div>

        {/* Battery Gauge */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-stone-500 tracking-wider flex items-center gap-0.5">
            <BatteryMedium size={8} />
            <span>BATT</span>
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            <div className={`w-1.5 h-2 rounded-[1px] ${batteryLevel > 20 ? 'bg-amber-400' : 'bg-stone-700'}`} />
            <div className={`w-1.5 h-2 rounded-[1px] ${batteryLevel > 50 ? 'bg-amber-400' : 'bg-stone-700'}`} />
            <div className={`w-1.5 h-2 rounded-[1px] ${batteryLevel > 80 ? 'bg-amber-400' : 'bg-stone-700'}`} />
          </div>
        </div>
      </div>

      {/* 3. Mechanical Film Counter Wheel Window */}
      <div className="flex items-center gap-3">
        {/* Physical Film Exposure Dial Window */}
        <div
          className="relative w-12 h-12 rounded-full border-2 border-stone-700 bg-gradient-to-tr from-stone-900 via-stone-800 to-stone-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_2px_8px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center"
          title={`胶卷剩余拍摄张数: ${filmCounter} / ${maxFrames}`}
        >
          {/* Glass Specular Glare */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          {/* Red Indicator Needle at 12 o'clock */}
          <div className="absolute top-1 w-0.5 h-2 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,1)]" />
          <span className="text-[7px] font-mono text-stone-400 font-bold uppercase tracking-tighter mt-1">
            EXP
          </span>
          <span className="text-sm font-mono font-bold text-white tabular-nums -mt-0.5">
            {filmCounter.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Physical Toggle Controls: Flash & Audio & AI */}
        <div className="flex items-center gap-1.5">
          {/* Flash Mode Toggle */}
          <button
            onClick={() => {
              cameraAudio.playToggleSwitch();
              onToggleFlash();
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              flashMode === 'on'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : flashMode === 'auto'
                ? 'bg-stone-800 border-stone-700 text-amber-400'
                : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
            title={`闪光灯模式: ${flashMode.toUpperCase()}`}
          >
            <Zap size={14} />
          </button>

          {/* AI Biocam Feature Toggle */}
          <button
            onClick={() => {
              cameraAudio.playToggleSwitch();
              onToggleAi();
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isAiActive
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
            title={isAiActive ? 'AI智能人脸检测与微光引擎已开启' : 'AI引擎已休眠'}
          >
            <Sparkles size={14} />
          </button>

          {/* Mechanical Sound Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title={isMuted ? '开启机械快门音效' : '静音'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {/* Download Project Source ZIP */}
          <a
            href="/retro-cam-ar.zip"
            download="retro-cam-ar.zip"
            className="p-2 rounded-xl bg-stone-950 hover:bg-amber-950/40 border border-stone-800 hover:border-amber-500/60 text-stone-400 hover:text-amber-300 transition-all cursor-pointer flex items-center gap-1.5"
            title="下载完整项目源码压缩包 (ZIP)"
          >
            <Download size={14} className="text-amber-400" />
            <span className="hidden sm:inline text-[9px] font-mono font-bold text-amber-300/90">源码 ZIP</span>
          </a>

          {/* Power Switch */}
          <button
            onClick={() => {
              cameraAudio.playToggleSwitch();
              onTogglePower();
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              isCameraActive
                ? 'bg-red-950/60 border-red-500/60 text-red-300 shadow-sm'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-white'
            }`}
            title="摄像头光学快门电源"
          >
            {isCameraActive ? 'PWR ON' : 'STANDBY'}
          </button>
        </div>
      </div>
    </div>
  );
};
