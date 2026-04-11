import {
    C_BASTION,
    C_BLIND,
    C_END,
    C_FORT,
    C_NETHER,
    C_OVERWORLD,
    C_STRONGHOLD,
    formatMMSS,
    pushOrCreate
} from "./helpers/utils.js";

Chart.defaults.borderColor = "#252540";
Chart.defaults.color = "#999";
Chart.defaults.font.family = "Jetbrains Mono, monospace";

Chart.defaults.elements.point.hitRadius = 10;
Chart.defaults.elements.point.radius = 3;
Chart.defaults.elements.line.borderWidth = 2;
Chart.defaults.elements.line.tension = 0.25;

export function buildAvgEntryChart(runs) {
    const categories = [
        { key: 'nether', color: C_NETHER, label: 'Nether' },
        { key: 'struct1', color: C_BASTION, label: 'Structure' },
        { key: 'stronghold', color: C_STRONGHOLD, label: 'Stronghold' },
        { key: 'end', color: C_END, label: 'End' }
    ];

    const dailyStats = {};
    runs.forEach(run => {
        const ts = toUnixTimestamp(run.date);
        if (!dailyStats[ts]) dailyStats[ts] = { counts: {}, sums: {} };
        
        categories.forEach(cat => {
            const val = run[cat.key === 'struct1' ? (run.bastion ? 'bastion' : 'fort') : cat.key];
            if (val) {
                dailyStats[ts].sums[cat.key] = (dailyStats[ts].sums[cat.key] || 0) + val;
                dailyStats[ts].counts[cat.key] = (dailyStats[ts].counts[cat.key] || 0) + 1;
            }
        });
    });

    const dates = Object.keys(dailyStats).sort();
    const datasets = categories.reverse().map(cat => ({
        label: cat.label,
        data: dates.map(d => ({
            x: Number(d),
            y: dailyStats[d].counts[cat.key] ? dailyStats[d].sums[cat.key] / dailyStats[d].counts[cat.key] : null
        })),
        borderColor: cat.color,
        backgroundColor: cat.color + "20", // Light area fill
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
    }));

    const ctx = document.querySelector(".avg-entry-chart").getContext("2d");
    new Chart(ctx, {
        type: "line",
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    type: "linear", 
                    grid: { color: "#30363d" },
                    ticks: { callback: v => new Date(v).toLocaleDateString('en-US', {month:'short', day:'numeric'}) }
                },
                y: { 
                    beginAtZero: true, 
                    grid: { color: "#30363d" },
                    ticks: { callback: v => formatMMSS(v) }
                }
            },
            plugins: {
                legend: { position: 'top', labels: { color: '#8b949e' } }
            }
        }
    });
}

export function buildAvgEntryChart(runs) {
    const netherDays = {};
    const struct1Days = {};
    const struct2Days = {};
    const blindDays = {};
    const strongholdDays = {};
    const endDays = {};

    // Use same reverse ordering convention as buildRuns (latest first)
    for (let r = 0; r < runs.length; r++) {
        const run = runs[r];

        if (run.nether) pushOrCreate(netherDays, toUnixTimestamp(run.date), run.nether);
        if (run.bastion || run.fort) pushOrCreate(struct1Days, toUnixTimestamp(run.date), !run.bastion ? run.fort : !run.fort ? run.bastion : Math.min(run.fort, run.bastion));
        if (run.bastion && run.fort) pushOrCreate(struct2Days, toUnixTimestamp(run.date), Math.max(run.fort, run.bastion));
        if (run.blind) pushOrCreate(blindDays, toUnixTimestamp(run.date), run.blind);
        if (run.stronghold) pushOrCreate(strongholdDays, toUnixTimestamp(run.date), run.stronghold);
        if (run.end) pushOrCreate(endDays, toUnixTimestamp(run.date), run.end);
    }

    // Average the times for each day
    [netherDays, struct1Days, struct2Days, blindDays, strongholdDays, endDays].forEach(dayObj => {
        Object.entries(dayObj).forEach(([k, v]) => dayObj[k] = v.reduce((a, b) => a + b, 0) / v.length);
    });

    const dates = Object.keys(netherDays);

    for (const el of document.getElementsByClassName("avg-entry-chart")) {
        const ctx = el.getContext("2d");

        new Chart(ctx, {
            type: "line",
            data: {
                labels: dates,
                datasets: [
                    {
                        label: "Nether Entry",
                        data: dates.map(d => timestackData(netherDays, d)),
                        showLine: true,
                        fill: "start",
                        pointBackgroundColor: C_NETHER,
                        borderColor: C_NETHER,
                        backgroundColor: C_OVERWORLD + "70"
                    },
                    {
                        label: "Struct 1 Entry",
                        data: dates.map(d => timestackData(struct1Days, d)),
                        showLine: true,
                        fill: "start",
                        pointBackgroundColor: C_BASTION,
                        borderColor: C_BASTION,
                        backgroundColor: C_NETHER + "70"
                    },
                    {
                        label: "Struct 2 Entry",
                        data: dates.map(d => timestackData(struct2Days, d)),
                        showLine: true,
                        fill: "start",
                        pointBackgroundColor: C_FORT,
                        borderColor: C_FORT,
                        backgroundColor: C_BASTION + "70"
                    },
                    {
                        label: "Blind",
                        data: dates.map(d => timestackData(blindDays, d)),
                        showLine: true,
                        fill: "start",
                        pointBackgroundColor: C_BLIND,
                        borderColor: C_BLIND,
                        backgroundColor: C_FORT + "70"
                    },
                    {
                        label: "Stronghold Entry",
                        data: dates.map(d => timestackData(strongholdDays, d)),
                        showLine: true,
                        fill: "start",
                        pointBackgroundColor: C_STRONGHOLD,
                        borderColor: C_STRONGHOLD,
                        backgroundColor: C_BLIND + "70"
                    },
                    {
                        label: "End Entry",
                        data: dates.map(d => timestackData(endDays, d)),
                        showLine: true,
                        fill: "start",
                        pointBackgroundColor: C_END,
                        borderColor: C_END,
                        backgroundColor: C_STRONGHOLD + "70"
                    }
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: "timestack",
                        title: {display: true, text: "Date"},
                        timestack: {
                            format_style: {
                                second: undefined,
                                minute: undefined,
                                hour: undefined
                            },
                            tooltip_format: {
                                second: undefined,
                                minute: undefined,
                                hour: undefined
                            }
                        }
                    },
                    y: {
                        type: "linear",
                        parsing: false,
                        min: 0,
                        title: {display: true, text: "Entry Time"},
                        ticks: {
                            callback: (value) => formatMMSS(Number(value))
                        },
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (c) => `${c.dataset.label ?? ""}: ${formatMMSS(c.parsed?.y)}`,
                        },
                    },
                },
            },
        });
    }
}

function toUnixTimestamp(date) {
    // surely mr fors will take less than 1 year to get the record
    return new Date(`${date} ${new Date().getFullYear()}`).getTime();
}

function timestackData(data, key)
{
    return { x: +key, y: data[key] };
}