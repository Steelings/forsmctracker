export const C_OVERWORLD = "#55ee62";
export const C_NETHER = "#ee5555";
export const C_BASTION = "#f6d32d"; 
export const C_FORT = "#7a0000";
export const C_BLIND = "#16e9e9"; 
export const C_STRONGHOLD = "#558877";
export const C_END = "#eeaa55";
export const C_FINISH = "#aaaaff";

// Push a value to an array in an object of arrays, creating the array if it doesn't exist
export function pushOrCreate(obj, key, val) {
    if (obj[key] === undefined) obj[key] = [];
    obj[key].push(val);
}

// Format a number of seconds as MM:SS, rounding to the nearest second
export function formatMMSS(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return "";
    const s = Math.round(totalSeconds); // ticks are fine as whole seconds
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// Convert a run timer to total seconds as a number
export function seconds(timer) {
    if (!timer) return 0;
    
    // Split on BOTH colons and dots
    const split = timer.toString().split(/[.:]/); 
    
    if (split.length === 3) {
        // Format: MM:SS.ms (e.g. 16:59.561)
        return Number(split[0]) * 60 + Number(split[1]) + Number(split[2]) / 1000;
    } else if (split.length === 2) {
        // Format: MM:SS (e.g. 17:10)
        return Number(split[0]) * 60 + Number(split[1]);
    }
    return 0;
}

// Convert minutes and seconds strings to total seconds, with basic validation
export function toSeconds(strMin, strSec) {
    return Math.max(Number(strMin || 0), 0) * 60
         + clamp(Number(strSec || 0), 0, 59);
}

// Clamp n to the range [lo, hi]
export function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
}