import React, { useEffect, useState } from 'react';
import { LandmarkPoint } from '../hooks/useHandTracking';
import { GestureDetectionState } from '../hooks/useGesture';
import { DiamondSceneHandle } from './DiamondScene';
import { EmojiOption, EMOJI_OPTIONS, MAKEUP_PRESETS, MakeupPreset } from '../utils/faceGems';
import {
  Sparkles,
  Camera,
  Trash2,
  Volume2,
  VolumeX,
  HelpCircle,
  Hand,
  Wand2,
} from 'lucide-react';
import { soundEffects } from '../effects/soundEffects';

interface GestureDetectorProps {
  sceneRef: React.RefObject<DiamondSceneHandle | null>;
  landmarks: LandmarkPoint[] | null;
  gestureState: GestureDetectionState;
  isCameraActive: boolean;
  onStartCamera: () => void;
  gemCount: number;
  selectedEmoji: EmojiOption;
  onSelectEmoji: (emoji: EmojiOption) => void;
  beautyFilter: string;
  onSelectFilter: (filterId: string) => void;
}

export const GestureDetector: React.FC<GestureDetectorProps> = ({
  sceneRef,
  gestureState,
  isCameraActive,
  onStartCamera,
  gemCount,
  selectedEmoji,
  onSelectEmoji,
  beautyFilter,
  onSelectFilter,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [promptMessage, setPromptMessage] = useState<string>('食指与拇指在面部捏合，贴上闪亮星钻 ✨');

  const { isPinching, clearProgress } = gestureState;

  // Update prompt on gesture changes
  useEffect(() => {
    if (isPinching) {
      setPromptMessage(`✨ 已在面部凝结 ${selectedEmoji.emoji}！松开后可再次捏合`);
    } else if (clearProgress > 0) {
      setPromptMessage('💫 保持张开手掌，正在拂去面部碎钻...');
    }
  }, [isPinching, clearProgress, selectedEmoji]);

  const handleApplyPreset = (preset: MakeupPreset) => {
    setActivePreset(preset.id);
    sceneRef.current?.applyPreset(preset);
    setPromptMessage(`💖 已换上「${preset.name}」妆容！可在脸上继续捏合添加`);
  };

  const handleClear = () => {
    sceneRef.current?.clearAllGems();
    setActivePreset(null);
    setPromptMessage('💫 面部碎钻已清空，捏合手指或点击即可贴上新钻');
  };

  const handleCapture = () => {
    sceneRef.current?.captureSelfie();
    setPromptMessage('📸 美妆自拍已生成并保存！');
  };

  const toggleSound = () => {
    const next = soundEffects.toggleMute();
    setIsMuted(next);
  };

  const filters = [
    { id: 'natural', name: '原图清透' },
    { id: 'bright', name: '冷白皮' },
    { id: 'warm', name: '暖日光' },
    { id: 'peach', name: '蜜桃粉' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none z-20">
      {/* 1. Header: Brand, Emojis, Filter Tones, Snapshot */}
      <header className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-pink-400 to-sky-400 p-[1.5px] shadow-lg">
            <div className="w-full h-full bg-black/80 rounded-full flex items-center justify-center text-sm">
              ✨
            </div>
          </div>
          <div>
            <span className="font-serif text-xl font-bold tracking-wider text-white drop-shadow-md">
              PRISMGEM
            </span>
            <span className="text-[11px] text-pink-300 font-sans tracking-wider ml-1.5 px-1.5 py-0.5 rounded bg-pink-500/20 border border-pink-400/30">
              美妆相机
            </span>
          </div>
        </div>

        {/* Emoji Style Picker Bar */}
        <div className="flex items-center gap-1 p-1 bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 shadow-xl">
          {EMOJI_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSelectEmoji(opt)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-transform ${
                selectedEmoji.id === opt.id
                  ? 'bg-white/25 scale-110 shadow-md ring-1 ring-white/40'
                  : 'hover:bg-white/10 opacity-70 hover:opacity-100'
              }`}
              title={opt.name}
            >
              {opt.emoji}
            </button>
          ))}
        </div>

        {/* Beauty Tone Filters & Camera Controls */}
        <div className="flex items-center gap-2">
          {/* Tone Selector */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-black/60 backdrop-blur-md rounded-xl border border-white/15 text-xs">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => onSelectFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  beautyFilter === f.id
                    ? 'bg-pink-600/80 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Snapshot Button */}
          <button
            onClick={handleCapture}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-pink-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="拍摄美妆照片并下载"
          >
            <Camera size={14} />
            <span>自拍拍照</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            disabled={gemCount === 0}
            className="p-2 rounded-xl bg-black/60 hover:bg-rose-950/50 text-slate-300 hover:text-white border border-white/15 disabled:opacity-40 transition-colors cursor-pointer"
            title="清空所有面部碎钻"
          >
            <Trash2 size={15} className="text-rose-400" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 transition-colors cursor-pointer"
            title={isMuted ? '开启音效' : '静音'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(prev => !prev)}
            className="p-2 rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 transition-colors cursor-pointer"
            title="操作指南"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </header>

      {/* 2. Center Dynamic Prompt & Charging Clear Bar */}
      <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
        {/* Dynamic Context Banner */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/15 shadow-2xl text-xs md:text-sm text-slate-200">
          <Sparkles size={14} className="text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{promptMessage}</span>
        </div>

        {/* Open Palm 1s Clear Charging Bar */}
        {clearProgress > 0 && (
          <div className="flex flex-col items-center bg-rose-950/85 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-rose-500/40 shadow-2xl animate-pulse">
            <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold mb-1">
              <Hand size={14} />
              <span>张开手掌拂去碎钻中: {Math.round(clearProgress * 100)}%</span>
            </div>
            <div className="w-48 h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-75"
                style={{ width: `${clearProgress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Makeup Presets Bar & Camera Guidance */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
        {/* One-touch Makeup Presets */}
        <div className="flex items-center gap-2 p-1.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 shadow-xl">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-pink-300 px-2">
            <Wand2 size={13} />
            <span className="hidden md:inline">一键妆容:</span>
          </div>
          {MAKEUP_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activePreset === preset.id
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Gesture Controls Guide */}
        <div className="flex items-center gap-3 text-xs text-slate-300 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-medium text-white">食指+拇指捏合:</span>
            <span>面部贴钻</span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="font-medium text-white">张开手掌1秒:</span>
            <span>拂去碎钻</span>
          </div>
          <span className="text-white/20 hidden md:inline">|</span>
          <div className="flex items-center gap-1.5 hidden md:flex text-slate-400">
            <span>点击屏幕也可贴钻</span>
          </div>
        </div>
      </footer>

      {/* 4. Tutorial Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto">
          <div className="relative w-full max-w-md bg-slate-950 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>✨ PRISMGEM 美妆相机使用说明</span>
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <p className="font-semibold text-amber-300">
                  01. 面部捏合贴钻 (Pinch to Place Gem)
                </p>
                <p className="text-slate-400">
                  面向摄像头，在脸上任意位置（眼角、双颊、眉心等）将食指与拇指捏合，即可在对应五官位置贴上灵动的彩钻/Emoji ✨。彩钻将随面部转动平滑跟随！
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <p className="font-semibold text-pink-300">
                  02. 一键仙女妆容 (Preset Makeup Looks)
                </p>
                <p className="text-slate-400">
                  底部提供「仙女眼角泪钻」、「花钿额间星印」、「双颊星河雀斑」等经典碎钻妆容模板，点击即刻换装。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <p className="font-semibold text-rose-300">
                  03. 张开手掌拂去碎钻 (Open Palm to Clear)
                </p>
                <p className="text-slate-400">
                  在镜头前五指张开并保持 1 秒钟，面部所有碎钻将如星尘般消散。
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <p className="font-semibold text-sky-300">
                  04. 拍照留念与自拍保存
                </p>
                <p className="text-slate-400">
                  点击右上角「自拍拍照」按钮，自动合并高清摄像头画面与面部流光彩钻，一键下载高质感美妆照片。
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg hover:from-pink-400 hover:to-rose-400 transition-colors cursor-pointer"
            >
              我知道了，开始妆容体验
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
