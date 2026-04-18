import { C_NETHER, C_BASTION, C_FORT, C_BLIND, C_STRONGHOLD, C_END } from "./helpers/utils.js";

let paceChart = null;

export function buildAvgEntryChart(runs) {
    const ctx = document.querySelector('.avg-entry-chart').getContext('2d');
    if (paceChart) paceChart.destroy();

    const uniqueDates = [...new Set(runs.map(r => r.date).filter(d => d && d !== "LIVE"))];
    
    // Sort dates properly
    uniqueDates.sort((a, b) => new Date(`${a} 2024`).getTime() - new Date(`${b} 2024`).getTime());

    // Initialize arrays for the splits
    const dailyData = {};
    uniqueDates.forEach(date => {
        dailyData[date] = { nethers: [], s1s: [], s2s: [], blinds: [], strongholds: [], ends: [] };
    });

    // S1 & S2 Logic
    runs.forEach(run => {
        if (!run.date || run.date === "LIVE" || !dailyData[run.date]) return;
        
        if (run.nether) dailyData[run.date].nethers.push(run.nether);
        
        let s1 = null;
        let s2 = null;

        // Determine First (S1) and Second (S2) structures
        if (run.bastion && run.fort) {
            s1 = Math.min(run.bastion, run.fort);
            s2 = Math.max(run.bastion, run.fort);
        } else if (run.bastion) {
            s1 = run.bastion;
        } else if (run.fort) {
            s1 = run.fort;
        }

        if (s1) dailyData[run.date].s1s.push(s1);
        if (s2) dailyData[run.date].s2s.push(s2);
        
        if (run.blind) dailyData[run.date].blinds.push(run.blind);
        if (run.stronghold) dailyData[run.date].strongholds.push(run.stronghold);
        if (run.end) dailyData[run.date].ends.push(run.end);
    });

    // Helper to average arrays safely
    const getAvg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    // Calculate averages
    const netherPoints = uniqueDates.map(date => getAvg(dailyData[date].nethers));
    const s1Points = uniqueDates.map(date => getAvg(dailyData[date].s1s));
    const s2Points = uniqueDates.map(date => getAvg(dailyData[date].s2s));
    const blindPoints = uniqueDates.map(date => getAvg(dailyData[date].blinds));
    const strongPoints = uniqueDates.map(date => getAvg(dailyData[date].strongholds));
    const endPoints = uniqueDates.map(date => getAvg(dailyData[date].ends));

    // Pre-load images with an onload event to prevent invisible points
    const loadImage = (src) => {
        const img = new Image(20, 20); // 20x20 for better visibility
        img.src = src;
        img.onload = () => { 
            if (paceChart) paceChart.update(); 
        };
        return img;
    };

    const imgNether = loadImage('static/nether.jpeg');
    const imgS1 = loadImage('static/bastion.png');
    const imgS2 = loadImage('static/fortress.png');
    const imgBlind = loadImage('static/first_portal.png');
    const imgStronghold = loadImage('static/stronghold.png');
    const imgEnd = loadImage('static/end.png');

    paceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: uniqueDates, 
            datasets: [
                {
                    label: 'Nether',
                    data: netherPoints,
                    borderColor: C_NETHER,
                    backgroundColor: C_NETHER,
                    borderWidth: 2,
                    tension: 0.3,
                    pointStyle: imgNether, 
                    spanGaps: false // Will now break on dry spells
                },
                {
                    label: 'S1',
                    data: s1Points,
                    borderColor: C_BASTION || '#f6d32d',
                    backgroundColor: C_BASTION || '#f6d32d',
                    borderWidth: 2,
                    tension: 0.3,
                    pointStyle: imgS1, 
                    spanGaps: false 
                },
                {
                    label: 'S2',
                    data: s2Points,
                    borderColor: C_FORT || '#800000',
                    backgroundColor: C_FORT || '#800000',
                    borderWidth: 2,
                    tension: 0.3,
                    pointStyle: imgS2, 
                    spanGaps: false
                },
                {
                    label: 'Blind',
                    data: blindPoints,
                    borderColor: C_BLIND || '#2edb54',
                    backgroundColor: C_BLIND || '#2edb54',
                    borderWidth: 2,
                    tension: 0.3,
                    pointStyle: imgBlind, 
                    spanGaps: false
                },
                {
                    label: 'Stronghold',
                    data: strongPoints,
                    borderColor: C_STRONGHOLD,
                    backgroundColor: C_STRONGHOLD,
                    borderWidth: 2,
                    tension: 0.3,
                    pointStyle: imgStronghold, 
                    showLine: false 
                },
                {
                    label: 'End',
                    data: endPoints,
                    borderColor: C_END,
                    backgroundColor: C_END,
                    borderWidth: 2,
                    tension: 0.3,
                    pointStyle: imgEnd, 
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'category', 
                    ticks: { color: '#8b949e' },
                    grid: { color: '#30363d' }
                },
                y: {
                    reverse: true, // Faster times at the top
                    ticks: {
                        color: '#8b949e',
                        callback: function(value) {
                            const m = Math.floor(value / 60);
                            const s = Math.floor(value % 60).toString().padStart(2, '0');
                            return `${m}:${s}`;
                        }
                    },
                    grid: { color: '#30363d' }
                }
            },
            plugins: {
                legend: {
                    title: {
                        display: true,
                        text: '👆 Click a split below to show or hide it from the chart',
                        color: '#8b949e',
                        font: { size: 12, style: 'italic', family: "'JetBrains Mono', monospace" },
                        padding: { bottom: 10 }
                    },
                    labels: { 
                        color: '#c9d1d9', 
                        usePointStyle: true,
                        font: { size: 14, family: "'JetBrains Mono', monospace" },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label; 
                        },
                        label: function(context) {
                            const val = context.parsed.y;
                            if (val === null) return null;
                            const m = Math.floor(val / 60);
                            const s = Math.floor(val % 60).toString().padStart(2, '0');
                            return `${context.dataset.label}: ${m}:${s}`;
                        }
                    }
                }
            }
        }
    });
}