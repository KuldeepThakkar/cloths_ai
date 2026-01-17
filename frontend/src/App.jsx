import React, { useState, useEffect } from 'react';
import FashionVisionAI from './components/FashionVisionAI';

function App() {
    const [metrics, setMetrics] = useState({ body_type: 'Ectomorph', height: '178 cm', ratio: '1.2' });
    const [skinTone, setSkinTone] = useState('Wheatish');
    const [landmarks, setLandmarks] = useState([]);
    const [skinRoi, setSkinRoi] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Fetch initial recommendations
        fetch('http://localhost:8000/recommend')
            .then(res => res.json())
            .then(data => setRecommendations(data.recommendations))
            .catch(err => console.error("Backend unreachable:", err));

        // WebSocket setup for real-time AI logic
        const ws = new WebSocket('ws://localhost:8000/ws');
        setSocket(ws);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.metrics) setMetrics(data.metrics);
            if (data.skin_tone) setSkinTone(data.skin_tone);
            if (data.landmarks) setLandmarks(data.landmarks);
            if (data.skin_roi) setSkinRoi(data.skin_roi);
        };

        return () => ws.close();
    }, []);

    return (
        <FashionVisionAI
            metrics={metrics}
            skinTone={skinTone}
            landmarks={landmarks}
            skinRoi={skinRoi}
            recommendations={recommendations}
            socket={socket}
        />
    );
}

export default App;
