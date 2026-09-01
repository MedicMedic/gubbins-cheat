// Worker: receives { jobId, candidates, letterBoxes, blocks, blockMasks, filterByBlocks,
// soft, softTotal, softReq, softReqTotal, softFilter }
// and returns { jobId, results: [{word, match, softScore, softFull}] }
// All matching logic lives in matcher.js, shared with the main thread.

importScripts('matcher.js');

self.onmessage = function(e) {
    const { jobId, candidates, letterBoxes, blocks, blockMasks, filterByBlocks, soft, softTotal, softReq, softReqTotal, softFilter } = e.data;
    const filledPrefix = buildFilledPrefix(letterBoxes);
    const softArr = soft || [];
    const softCount = softTotal || 0;
    const softReqArr = softReq || [];
    const softReqCount = softReqTotal || 0;
    const results = [];
    for (let i = 0; i < candidates.length; i++) {
        const w = candidates[i];
        if (!matchesPattern(w, letterBoxes)) continue;
        // Soft "base" letters: count matches for ranking; optionally filter. When some ghosts are
        // marked required, the filter requires only those; otherwise it requires all soft letters.
        let softScore = 0;
        for (let k = 0; k < softArr.length; k++) { if (softArr[k] && (softArr[k] === '?' || w[k] === softArr[k])) softScore++; }
        if (softFilter) {
            if (softReqCount > 0) {
                let ok = true;
                for (let k = 0; k < softReqArr.length; k++) { if (softReqArr[k] && softReqArr[k] !== '?' && w[k] !== softReqArr[k]) { ok = false; break; } }
                if (!ok) continue;
            } else if (softCount > 0 && softScore !== softCount) continue;
        }
        const match = blocks.length
            ? matchBlocksForWord(w, blocks, filledPrefix, null, blockMasks)
            : { placements: [], count: 0, fullCount: 0, totalLength: 0 };
        if (filterByBlocks && match.count === 0) continue;
        results.push({ word: w, match, softScore, softFull: softCount > 0 && softScore === softCount });
    }
    self.postMessage({ jobId, results });
};
