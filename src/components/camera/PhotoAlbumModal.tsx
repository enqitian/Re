import React, { useState, useEffect, useMemo } from 'react';
import { DevelopedPhoto } from '../../types/camera';
import { cameraAudio } from '../../utils/cameraAudio';
import { X, Download, Trash2, Film, Camera, Clock, Filter, RotateCcw } from 'lucide-react';

interface PhotoAlbumModalProps {
  photos: DevelopedPhoto[];
  isOpen: boolean;
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
  onClearAllPhotos?: () => void;
}

type SortOrder = 'newest' | 'oldest';

export const PhotoAlbumModal: React.FC<PhotoAlbumModalProps> = ({
  photos,
  isOpen,
  onClose,
  onDeletePhoto,
  onClearAllPhotos,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<DevelopedPhoto | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedFilmFilter, setSelectedFilmFilter] = useState<string>('all');

  // Extract unique film types available in the current photo vault
  const availableFilms = useMemo(() => {
    const filmMap = new Map<string, { code: string; name: string; count: number }>();
    photos.forEach(p => {
      const code = p.filmCode || 'OTHER';
      const name = p.filmName || code;
      const existing = filmMap.get(code);
      if (existing) {
        existing.count += 1;
      } else {
        filmMap.set(code, { code, name, count: 1 });
      }
    });
    return Array.from(filmMap.values());
  }, [photos]);

  // Filter and sort photos according to active user selections
  const displayedPhotos = useMemo(() => {
    let result = photos;

    // 1. Filter by film stock
    if (selectedFilmFilter !== 'all') {
      result = result.filter(
        p => p.filmCode === selectedFilmFilter || p.filmName === selectedFilmFilter
      );
    }

    // 2. Sort by timestamp
    return [...result].sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });
  }, [photos, selectedFilmFilter, sortOrder]);

  // Synchronize selectedPhoto whenever the modal opens or displayed list updates
  useEffect(() => {
    if (!isOpen) return;

    if (displayedPhotos.length === 0) {
      setSelectedPhoto(null);
    } else {
      // If no photo is selected or current selected photo is not in displayed list, pick the first one
      setSelectedPhoto(prev => {
        if (!prev || !displayedPhotos.some(p => p.id === prev.id)) {
          return displayedPhotos[0];
        }
        return displayedPhotos.find(p => p.id === prev.id) || displayedPhotos[0];
      });
    }
  }, [isOpen, displayedPhotos]);

  const handleDeletePhoto = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    cameraAudio.playToggleSwitch();

    // Immediately calculate and switch to the next available photo in displayed list
    const remaining = displayedPhotos.filter(p => p.id !== id);
    if (remaining.length === 0) {
      setSelectedPhoto(null);
    } else if (selectedPhoto?.id === id) {
      const currentIndex = displayedPhotos.findIndex(p => p.id === id);
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      setSelectedPhoto(remaining[nextIndex]);
    }

    onDeletePhoto(id);
  };

  const handleClearAll = () => {
    cameraAudio.playToggleSwitch();
    setSelectedPhoto(null);
    if (onClearAllPhotos) {
      onClearAllPhotos();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-stone-950 border-2 border-stone-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-stone-800/80 bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <Film size={18} className="text-amber-400 shrink-0" />
            <div>
              <h2 className="font-serif font-bold text-base text-stone-100 tracking-wider">
                FILM VAULT · 胶卷冲印暗房
              </h2>
              <span className="text-[10px] font-mono text-stone-400">
                本卷已冲印 {photos.length} 张胶片照片
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {photos.length > 0 && onClearAllPhotos && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-stone-800 hover:border-rose-800/60 text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5"
                title="清空暗房中所有已冲印照片"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">清空所有</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter & Sort Dropdown Control Strip */}
        {photos.length > 0 && (
          <div className="px-5 sm:px-6 py-2.5 bg-stone-900/90 border-b border-stone-800/90 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center flex-wrap gap-2.5">
              {/* 1. Sort by Time Dropdown */}
              <div className="flex items-center gap-1.5 bg-stone-950/90 border border-stone-800 rounded-xl px-2.5 py-1 shadow-inner">
                <Clock size={12} className="text-amber-400 shrink-0" />
                <span className="text-[10px] font-mono text-stone-400 uppercase">时间:</span>
                <select
                  value={sortOrder}
                  onChange={e => {
                    cameraAudio.playDialClick();
                    setSortOrder(e.target.value as SortOrder);
                  }}
                  className="bg-transparent text-stone-200 text-[11px] font-mono focus:outline-none cursor-pointer pr-1"
                >
                  <option value="newest" className="bg-stone-900 text-stone-200">
                    最新拍摄 (Newest)
                  </option>
                  <option value="oldest" className="bg-stone-900 text-stone-200">
                    最旧拍摄 (Oldest)
                  </option>
                </select>
              </div>

              {/* 2. Filter by Film Stock Dropdown */}
              <div className="flex items-center gap-1.5 bg-stone-950/90 border border-stone-800 rounded-xl px-2.5 py-1 shadow-inner">
                <Filter size={12} className="text-amber-400 shrink-0" />
                <span className="text-[10px] font-mono text-stone-400 uppercase">胶卷:</span>
                <select
                  value={selectedFilmFilter}
                  onChange={e => {
                    cameraAudio.playDialClick();
                    setSelectedFilmFilter(e.target.value);
                  }}
                  className="bg-transparent text-stone-200 text-[11px] font-mono focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-stone-900 text-stone-200">
                    全部胶卷 ({photos.length})
                  </option>
                  {availableFilms.map(film => (
                    <option key={film.code} value={film.code} className="bg-stone-900 text-stone-200">
                      {film.code} ({film.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filter Button if active */}
              {(selectedFilmFilter !== 'all' || sortOrder !== 'newest') && (
                <button
                  onClick={() => {
                    cameraAudio.playToggleSwitch();
                    setSelectedFilmFilter('all');
                    setSortOrder('newest');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono text-amber-400/90 hover:text-amber-300 bg-amber-950/30 border border-amber-800/50 hover:bg-amber-950/60 transition-all cursor-pointer"
                  title="重置排序与筛选条件"
                >
                  <RotateCcw size={10} />
                  <span>重置</span>
                </button>
              )}
            </div>

            {/* Showing status counter */}
            <div className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
              <span>显示</span>
              <span className="text-amber-300 font-bold">{displayedPhotos.length}</span>
              <span>/ 共 {photos.length} 张底片</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        {photos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-stone-500">
            <Camera size={36} className="text-stone-700 mb-3" />
            <p className="font-mono text-sm text-stone-400">当前胶卷暗房暂无冲印相片</p>
            <p className="text-xs text-stone-600 mt-1">按下机械快门曝光并显影第一张照片</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
            {/* Left Film Roll Strip List */}
            <div className="md:col-span-5 border-r border-stone-800/80 overflow-y-auto p-4 space-y-3 max-h-[64vh] scrollbar-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-stone-500 font-bold block">
                  35MM CONTACT SHEET
                </span>
                <span className="text-[9px] font-mono text-stone-500">
                  {sortOrder === 'newest' ? '按时间降序' : '按时间升序'}
                </span>
              </div>

              {displayedPhotos.length === 0 ? (
                <div className="py-12 px-4 text-center text-stone-500">
                  <Filter size={24} className="mx-auto text-stone-600 mb-2" />
                  <p className="font-mono text-xs text-stone-400">未找到属于该胶卷类型的相片</p>
                  <button
                    onClick={() => {
                      cameraAudio.playToggleSwitch();
                      setSelectedFilmFilter('all');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-800 text-xs font-mono transition-colors cursor-pointer"
                  >
                    显示全部胶卷底片
                  </button>
                </div>
              ) : (
                displayedPhotos.map((p, idx) => {
                  const isSelected = selectedPhoto?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPhoto(p)}
                      className={`relative p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-stone-900 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-stone-950/60 border-stone-800 hover:bg-stone-900/60'
                      }`}
                    >
                      {/* Sprocket hole visual */}
                      <div className="w-1.5 h-10 rounded-[1px] bg-stone-800 shrink-0" />

                      {/* Thumbnail */}
                      <img
                        src={p.dataUrl}
                        alt="Thumbnail"
                        className="w-14 h-14 object-cover rounded-lg border border-stone-700/80 shrink-0"
                      />

                      {/* Metadata */}
                      <div className="flex-1 min-w-0 font-mono text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-200 truncate">
                            FRAME #{idx + 1} · {p.filmCode}
                          </span>
                          <span className="text-[9px] text-amber-400">
                            ISO {p.iso}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 block truncate mt-0.5">
                          {p.dateString} · {p.timeString}
                        </span>
                        <span className="text-[9px] text-stone-500 block truncate">
                          {p.shutterSpeed} · {p.aperture}
                        </span>
                      </div>

                      {/* Quick Delete Button directly on the contact sheet card */}
                      <button
                        type="button"
                        onClick={e => handleDeletePhoto(p.id, e)}
                        className="p-2 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-800/80 border border-transparent hover:border-rose-500/30 transition-all shrink-0 cursor-pointer"
                        title="销毁此张底片"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Large Inspection Preview */}
            <div className="md:col-span-7 p-6 flex flex-col items-center justify-center bg-stone-950 overflow-y-auto">
              {selectedPhoto ? (
                <div className="flex flex-col items-center max-w-sm w-full">
                  {/* Polaroid Frame */}
                  <div className="bg-[#f8f6f0] text-stone-900 rounded-sm p-4 shadow-2xl w-full border border-stone-400/40">
                    <img
                      src={selectedPhoto.dataUrl}
                      alt="Selected frame"
                      className="w-full aspect-[4/3] object-cover border border-stone-300"
                    />
                    <div className="pt-3 flex items-start justify-between font-mono text-[10px]">
                      <div>
                        <span className="font-serif font-bold text-xs text-stone-900 uppercase block">
                          LUMINA VINTAGE 35
                        </span>
                        <span className="text-stone-600 block mt-0.5">
                          {selectedPhoto.filmName} ({selectedPhoto.filmCode})
                        </span>
                        <span className="text-stone-500 text-[9px] block">
                          {selectedPhoto.iso} ISO · {selectedPhoto.shutterSpeed} · {selectedPhoto.aperture}
                        </span>
                      </div>
                      <div className="text-right text-red-600 font-bold">
                        <span>{selectedPhoto.dateString}</span>
                        <span className="block text-[9px] text-red-500">
                          {selectedPhoto.timeString}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-3 w-full">
                    <a
                      href={selectedPhoto.dataUrl}
                      download={`lumina_photo_${selectedPhoto.id}.png`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-stone-100 font-mono font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      <span>下载相片</span>
                    </a>

                    <button
                      onClick={() => handleDeletePhoto(selectedPhoto.id)}
                      className="p-2.5 rounded-xl bg-stone-900 hover:bg-rose-950/60 text-stone-400 hover:text-rose-400 border border-stone-800 hover:border-rose-900/50 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="销毁底片"
                    >
                      <Trash2 size={15} />
                      <span className="text-[11px] font-mono">销毁底片</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-stone-600 font-mono text-xs">
                  请选择左侧一张底片进行大图检视
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
