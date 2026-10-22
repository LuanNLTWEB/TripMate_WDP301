import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

const MAP_BOUNDS = {
  minLon: 102.143676127,
  maxLon: 109.463025271,
  minLat: 8.403122515,
  maxLat: 23.393574093
};

const MAP_HEIGHT = 8.15;
const LATITUDE_CORRECTION = Math.cos(16 * THREE.MathUtils.DEG2RAD);
const MAP_WIDTH = (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)
  * (MAP_HEIGHT / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat))
  * LATITUDE_CORRECTION;

const MAP_LOCATIONS = [
  { name: 'Hà Nội', coordinates: [105.8342, 21.0278] },
  { name: 'Hạ Long', coordinates: [107.0448, 20.9517] },
  { name: 'Huế', coordinates: [107.5909, 16.4637] },
  { name: 'Đà Nẵng', coordinates: [108.2022, 16.0544] },
  { name: 'Hội An', coordinates: [108.338, 15.8801] },
  { name: 'Nha Trang', coordinates: [109.1967, 12.2388] },
  { name: 'Đà Lạt', coordinates: [108.4583, 11.9404] },
  { name: 'TP. Hồ Chí Minh', coordinates: [106.6297, 10.8231] },
  { name: 'Phú Quốc', coordinates: [103.984, 10.2899] }
];

function projectCoordinate([longitude, latitude]) {
  const centerLon = (MAP_BOUNDS.minLon + MAP_BOUNDS.maxLon) / 2;
  const centerLat = (MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2;
  const scale = MAP_HEIGHT / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return [
    (longitude - centerLon) * scale * LATITUDE_CORRECTION,
    (latitude - centerLat) * scale
  ];
}

function createMapGeometry(geoJson) {
  const geometry = geoJson.features[0].geometry;
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  const outlinePositions = [];
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const context = canvas.getContext('2d');

  const traceRing = (ring) => {
    ring.forEach((coordinate, index) => {
      const [x, y] = projectCoordinate(coordinate);
      const canvasX = ((x / MAP_WIDTH) + 0.5) * canvas.width;
      const canvasY = (0.5 - (y / MAP_HEIGHT)) * canvas.height;
      if (index === 0) context.moveTo(canvasX, canvasY);
      else context.lineTo(canvasX, canvasY);
    });
    context.closePath();
  };

  polygons.forEach((polygon) => {
    const [outerRing, ...holes] = polygon;
    if (!outerRing || outerRing.length < 4) return;

    context.beginPath();
    traceRing(outerRing);
    holes.forEach(traceRing);
    context.fillStyle = '#0b6763';
    context.fill('evenodd');
    context.save();
    context.shadowColor = 'rgba(77, 255, 229, 0.85)';
    context.shadowBlur = 12;
    context.strokeStyle = 'rgba(91, 246, 226, 0.72)';
    context.lineWidth = 3;
    context.stroke();
    context.restore();

    outerRing.forEach((coordinate, index) => {
      const [x, y] = projectCoordinate(coordinate);
      if (index > 0) {
        const [previousX, previousY] = projectCoordinate(outerRing[index - 1]);
        outlinePositions.push(previousX, 0.018, -previousY, x, 0.018, -y);
      }
    });
  });

  const surface = new THREE.PlaneGeometry(MAP_WIDTH, MAP_HEIGHT);
  surface.rotateX(-Math.PI / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const outline = new THREE.BufferGeometry();
  outline.setAttribute('position', new THREE.Float32BufferAttribute(outlinePositions, 3));
  return { surface, outline, texture };
}

function MapPins({ progressRef }) {
  const ringRefs = useRef([]);
  const focusRingRef = useRef(null);
  const focusHaloRef = useRef(null);
  const pins = useMemo(() => MAP_LOCATIONS.map((location) => {
    const [x, y] = projectCoordinate(location.coordinates);
    return { ...location, position: [x, 0.14, -y] };
  }), []);

  useFrame((state) => {
    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const pulse = (state.clock.elapsedTime * 0.55 + index * 0.16) % 1;
      const scale = 0.65 + pulse * 1.25;
      ring.scale.setScalar(scale);
      ring.material.opacity = (1 - pulse) * 0.48;
    });

    const progress = progressRef.current || 0;
    const focus = THREE.MathUtils.smoothstep(progress, 0.29, 0.405);
    const exit = THREE.MathUtils.smoothstep(progress, 0.408, 0.438);
    if (focusRingRef.current) {
      focusRingRef.current.scale.setScalar(1 + focus * 1.35);
      focusRingRef.current.material.opacity = focus * (1 - exit) * 0.9;
    }
    if (focusHaloRef.current) {
      const pulse = 0.88 + Math.sin(state.clock.elapsedTime * 3.4) * 0.12;
      focusHaloRef.current.scale.setScalar((1 + focus * 2.1) * pulse);
      focusHaloRef.current.material.opacity = focus * (1 - exit) * 0.34;
    }
  });

  return (
    <>
      {pins.map((pin, index) => (
        <group key={pin.name} position={pin.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[index === 1 ? 0.095 : 0.075, 24]} />
            <meshBasicMaterial color={index === 1 ? '#fff1a3' : '#ffd15c'} toneMapped={false} />
          </mesh>
          <mesh
            ref={(node) => { ringRefs.current[index] = node; }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.006, 0]}
          >
            <ringGeometry args={[0.1, 0.135, 30]} />
            <meshBasicMaterial color="#ffd15c" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.56, 8]} />
            <meshBasicMaterial color="#f1bd4d" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.64, 0]}>
            <sphereGeometry args={[0.045, 12, 8]} />
            <meshBasicMaterial color="#ffe58e" toneMapped={false} />
          </mesh>
        </group>
      ))}

      <group position={pins[1].position}>
        <mesh ref={focusRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.16, 0.185, 48]} />
          <meshBasicMaterial color="#ffe180" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={focusHaloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.235, 0.27, 48]} />
          <meshBasicMaterial color="#63f5e3" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.85, 0]} color="#ffe19a" intensity={5} distance={3.2} />
      </group>
    </>
  );
}

function VietnamStoryMap({ groupRef, progressRef }) {
  const rawGeoJson = useLoader(THREE.FileLoader, '/data/vietnam-boundary.geojson');
  const geoJson = useMemo(() => JSON.parse(rawGeoJson), [rawGeoJson]);
  const { surface, outline, texture } = useMemo(() => createMapGeometry(geoJson), [geoJson]);
  const routePoints = useMemo(
    () => MAP_LOCATIONS.map((location) => {
      const [x, y] = projectCoordinate(location.coordinates);
      return new THREE.Vector3(x, 0.13, -y);
    }),
    []
  );

  return (
    <group ref={groupRef} position={[2.1, -0.58, -4]} visible={false}>
      <mesh geometry={surface}>
        <meshBasicMaterial map={texture} transparent alphaTest={0.025} toneMapped={false} />
      </mesh>
      <lineSegments geometry={outline}>
        <lineBasicMaterial color="#65f4e3" transparent opacity={0.88} toneMapped={false} />
      </lineSegments>
      <Line points={routePoints} color="#efbd50" lineWidth={0.75} transparent opacity={0.48} />
      <MapPins progressRef={progressRef} />
      <pointLight position={[0, 2.4, 0]} color="#5ff7e2" intensity={7} distance={9} />
    </group>
  );
}

export default VietnamStoryMap;
