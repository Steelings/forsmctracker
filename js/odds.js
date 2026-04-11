import { C_NETHER, C_BASTION, C_BLIND, C_END, C_FORT, C_STRONGHOLD } from "./helpers/utils.js";
import { fitLogNormal, getSplits, logNormalCdfSeconds } from "./helpers/runhelper.js";

function reduceSum(obj) { return Object.values(obj).reduce((a, b) => a + b, 0); }
function reduceLen(obj) { return Object.values(obj).reduce((a, b) => a + b.length, 0); }

export function buildOdds(runs) {
    const [counts, nether, s1, s2, blind, strong, end] = getSplits(runs);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const splits = [nether, s1, s2, blind, strong, end];
    const labels = ["Nether", "Struct 1", "Struct 2", "Blind", "Stronghold", "End"];
    const row = document.getElementById("odds-chance");

    if (row && total > 0) {
        row.innerHTML = `<tr><th>Split</th><th>Runs</th><th>Success %</th></tr>` + splits.map((s, i) => {
            const num = Object.values(s).flat().length;
            const p = ((num / total) * 100).toFixed(2); 
            return `<tr><td>${labels[i]}</td><td>${num}</td><td style="font-weight:bold">${p}%</td></tr>`;
        }).join("");
    }
}

export function buildPredictions(runs) {
    const [counts, , , , blinds] = getSplits(runs);
    const total = reduceSum(counts);
    const blindTimes = Object.values(blinds).flat();
    const fit = fitLogNormal(blindTimes);
    if (!fit || total === 0) return;

    const avgRuns = total / Object.keys(counts).length;
    const pRec = (blindTimes.length / total) * 0.0125; 

    let d10 = 0, d50 = 0, d99 = 0, cum = 0;
    while (cum < 0.99 && d99 < 5000) {
        d99++;
        cum = 1 - Math.pow(1 - pRec, avgRuns * d99);
        if (cum < 0.1) d10++;
        if (cum < 0.5) d50++;
    }

    const format = (d) => {
        const date = new Date(); date.setDate(date.getDate() + d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const hDate = document.getElementById("hero-date");
    const hProb = document.getElementById("hero-prob");
    const dAfter = document.getElementById("date-after");
    const dBefore = document.getElementById("date-before");

    if (hDate) hDate.textContent = format(d50);
    if (dAfter) dAfter.textContent = format(d10);
    if (dBefore) dBefore.textContent = format(d99);
    // FIXED: Changed d99_days to d99
    if (hProb) hProb.textContent = `99% confidence reached in ${d99} days`;
}