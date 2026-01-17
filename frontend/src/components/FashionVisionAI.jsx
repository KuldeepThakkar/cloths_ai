import React, { useEffect, useRef, useState } from 'react';
import './FashionVision.css';

const FashionVisionAI = ({ metrics: aiMetrics, skinTone, landmarks, skinRoi, recommendations, socket }) => {
    const [filter, setFilter] = useState('All');
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [liveRecommendations, setLiveRecommendations] = useState([]);
    const [palette, setPalette] = useState([]);
    const [activeGarment, setActiveGarment] = useState(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isPromptLoading, setIsPromptLoading] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const hiddenCanvasRef = useRef(null);
    const [isScanning, setIsScanning] = useState(true);

    const [cameraStatus, setCameraStatus] = useState('idle'); // idle, requesting, active, error
    const [errorMsg, setErrorMsg] = useState('');

    // Fetch Recommendations based on detected AI state
    useEffect(() => {
        const fetchRecs = async () => {
            try {
                const url = `http://localhost:8000/recommend?skin_tone=${skinTone || 'Wheatish'}&body_type=${aiMetrics?.body_type || 'Mesomorph'}&category=${filter}&prompt=${encodeURIComponent(aiPrompt)}`;
                const response = await fetch(url);
                const data = await response.json();
                setLiveRecommendations(data.recommendations || []);
                setPalette(data.suggested_colors || []);
            } catch (err) {
                console.error("Failed to fetch recommendations:", err);
            }
        };
        fetchRecs();
    }, [skinTone, aiMetrics?.body_type, filter, aiPrompt]);

    // Body Structure Description logic
    const getStructureDesc = (type) => {
        const descs = {
            'Mesomorph': 'Muscular & Well-Built',
            'Ectomorph': 'Lean & Tall Build',
            'Endomorph': 'Solid & Strong Build'
        };
        return descs[type] || 'Analyzing Body Frame...';
    };

    const handleTryOn = (item) => {
        setActiveGarment(activeGarment?.id === item.id ? null : item);
        setIsScanning(true); // Ensure scanning is on when trying on
    };

    const wardrobe = recommendations.length > 0 ? recommendations.map(r => ({
        id: r.id,
        name: r.name,
        cat: r.category || 'Casual',
        match: `${Math.floor(Math.random() * 10) + 90}%`,
        color: r.color
    })) : [
        { id: 1, name: "Classic White Shirt", cat: "Formal", match: "94%" },
        { id: 2, name: "Navy Blue Blazer", cat: "Formal", match: "96%" },
        { id: 3, name: "Casual Denim Shirt", cat: "Casual", match: "87%" },
        { id: 4, name: "Traditional Kurta", cat: "Ethnic", match: "95%" },
    ];

    const filteredWardrobe = filter === 'All' ? wardrobe : wardrobe.filter(item => item.cat === filter);

    // Start Webcam
    useEffect(() => {
        if (!cameraEnabled) return;

        setCameraStatus('requesting');
        let stream = null;

        const startVideo = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    }
                });

                setCameraStatus('active');

                // Small delay to ensure the video element is mounted if it was just turned on
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current.play().catch(e => console.error("Play error:", e));
                        };
                    }
                }, 100);

            } catch (err) {
                console.error("Webcam access error:", err);
                setCameraStatus('error');
                setErrorMsg(err.message || 'Camera access denied');
                setCameraEnabled(false);
            }
        };

        startVideo();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraEnabled]);

    // Frame Capture & Sending Loop
    useEffect(() => {
        if (!socket || !isScanning || cameraStatus !== 'active') return;

        const captureInterval = setInterval(() => {
            if (videoRef.current && hiddenCanvasRef.current && socket.readyState === WebSocket.OPEN) {
                const video = videoRef.current;
                const canvas = hiddenCanvasRef.current;
                const ctx = canvas.getContext('2d');

                // Ensure video is playing and has data
                if (video.readyState >= 2 && video.videoWidth > 0) {
                    if (canvas.width !== video.videoWidth) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                    }
                    ctx.drawImage(video, 0, 0);
                    const base64Img = canvas.toDataURL('image/jpeg', 0.5);
                    socket.send(base64Img);
                }
            }
        }, 150); // Balanced FPS for performance

        return () => clearInterval(captureInterval);
    }, [socket, isScanning, cameraStatus]);

    // Draw Skeleton HUD
    useEffect(() => {
        if (!canvasRef.current || !landmarks) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;

        if (video && video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (landmarks.length > 0) {
            // Draw Virtual Garment Overlay (VTON Simulation)
            if (activeGarment) {
                const torsoPoints = [11, 12, 24, 23]; // shoulders and hips
                const pts = torsoPoints.map(id => landmarks.find(lm => lm[0] === id)).filter(Boolean);

                if (pts.length === 4) {
                    ctx.beginPath();
                    ctx.moveTo(pts[0][1], pts[0][2]); // shoulder L
                    ctx.lineTo(pts[1][1], pts[1][2]); // shoulder R
                    ctx.lineTo(pts[2][1], pts[2][2]); // hip R
                    ctx.lineTo(pts[3][1], pts[3][2]); // hip L
                    ctx.closePath();

                    ctx.fillStyle = `${activeGarment.color}66`; // 40% transparent
                    ctx.fill();
                    ctx.strokeStyle = activeGarment.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Add "digitized" glow
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = activeGarment.color;
                }
            }

            ctx.strokeStyle = '#d4af37';
            ctx.fillStyle = '#d4af37';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#d4af37';

            landmarks.forEach(([id, x, y, z]) => {
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });

            const connections = [[11, 12], [11, 23], [12, 24], [23, 24]];
            connections.forEach(([i, j]) => {
                const p1 = landmarks.find(lm => lm[0] === i);
                const p2 = landmarks.find(lm => lm[0] === j);
                if (p1 && p2) {
                    ctx.beginPath();
                    ctx.moveTo(p1[1], p1[2]);
                    ctx.lineTo(p2[1], p2[2]);
                    ctx.stroke();
                }
            });
        }

        // Draw Skin Scanner ROI (Cyan Highlight)
        if (skinRoi && skinRoi.length === 4) {
            const [x1, y1, x2, y2] = skinRoi;
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.setLineDash([]);

            // Scanner Frame
            const size = 6;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1 + size); ctx.lineTo(x1, y1); ctx.lineTo(x1 + size, y1);
            ctx.stroke();

            ctx.font = '9px Inter';
            ctx.fillStyle = '#00f2ff';
            ctx.fillText('SKIN SCAN', x1, y1 - 4);
        }
    }, [landmarks, skinRoi]);

    return (
        <div className="fv-dashboard">
            <header className="fv-header">
                <div className="logo">FASHION<span>VISION AI</span></div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    {aiMetrics?.vibe_match && (
                        <div className="confidence-badge" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                            VIBE: {aiMetrics.vibe_match}
                        </div>
                    )}
                    <div className="confidence-badge">Analysis Status: {isScanning ? 'LIVE' : 'PAUSED'}</div>
                </div>
            </header>

            <canvas ref={hiddenCanvasRef} style={{ display: 'none' }}></canvas>

            <div className="fv-main-grid">
                {/* Left Column: Body Metrics */}
                <aside className="fv-panel">
                    <section className="glass-card">
                        <h3>BODY METRICS</h3>
                        <div className="metric-row"><span>Estimated Height</span> <span className="gold-val">{aiMetrics?.height || "175 cm"}</span></div>
                        <div className="metric-row"><span>Ratio</span> <span className="gold-val">{aiMetrics?.ratio || "1.0"}</span></div>
                        <div className="metric-row"><span>Shoulder Width</span> <span className="gold-val">{aiMetrics?.shoulder_width ? `${aiMetrics.shoulder_width}px` : "Analyzing..."}</span></div>
                        <div className="metric-row"><span>Waist Width</span> <span className="gold-val">{aiMetrics?.waist_width ? `${aiMetrics.waist_width}px` : "Analyzing..."}</span></div>
                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }} />
                        <div className="structure-info">
                            <h4>{aiMetrics?.body_type || "Analyzing..."}</h4>
                            <p>{getStructureDesc(aiMetrics?.body_type)}</p>
                        </div>
                    </section>

                    <section className="glass-card skin-tone">
                        <h3>SKIN TONE PROFILE</h3>
                        <div className="tone-display">
                            <div className={`tone-swatch ${skinTone ? skinTone.toLowerCase() : 'wheatish'}`}></div>
                            <span>{skinTone || "Detecting..."}</span>
                        </div>
                        <p className="subtext">Analyzed from facial region</p>
                    </section>
                </aside>

                {/* Center: Virtual Mirror */}
                <main className="fv-mirror-container">
                    <div className="ai-stylist-block">
                        <div className="stylist-input-wrapper">
                            <input
                                type="text"
                                placeholder="Describe your style (e.g., 'A light blue summer shirt for beach')..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && setFilter('All')}
                            />
                            <button className="btn-stylist">ASK AI</button>
                        </div>
                    </div>

                    <div className="mirror-frame">
                        {cameraStatus === 'idle' && (
                            <div className="camera-prompt">
                                <div className="icon-camera" style={{ fontSize: '3rem', marginBottom: '20px' }}>📷</div>
                                <h3>Camera Access Required</h3>
                                <p>Enable camera to analyze metrics and try on garments.</p>
                                <button onClick={() => setCameraEnabled(true)} className="btn-gold">Enable Camera</button>
                                <button className="btn-outline" onClick={() => setCameraEnabled(true)}>Use Demo Mode</button>
                            </div>
                        )}

                        {cameraStatus === 'requesting' && (
                            <div className="camera-prompt">
                                <div className="loader" style={{ fontSize: '2rem', marginBottom: '20px' }}>⏳</div>
                                <h3>Requesting Access...</h3>
                                <p>Please allow camera permissions in your browser.</p>
                            </div>
                        )}

                        {cameraStatus === 'error' && (
                            <div className="camera-prompt">
                                <div className="icon-error" style={{ fontSize: '3rem', color: '#ff4444', marginBottom: '20px' }}>⚠️</div>
                                <h3>Access Denied</h3>
                                <p style={{ color: '#ff8888' }}>{errorMsg}</p>
                                <button onClick={() => setCameraEnabled(true)} className="btn-gold">Try Again</button>
                            </div>
                        )}

                        {cameraStatus === 'active' && (
                            <div className="live-feed">
                                {isScanning && <div className="scan-line"></div>}
                                <div className="analysis-tag">AI ANALYSIS ACTIVE</div>
                                {activeGarment && (
                                    <div className="analysis-tag" style={{ top: '60px', borderColor: activeGarment.color, color: '#fff', background: activeGarment.color + '44' }}>
                                        TRYING ON: {activeGarment.name.toUpperCase()}
                                    </div>
                                )}
                                <canvas ref={canvasRef} style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    zIndex: 5,
                                    transform: 'scaleX(-1)'
                                }}></canvas>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="video-element"
                                />
                            </div>
                        )}
                    </div>
                    <button className="btn-rescan" onClick={() => setIsScanning(!isScanning)}>
                        {isScanning ? 'STOP SCAN' : 'RESUME SCAN'}
                    </button>
                </main>

                {/* Right Column: Wardrobe & Palette */}
                <aside className="fv-panel">
                    <section className="glass-card palette">
                        <h3>YOUR COLOR PALETTE</h3>
                        <div className="palette-grid">
                            {palette.length > 0 ? palette.map((color, idx) => (
                                <div key={idx} className="p-item">
                                    <div className="p-color" style={{ backgroundColor: color.hex }}></div>
                                    <span>{color.name}</span>
                                </div>
                            )) : (
                                <>
                                    <div className="p-item"><div className="p-color olive"></div><span>Olive</span></div>
                                    <div className="p-item"><div className="p-color coral"></div><span>Coral</span></div>
                                    <div className="p-item"><div className="p-color warm-brown"></div><span>Brown</span></div>
                                </>
                            )}
                        </div>
                    </section>

                    <section className="glass-card wardrobe-section">
                        <h3>VIRTUAL WARDROBE</h3>
                        <div className="filter-chips">
                            {['All', 'Formal', 'Casual', 'Ethnic'].map(cat => (
                                <button key={cat} onClick={() => setFilter(cat)} className={filter === cat ? 'active' : ''}>{cat}</button>
                            ))}
                        </div>
                        <div className="wardrobe-scroll">
                            {liveRecommendations.length > 0 ? liveRecommendations.map(item => (
                                <div key={item.id} className="wardrobe-item">
                                    <div className="item-img" style={{ backgroundColor: item.color || '#222' }}></div>
                                    <div className="item-info">
                                        <h5>{item.name}</h5>
                                        <span>{item.match || '90%'} Match</span>
                                    </div>
                                    <button
                                        className={`btn-gold ${activeGarment?.id === item.id ? 'active' : ''}`}
                                        onClick={() => handleTryOn(item)}
                                        style={{
                                            padding: '5px 10px',
                                            fontSize: '0.7rem',
                                            margin: 0,
                                            marginLeft: 'auto',
                                            backgroundColor: activeGarment?.id === item.id ? '#fff' : 'var(--gold)',
                                            color: activeGarment?.id === item.id ? '#000' : '#000'
                                        }}
                                    >
                                        {activeGarment?.id === item.id ? 'Remove' : 'Try On'}
                                    </button>
                                </div>
                            )) : (
                                <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>Scanning for best matches...</p>
                            )}
                        </div>
                    </section>
                </aside>
            </div>

            <footer className="fv-footer">
                <p>Style Tip for {aiMetrics?.body_type || 'you'}: Tailored fits showcase your natural build. Athletic fit shirts complement your frame.</p>
                <p className="powered-by">Powered by FashionVision Real-time AI</p>
            </footer>
        </div>
    );
};

export default FashionVisionAI;
