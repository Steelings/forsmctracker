import { C_NETHER, C_STRONGHOLD, C_END } from "./helpers/utils.js";

let paceChart = null;

export function buildAvgEntryChart(runs) {
    const ctx = document.querySelector('.avg-entry-chart').getContext('2d');
    if (paceChart) paceChart.destroy();

    // Group runs by date to get daily averages
    const dailyData = {};
    runs.forEach(run => {
        if (!run.date) return;
        
        // Convert 'Mar 24' to a real timestamp so the chart can space them correctly
        const dateKey = new Date(run.date).getTime(); 
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = { nethers: [], structs: [], strongholds: [], ends: [] };
        }
        
        if (run.nether) dailyData[dateKey].nethers.push(run.nether);
        // Assuming your JSON tracks struct 1 / blind / etc. We'll use blind as structure for the chart if struct isn't explicitly defined.
        if (run.blind) dailyData[dateKey].structs.push(run.blind); 
        if (run.stronghold) dailyData[dateKey].strongholds.push(run.stronghold);
        if (run.end) dailyData[dateKey].ends.push(run.end);
    });

    // Helper to average arrays
    const getAvg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const netherPoints = [];
    const structPoints = [];
    const strongPoints = [];
    const endPoints = [];

    // Sort by timestamp just in case
    const sortedDates = Object.keys(dailyData).sort((a, b) => Number(a) - Number(b));

    sortedDates.forEach(date => {
        const d = dailyData[date];
        const x = Number(date); // The X axis timestamp
        
        const nAvg = getAvg(d.nethers);
        const stAvg = getAvg(d.structs);
        const shAvg = getAvg(d.strongholds);
        const eAvg = getAvg(d.ends);

        if (nAvg) netherPoints.push({ x, y: nAvg });
        if (stAvg) structPoints.push({ x, y: stAvg });
        if (shAvg) strongPoints.push({ x, y: shAvg });
        if (eAvg) endPoints.push({ x, y: eAvg });
    });

    paceChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Nether',
                    data: netherPoints,
                    borderColor: C_NETHER,
                    backgroundColor: C_NETHER,
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3
                },
                {
                    label: 'Structure',
                    data: structPoints,
                    borderColor: '#8b949e', // Grey
                    backgroundColor: '#8b949e',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3
                },
                {
                    label: 'Stronghold',
                    data: strongPoints,
                    borderColor: C_STRONGHOLD,
                    backgroundColor: C_STRONGHOLD,
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    showLine: false // Usually sparse, scatter looks better
                },
                {
                    label: 'End',
                    data: endPoints,
                    borderColor: C_END,
                    backgroundColor: C_END,
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear', // Using linear for time allows easy spacing
                    ticks: {
                        color: '#8b949e',
                        callback: function(value) {
                            // Format X-axis bottom labels
                            return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                    },
                    grid: { color: '#30363d' }
                },
                y: {
                    reverse: true, // Faster times are at the top
                    ticks: {
                        color: '#8b949e',
                        callback: function(value) {
                            // Format Y-axis left labels as MM:SS
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
                    labels: { color: '#c9d1d9', usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    callbacks: {
                        // FIX: Converts the giant X-axis number into a clean date on Hover
                        title: function(tooltipItems) {
                            const rawVal = tooltipItems[0].parsed.x;
                            return new Date(rawVal).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                            });
                        },
                        // Fix: Formats the Y-axis hover value into MM:SS
                        label: function(context) {
                            const val = context.parsed.y;
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