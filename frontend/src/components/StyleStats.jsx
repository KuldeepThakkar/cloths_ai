import React from 'react';
import { User, Ruler, Activity, Palette } from 'lucide-react';

const StyleStats = ({ metrics, skinTone }) => {
    return (
        <div className="stats-sidebar">
            <div className="glass-card" style={{ padding: '20px' }}>
                <h2 className="gold-text" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={24} /> PROFILE
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Ruler size={16} /> Height
                        </span>
                        <span style={{ fontWeight: 'bold' }}>{metrics?.height || "175 cm"}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} /> Body Frame
                        </span>
                        <span style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>{metrics?.body_type || "Mesomorph"}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Palette size={16} /> Skin Palette
                        </span>
                        <span style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>{skinTone || "Wheatish"}</span>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '20px', flex: 1 }}>
                <h2 className="gold-text" style={{ marginBottom: '15px' }}>COLOR THEORY</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Based on your <span className="gold-text">Wheatish</span> skin tone,
                    we recommend warm earthy colors, mustard yellows, and deep greens.
                </p>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    {['#8B4513', '#DAA520', '#556B2F', '#800000'].map(color => (
                        <div key={color} style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: color,
                            border: '2px solid rgba(255,255,255,0.2)'
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StyleStats;
