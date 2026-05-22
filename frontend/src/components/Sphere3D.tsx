import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  particles?: number;
  links?: number;
  particleColor?: string;
  accentColor?: string;
  linkColor?: string;
  pulse?: boolean;
  satellites?: SatelliteConfig[];
  rotationSpeed?: number;
};

export type SatelliteConfig = {
  tiltX: number; // degrees
  tiltZ: number; // degrees
  orbitSpeed: number; // radians per frame
  altitude?: number; // multiplier on sphere radius (>=1)
};

const DEFAULT_SATELLITES: SatelliteConfig[] = [
  { tiltX: 0,   tiltZ: 0,   orbitSpeed: 0.0050 },
  { tiltX: 64,  tiltZ: 18,  orbitSpeed: 0.0040 },
  { tiltX: -38, tiltZ: -28, orbitSpeed: -0.0044 },
];

/**
 * Transparent particle sphere with k-nearest-neighbour links.
 * Sized to fill its parent — make the parent the size you want.
 */
export function Sphere3D({
  particles = 240,
  links = 2,
  particleColor = "#1a1a1a",
  accentColor = "#1E55E8",
  linkColor = "#1a1a1a",
  pulse = true,
  satellites = DEFAULT_SATELLITES,
  rotationSpeed = 0.0011,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 200;
    const h = mount.clientHeight || 200;
    const RADIUS = 2.4;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const dotTex = makeDotTexture();

    // Fibonacci-distributed points on the sphere surface.
    const basePositions: number[] = [];
    const vecs: THREE.Vector3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < particles; i++) {
      const y = 1 - (i / (particles - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = i * golden;
      const v = new THREE.Vector3(
        Math.cos(theta) * r,
        y,
        Math.sin(theta) * r
      ).multiplyScalar(RADIUS);
      vecs.push(v);
      basePositions.push(v.x, v.y, v.z);
    }

    const baseGeo = new THREE.BufferGeometry();
    baseGeo.setAttribute("position", new THREE.Float32BufferAttribute(basePositions, 3));
    const baseMat = new THREE.PointsMaterial({
      size: 0.12,
      sizeAttenuation: true,
      color: new THREE.Color(particleColor),
      transparent: true,
      opacity: 0.92,
      map: dotTex,
      alphaTest: 0.4,
      depthWrite: false,
    });
    const basePts = new THREE.Points(baseGeo, baseMat);

    // Links: each particle connects to a randomized K of its nearest neighbours
    // on the sphere surface (no chords through the interior).
    const shortLinks: number[] = [];
    const shortIdx: number[] = []; // particle index per link vertex
    const seen = new Set<string>();
    const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const addPair = (i: number, j: number) => {
      const key = pairKey(i, j);
      if (seen.has(key)) return;
      seen.add(key);
      shortLinks.push(vecs[i].x, vecs[i].y, vecs[i].z);
      shortLinks.push(vecs[j].x, vecs[j].y, vecs[j].z);
      shortIdx.push(i, j);
    };

    for (let i = 0; i < vecs.length; i++) {
      const k = Math.max(0, links + (Math.floor(Math.random() * 3) - 1));
      const ds: { j: number; d: number }[] = [];
      for (let j = 0; j < vecs.length; j++) {
        if (i === j) continue;
        ds.push({ j, d: vecs[i].distanceToSquared(vecs[j]) });
      }
      ds.sort((a, b) => a.d - b.d);

      const pool = ds.slice(0, k + 2);
      shuffle(pool);
      for (let n = 0; n < Math.min(k, pool.length); n++) {
        addPair(i, pool[n].j);
      }
    }

    const linkColorObj = new THREE.Color(linkColor);
    const SHORT_BASE_A = 0.2;

    const shortColorBuf = new Float32Array(shortIdx.length * 4);
    for (let i = 0; i < shortIdx.length; i++) {
      shortColorBuf[i * 4 + 0] = linkColorObj.r;
      shortColorBuf[i * 4 + 1] = linkColorObj.g;
      shortColorBuf[i * 4 + 2] = linkColorObj.b;
      shortColorBuf[i * 4 + 3] = SHORT_BASE_A;
    }
    const shortGeo = new THREE.BufferGeometry();
    shortGeo.setAttribute("position", new THREE.Float32BufferAttribute(shortLinks, 3));
    shortGeo.setAttribute("color", new THREE.BufferAttribute(shortColorBuf, 4));
    const shortMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    const shortLines = new THREE.LineSegments(shortGeo, shortMat);

    // Per-vertex color buffer on the surface particles — drives the orange
    // "lightning strike" effect. Each frame, each satellite's nearest K static
    // particles get heat = 1; heat decays exponentially toward zero, and the
    // vertex color lerps between the dark base color and the accent orange.
    const baseColorObj = new THREE.Color(particleColor);
    const accentColorObj = new THREE.Color(accentColor);
    const colorBuf = new Float32Array(particles * 3);
    for (let i = 0; i < particles; i++) {
      colorBuf[i * 3 + 0] = baseColorObj.r;
      colorBuf[i * 3 + 1] = baseColorObj.g;
      colorBuf[i * 3 + 2] = baseColorObj.b;
    }
    baseGeo.setAttribute("color", new THREE.BufferAttribute(colorBuf, 3));
    baseMat.vertexColors = true;
    baseMat.color.set(0xffffff);
    const heat = new Float32Array(particles);

    const globe = new THREE.Group();
    globe.add(shortLines);
    globe.add(basePts);

    // Satellites — attached to the globe group so they rotate with the sphere.
    // Each lives on a tilted orbital plane and revolves at its own rate.
    const satMat = new THREE.PointsMaterial({
      size: 0.22,
      sizeAttenuation: true,
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 1,
      map: dotTex,
      alphaTest: 0.4,
      depthWrite: false,
    });
    type Sat = { tilt: THREE.Group; orbit: THREE.Group; r: number };
    const sats: Sat[] = [];
    const satGeos: THREE.BufferGeometry[] = [];
    const deg = (d: number) => (d * Math.PI) / 180;
    for (const cfg of satellites) {
      const tilt = new THREE.Group();
      tilt.rotation.x = deg(cfg.tiltX);
      tilt.rotation.z = deg(cfg.tiltZ);
      tilt.updateMatrix();
      const orbit = new THREE.Group();
      orbit.rotation.y = Math.random() * Math.PI * 2;
      tilt.add(orbit);
      const r = RADIUS * (cfg.altitude ?? 1.22);
      const satGeo = new THREE.BufferGeometry();
      satGeo.setAttribute("position", new THREE.Float32BufferAttribute([r, 0, 0], 3));
      satGeos.push(satGeo);
      orbit.add(new THREE.Points(satGeo, satMat));
      globe.add(tilt);
      sats.push({ tilt, orbit, r });
    }

    scene.add(globe);

    const STRIKE_K = 2;          // how many neighbours light per satellite, per frame
    const HEAT_HALF_LIFE = 1.5;  // seconds — controls trail length
    const colorAttr = baseGeo.attributes.color as THREE.BufferAttribute;
    const shortColorAttr = shortGeo.attributes.color as THREE.BufferAttribute;

    let raf = 0;
    let prev = performance.now();
    const t0 = prev;
    const tmpV = new THREE.Vector3();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      globe.rotation.y += rotationSpeed;

      // Advance each satellite and "strike" its nearest sphere particles.
      for (let i = 0; i < sats.length; i++) {
        const s = sats[i];
        s.orbit.rotation.y += satellites[i].orbitSpeed;
        s.orbit.updateMatrix();
        tmpV
          .set(s.r, 0, 0)
          .applyMatrix4(s.orbit.matrix)
          .applyMatrix4(s.tilt.matrix);
        // vecs[] are in globe-local space, tmpV is too, so distances are valid.
        // Partial selection of K nearest: small N (~140) so full sort is fine.
        const dists: { idx: number; d: number }[] = [];
        for (let j = 0; j < vecs.length; j++) {
          dists.push({ idx: j, d: vecs[j].distanceToSquared(tmpV) });
        }
        dists.sort((a, b) => a.d - b.d);
        for (let k = 0; k < STRIKE_K; k++) {
          const idx = dists[k].idx;
          if (heat[idx] < 1) heat[idx] = 1;
        }
      }

      // Decay heat and repaint surface particle vertex colors as a base↔accent lerp.
      const decay = Math.pow(0.5, dt / HEAT_HALF_LIFE);
      for (let i = 0; i < particles; i++) {
        heat[i] *= decay;
        const h = heat[i] < 0.001 ? 0 : heat[i];
        colorBuf[i * 3 + 0] = baseColorObj.r + (accentColorObj.r - baseColorObj.r) * h;
        colorBuf[i * 3 + 1] = baseColorObj.g + (accentColorObj.g - baseColorObj.g) * h;
        colorBuf[i * 3 + 2] = baseColorObj.b + (accentColorObj.b - baseColorObj.b) * h;
      }
      colorAttr.needsUpdate = true;

      // Repaint link vertex colors — each link endpoint inherits its particle's heat,
      // so a struck node propagates orange along every line that touches it.
      for (let i = 0; i < shortIdx.length; i++) {
        const h = heat[shortIdx[i]];
        shortColorBuf[i * 4 + 0] = linkColorObj.r + (accentColorObj.r - linkColorObj.r) * h;
        shortColorBuf[i * 4 + 1] = linkColorObj.g + (accentColorObj.g - linkColorObj.g) * h;
        shortColorBuf[i * 4 + 2] = linkColorObj.b + (accentColorObj.b - linkColorObj.b) * h;
        shortColorBuf[i * 4 + 3] = SHORT_BASE_A + h * (1 - SHORT_BASE_A);
      }
      shortColorAttr.needsUpdate = true;

      if (pulse) {
        const t = (now - t0) / 1000;
        const s = 0.5 + 0.5 * Math.sin(t * 2.4);
        satMat.opacity = 0.7 + s * 0.3;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      const W = mount.clientWidth;
      const H = mount.clientHeight;
      if (W === 0 || H === 0) return;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      baseGeo.dispose();
      baseMat.dispose();
      shortGeo.dispose();
      shortMat.dispose();
      satMat.dispose();
      for (const g of satGeos) g.dispose();
      dotTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [particles, links, particleColor, accentColor, linkColor, pulse, satellites, rotationSpeed]);

  return <div ref={mountRef} className="w-full h-full" />;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function makeDotTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
