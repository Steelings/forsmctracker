import {
    seconds,
    formatMMSS,
    C_NETHER,
    C_FORT,
    C_BASTION,
    C_BLIND,
    C_STRONGHOLD,
    C_END,
    C_FINISH
} from "./helpers/utils.js";

// Amount of pixels to the left of run bars
const RUNS_MARGIN = 220;
// Pixels per minute in the run bars (for scaling)
const RUNS_PER_MINUTE = 45;

export class Runlist {

    constructor(element, runs) {
        this.element = element;
        this.runs = runs;
        this.initElement();
        this.rebuildRuns();
    }

    initElement() {
        this.element.style.textAlign = "left";
        this.element.innerHTML += `
            <div class="runs-settings">
                <label>
                    Show Only Runs Entering:
                    <select class="runs-split-filter">
                        <option value="all">All Runs</option>
                        <option value="nether">Nether</option>
                        <option value="struct1">Struct 1</option>
                        <option value="struct2">Struct 2</option>
                        <option value="blind">Blind</option>
                        <option value="stronghold">Stronghold</option>
                        <option value="end">End</option>
                        <option value="finish">Finish</option>
                    </select>
                </label>

                <label>
                    Sort By:
                    <select class="runs-sort">
                        <option value="date">Date</option>
                        <option value="nether">Nether Entry Time</option>
                        <option value="struct1">Struct 1 Time</option>
                        <option value="struct2">Struct 2 Time</option>
                        <option value="blind">Blind Time</option>
                        <option value="stronghold">Stronghold Time</option>
                        <option value="end">End Time</option>
                        <option value="finish">Finish Time</option>
                        <option value="death">Death Reason</option>
                        <option value="duration">Duration</option>
                    </select>
                </label>
            </div>

            <div class="runs"></div>
            <div class="runs-tooltip"></div>
        `;

        // View settings
        this.element.querySelector(".runs-split-filter").onchange = () => this.rebuildRuns();
        this.element.querySelector(".runs-sort").onchange = () => this.rebuildRuns();

        // Runs tooltip
        const tooltip = this.element.querySelector(".runs-tooltip");
        this.element.querySelector(".runs").addEventListener("mousemove", e => {
            const deathImage = e.target?.closest?.("img");
            if (deathImage) {
                tooltip.innerHTML = `
                <img src="${deathImage.getAttribute("src")}" height="32" alt="">
                <br>
                <span style="color: #ee8888">${deathImage.getAttribute("title")}</span>
            `;
                tooltip.style.left = `${e.clientX + 8}px`;
                tooltip.style.top = `${e.clientY - 60}px`;
                tooltip.style.display = "block";
                return;
            }

            const bar = e.target?.closest?.(".run-bar-container");
            if (!bar) {
                tooltip.style.display = "none";
                return;
            }

            const rowRect = bar.getBoundingClientRect();
            const seconds = (e.clientX - rowRect.left) * (60 / RUNS_PER_MINUTE);

            tooltip.textContent = formatMMSS(seconds) + " (click to go to VOD)";
            tooltip.style.left = `${e.clientX + 8}px`;
            tooltip.style.top = `${e.clientY - 24}px`;
            tooltip.style.display = "block";
        });

        this.element.querySelector(".runs").addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
        });

        this.element.querySelector(".runs").addEventListener("click", (e) => {
            const bar = e.target?.closest?.(".run-bar-container");
            if (!bar) return;

            const run = this.runs[Number(bar.getAttribute("data-run"))];
            const rowRect = bar.getBoundingClientRect();
            const secs = (e.clientX - rowRect.left) * (60 / RUNS_PER_MINUTE);

            // Find closest entry to clicked time
            const timestamp = run.timestamps[~~(secs / 5)].replace(":", "h").replace(":", "m");
            window.open(`${run.vod}?t=${timestamp}s`, "_blank");
        });
    }
