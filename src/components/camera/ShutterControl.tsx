import React, { useState } from 'react';
import { cameraAudio } from '../../utils/cameraAudio';

interface ShutterControlProps {
  onCapture: () => void;
  disabled?: boolean;
}

export const ShutterControl: React.FC<ShutterControlProps> = ({
  onCapture,
  disabled = false,
}) => {
  const [isPressed, setIsPressed] = useState<boolean>(false);

  const handlePointerDown = () => {
    if (disabled) return;
    setIsPressed(true);
    cameraAudio.playFocusBeep(); // Half-press focus confirmation
  };

  const handlePointerUp = () => {
    if (disabled || !isPressed) return;
    setIsPressed(false);
    onCapture();
  };

  const handlePointerCancel = () => {
    setIsPressed(false);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Mechanical Shutter Housing / Brass Rim Assembly */}
      <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-stone-700 via-stone-800 to-stone-950 p-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center">
        {/* Outer Knurled Collar with Threaded Cable Release Hole */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-600/30 opacity-60" />

        {/* The Depressible Mechanical Shutter Button */}
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          disabled={disabled}
          className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-75 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 ${
            isPressed
              ? 'scale-[0.92] translate-y-1 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] bg-gradient-to-b from-stone-500 to-stone-700'
              : 'scale-100 hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_2px_2px_rgba(255,255,255,0.4)] bg-gradient-to-b from-stone-300 via-stone-400 to-stone-600'
          }`}
          style={{
            border: '2px solid #a8a29e',
          }}
          title="按下机械快门曝光照片"
        >
          {/* Concentric Milled Grooves on Button Top */}
          <div className="absolute inset-2 rounded-full border border-stone-500/40 pointer-events-none" />
          <div className="absolute inset-4 rounded-full border border-stone-500/30 pointer-events-none" />

          {/* Central Threaded Socket (for classic mechanical cable release) */}
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-stone-800 to-stone-950 border border-stone-600 flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-stone-900 border border-stone-700" />
          </div>
        </button>
      </div>

      <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-stone-400 mt-1.5">
        SHUTTER RELEASE
      </span>
    </div>
  );
};
