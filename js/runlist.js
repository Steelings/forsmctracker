import { seconds, C_NETHER, C_STRONGHOLD, C_END } from "./helpers/utils.js";

const RUNS_PER_MINUTE = 45;

function getDeathDetails(deathString) {
    if (!deathString) return null; 
    const d = deathString.toLowerCase();
    if (d.includes("lava")) return { text: "Lava", img: "static/forsenHoppedin.webp" };
    if (d.includes("fell") || d.includes("ground") || d.includes("high place")) return { text: "Gravity", img: "static/forsenGravity.webp" };
    if (d.includes("piglin")) return { text: "Piglins", img: "static/piglin.webp" };
    if (d.includes("hoglin")) return { text: "Hoglins", img: "static/hoglin.webp" };
    if (d.includes("blaze")) return { text: "Blazes", img: "static/blaze.webp" };
    if (d.includes("burned") || d.includes("fire")) return { text: "Fire", img: "static/forsenFire.webp" };
    if (d.includes("skel")) return { text: "Skeletons", img: "static/skeleton.webp" };
    if (d.includes("wither")) return { text: "Wither", img: "static/wither.webp" };
    if (d.includes("drown") || d.includes("swim")) return { text: "Drowned", img: "static/forsenSwim.webp" };
    return null;
}

export class Runlist {
    constructor(element, runs) {
        this.element = element;
        this.runs = runs;
        this.initElement();
        this.rebuildRuns();
    }

    initElement() {
        if (!this.element) {
            console.error("Runlist: element not found!");
            return;
        }
        this.element.style.textAlign = "left";
        this.element.innerHTML = `
            <div class="runs-settings" style="margin-bottom: 20px; display: flex; gap: 20px;">
                <label style="color: #8b949e; font-size: 0.9rem;">Filter: 
                    <select class="runs-split-filter" style="background: #21262d; color: white; border: 1px solid #30363d; padding: 5px; border-radius: 4px; margin-left: 5px;">
                        <option value="all">All Runs</option>
                        <option value="nether">Nether</option>
                        <option value="stronghold">Stronghold</option>
                        <option value="end">End</option>
                    </select>
                </label>
                <label style="color: #8b949e; font-size: 0.9rem;">Sort: 
                    <select class="runs-sort" style="background: #21262d; color: white; border: 1px solid #30363d; padding: 5px; border-radius: 4px; margin-left: 5px;">
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

        let processedRuns = this.runs.map((run, r) => {
            let score = 0;
            if (run.end) score += 5000;
            if (run.stronghold) score += 1000;
            if (run.blind) score += 500;
            if (run.nether && run.nether < 180) score += 200;

            const lastTime = seconds(run.runTime);
            const segments = [
                { w: run.nether || lastTime, color: "#55ee55" }, 
                { w: run.nether ? (run.stronghold ? run.stronghold - run.nether : lastTime - run.nether) : 0, color: C_NETHER },
                { w: run.stronghold ? (run.end ? run.end - run.stronghold : lastTime - run.stronghold) : 0, color: C_STRONGHOLD },
                { w: run.end ? (lastTime - run.end) : 0, color: C_END }
            ].filter(s => s.w > 0);

            const deathData = getDeathDetails(run.death);

            return { ...run, segments, forsenScore: score, originalIndex: r, deathData };
        });

        const filter = this.element.querySelector(".runs-split-filter").value;
        if (filter !== "all") {
            processedRuns = processedRuns.filter(run => !!run[filter]);
        }

        const sort = this.element.querySelector(".runs-sort").value;
        if (sort === "date") {
            processedRuns.sort((a, b) => b.originalIndex - a.originalIndex);
        } else {
            processedRuns.sort((a, b) => b.forsenScore - a.forsenScore);
        }

        runElement.innerHTML = processedRuns.map(outRun => {
            const dateStr = outRun.vod ? outRun.date : "LIVE";
            
            // Updated Twitch URL generation
            let link = "";
            if (outRun.vod && outRun.timestamps && outRun.timestamps.length > 0) {
                const lastStamp = outRun.timestamps[outRun.timestamps.length - 1];
                const parts = lastStamp.split(':').map(Number); // Split and convert to math numbers
                
                let totalSeconds = 0;
                if (parts.length === 3) {
                    totalSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
                } else if (parts.length === 2) {
                    totalSeconds = (parts[0] * 60) + parts[1];
                }

                // Subtract 10 seconds (Math.max prevents it from going into negative time)
                totalSeconds = Math.max(0, totalSeconds - 10);

                // Convert back to Hours, Minutes, Seconds
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;

                // Format for Twitch (only include hours if it's over 1 hour)
                const tStr = h > 0 ? `${h}h${m}m${s}s` : `${m}m${s}s`;
                link = `href="${outRun.vod}?t=${tStr}"`;
            }
            
            // Updated default Reset logic
            const deathText = outRun.deathData ? outRun.deathData.text : "Reset";
            const deathImg = outRun.deathData ? outRun.deathData.img : "static/forsenLoading-4x.webp";
            
            const deathHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-right: 20px; color: #8b949e; font-size: 0.8rem;" title="${outRun.death || "Manual Reset"}">
                    <span>${deathText}</span>
                    <img src="${deathImg}" width="24" height="24" alt="${deathText}" style="border-radius: 4px;">
                </div>
            `;

            return `
            <div class="run-entry" style="border-bottom: 1px solid #30363d; padding: 12px 0; display: flex; align-items: center;">
                
                <span style="width: 130px; font-size: 0.85rem; flex-shrink: 0;">
                    <span style="color: #8b949e;">#${outRun.originalIndex}</span> - 
                    <a target="_blank" ${link} style="color: #58a6ff; text-decoration: none;">${dateStr}</a>
                </span>
                
                <div style="flex-grow: 1; height: 8px; display: flex; background: #21262d; border-radius: 4px; overflow: hidden; margin: 0 20px;">
                    ${outRun.segments.map(s => `
                        <div style="width: ${s.w * (RUNS_PER_MINUTE / 60)}px; background-color: ${s.color}; height: 100%;"></div>
                    `).join("")}
                </div>

                ${deathHTML}

                <span style="width: 70px; text-align: right; font-size: 0.9rem; color: #f0f6fc; flex-shrink: 0; font-weight: bold;">
                    ${outRun.runTime}
                </span>
            </div>`;
        }).join("");
    }
}