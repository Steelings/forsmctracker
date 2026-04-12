import { C_BASTION, C_FORT, C_NETHER, C_BLIND, C_STRONGHOLD, C_END, C_FINISH, formatMMSS } from "./helpers/utils.js";
import { Runlist } from "./runlist.js";
import { getSplits } from "./helpers/runhelper.js";


/**
 * BUILD DAILY SUMMARY
 * Populates the dashboard cards (Nethers, S1, S2, etc.) and handles the run history list.
 */
export function buildDailySummary(runs) {
    const splits = getSplits(runs);
    
    // Mapping IDs from HTML to specific indices in the getSplits array
    // Index 1: Nether, 2: S1, 3: S2, 5: Stronghold, 6: End
    const updateCard = (idQty, idAvg, splitObj) => {
        const qtyEl = document.getElementById(idQty);
        const avgEl = document.getElementById(idAvg);
        if (!qtyEl || !splitObj) return;

        const allTimes = Object.values(splitObj).flat();
        qtyEl.textContent = allTimes.length;
        
        const avg = allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;
        if (avgEl) avgEl.textContent = `Avg: ${formatMMSS(avg)}`;
    };

    updateCard('val-nether-qty', 'val-nether-avg', splits[1]);
    updateCard('val-s1-qty', 'val-s1-avg', splits[2]);
    updateCard('val-s2-qty', 'val-s2-avg', splits[3]);
    updateCard('val-strong-qty', 'val-strong-avg', splits[5]);
    updateCard('val-end-qty', 'val-end-avg', splits[6]);

    // --- NEW: Calculate Resets Per Nether for the Insights Card ---
    const totalRuns = runs.length;
    // Safely grab all the nether times we just used for the cards above
    const netherTimes = splits[1] ? Object.values(splits[1]).flat() : [];
    const totalNethers = netherTimes.length;

    let resetsPerNether = 0;
    if (totalNethers > 0) {
        resetsPerNether = totalRuns / totalNethers;
    }

    const resetsEl = document.getElementById("insight-resets-per-nether");
    if (resetsEl) {
        // Puts the number in the HTML, rounded to 1 decimal place (e.g., 24.5)
        resetsEl.textContent = resetsPerNether > 0 ? resetsPerNether.toFixed(1) : "0";
    }
    // --------------------------------------------------------------

    // Setup for Run History List
    const runlist = new Runlist(document.getElementById("summary-runs"), []);
    const runsByDay = {};
    runs.forEach(run => {
        if (!runsByDay[run.date]) runsByDay[run.date] = [];
        runsByDay[run.date].push(run);
    });

    const daySelect = document.getElementById("summary-day");
    if (daySelect) {
        daySelect.innerHTML = "";
        // Sort dates descending (newest first)
        Object.keys(runsByDay).reverse().forEach(day => {
            const opt = document.createElement("option");
            opt.value = day;
            opt.textContent = `${day} (${runsByDay[day].length} runs)`;
            daySelect.appendChild(opt);
        });

        daySelect.onchange = () => {
            runlist.runs = runsByDay[daySelect.value];
            runlist.rebuildRuns();
        };

        // Initialize with the most recent day
        if (daySelect.options.length > 0) {
            daySelect.value = daySelect.options[0].value;
            daySelect.onchange();
        }
    }
}

/**
 * BUILD DEATH PIE CHART
 * Visualizes cause of death with custom WebP icons and percentage breakdown.
 */
