import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface AnimatedMapBackgroundProps {
  searchLocations?: Array<{ lat: number; lng: number; name: string }>;
}

export const AnimatedMapBackground: React.FC<AnimatedMapBackgroundProps> = ({
  searchLocations = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let animationId: number | null = null;
    const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_KEY;

    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Initialize camera with wide angle for map view
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 5000, 8000); // High above, looking down
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Initialize renderer with transparent background
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create animated map surface (abstract representation)
    const mapGeometry = new THREE.PlaneGeometry(20000, 20000, 50, 50);
    const mapMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.1,
      roughness: 0.9,
      transparent: true,
      opacity: 0.6,
    });

    // Animate vertices to create map-like effect
    const positions = mapGeometry.attributes.position.array as Float32Array;
    const originalPositions = new Float32Array(positions);
    
    for (let i = 0; i < positions.length; i += 3) {
      originalPositions[i + 2] = Math.random() * 100 - 50; // Random height for terrain
    }

    const mapMesh = new THREE.Mesh(mapGeometry, mapMaterial);
    mapMesh.rotation.x = -Math.PI / 2;
    scene.add(mapMesh);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5000, 10000, 5000);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add location markers (glowing points)
    const locationMarkers: THREE.Mesh[] = [];
    searchLocations.forEach((location) => {
      const markerGeometry = new THREE.SphereGeometry(50, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.8,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      
      // Convert lat/lng to 3D position (simplified)
      const x = (location.lng - 21) * 5000; // Center around Poland
      const z = (location.lat - 52) * -5000;
      marker.position.set(x, 200, z);
      
      scene.add(marker);
      locationMarkers.push(marker);
    });

    // Add fog for depth
    scene.fog = new THREE.Fog(0x000000, 5000, 15000);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      const time = Date.now() * 0.001;

      // Animate map surface (gentle waves)
      if (mapMesh && mapGeometry.attributes.position) {
        const positions = mapGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          const x = originalPositions[i];
          const z = originalPositions[i + 2];
          positions[i + 1] = originalPositions[i + 1] + Math.sin(x * 0.001 + time) * 10;
          positions[i + 1] += Math.cos(z * 0.001 + time * 0.7) * 8;
        }
        mapGeometry.attributes.position.needsUpdate = true;
        mapGeometry.computeVertexNormals();
      }

      // Animate camera (slow rotation)
      const radius = 10000;
      camera.position.x = Math.cos(time * 0.1) * radius;
      camera.position.z = Math.sin(time * 0.1) * radius;
      camera.lookAt(0, 0, 0);

      // Animate location markers
      locationMarkers.forEach((marker, index) => {
        marker.position.y = 200 + Math.sin(time * 2 + index) * 50;
        const scale = 1 + Math.sin(time * 3 + index) * 0.2;
        marker.scale.set(scale, scale, scale);
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
      animationId = animationFrameRef.current;
    };

    setMapLoaded(true);
    animationId = requestAnimationFrame(animate);
    animationFrameRef.current = animationId;

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      
      if (mapGeometry) mapGeometry.dispose();
      if (mapMaterial) mapMaterial.dispose();
      locationMarkers.forEach(marker => {
        if (marker.geometry) marker.geometry.dispose();
        if (marker.material) (marker.material as THREE.Material).dispose();
      });
      
      if (rendererRef.current && containerRef.current && rendererRef.current.domElement && 
          containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [searchLocations]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: mapLoaded ? 1 : 0,
        transition: 'opacity 1s ease-in',
      }}
    />
  );
};

