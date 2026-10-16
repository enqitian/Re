export interface FilmPreset {
  id: string;
  name: string;
  filmCode: string;
  manufacturer: string;
  description: string;
  iso: number;
  temperature: string;
  grainIntensity: number; // 0 to 1
  contrast: number;
  saturation: number;
  tintRgb: [number, number, number]; // highlight tint
  shadowTintRgb: [number, number, number]; // shadow tint
  cssFilter: string;
  vignette: number;
  badgeColor: string;
  accentColor: string;
  exifLens: string;
}

export const FILM_PRESETS: FilmPreset[] = [
  {
    id: 'kodak_warm',
    name: 'Kodak Warm Film',
    filmCode: 'PORTRA 400',
    manufacturer: 'EASTMAN KODAK',
    description: '暖金自然光感 · 柔和肤色影调与高光微泛光',
    iso: 400,
    temperature: '5500K WARM',
    grainIntensity: 0.18,
    contrast: 1.08,
    saturation: 1.15,
    tintRgb: [255, 235, 205],
    shadowTintRgb: [35, 22, 18],
    cssFilter: 'brightness(1.04) contrast(1.08) saturate(1.15) sepia(0.16) hue-rotate(-6deg)',
    vignette: 0.35,
    badgeColor: '#eab308',
    accentColor: '#f59e0b',
    exifLens: '35mm f/1.4 ASPH',
  },
  {
    id: 'fuji_chrome',
    name: 'Fuji Classic Chrome',
    filmCode: 'CHROME 100',
    manufacturer: 'FUJIFILM JAPAN',
    description: '纪实经典正片 · 抑制过饱和，深沉硬朗的阴影与青冷苍翠',
    iso: 100,
    temperature: '5200K DAYLIGHT',
    grainIntensity: 0.12,
    contrast: 1.22,
    saturation: 0.92,
    tintRgb: [220, 240, 235],
    shadowTintRgb: [18, 28, 32],
    cssFilter: 'brightness(0.98) contrast(1.22) saturate(0.92) hue-rotate(4deg)',
    vignette: 0.4,
    badgeColor: '#10b981',
    accentColor: '#059669',
    exifLens: '50mm f/2.0 CRON',
  },
  {
    id: 'polaroid_vintage',
    name: 'Polaroid Vintage',
    filmCode: 'TIME-ZERO',
    manufacturer: 'POLAROID LAND',
    description: '拍立得复古即时显影 · 青灰暗角与梦幻褪色质感',
    iso: 640,
    temperature: '4800K VINTAGE',
    grainIntensity: 0.28,
    contrast: 1.12,
    saturation: 1.10,
    tintRgb: [240, 248, 255],
    shadowTintRgb: [30, 25, 40],
    cssFilter: 'brightness(1.06) contrast(1.12) saturate(1.10) sepia(0.24) hue-rotate(-12deg)',
    vignette: 0.55,
    badgeColor: '#ec4899',
    accentColor: '#db2777',
    exifLens: '116mm f/8.8 GLASS',
  },
  {
    id: 'bw_cinema',
    name: 'Black & White Cinema',
    filmCode: 'TRI-X 400',
    manufacturer: 'EASTMAN PANCHROMATIC',
    description: '经典电影黑白银盐 · 戏剧性明暗反差与粗粝银盐质感',
    iso: 400,
    temperature: 'MONO B&W',
    grainIntensity: 0.32,
    contrast: 1.36,
    saturation: 0.0,
    tintRgb: [245, 245, 245],
    shadowTintRgb: [10, 10, 10],
    cssFilter: 'grayscale(1) contrast(1.36) brightness(1.02)',
    vignette: 0.45,
    badgeColor: '#94a3b8',
    accentColor: '#cbd5e1',
    exifLens: '28mm f/2.8 ELMAR',
  },
  {
    id: 'retro_sunset',
    name: 'Retro Sunset',
    filmCode: 'GOLD 200',
    manufacturer: 'KODAK COLORPLUS',
    description: '80年代落日熔金 · 漫射暖霞与微醺怀旧夕阳感',
    iso: 200,
    temperature: '3200K TUNGSTEN',
    grainIntensity: 0.22,
    contrast: 1.14,
    saturation: 1.28,
    tintRgb: [255, 200, 160],
    shadowTintRgb: [40, 15, 10],
    cssFilter: 'brightness(1.05) contrast(1.14) saturate(1.28) sepia(0.32) hue-rotate(-16deg)',
    vignette: 0.38,
    badgeColor: '#f97316',
    accentColor: '#ea580c',
    exifLens: '35mm f/2.0 SUMMICRON',
  },
  {
    id: 'old_camera_ccd',
    name: 'Old Camera CCD',
    filmCode: 'CCD 2003',
    manufacturer: 'CYBER OPTICS DIGICAM',
    description: '千禧年复古CCD数码 · 鲜活冷暖交融与独特数码色彩溢出',
    iso: 80,
    temperature: 'Y2K SENSOR',
    grainIntensity: 0.16,
    contrast: 1.18,
    saturation: 1.25,
    tintRgb: [230, 245, 255],
    shadowTintRgb: [15, 20, 35],
    cssFilter: 'brightness(1.10) contrast(1.18) saturate(1.25) hue-rotate(-4deg)',
    vignette: 0.25,
    badgeColor: '#06b6d4',
    accentColor: '#0891b2',
    exifLens: 'VARIO-ZOOM 7-21mm',
  },
];
