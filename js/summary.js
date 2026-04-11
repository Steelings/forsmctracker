import {C_BASTION, C_FORT, C_NETHER, C_BLIND, C_STRONGHOLD, C_END, C_FINISH, formatMMSS} from "./helpers/utils.js";
import {Runlist} from "./runlist.js";
import {getSplits} from "./helpers/runhelper.js";
import {isDeadRun} from "./runlist.js";

export function buildDailySummary(runs) {
    const nethers = runs.filter(r => r.nether).length;
    const structs = runs.filter(r => r.bastion || r.fort).length;
    const strongholds = runs.filter(r => r.stronghold).length;
    const ends = runs.filter(r => r.end).length;

    document.getElementById('val-nether-qty').textContent = nethers;
    document.getElementById('val-struct-qty').textContent = structs;
    document.getElementById('val-strong-qty').textContent = strongholds;
    document.getElementById('val-end-qty').textContent = ends;
    const runlist = new Runlist(document.getElementById("summary-runs"), []);
    const splits = getSplits(runs);

    // 1. FILL GLOBAL STAT CARDS (Quality filtered)
    const qualityRuns = runs.filter(r => !isDeadRun(r));
    
    const updateCard = (idQty, idAvg, splitIndex) => {
        const data = Object.values(splits[splitIndex]).flat();
        document.getElementById(idQty).textContent = data.length;
        const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
        document.getElementById(idAvg).textContent = `Avg: ${formatMMSS(avg)}`;
    };

    updateCard('val-nether-qty', 'val-nether-avg', 1); // Nether
    updateCard('val-struct-qty', 'val-struct-avg', 2); // Struct 1 (Bastion/Fort)
    updateCard('val-strong-qty', 'val-strong-avg', 5); // Stronghold
    updateCard('val-end-qty', 'val-end-avg', 6);    // End

    // 2. SETUP DROPDOWN
    const runsByDay = {};
    runs.forEach(run => {
        if (!runsByDay[run.date]) runsByDay[run.date] = [];
        runsByDay[run.date].push(run);
    });

    const daySelect = document.getElementById("summary-day");
    daySelect.innerHTML = ""; // Clear
    for (const [day, dayRuns] of Object.entries(runsByDay)) {
        const option = document.createElement("option");
        option.value = day;
        option.textContent = `${day} (${dayRuns.length} runs)`;
        daySelect.appendChild(option);
    }

    daySelect.onchange = () => {
        runlist.runs = runsByDay[daySelect.value];
        runlist.rebuildRuns();
    };

    // Default to latest
    daySelect.value = daySelect.options[daySelect.options.length - 1].value;
    daySelect.onchange();
}

export function buildDeathPieChart(runs) {
    const deathCounts = {};
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
            else if (d.includes("fell") || d.includes("ground")) cause = "Gravity";
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

    const ctx = document.getElementById('death-pie-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sortedLabels,
            datasets: [{
                data: sortedData,
                backgroundColor: ['#ee5555', '#558877', '#8855ee', '#eeaa55', '#aaaaff', '#635b55', '#30363d'],
                borderWidth: 2,
                borderColor: '#161b22'
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
                        font: { family: 'JetBrains Mono', size: 12 },
                            generateLabels: (chart) => {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label} (${data.datasets[0].data[i]})`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.raw} deaths`
                    }
                }
            }
        }
    });
}