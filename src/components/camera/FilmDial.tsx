import React from 'react';
import { FilmPreset, FILM_PRESETS } from '../../utils/filmPresets';
import { cameraAudio } from '../../utils/cameraAudio';
import { Film } from 'lucide-react';

interface FilmDialProps {
  selectedFilm: FilmPreset;
  onSelectFilm: (film: FilmPreset) => void;
}

export const FilmDial: React.FC<FilmDialProps> = ({
  selectedFilm,
  onSelectFilm,
}) => {
  const currentIndex = FILM_PRESETS.findIndex(f => f.id === selectedFilm.id);

  const handleSelect = (film: FilmPreset) => {
    if (film.id !== selectedFilm.id) {
      cameraAudio.playDialClick();
      cameraAudio.playFilmAdvance();
      onSelectFilm(film);
    }
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % FILM_PRESETS.length;
    handleSelect(FILM_PRESETS[nextIdx]);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + FILM_PRESETS.length) % FILM_PRESETS.length;
    handleSelect(FILM_PRESETS[prevIdx]);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Film size={12} className="text-amber-400" />
        <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-stone-300">
          FILM EMULSION SELECTOR
        </span>
      </div>

      {/* Mechanical Rotary Selector Assembly */}
      <div className="relative flex items-center bg-stone-950/90 border border-stone-800 rounded-2xl p-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_4px_16px_rgba(0,0,0,0.6)]">
        {/* Step Buttons */}
        <button
          onClick={handlePrev}
          className="w-7 h-10 flex items-center justify-center rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-400 hover:text-stone-200 border border-stone-800/80 transition-all cursor-pointer font-mono text-sm"
          title="上一个胶卷"
        >
          ‹
        </button>

        {/* Film Stock Roll Strip */}
        <div className="flex items-center gap-1.5 px-2 overflow-x-auto max-w-xs md:max-w-md scrollbar-none py-0.5">
          {FILM_PRESETS.map((film, idx) => {
            const isSelected = film.id === selectedFilm.id;
            return (
              <button
                key={film.id}
                onClick={() => handleSelect(film)}
                className={`relative px-2.5 py-1.5 rounded-xl border flex flex-col items-start transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-b from-stone-800 to-stone-900 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-[1.03]'
                    : 'bg-stone-950/60 border-stone-800/80 hover:bg-stone-900/60 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Film Top Bar */}
                <div className="flex items-center gap-1.5 w-full">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: film.badgeColor }}
                  />
                  <span className="text-[10px] font-mono font-bold tracking-tight text-white whitespace-nowrap">
                    {film.filmCode}
                  </span>
                  <span className="text-[8px] font-mono text-stone-400 ml-auto tabular-nums">
                    ISO {film.iso}
                  </span>
                </div>

                {/* Film Name */}
                <span className="text-[11px] font-sans font-medium text-stone-300 tracking-tight text-left mt-0.5 whitespace-nowrap">
                  {film.name}
                </span>

                {/* Active Indicator Detent */}
                {isSelected && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full shadow-[0_0_6px_rgba(245,158,11,1)]"
                    style={{ backgroundColor: film.badgeColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          className="w-7 h-10 flex items-center justify-center rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-400 hover:text-stone-200 border border-stone-800/80 transition-all cursor-pointer font-mono text-sm"
          title="下一个胶卷"
        >
          ›
        </button>
      </div>

      {/* Description Line */}
      <p className="text-[10px] font-sans text-stone-400 mt-1 tracking-tight text-center max-w-sm truncate">
        {selectedFilm.description}
      </p>
    </div>
  );
};
