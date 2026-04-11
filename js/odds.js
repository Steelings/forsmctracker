export function buildPredictions(runs) {
    const [totalRunCount, , , , blinds] = getSplits(runs);
    const totalCount = reduceToSum(totalRunCount);
    const avgDayRuns = totalCount / Object.keys(totalRunCount).length;
    const blindCount = reduceToLength(blinds);
    const chanceBlindPerRun = blindCount / totalCount;
    const blindFit = fitLogNormal(Object.values(blinds).flat());

    const RECORD_TIME = 14 * 60 + 27;
    const BLIND_TO_STRONGHOLD_TIME = 120;
    const BLIND_TO_STRONGHOLD_P = 0.25;
    const STRONGHOLD_TO_END_TIME = 60;
    const STRONGHOLD_TO_END_P = 0.70;
    const END_TO_FINISH_TIME = 120;
    const END_TO_FINISH_P = 0.25;

    const requiredBlindTime = RECORD_TIME - (BLIND_TO_STRONGHOLD_TIME + STRONGHOLD_TO_END_TIME + END_TO_FINISH_TIME);
    const pBlindFastEnough = logNormalCdfSeconds(requiredBlindTime, blindFit.mu, blindFit.sigma);
    const pRecordPerBlind = pBlindFastEnough * BLIND_TO_STRONGHOLD_P * STRONGHOLD_TO_END_P * END_TO_FINISH_P;
    const pRecordPerRun = chanceBlindPerRun * pRecordPerBlind;

    let daysCumulative10 = 0, daysCumulative50 = 0, daysCumulative90 = 0, cumulative = 0;
    while (cumulative < 0.9 && daysCumulative90 < 10000) {
        if (cumulative < 0.1) daysCumulative10++;
        if (cumulative < 0.5) daysCumulative50++;
        daysCumulative90++;
        cumulative = 1 - Math.pow(1 - pRecordPerRun, avgDayRuns * daysCumulative90);
    }

    const date10 = new Date(); date10.setDate(date10.getDate() + daysCumulative10);
    const date50 = new Date(); date50.setDate(date50.getDate() + daysCumulative50);
    const date90 = new Date(); date90.setDate(date90.getDate() + daysCumulative90);

    // FILL THE NEW HERO CARD
    document.getElementById("hero-date").textContent = date50.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    document.getElementById("hero-prob").textContent = `50% Probability based on ${totalCount} recorded runs`;
    document.getElementById("date-after").textContent = date10.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    document.getElementById("date-before").textContent = date90.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}