import React, { useEffect, useState, useRef } from 'react';
import { DevelopedPhoto } from '../../types/camera';
import { Download, Check, Sparkles, X, Share2 } from 'lucide-react';

interface PhotoDevelopingModalProps {
  photo: DevelopedPhoto | null;
  isDeveloping: boolean;
  onClose: () => void;
}

export const PhotoDevelopingModal: React.FC<PhotoDevelopingModalProps> = ({
  photo,
  isDeveloping,
  onClose,
}) => {
  const [devProgress, setDevProgress] = useState<number>(0);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Animate the chemical developing process (latent silver halide revealing)
  useEffect(() => {
    if (!photo) return;
    if (isDeveloping) {
      setDevProgress(0);
      const startTime = performance.now();
      const duration = 2400; // 2.4s chemical developing time

      const interval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(elapsed / duration, 1.0);
        setDevProgress(p);
        if (p >= 1.0) {
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    } else {
      setDevProgress(prev => (prev === 1.0 ? prev : 1.0));
    }
  }, [photo?.id, isDeveloping]);

  if (!photo) return null;

  const handleDownload = () => {
    if (!cardRef.current) return;

    // Use offscreen canvas to render final high-res printable photo card
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photo.dataUrl;
    img.onload = () => {
      const cardCanvas = document.createElement('canvas');
      const cardW = 1000;
      const photoX = 60;
      const photoY = 60;
      const photoW = cardW - 120; // 880px
      const photoH = Math.round(photoW * 3 / 4); // 660px (true 4:3 aspect ratio)
      const metaY = photoY + photoH + 40;
      const cardH = photoY + photoH + 150; // 870px
      cardCanvas.width = cardW;
      cardCanvas.height = cardH;
      const ctx = cardCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Textured Warm Polaroid Paper Base
      ctx.fillStyle = '#f8f6f0';
      ctx.fillRect(0, 0, cardW, cardH);

      // Subtle paper noise / card border shadow
      ctx.strokeStyle = '#e2dfd5';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, cardW - 2, cardH - 2);

      // 2. Photo Area (Exact 4:3 aspect ratio)
      ctx.drawImage(img, photoX, photoY, photoW, photoH);

      // Inner photo border shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // 3. Bottom Polaroid Margin: Vintage Mechanical Stamps
      // Camera Wordmark
      ctx.fillStyle = '#1c1917';
      ctx.font = '700 24px "Cinzel", Georgia, serif';
      ctx.fillText('LUMINA VINTAGE 35', photoX, metaY);

      ctx.fillStyle = '#78716c';
      ctx.font = '500 14px "Courier New", monospace';
      ctx.fillText(`FILM: ${photo.filmName.toUpperCase()} · ${photo.filmCode}`, photoX, metaY + 28);
      ctx.fillText(`EXIF: ${photo.iso} ISO · ${photo.shutterSpeed} · ${photo.aperture} · ${photo.lens}`, photoX, metaY + 50);

      // Authentic Red/Orange Ink Date Stamp (Right Aligned)
      ctx.save();
      ctx.fillStyle = '#dc2626';
      ctx.font = '700 22px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`DATE: ${photo.dateString}`, cardW - photoX, metaY + 6);
      ctx.font = '600 15px "Courier New", monospace';
      ctx.fillText(`TIME: ${photo.timeString}`, cardW - photoX, metaY + 30);
      ctx.fillStyle = '#ea580c';
      ctx.fillText(`NO. ${photo.id.substring(photo.id.length - 6).toUpperCase()}`, cardW - photoX, metaY + 52);
      ctx.restore();

      // Download file
      const finalUrl = cardCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `lumina_film_${photo.dateString}_${Date.now()}.png`;
      link.href = finalUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative flex flex-col items-center max-w-md w-full">
        {/* Developing Status Bar */}
        {devProgress < 1.0 && (
          <div className="mb-4 flex flex-col items-center bg-stone-900/90 border border-amber-500/40 px-5 py-2 rounded-2xl shadow-2xl animate-pulse">
            <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold mb-1">
              <Sparkles size={14} className="animate-spin text-amber-400" />
              <span>PHOTO DEVELOPING... [{(devProgress * 100).toFixed(0)}%]</span>
            </div>
            <div className="w-52 h-1.5 bg-black/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-75"
                style={{ width: `${devProgress * 100}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-stone-400 mt-1">
              正在模拟银盐颗粒化学显影，静待照片浮现...
            </span>
          </div>
        )}

        {/* Physical Polaroid Photo Card Container */}
        <div
          ref={cardRef}
          className="relative bg-[#f8f6f0] text-stone-900 rounded-sm p-4 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.15)] w-full transition-transform duration-500"
          style={{
            transform: devProgress < 1.0 ? 'scale(0.96) translateY(12px)' : 'scale(1) translateY(0)',
          }}
        >
          {/* Close X */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-stone-300/60 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
            title="关闭相片"
          >
            <X size={16} />
          </button>

          {/* Photo Frame Window */}
          <div className="relative aspect-[4/3] w-full bg-stone-900 overflow-hidden shadow-inner border border-stone-300/80">
            {/* The Actual Photo Image */}
            <img
              src={photo.dataUrl}
              alt="Developed analog photograph"
              className="w-full h-full object-cover transition-all duration-300"
              style={{
                // Developing milky fade effect
                filter: devProgress < 1.0
                  ? `blur(${(1 - devProgress) * 12}px) brightness(${0.5 + devProgress * 0.5}) contrast(${0.6 + devProgress * 0.4})`
                  : 'none',
                opacity: 0.3 + devProgress * 0.7,
              }}
            />

            {/* Chemical Developing Fog Layer */}
            {devProgress < 1.0 && (
              <div
                className="absolute inset-0 bg-[#e0ded6] mix-blend-color pointer-events-none transition-opacity duration-300"
                style={{ opacity: 1 - devProgress }}
              />
            )}
          </div>

          {/* Bottom Polaroid White Margin with Analog Typography Stamps */}
          <div className="pt-4 flex items-start justify-between gap-4 font-mono select-none">
            {/* Left: Camera & Film Specs */}
            <div className="flex flex-col">
              <span className="font-serif font-bold text-sm tracking-widest text-stone-900 uppercase">
                LUMINA VINTAGE 35
              </span>
              <span className="text-[10px] text-stone-600 font-bold mt-0.5">
                FILM: {photo.filmName} · {photo.filmCode}
              </span>
              <span className="text-[9px] text-stone-500 mt-0.5">
                EXIF: ISO {photo.iso} · {photo.shutterSpeed} · {photo.aperture}
              </span>
            </div>

            {/* Right: Retro Orange Ink Date & Frame Stamp */}
            <div className="flex flex-col items-end text-red-600 font-bold">
              <span className="text-xs tracking-tight">
                {photo.dateString}
              </span>
              <span className="text-[10px] text-red-500 tracking-tight">
                {photo.timeString}
              </span>
              <span className="text-[9px] text-orange-600 mt-0.5">
                EXP. #{photo.id.substring(photo.id.length - 4).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="mt-4 flex items-center gap-3 w-full">
          <button
            onClick={handleDownload}
            disabled={devProgress < 1.0}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-stone-100 font-mono font-bold text-xs rounded-xl shadow-xl shadow-amber-950/40 border border-amber-500/40 transition-all active:scale-98 cursor-pointer"
          >
            {downloadSuccess ? (
              <>
                <Check size={15} className="text-emerald-300" />
                <span>已保存高清相纸照片！</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>保存冲印相片 (EXPORT PRINT)</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="py-3 px-5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-mono text-xs font-bold rounded-xl border border-stone-800 transition-colors cursor-pointer"
          >
            下一张 (NEXT)
          </button>
        </div>
      </div>
    </div>
  );
};
