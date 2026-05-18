import * as THREE from 'three';

const PREVIEW_SIZE = 256;
const CAPE_BOX_WIDTH = 10;
const CAPE_BOX_HEIGHT = 16;
const CAPE_BOX_DEPTH = 1;

const IMG_W = 64;
const IMG_H = 32;
const u_fn = (x: number) => x / IMG_W;
const v_fn = (y: number) => 1 - y / IMG_H;

const T_RIGHT = [0, 1, 1, 16];
const T_FRONT = [1, 1, 10, 16];
const T_LEFT = [11, 1, 1, 16];
const T_BACK = [12, 1, 10, 16];
const T_TOP = [1, 0, 10, 1];
const T_BOTTOM = [11, 0, 10, 1];

function mapUV(area: number[]) {
  return [
    new THREE.Vector2(u_fn(area[0]), v_fn(area[1])),
    new THREE.Vector2(u_fn(area[0] + area[2]), v_fn(area[1])),
    new THREE.Vector2(u_fn(area[0]), v_fn(area[1] + area[3])),
    new THREE.Vector2(u_fn(area[0] + area[2]), v_fn(area[1] + area[3])),
  ];
}

function shouldUseCrossOrigin(url: string): boolean {
  return /^https?:\/\//i.test(url) && !url.includes('asset.localhost') && !url.startsWith('asset://');
}

function loadTexture(imageUrl: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    if (shouldUseCrossOrigin(imageUrl)) {
      loader.crossOrigin = 'anonymous';
    }
    loader.load(
      imageUrl,
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

function createCapeMesh(texture: THREE.Texture): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(CAPE_BOX_WIDTH, CAPE_BOX_HEIGHT, CAPE_BOX_DEPTH);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const uvOrder = [
    ...mapUV(T_RIGHT),
    ...mapUV(T_LEFT),
    ...mapUV(T_TOP),
    ...mapUV(T_BOTTOM),
    ...mapUV(T_FRONT),
    ...mapUV(T_BACK),
  ];
  for (let i = 0; i < uvOrder.length; i++) {
    uv.setXY(i, uvOrder[i].x, uvOrder[i].y);
  }
  uv.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    transparent: true,
    alphaTest: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.y = 0;
  return mesh;
}

function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  if (mesh.material instanceof THREE.Material) {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
  }
}

let renderQueue: Promise<unknown> = Promise.resolve();

function enqueueRender<T>(task: () => Promise<T>): Promise<T> {
  const result = renderQueue.then(task, task);
  renderQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function renderCapePreviewBlob(imageUrl: string): Promise<Blob> {
  return enqueueRender(async () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 22);
    camera.lookAt(0, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    let mesh: THREE.Mesh | null = null;
    try {
      const texture = await loadTexture(imageUrl);
      mesh = createCapeMesh(texture);
      scene.add(mesh);
      renderer.render(scene, camera);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('Failed to export cape preview'))),
          'image/png',
        );
      });
      return blob;
    } finally {
      if (mesh) {
        scene.remove(mesh);
        disposeMesh(mesh);
      }
      renderer.dispose();
      scene.clear();
    }
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const memoryPreviewCache = new Map<string, string>();

export async function getOrCreateStaticCapePreview(
  capeId: string,
  textureImageUrl: string,
  getExistingPreviewPath: (id: string) => Promise<string | null>,
  savePreview: (id: string, pngBase64: string) => Promise<string>,
  toDisplayUrl: (path: string) => string,
): Promise<string> {
  const cached = memoryPreviewCache.get(capeId);
  if (cached) {
    return cached;
  }

  const existingPath = await getExistingPreviewPath(capeId);
  if (existingPath) {
    const displayUrl = toDisplayUrl(existingPath);
    memoryPreviewCache.set(capeId, displayUrl);
    return displayUrl;
  }

  const blob = await renderCapePreviewBlob(textureImageUrl);
  const pngBase64 = await blobToBase64(blob);
  const savedPath = await savePreview(capeId, pngBase64);
  const displayUrl = toDisplayUrl(savedPath);
  memoryPreviewCache.set(capeId, displayUrl);
  return displayUrl;
}

export function clearStaticCapePreviewMemoryCache(): void {
  memoryPreviewCache.clear();
}
