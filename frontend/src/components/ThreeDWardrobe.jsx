import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const ThreeDWardrobe = ({ clothes }) => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        mountRef.current.appendChild(renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xd4af37, 1);
        pointLight.position.set(5, 5, 5);
        scene.add(pointLight);

        // Create a simple rotating "Clothing Item" placeholder
        const geometry = new THREE.BoxGeometry(1, 1.5, 0.2);
        const material = new THREE.MeshPhongMaterial({
            color: 0xd4af37,
            shininess: 100,
            specular: 0x444444
        });
        const item = new THREE.Mesh(geometry, material);
        scene.add(item);

        camera.position.z = 3;

        const animate = () => {
            requestAnimationFrame(animate);
            item.rotation.y += 0.01;
            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div ref={mountRef} className="wardrobe-container glass-card" style={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', left: '15px', zIndex: 5 }}>
                <h4 className="gold-text" style={{ fontSize: '10px' }}>3D WARDROBE</h4>
            </div>
        </div >
    );
};

export default ThreeDWardrobe;