rebuildRuns() {
        const runElement = this.element.querySelector(".runs");
        const secs = Math.max(...this.runs.map(r => seconds(r.runTime)));
        runElement.style.width = `${secs / (60 / RUNS_PER_MINUTE) + RUNS_MARGIN + 70}px`;

        let labelString = "";
        for (let m = 1; m * 60 < secs + 60; m++) {
            labelString += `<span style="text-align: center; width: ${RUNS_PER_MINUTE}px;">${m}:00</span>`;
        }

        runElement.innerHTML = `<div class="run-label-container">${labelString}</div>`;

        // 1. MAP AND SCORE THE RUNS
        let outRuns = this.runs.map((run, r) => {
            let score = 0;
            if (run.finish) score += 10000;
            if (run.end) score += 5000;
            if (run.stronghold) score += 1000;
            if (run.blind) score += 500;
            if (run.nether && run.nether < 180) score += 200; 
            
            return { ...run, forsenScore: score, originalIndex: r };
        });

        // 2. FILTER
        const splitFilter = this.element.querySelector(".runs-split-filter").value;
        outRuns = outRuns.filter(run => {
            if (splitFilter === "all") return true;
            if (splitFilter === "nether") return !!run.nether;
            if (splitFilter === "struct1") return !!(run.bastion || run.fort);
            if (splitFilter === "struct2") return !!(run.bastion && run.fort);
            if (splitFilter === "blind") return !!run.blind;
            if (splitFilter === "stronghold") return !!run.stronghold;
            if (splitFilter === "end") return !!run.end;
            if (splitFilter === "finish") return !!run.finish;
            return true;
        });

        // 3. SORT
        const sort = this.element.querySelector(".runs-sort").value;
        if (sort === "date") {
            outRuns.sort((a, b) => b.originalIndex - a.originalIndex);
        } else if (sort === "duration") {
            outRuns.sort((a, b) => seconds(b.runTime) - seconds(a.runTime));
        } else {
            // Default: Sort by the new Forsen Score we created
            outRuns.sort((a, b) => b.forsenScore - a.forsenScore);
        }

        // 4. RENDER
        let runStr = "";
        for (const outRun of outRuns) {
            // Calculate time difference for the "LIVE" indicator
            const timeDiff = utcDiff(outRun.timestamps[outRun.timestamps.length - 1]);

            // Determine if the run is from a VOD or is currently live
            const dateStr = outRun.vod ? outRun.date : "LIVE";
            
            // Format the VOD link with the specific timestamp
            const link = outRun.vod ? `href="${outRun.vod}?t=${outRun.timestamps[0].replace(":", "h").replace(":", "m")}s"` : "";
            
            // Add a pulse animation if the run is live and recent (within 15 mins)
            const liveClass = !outRun.vod && outRun.originalIndex === this.runs.length - 1 && timeDiff > 0 && timeDiff < 900
                ? 'class="live-run"' : "";

            runStr += `
            <div class="run-entry" style="border-bottom: 1px solid #30363d; padding: 10px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; width: 180px;">
                        #${outRun.originalIndex} - <a target="_blank" ${liveClass} ${link}>${dateStr} ${outRun.timestamps[0]}</a>
                    </span>
                    
                    <div class="run-bar-container" style="flex-grow: 1; margin: 0 15px; position: relative; height: 12px; display: flex; background: #161b22; border-radius: 6px; overflow: hidden;">
                        ${outRun.segments.map((s, i) => `
                            <div class="run-bar" 
                                 style="width: ${s.w * (RUNS_PER_MINUTE / 60)}px; background-color: ${s.color}; height: 100%;">
                            </div>`).join("")}
                    </div>

                    <span style="min-width: 120px; text-align: right; font-size: 0.9rem;">
                        ${outRun.deathIcon} <span style="color: #8b949e; margin-left: 8px;">${outRun.runTime}</span>
                    </span>
                </div>
            </div>
            `.replace(/>\n\s+/g, ">"); // Minify string slightly for performance
        }
        runElement.innerHTML += runStr;
    }
} 

function utcDiff(timeStr) {
    const [h, m, s] = timeStr.split(":").map(Number);
    const now = new Date();
    return (now.getUTCHours() - h) * 3600 + (now.getUTCMinutes() - m) * 60 + (s - now.getUTCSeconds() - s);
}

export const isDeadRun = (run) => {
    const netherLimit = 300; 
    const strongholdLimit = 900; 
    if (run.nether > netherLimit) return true;
    if (run.stronghold > strongholdLimit) return true;
    return false;
};