import * as THREE from 'three';

/**
 * Creates a faceted brilliant-cut 3D diamond geometry.
 * Features a flat top table, crown facets, girdle, and pointed pavilion.
 */
export function createDiamondGeometry(radius: number = 0.5): THREE.BufferGeometry {
  const segments = 16; // 16 facets around girdle
  const tableRadius = radius * 0.55;
  const tableY = radius * 0.45;
  const girdleRadius = radius;
  const girdleY = radius * 0.1;
  const girdleBottomY = -radius * 0.05;
  const culetY = -radius * 0.95;

  const vertices: number[] = [];
  const indices: number[] = [];

  // 1. Table center vertex (index 0)
  vertices.push(0, tableY, 0);

  // 2. Table perimeter vertices (indices 1 .. segments)
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(
      Math.cos(angle) * tableRadius,
      tableY,
      Math.sin(angle) * tableRadius
    );
  }

  // 3. Girdle upper ring vertices (indices segments + 1 .. 2 * segments)
  const girdleTopStart = segments + 1;
  for (let i = 0; i < segments; i++) {
    const angle = ((i + 0.5) / segments) * Math.PI * 2;
    vertices.push(
      Math.cos(angle) * girdleRadius,
      girdleY,
      Math.sin(angle) * girdleRadius
    );
  }

  // 4. Girdle lower ring vertices (indices 2 * segments + 1 .. 3 * segments)
  const girdleBottomStart = 2 * segments + 1;
  for (let i = 0; i < segments; i++) {
    const angle = ((i + 0.5) / segments) * Math.PI * 2;
    vertices.push(
      Math.cos(angle) * girdleRadius * 0.98,
      girdleBottomY,
      Math.sin(angle) * girdleRadius * 0.98
    );
  }

  // 5. Culet bottom point (index 3 * segments + 1)
  const culetIndex = 3 * segments + 1;
  vertices.push(0, culetY, 0);

  // Indices:
  // Table fan
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, i + 1, next + 1);
  }

  // Crown triangles (Table to Girdle Top)
  for (let i = 0; i < segments; i++) {
    const tCurrent = i + 1;
    const tNext = ((i + 1) % segments) + 1;
    const gCurrent = girdleTopStart + i;
    const gNext = girdleTopStart + ((i + 1) % segments);

    indices.push(tCurrent, gCurrent, tNext);
    indices.push(tNext, gCurrent, gNext);
  }

  // Girdle rim quads (two triangles each)
  for (let i = 0; i < segments; i++) {
    const gt1 = girdleTopStart + i;
    const gt2 = girdleTopStart + ((i + 1) % segments);
    const gb1 = girdleBottomStart + i;
    const gb2 = girdleBottomStart + ((i + 1) % segments);

    indices.push(gt1, gb1, gt2);
    indices.push(gt2, gb1, gb2);
  }

  // Pavilion triangles (Girdle Bottom to Culet)
  for (let i = 0; i < segments; i++) {
    const gb1 = girdleBottomStart + i;
    const gb2 = girdleBottomStart + ((i + 1) % segments);
    indices.push(gb1, culetIndex, gb2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  
  // Non-indexed / flat faceted normals so each facet catches light sharp and crisply like a real gem
  const flatGeometry = geometry.toNonIndexed();
  flatGeometry.computeVertexNormals();

  return flatGeometry;
}

/**
 * Predefined diamond gemstone color profiles with refraction and glow colors
 */
export interface DiamondColorTheme {
  id: string;
  name: string;
  nameZh: string;
  color: string;
  glowColor: string;
  specularColor: string;
  attenuationColor: string;
  roughness: number;
  transmission: number;
  dispersion: number;
  isRainbow?: boolean;
}

export const DIAMOND_COLOR_THEMES: DiamondColorTheme[] = [
  {
    id: 'blue',
    name: 'Ocean Sapphire',
    nameZh: '海洋深蓝钻',
    color: '#00d2ff',
    glowColor: '#0088ff',
    specularColor: '#cceeff',
    attenuationColor: '#0044aa',
    roughness: 0.03,
    transmission: 0.94,
    dispersion: 0.08,
  },
  {
    id: 'pink',
    name: 'Rose Quartz',
    nameZh: '幻境粉红钻',
    color: '#ff69b4',
    glowColor: '#ff1493',
    specularColor: '#ffe4f0',
    attenuationColor: '#cc0066',
    roughness: 0.04,
    transmission: 0.93,
    dispersion: 0.07,
  },
  {
    id: 'purple',
    name: 'Royal Amethyst',
    nameZh: '极光魅紫钻',
    color: '#b366ff',
    glowColor: '#8a2be2',
    specularColor: '#eeddff',
    attenuationColor: '#4b0082',
    roughness: 0.04,
    transmission: 0.94,
    dispersion: 0.09,
  },
  {
    id: 'green',
    name: 'Emerald Crystal',
    nameZh: '翡翠生机绿钻',
    color: '#10e892',
    glowColor: '#059669',
    specularColor: '#d1fae5',
    attenuationColor: '#064e3b',
    roughness: 0.03,
    transmission: 0.93,
    dispersion: 0.07,
  },
  {
    id: 'rainbow',
    name: 'Prism Rainbow',
    nameZh: '梦幻彩虹三棱钻',
    color: '#ffffff',
    glowColor: '#ff80bf',
    specularColor: '#ffffff',
    attenuationColor: '#88e0ff',
    roughness: 0.02,
    transmission: 0.96,
    dispersion: 0.15,
    isRainbow: true,
  },
  {
    id: 'champagne',
    name: 'Champagne Gold',
    nameZh: '璀璨香槟金钻',
    color: '#facc15',
    glowColor: '#f59e0b',
    specularColor: '#fffbeb',
    attenuationColor: '#78350f',
    roughness: 0.04,
    transmission: 0.92,
    dispersion: 0.06,
  },
];

export function getRandomDiamondTheme(): DiamondColorTheme {
  const index = Math.floor(Math.random() * DIAMOND_COLOR_THEMES.length);
  return DIAMOND_COLOR_THEMES[index];
}
