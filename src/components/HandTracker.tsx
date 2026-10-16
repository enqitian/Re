import React from 'react';
import { LandmarkPoint } from '../hooks/useHandTracking';
import { Camera, Eye, Sparkles, Smile, Hand } from 'lucide-react';

interface HandTrackerProps {
  isCameraActive: boolean;
  hasFace: boolean;
  hasHand: boolean;
  isPinching: boolean;
  isOpenPalm: boolean;
  clearProgress: number;
  pinchDistance: number;
  onToggleCamera: () => void;
}

export const HandTracker: React.FC<HandTrackerProps> = ({
  isCameraActive,
  hasFace,
  hasHand,
  isPinching,
  isOpenPalm,
  clearProgress,
  pinchDistance,
  onToggleCamera,
}) => {
  return (
    <div className="fixed top-20 right-4 z-20 pointer-events-auto select-none font-sans">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 shadow-xl text-xs text-slate-300">
        {/* Face tracking indicator */}
        <div
          className={`flex items-center gap-1 transition-colors ${
            hasFace ? 'text-pink-300' : 'text-slate-500'
          }`}
          title={hasFace ? '面部已锁定，彩钻将跟随面部' : '未检测到面部'}
        >
          <Smile size={13} className={hasFace ? 'animate-pulse' : ''} />
          <span className="hidden sm:inline">{hasFace ? '面部锁定' : '寻找面部'}</span>
        </div>

        <span className="text-white/20">|</span>

        {/* Hand tracking indicator */}
        <div
          className={`flex items-center gap-1 transition-colors ${
            hasHand ? (isPinching ? 'text-amber-300 font-semibold' : 'text-sky-300') : 'text-slate-500'
          }`}
          title={hasHand ? (isPinching ? '正在捏合贴钻' : '手势识别中') : '未检测到手部'}
        >
          <Hand size={13} />
          <span className="hidden sm:inline">
            {isPinching ? '捏合中' : hasHand ? '手势就绪' : '手势待命'}
          </span>
        </div>

        {/* Pinching visual indicator */}
        {isPinching && (
          <span className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40 animate-bounce">
            <Sparkles size={11} />
            <span>贴钻</span>
          </span>
        )}

        <button
          onClick={onToggleCamera}
          className={`p-1 rounded-lg transition-colors ml-1 ${
            isCameraActive ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-rose-400 hover:bg-rose-500/20'
          }`}
          title={isCameraActive ? '关闭摄像头' : '打开摄像头'}
        >
          <Camera size={13} />
        </button>
      </div>
    </div>
  );
};
