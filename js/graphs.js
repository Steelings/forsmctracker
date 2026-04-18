import { C_NETHER, C_STRONGHOLD, C_END } from "./helpers/utils.js";

let paceChart = null;

export function buildAvgEntryChart(runs) {
    const ctx = document.querySelector('.avg-entry-chart').getContext('2d');
    if (paceChart) paceChart.destroy();

    const uniqueDates = [...new Set(runs.map(r => r.date).filter(d => d && d !== "LIVE"))];
    
    // Sort dates properly
    uniqueDates.sort((a, b) => new Date(`${a} 2024`).getTime() - new Date(`${b} 2024`).getTime());

    // Initialize arrays for 4 splits
    const dailyData = {};
    uniqueDates.forEach(date => {
        dailyData[date] = { nethers: [], structs: [], strongholds: [], ends: [] };
    });

    runs.forEach(run => {
        if (!run.date || run.date === "LIVE" || !dailyData[run.date]) return;
        
        if (run.nether) dailyData[run.date].nethers.push(run.nether);
        
        // FIX: Using run.fort to track Fortress time instead of run.blind
        if (run.fort) dailyData[run.date].structs.push(run.fort); 
        
        if (run.stronghold) dailyData[run.date].strongholds.push(run.stronghold);
        if (run.end) dailyData[run.date].ends.push(run.end);
    });

    // Helper to average arrays safely (Already works perfectly for 1 entry!)
    const getAvg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    // Calculate averages
    const netherPoints = uniqueDates.map(date => getAvg(dailyData[date].nethers));
    const structPoints = uniqueDates.map(date => getAvg(dailyData[date].structs));
    const strongPoints = uniqueDates.map(date => getAvg(dailyData[date].strongholds));
    const endPoints = uniqueDates.map(date => getAvg(dailyData[date].ends));

    // Pre-load images with an onload event to update the chart instantly
    const loadImage = (src) => {
        const img = new Image(16, 16); 
        img.src = src;
        img.onload = () => { 
            // This forces Chart.js to redraw once the image is ready, fixing the "missing" points
            if (paceChart) paceChart.update(); 
        };
        return img;
    };

    const imgNether = loadImage('static/nether.jpeg');
    const imgStruct = loadImage('static/fortress.png');
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
                    spanGaps: true 
                },
                {
                    label: 'Structure',
                    data: structPoints,
                    borderColor: '#8b949e', 
                    backgroundColor: '#8b949e',
                    borderWidth: 2,
                    tension: 0.3,
                    pointStyle: imgStruct, 
                    spanGaps: true
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
                    labels: { color: '#c9d1d9', usePointStyle: true }
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