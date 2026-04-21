import { fitLogNormal, getSplits } from "./helpers/runhelper.js";

function reduceSum(obj) { return Object.values(obj).reduce((a, b) => a + b, 0); }

export function buildOdds(runs) {
    // <-- NEW: Added finish to the array
    const [counts, nether, s1, s2, blind, strong, end, finish] = getSplits(runs);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    
    // <-- NEW: Added finish to splits and labels
    const splits = [nether, s1, s2, blind, strong, end, finish];
    const labels = ["Nether", "Struct 1", "Struct 2", "Blind", "Stronghold", "End", "Finish"];
    
    const row = document.getElementById("odds-chance");

    if (row && total > 0) {
        row.innerHTML = `
            <tr>
                <th title="The major stages of the Minecraft speedrun">Stage</th>
                <th title="The total amount of runs that successfully reached this point">Runs Survived</th>
                <th title="The overall % chance of a run making it this far">Survival Rate</th>
            </tr>
        ` + splits.map((s, i) => {
            const num = Object.values(s).flat().length;
            const p = ((num / total) * 100).toFixed(2); 
            return `<tr>
                <td>${labels[i]}</td>
                <td>${num}</td>
                <td style="font-weight:bold; color: #58a6ff;">${p}%</td>
            </tr>`;
        }).join("");
    }
}

function calculateDaysToRecord(runsSubset) {
    // Introduce Pace Filtering on xQc's record (14:27)
    // For a run to be on pace, the nether exit (blind) should be before 10 minutes at the absolute latest.
    const [counts, , , , blinds] = getSplits(runsSubset);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const blindTimes = Object.values(blinds).flat();
    
    if (blindTimes.length === 0 || total === 0) return null;

    // 10 minutes = 600 seconds
    // EDIT: Asked professional speedrunner @metser (twitch.tv/metser) and we came out at 630 seconds cutoff
    const PACE_CUTOFF_SECONDS = 630;
    const recordPaceBlinds = blindTimes.filter(time => time <= PACE_CUTOFF_SECONDS);

    // Streams/days multiplier
    const avgRunsPerStream = total / Math.max(1, Object.keys(counts).length);

    // Conversion: if he gets a sub-10 nether exit, how often does it become a god run?
    // Based on historical data, 4 End entries out of ~80 blind exits is roughly a 5% raw conversion.
    // Cut in half to 2.5% to account for throwing the dragon fight, bad perches, and bed cycle fails.
    const CONVERSION_RATE = 0.025; 
    
    // Chances of getting a run that is both on pace AND successfully converts
    const pRecordPace = recordPaceBlinds.length / total;
    const pRec = pRecordPace * CONVERSION_RATE;
    
    if (pRec === 0) return null;
    
    // Normal distribution
    let d10 = 0, d50 = 0, d99 = 0, cum = 0;
    while (cum < 0.99 && d99 < 5000) {
        d99++;
        cum = 1 - Math.pow(1 - pRec, avgRunsPerStream * d99);
        if (cum < 0.1) d10++;
        if (cum < 0.5) d50++;
    }

    // Return the estimated dates
    return { d10, d50, d99 };
}

export function buildPredictions(runs) {
    // 1. Calculate current prediction
    const currentPred = calculateDaysToRecord(runs);
    if (!currentPred) return;

    // 2. Find runs from the most recent day to separate them
    const latestDate = runs[runs.length - 1].date;
    const previousRuns = runs.filter(r => r.date !== latestDate);
    
    // 3. Calculate what the prediction WAS before the latest stream
    const previousPred = calculateDaysToRecord(previousRuns);

    // 4. Format dates for the UI
    const format = (d) => {
        const date = new Date(); date.setDate(date.getDate() + d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const hDate = document.getElementById("hero-date");
    const hTrend = document.getElementById("hero-trend");
    
    const dAfter = document.getElementById("date-after");
    const dBefore = document.getElementById("date-before");
    const hProb = document.getElementById("hero-prob");

    if (hDate) hDate.textContent = format(currentPred.d50);
    if (dAfter) dAfter.textContent = format(currentPred.d10);
    if (dBefore) dBefore.textContent = format(currentPred.d99);
    if (hProb) hProb.textContent = `99% confidence reached in ${currentPred.d99} days`;

    // 5. Inject the Neon Green/Red Arrow
    if (hTrend && previousPred) {
        const diff = currentPred.d50 - previousPred.d50;
        if (diff < 0) {
            hTrend.textContent = `(↓ ${Math.abs(diff)} days shaved off the grind! Doubters?)`;
            hTrend.className = "trend-indicator trend-good";
        } else if (diff > 0) {
            hTrend.textContent = `(↑ ${diff} days added to grind)`;
            hTrend.className = "trend-indicator trend-bad";
        } else {
            hTrend.textContent = "(No Change in pace)";
            hTrend.className = "trend-indicator";
            hTrend.style.color = "#8b949e";
            hTrend.style.textShadow = "none";
        }
    }
}