import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cameraAudio } from '../../utils/cameraAudio';

interface MechanicalKnobProps {
  label: string;
  subLabel: string;
  value: number; // 0 to 10
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  accentColor?: string;
  unit?: string;
}

export const MechanicalKnob: React.FC<MechanicalKnobProps> = ({
  label,
  subLabel,
  value,
  min = 0,
  max = 10,
  onChange,
  accentColor = '#f59e0b',
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(value);

  // Map 0 -> 10 to angle -135deg -> +135deg
  const totalRange = max - min;
  const normalized = (value - min) / totalRange;
  const rotationDeg = -135 + normalized * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = startYRef.current - e.clientY; // drag up = increase
    const stepDelta = Math.round(dy / 14); // 14px per notch
    const nextVal = Math.min(max, Math.max(min, startValRef.current + stepDelta));

    if (nextVal !== value) {
      cameraAudio.playDialClick();
      onChange(nextVal);
    }
  }, [isDragging, max, min, onChange, value]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    }
  }, [isDragging]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    const nextVal = Math.min(max, Math.max(min, value + delta));
    if (nextVal !== value) {
      cameraAudio.playDialClick();
      onChange(nextVal);
    }
  };

  const handleStepClick = (targetVal: number) => {
    if (targetVal !== value) {
      cameraAudio.playDialClick();
      onChange(targetVal);
    }
  };

  return (
    <div
      className="flex flex-col items-center select-none group touch-none"
      onWheel={handleWheel}
    >
      {/* Top Value Readout / Engraved Label */}
      <div className="flex flex-col items-center mb-1 text-center">
        <span className="text-[11px] font-mono tracking-wider font-semibold text-stone-300 uppercase">
          {label}
        </span>
        <span className="text-[9px] font-sans text-stone-500 tracking-tight">
          {subLabel}
        </span>
      </div>

      {/* Mechanical Knob Assembly */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer Bezel with Machined Brass Screws & Notches */}
        <div className="absolute inset-0 rounded-full border-2 border-stone-800 bg-gradient-to-b from-stone-900 via-stone-950 to-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.8)] flex items-center justify-center">
          {/* Circular Tick Marks 0 through 10 */}
          {Array.from({ length: 11 }).map((_, idx) => {
            const tickDeg = -135 + (idx / 10) * 270;
            const isCurrent = idx === value;
            return (
              <div
                key={idx}
                onClick={() => handleStepClick(idx)}
                className="absolute inset-0 flex justify-center cursor-pointer pointer-events-auto"
                style={{ transform: `rotate(${tickDeg}deg)` }}
                title={`Level ${idx}`}
              >
                <div
                  className={`w-[1.5px] rounded-full transition-all duration-150 ${
                    isCurrent
                      ? 'h-2 bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                      : idx % 5 === 0
                      ? 'h-1.5 bg-stone-400'
                      : 'h-1 bg-stone-600'
                  }`}
                  style={{ marginTop: '2px' }}
                />
              </div>
            );
          })}
        </div>

        {/* Rotating Knurled Metal Center Dial */}
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-14 h-14 rounded-full cursor-grab active:cursor-grabbing transition-transform duration-100 ease-out shadow-[0_4px_8px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.25)] ${
            isDragging ? 'scale-[0.98]' : 'hover:scale-[1.01]'
          }`}
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            background: `radial-gradient(circle at 40% 35%, #44403c 0%, #292524 45%, #1c1917 80%, #0c0a09 100%)`,
          }}
        >
          {/* Milled Grip Texture / Knurl Lines */}
          <div
            className="absolute inset-0 rounded-full opacity-35"
            style={{
              backgroundImage: `repeating-conic-gradient(from 0deg, #78716c 0deg 4deg, #1c1917 4deg 8deg)`,
            }}
          />

          {/* Machined Inner Metal Cap with Concentric Grooves */}
          <div className="absolute inset-1.5 rounded-full border border-stone-700/60 bg-gradient-to-tr from-stone-900 via-stone-800 to-stone-700 flex items-center justify-center shadow-inner">
            {/* Brass Indicator Line */}
            <div
              className="absolute top-1 w-1 h-3 rounded-full shadow-[0_0_4px_rgba(245,158,11,0.8)]"
              style={{ backgroundColor: accentColor }}
            />
            {/* Center Screw / Pivot Rivet */}
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-stone-400 to-stone-700 border border-stone-600 shadow-sm flex items-center justify-center">
              <div className="w-1.5 h-[1px] bg-stone-900 rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* Digital / Mechanical Level Gauge */}
      <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-stone-800">
        <span className="text-[9px] font-mono text-stone-500 uppercase tracking-tighter">
          LVL
        </span>
        <span
          className="text-xs font-mono font-bold tabular-nums"
          style={{ color: value > 0 ? accentColor : '#78716c' }}
        >
          {value.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};
