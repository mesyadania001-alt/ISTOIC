import React from 'react';
import './SystemHealthView.css';

const SystemHealthView = () => {
    return (
        <div className="system-health-view">
            <h1>System Health</h1>
            <div className="metrics-grid">
                <div className="metric-card">
                    <h2>Metric 1</h2>
                    <p>Status: OK</p>
                </div>
                <div className="metric-card">
                    <h2>Metric 2</h2>
                    <p>Status: Warning</p>
                </div>
                <div className="metric-card">
                    <h2>Metric 3</h2>
                    <p>Status: Critical</p>
                </div>
            </div>
        </div>
    );
};

export default SystemHealthView;