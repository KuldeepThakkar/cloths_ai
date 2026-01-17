import React, { useRef, useEffect, useState } from 'react';

const VirtualMirror = ({ metrics, skinTone }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing webcam:", err);
            }
        };
        startVideo();
    }, []);

    return (
        <div className="virtual-mirror glass-card">
            {isScanning && <div className="scan-line"></div>}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-feed"
            />

            {/* Analytics Overlay */}
            <div className="mirror-overlay" style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                bottom: '20px',
                pointerEvents: 'none'
            }}>
                {/* Skeleton markers would be drawn here on canvas */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '15px',
                    borderRadius: '12px',
                    border: '1px solid var(--gold-primary)'
                }}>
                    <h3 className="gold-text" style={{ fontSize: '14px' }}>AI STATUS: ACTIVE</h3>
                    <p style={{ fontSize: '12px' }}>TRK: {metrics?.body_type || "SCANNING..."}</p>
                </div>

                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    textAlign: 'right'
                }}>
                    <div className="glass-card" style={{ padding: '10px 20px', marginBottom: '10px' }}>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>SKIN TONE</p>
                        <p className="gold-text" style={{ fontWeight: 'bold' }}>{skinTone || "ANALYZING..."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VirtualMirror;
