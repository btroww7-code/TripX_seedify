import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CosmosBackgroundProps {
  starCount?: number;
  animationSpeed?: number;
  interactionEnabled?: boolean;
}

interface StarData {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  color: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ShootingStarData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
}

export const CosmosBackground: React.FC<CosmosBackgroundProps> = ({
  starCount = 15000,
  animationSpeed = 1,
  interactionEnabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starFieldRef = useRef<THREE.Points | null>(null);
  const shootingStarsRef = useRef<THREE.Points | null>(null);
  const starDataRef = useRef<StarData[]>([]);
  const shootingStarDataRef = useRef<ShootingStarData[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(400);
  const isMountedRef = useRef(true);
  const mousePositionRef = useRef({ x: 0, y: 0 });

  const getStarColor = (): number => {
    const rand = Math.random();
    if (rand < 0.5) return 0xffffff;
    if (rand < 0.7) return 0xffffdd;
    if (rand < 0.85) return 0xffddbb;
    if (rand < 0.93) return 0xbbddff;
    return 0xffbbbb;
  };

  const generateStars = () => {
    const starData: StarData[] = [];

    // 85% normalnych gwiazd równomiernie rozłożonych
    const normalStars = Math.floor(starCount * 0.85);
    for (let i = 0; i < normalStars; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = Math.random() * 300 + 80;

      starData.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.4 + 0.4,
        color: getStarColor(),
        velocityX: (Math.random() - 0.5) * 0.08 * animationSpeed,
        velocityY: (Math.random() - 0.5) * 0.08 * animationSpeed,
        velocityZ: (Math.random() - 0.5) * 0.08 * animationSpeed,
        twinkleSpeed: Math.random() * 0.003 + 0.001,
        twinkleOffset: Math.random() * 1000,
      });
    }

    // 15% Droga Mleczna - wijąca się jak wiejska droga
    const milkyWayStars = Math.floor(starCount * 0.15);
    for (let i = 0; i < milkyWayStars; i++) {
      const t = i / milkyWayStars;

      // Wijąca się ścieżka - jak wiejska droga
      const pathAngle = t * Math.PI * 1.5;
      const baseRadius = 250;

      // Nieregularne zakręty i załamania
      const winding = Math.sin(t * Math.PI * 8) * 80;
      const winding2 = Math.cos(t * Math.PI * 5) * 60;
      const randomCurve = Math.sin(t * 137.5) * 40;

      // Zmienna szerokość "drogi"
      const roadWidth = (Math.random() - 0.5) * (30 + Math.sin(t * Math.PI * 3) * 20);
      const roadHeight = (Math.random() - 0.5) * (25 + Math.cos(t * Math.PI * 4) * 15);

      // Skupiska i puste obszary
      const density = Math.random() < 0.7 ? 1 : 0.3;
      if (Math.random() > density) continue;

      const x = Math.cos(pathAngle) * (baseRadius + winding) + randomCurve + roadWidth;
      const y = Math.sin(pathAngle * 0.5) * 30 + winding2 * 0.3 + roadHeight;
      const z = Math.sin(pathAngle) * (baseRadius + winding) + winding2 + roadWidth;

      starData.push({
        x,
        y,
        z,
        size: Math.random() * 1.5 + 0.3,
        brightness: Math.random() * 0.7 + 0.2,
        color: Math.random() > 0.15 ? 0xffffff : Math.random() > 0.5 ? 0xffffee : 0xffeedd,
        velocityX: (Math.random() - 0.5) * 0.03 * animationSpeed,
        velocityY: (Math.random() - 0.5) * 0.02 * animationSpeed,
        velocityZ: (Math.random() - 0.5) * 0.03 * animationSpeed,
        twinkleSpeed: Math.random() * 0.002 + 0.001,
        twinkleOffset: Math.random() * 1000,
      });
    }

    starDataRef.current = starData;
  };

  const createShootingStar = () => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const radius = 400;

    // Losowy kierunek bardzo szybkiego lotu
    const dirTheta = Math.random() * Math.PI * 2;
    const dirPhi = Math.random() * Math.PI;

    shootingStarDataRef.current.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
      vx: Math.sin(dirPhi) * Math.cos(dirTheta) * 15 * animationSpeed,
      vy: Math.sin(dirPhi) * Math.sin(dirTheta) * 15 * animationSpeed,
      vz: Math.cos(dirPhi) * 15 * animationSpeed,
      life: 1.0,
      size: 4,
    });
  };

  const createStarField = (scene: THREE.Scene) => {
    if (starFieldRef.current) {
      scene.remove(starFieldRef.current);
      starFieldRef.current.geometry.dispose();
      (starFieldRef.current.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    starDataRef.current.forEach((star) => {
      positions.push(star.x, star.y, star.z);
      const color = new THREE.Color(star.color);
      colors.push(color.r, color.g, color.b);
      sizes.push(star.size);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending,
    });

    starFieldRef.current = new THREE.Points(geometry, material);
    scene.add(starFieldRef.current);
  };

  const createShootingStarField = (scene: THREE.Scene) => {
    if (shootingStarsRef.current) {
      scene.remove(shootingStarsRef.current);
      shootingStarsRef.current.geometry.dispose();
      (shootingStarsRef.current.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    for (let i = 0; i < 5; i++) {
      positions.push(0, 0, 0);
      colors.push(0, 0, 0);
      sizes.push(0);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 6,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending,
    });

    shootingStarsRef.current = new THREE.Points(geometry, material);
    scene.add(shootingStarsRef.current);
  };

  useEffect(() => {
    if (!containerRef.current) {
      console.error('CosmosBackground: containerRef.current is null');
      return;
    }

    isMountedRef.current = true;
    let animationId: number | null = null;
    let currentRenderer: THREE.WebGLRenderer | null = null;

    // Event handlers - zdefiniowane przed użyciem, dostępne w cleanup
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !isMountedRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!interactionEnabled || !isMountedRef.current) return;
      
      // Sprawdź czy kliknięcie nie było na interaktywnym elemencie (przycisk, input, link)
      const target = event.target as HTMLElement;
      if (target && (
        target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.tagName === 'A' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('[role="button"]') ||
        target.closest('[onclick]')
      )) {
        return; // Nie obsługuj eventów na interaktywnych elementach
      }
      
      isDraggingRef.current = true;
      previousMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!interactionEnabled || !isMountedRef.current) return;
      
      // Zapisz aktualną pozycję kursora
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
      
      // Oblicz pozycję kursora względem środka ekranu (normalizowana do -1..1)
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const normalizedX = (event.clientX - centerX) / centerX; // -1 do 1
      const normalizedY = (event.clientY - centerY) / centerY; // -1 do 1
      
      // Ustaw rotację na podstawie pozycji kursora
      // Maksymalna rotacja to około 45 stopni (0.785 radianów)
      targetRotationRef.current.y = normalizedX * 0.785;
      targetRotationRef.current.x = normalizedY * 0.785;
      targetRotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationRef.current.x));
      
      // Jeśli przeciągamy, również aktualizuj na podstawie delty (dla dodatkowej kontroli)
      if (isDraggingRef.current) {
        const deltaX = event.clientX - previousMouseRef.current.x;
        const deltaY = event.clientY - previousMouseRef.current.y;
        targetRotationRef.current.y += deltaX * 0.005;
        targetRotationRef.current.x += deltaY * 0.005;
        targetRotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationRef.current.x));
      }
      
      previousMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!interactionEnabled || !isMountedRef.current) return;
      // NIE preventDefault - pozwól na normalny scroll strony I zoom kosmosu
      zoomRef.current -= event.deltaY * 0.3;
      zoomRef.current = Math.max(100, Math.min(800, zoomRef.current));
    };

    try {
      // Initialize scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Initialize camera
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
      );
      camera.position.z = zoomRef.current;
      cameraRef.current = camera;

      // Initialize renderer - przezroczyste tło
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0); // Przezroczyste tło dla React
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.pointerEvents = 'auto'; // Zawsze auto - eventy są na document
      
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      currentRenderer = renderer; // Zapisz referencję dla cleanup

      // Generate stars
      generateStars();
      createStarField(scene);
      createShootingStarField(scene);

      window.addEventListener('resize', handleResize);
      
      // Dodaj eventy do document - dokładnie jak w oryginalnym HTML
      // To umożliwia interakcję nawet gdy klikamy poza interaktywne elementy
      if (interactionEnabled) {
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('wheel', handleWheel, { passive: false });
      }

      // Animation loop
      const animate = () => {
        if (!isMountedRef.current || !sceneRef.current || !cameraRef.current || !rendererRef.current) {
          return;
        }

        try {
          // Smooth rotation
          currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.05;
          currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.05;

          if (starFieldRef.current) {
            starFieldRef.current.rotation.x = currentRotationRef.current.x;
            starFieldRef.current.rotation.y = currentRotationRef.current.y;
          }

          // Smooth zoom
          cameraRef.current.position.z += (zoomRef.current - cameraRef.current.position.z) * 0.05;

          // Animate stars
          if (starFieldRef.current && starDataRef.current.length > 0) {
            const positions = starFieldRef.current.geometry.attributes.position.array as Float32Array;
            const colors = starFieldRef.current.geometry.attributes.color.array as Float32Array;
            const time = Date.now() * 0.001;

            for (let i = 0; i < starDataRef.current.length && i * 3 + 2 < positions.length; i++) {
              const star = starDataRef.current[i];
              const i3 = i * 3;

              positions[i3] += star.velocityX;
              positions[i3 + 1] += star.velocityY;
              positions[i3 + 2] += star.velocityZ;

              const distance = Math.sqrt(
                positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2
              );

              if (distance > 350 || distance < 30) {
                const targetRadius = 150 + Math.random() * 100;
                const factor = targetRadius / distance;
                positions[i3] *= factor;
                positions[i3 + 1] *= factor;
                positions[i3 + 2] *= factor;
              }

              const flicker = 0.7 + Math.sin(time * star.twinkleSpeed * 100 + star.twinkleOffset) * 0.3;
              const color = new THREE.Color(star.color);
              const brightness = star.brightness * flicker;
              colors[i3] = color.r * brightness;
              colors[i3 + 1] = color.g * brightness;
              colors[i3 + 2] = color.b * brightness;
            }

            starFieldRef.current.geometry.attributes.position.needsUpdate = true;
            starFieldRef.current.geometry.attributes.color.needsUpdate = true;
          }

          // Animate shooting stars
          if (shootingStarsRef.current) {
            const ssPositions = shootingStarsRef.current.geometry.attributes.position.array as Float32Array;
            const ssColors = shootingStarsRef.current.geometry.attributes.color.array as Float32Array;
            const ssSizes = shootingStarsRef.current.geometry.attributes.size.array as Float32Array;

            for (let i = shootingStarDataRef.current.length - 1; i >= 0; i--) {
              const star = shootingStarDataRef.current[i];
              const i3 = i * 3;

              star.x += star.vx;
              star.y += star.vy;
              star.z += star.vz;
              star.life -= 0.02 * animationSpeed;

              if (i3 < ssPositions.length && i3 + 2 < ssPositions.length) {
                ssPositions[i3] = star.x;
                ssPositions[i3 + 1] = star.y;
                ssPositions[i3 + 2] = star.z;
                ssColors[i3] = star.life * 2;
                ssColors[i3 + 1] = star.life * 2;
                ssColors[i3 + 2] = star.life * 1.5;
                ssSizes[i3 / 3] = star.size * star.life;
              }

              if (star.life <= 0) {
                shootingStarDataRef.current.splice(i, 1);
              }
            }

            // Rzadkie pojawianie się spadających gwiazd
            if (shootingStarDataRef.current.length === 0 && Math.random() < 0.005) {
              createShootingStar();
            }

            shootingStarsRef.current.geometry.attributes.position.needsUpdate = true;
            shootingStarsRef.current.geometry.attributes.color.needsUpdate = true;
            shootingStarsRef.current.geometry.attributes.size.needsUpdate = true;
          }

          rendererRef.current.render(sceneRef.current, cameraRef.current);
          animationFrameRef.current = requestAnimationFrame(animate);
          animationId = animationFrameRef.current;
        } catch (error) {
          console.error('Cosmos animation error:', error);
          if (isMountedRef.current) {
            animationId = requestAnimationFrame(animate);
          }
        }
      };

      // Start animation
      console.log('CosmosBackground: Starting animation');
      animationId = requestAnimationFrame(animate);
      animationFrameRef.current = animationId;
    } catch (error) {
      console.error('CosmosBackground initialization error:', error);
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Usuń wszystkie event listeners
      window.removeEventListener('resize', handleResize);
      
      // Usuń eventy z document
      if (interactionEnabled) {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('wheel', handleWheel);
      }

      if (starFieldRef.current) {
        starFieldRef.current.geometry.dispose();
        (starFieldRef.current.material as THREE.Material).dispose();
      }

      if (shootingStarsRef.current) {
        shootingStarsRef.current.geometry.dispose();
        (shootingStarsRef.current.material as THREE.Material).dispose();
      }

      if (rendererRef.current && containerRef.current && rendererRef.current.domElement && 
          containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      starFieldRef.current = null;
      shootingStarsRef.current = null;
    };
  }, []); // Empty deps - only mount once

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'auto', // Zawsze auto - eventy są na document
        backgroundColor: 'transparent',
        touchAction: 'none', // Zapobiega scrollowaniu na mobile
      }}
    />
  );
};
