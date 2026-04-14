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

    // 1. Tally the deaths
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
    const backgroundColors = ['#ee5555', '#558877', '#8855ee', '#eeaa55', '#635b55', '#7a0000', '#252540', '#30363d'];
    
    const ctx = document.getElementById('death-pie-chart');
    if (!ctx) return;

    // 2. Calculate total for percentages
    const totalDeaths = sortedData.reduce((a, b) => a + b, 0);

    // 3. Initialize the Chart
    new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: sortedLabels,
            datasets: [{
                data: sortedData,
                backgroundColor: backgroundColors,
                borderColor: '#161b22',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                // TURN OFF DEFAULT CANVAS LEGEND
                legend: {
                    display: false 
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleFont: { family: 'JetBrains Mono' },
                    bodyFont: { family: 'JetBrains Mono' },
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const percentage = ((value / totalDeaths) * 100).toFixed(1) + "%";
                            return ` ${context.label}: ${value} (${percentage})`;
                        }
                    }
                }
            }
        }
    });

    // Generate the Custom HTML Legend (This allows animated WebPs and color boxes!)
    const legendContainer = document.getElementById('custom-legend');
    if (!legendContainer) return;

    let legendHTML = '';
    sortedLabels.forEach((label, index) => {
        const value = sortedData[index];
        const percentage = ((value / totalDeaths) * 100).toFixed(1) + "%";
        const color = backgroundColors[index % backgroundColors.length];
        const imgSrc = imgMap[label] || "static/aware.webp"; // Fallback image

        legendHTML += `
            <div class="legend-item">
                <div class="legend-color-box" style="background-color: ${color};"></div>
                <img src="${imgSrc}" class="legend-icon" alt="${label}" />
                <span>${percentage} ${label}</span>
            </div>
        `;
    });

    legendContainer.innerHTML = legendHTML;
}

export function buildProjectionChart(runsByDay) {
    const ctx = document.getElementById('projection-chart');
    if (!ctx) return;

    const dates = Object.keys(runsByDay).sort((a, b) => new Date(a) - new Date(b));
    
    let cumulativeRuns = 0;
    let cumulativePaceRuns = 0;
    const CONVERSION_RATE = 0.025; // 2.5% conversion
    const PACE_CUTOFF = 630; // 10.5 minutes EDIT @metser

    const projectionData = dates.map((date, index) => {
        const dayRuns = runsByDay[date];
        cumulativeRuns += dayRuns.length;
        
        // Count how many runs were actually on pace today and add to cumulative
        dayRuns.forEach(run => {
            const s2 = run.bastion && run.fort ? Math.max(run.bastion, run.fort) : null;
            if (s2 !== null && run.blind && run.blind <= PACE_CUTOFF) {
                cumulativePaceRuns++;
            }
        });

        const streamsSoFar = index + 1;
        const runsPerStream = cumulativeRuns / streamsSoFar;

        // Apply the same probability math from the main predictor
        const pRecordPace = cumulativeRuns > 0 ? (cumulativePaceRuns / cumulativeRuns) : 0;
        const pRec = pRecordPace * CONVERSION_RATE;

        // Calculate expected days (d50) using the log probability formula
        let d50 = 1500; // Default cap to prevent chart from breaking early on
        if (pRec > 0) {
            d50 = Math.log(0.5) / (runsPerStream * Math.log(1 - pRec));
            d50 = Math.min(d50, 1500); // Cap the visual spike for the first few bad days
        }

        // Calculate the actual calendar date for the tooltip
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + d50);
        const dateStr = expectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return {
            x: date,
            y: parseFloat(d50.toFixed(1)),
            totalRuns: cumulativeRuns,
            pace: runsPerStream.toFixed(1),
            estDate: dateStr // Pass the formatted date to the tooltip
        };
    });

    const existingChart = Chart.getChart("projection-chart");
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Days to Record',
                data: projectionData,
                borderColor: '#58a6ff',
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    min: 0,
                    title: { display: true, text: 'Expected Days Remaining', color: '#8b949e' },
                    grid: { color: 'rgba(48, 54, 61, 0.3)' },
                    ticks: { color: '#8b949e' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8b949e', maxTicksLimit: 12 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#161b22',
                    callbacks: {
                        label: (context) => {
                            const d = context.raw;
                            return [
                                ` Est. Date: ${d.estDate}`,
                                ` Days Left: ${d.y}`,
                                ` Total Runs: ${d.totalRuns}`,
                                ` Pace: ${d.pace} runs/stream`
                            ];
                        }
                    }
                }
            }
        }
    });
}