import React from 'react';
import { EmojiOption, EMOJI_OPTIONS } from '../../utils/faceGems';
import { cameraAudio } from '../../utils/cameraAudio';
import { Sparkles } from 'lucide-react';

interface EmojiDialProps {
  selectedEmoji: EmojiOption;
  onSelectEmoji: (emoji: EmojiOption) => void;
  gemCount: number;
  onClearGems: () => void;
}

export const EmojiDial: React.FC<EmojiDialProps> = ({
  selectedEmoji,
  onSelectEmoji,
  gemCount,
  onClearGems,
}) => {
  const handleSelect = (emoji: EmojiOption) => {
    if (emoji.id !== selectedEmoji.id) {
      cameraAudio.playDialClick();
      onSelectEmoji(emoji);
    }
  };

  return (
    <div className="flex flex-col select-none bg-stone-900/90 border border-stone-800 rounded-xl p-2.5 shadow-md">
      {/* Top Label & Gem Counter */}
      <div className="flex items-center justify-between w-full mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-400" />
          <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-stone-300">
            EMOJI GEM ROTARY
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px]">
          <span className="text-stone-500">GEMS:</span>
          <span className="text-amber-300 font-bold tabular-nums">
            {gemCount.toString().padStart(2, '0')}
          </span>
          {gemCount > 0 && (
            <button
              onClick={() => {
                cameraAudio.playToggleSwitch();
                onClearGems();
              }}
              className="text-rose-400 hover:text-rose-300 underline cursor-pointer ml-1 font-bold"
              title="清空所有彩钻"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Rotary Selector Assembly */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-stone-950/90 border border-stone-800 rounded-lg shadow-inner">
        {EMOJI_OPTIONS.map(opt => {
          const isSelected = opt.id === selectedEmoji.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className={`h-7 rounded-md flex items-center justify-center text-sm transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-stone-800 to-stone-900 border border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)] scale-105'
                  : 'hover:bg-stone-900/60 opacity-60 hover:opacity-100 border border-transparent'
              }`}
              title={`${opt.name} · 食指拇指捏合在面部生成`}
            >
              {opt.emoji}
            </button>
          );
        })}
      </div>

      <span className="text-[9px] font-sans text-stone-400/90 tracking-tight mt-2 text-center">
        💡 手势：食指+拇指捏合贴钻 · 张开手掌1秒清空
      </span>
    </div>
  );
};