export function buildDeathPieChart(runs) {
    const deathCounts = {};
    
    // Icon mapping based on your static folder
    const imgMap = {
        "Lava": "static/forsenHoppedin.webp",
        "Gravity": "static/forsenGravity.webp",
        "Piglins": "static/piglin.webp",
        "Hoglins": "static/hoglin.webp",
        "Blazes": "static/blaze.webp",
        "Fire": "static/forsenFire.webp",
        "Skeletons": "static/skeleton.webp",
        "Wither": "static/wither.webp",
        "Other": "static/aware.webp"
    };

    runs.forEach(run => {
        if (run.death) {
            let cause = "Other";
            const d = run.death.toLowerCase();
            if (d.includes("lava")) cause = "Lava";
            else if (d.includes("fell") || d.includes("ground") || d.includes("high place")) cause = "Gravity";
            else if (d.includes("piglin")) cause = "Piglins";
            else if (d.includes("hoglin")) cause = "Hoglins";
            else if (d.includes("blaze")) cause = "Blazes";
            else if (d.includes("burned") || d.includes("fire")) cause = "Fire";
            else if (d.includes("skel")) cause = "Skeletons";
            else if (d.includes("wither")) cause = "Wither";
            
            deathCounts[cause] = (deathCounts[cause] || 0) + 1;
        }
    });

    const sortedLabels = Object.keys(deathCounts).sort((a, b) => deathCounts[b] - deathCounts[a]);
    const sortedData = sortedLabels.map(label => deathCounts[label]);

    const ctx = document.getElementById('death-pie-chart');
    if (!ctx) return;

    new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: sortedLabels,
            datasets: [{
                data: sortedData,
                backgroundColor: [
                    '#ee5555', // Nether Red
                    '#558877', // Stronghold Green
                    '#8855ee', // Blind Purple
                    '#eeaa55', // End Orange
                    '#635b55', // Bastion Grey
                    '#7a0000', // Fort Red
                    '#252540', // Navy
                    '#30363d'  // Muted
                ],
                borderColor: '#161b22',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8b949e',
                        padding: 20,
                        font: { family: 'JetBrains Mono', size: 12 },
                        // Injects icons into the legend if browser supports it
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleFont: { family: 'JetBrains Mono' },
                    bodyFont: { family: 'JetBrains Mono' },
                    callbacks: {
                        label: (context) => {
                            const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percentage = ((value / sum) * 100).toFixed(1) + "%";
                            return ` ${context.label}: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });
}

export function buildProjectionChart(runsByDay) {
    const ctx = document.getElementById('projection-chart');
    if (!ctx) return;

    const dates = Object.keys(runsByDay).sort((a, b) => new Date(a) - new Date(b));
    
    // Increase the target so he hasn't "finished" yet
    const TOTAL_ESTIMATED_RUNS_NEEDED = 8000; 
    
    let cumulativeRuns = 0;
    const projectionData = dates.map((date, index) => {
        const runsToday = runsByDay[date].length;
        cumulativeRuns += runsToday;
        
        const streamsSoFar = index + 1;
        const avgRunsPerStream = cumulativeRuns / streamsSoFar;
        
        const remainingRuns = Math.max(0, TOTAL_ESTIMATED_RUNS_NEEDED - cumulativeRuns);
        
        // Safety check: If avgRunsPerStream is 0, we avoid infinity
        let expectedDays = avgRunsPerStream > 0 ? (remainingRuns / avgRunsPerStream) : 100;

        // GUARDRAIL: Cap the chart at 200 days so it doesn't break the UI
        // And ensure it stays above 0.1 so it doesn't look like he's finished
        return Math.min(200, Math.max(0.1, expectedDays)).toFixed(1);
    });

    const existingChart = Chart.getChart("projection-chart");
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Expected Days Remaining',
                data: projectionData,
                borderColor: '#58a6ff',
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
                borderWidth: 2,
                pointRadius: 0, // Set to 0 to make the line look cleaner
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 150, // This keeps the Y-axis from going to infinity
                    title: { display: true, text: 'Days Until Record', color: '#8b949e' },
                    grid: { color: 'rgba(48, 54, 61, 0.3)' },
                    ticks: { color: '#8b949e' }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8b949e',
                        maxTicksLimit: 10
                    }
                }
            },
            plugins: {
                legend: { display: false } // Hide legend to save space
            }
        }
    });
}