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

const RUNS_MARGIN = 220;
const RUNS_PER_MINUTE = 45;

export class Runlist {
    constructor(element, runs) {
        this.element = element;
        this.runs = runs;
        this.initElement();
        this.rebuildRuns();
    }

    initElement() {
        if (!this.element) {
        console.error("Runlist: Container element not found");
        return; 
    }
    this.element.style.textAlign = "left";
        this.element.style.textAlign = "left";
        this.element.innerHTML = `
            <div class="runs-settings" style="margin-bottom: 20px; display: flex; gap: 20px;">
                <label>Filter: 
                    <select class="runs-split-filter">
                        <option value="all">All Runs</option>
                        <option value="nether">Nether</option>
                        <option value="stronghold">Stronghold</option>
                        <option value="end">End</option>
                    </select>
                </label>
                <label>Sort: 
                    <select class="runs-sort">
                        <option value="score">Forsen Performance</option>
                        <option value="date">Date</option>
                    </select>
                </label>
            </div>
            <div class="runs"></div>
        `;

        this.element.querySelector(".runs-split-filter").onchange = () => this.rebuildRuns();
        this.element.querySelector(".runs-sort").onchange = () => this.rebuildRuns();
    }

    rebuildRuns() {
        const runElement = this.element.querySelector(".runs");
        if (!runElement) return;

        // 1. FILTER AND SCORE
        let processedRuns = this.runs.map((run, r) => {
            // Calculate Score
            let score = 0;
            if (run.end) score += 5000;
            if (run.stronghold) score += 1000;
            if (run.blind) score += 500;
            if (run.nether && run.nether < 180) score += 200;

            // Prepare Segments (The fix for the .map error)
            const lastTime = seconds(run.runTime);
            const segments = [
                { w: run.nether || lastTime, color: "#55ee55" },
                { w: run.nether ? (run.stronghold ? run.stronghold - run.nether : lastTime - run.nether) : 0, color: C_NETHER },
                { w: run.stronghold ? (run.end ? run.end - run.stronghold : lastTime - run.stronghold) : 0, color: C_STRONGHOLD },
                { w: run.end ? (lastTime - run.end) : 0, color: C_END }
            ].filter(s => s.w > 0);

            return { ...run, segments, forsenScore: score, originalIndex: r };
        });

        // 2. APPLY FILTER
        const filter = this.element.querySelector(".runs-split-filter").value;
        if (filter !== "all") {
            processedRuns = processedRuns.filter(run => !!run[filter]);
        }

        // 3. APPLY SORT
        const sort = this.element.querySelector(".runs-sort").value;
        if (sort === "date") {
            processedRuns.sort((a, b) => b.originalIndex - a.originalIndex);
        } else {
            processedRuns.sort((a, b) => b.forsenScore - a.forsenScore);
        }

        // 4. RENDER
        runElement.innerHTML = processedRuns.map(outRun => {
            const dateStr = outRun.vod ? outRun.date : "LIVE";
            const link = outRun.vod ? `href="${outRun.vod}?t=${outRun.timestamps[0].replace(/:/g, s => s === ':' ? 'h' : 'm')}s"` : "";
            
            return `
            <div class="run-entry" style="border-bottom: 1px solid #30363d; padding: 12px 0; display: flex; align-items: center;">
                <span style="width: 160px; font-size: 0.85rem;">
                    #${outRun.originalIndex} - <a target="_blank" ${link}>${dateStr}</a>
                </span>
                <div style="flex-grow: 1; height: 10px; display: flex; background: #161b22; border-radius: 5px; overflow: hidden; margin: 0 15px;">
                    ${outRun.segments.map(s => `
                        <div style="width: ${s.w * (RUNS_PER_MINUTE / 60)}px; background-color: ${s.color}; height: 100%;"></div>
                    `).join("")}
                </div>
                <span style="width: 80px; text-align: right; font-size: 0.85rem; color: #8b949e;">
                    ${outRun.runTime}
                </span>
            </div>`;
        }).join("");
    }
}

function utcDiff(timeStr) {
    const [h, m, s] = timeStr.split(":").map(Number);
    const now = new Date();
    return (now.getUTCHours() - h) * 3600 + (now.getUTCMinutes() - m) * 60 + (s - now.getUTCSeconds());
}

export const isDeadRun = (run) => {
    if (run.nether > 300) return true;
    if (run.stronghold > 900) return true;
    return false;
};