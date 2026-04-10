// Worker: receives { jobId, candidates, letterBoxes, blocks, filterByBlocks }
// and returns { jobId, results: [{word, match}] }

function matchBlocksForWord(word, blocks, letterBoxesLocal) {
    if (!blocks || blocks.length === 0) return { placements: [], count: 0, totalLength: 0 };
    const positions = blocks.map(block => {
        const starts = [];
        const bl = block.length;
        for (let i = 0; i <= word.length - bl; i++) {
            if (word.substr(i, bl) !== block) continue;
            let hit = false;
            for (let k = i; k < i + bl; k++) {
                if (letterBoxesLocal[k] && letterBoxesLocal[k] !== '') { hit = true; break; }
            }
            if (!hit) starts.push(i);
        }
        return starts;
    });
    if (positions.every(p => p.length === 0)) return { placements: [], count: 0, totalLength: 0 };
    const n = blocks.length;
    const order = Array.from({ length: n }, (_, i) => i)
        .sort((a, b) => {
            const la = blocks[a].length, lb = blocks[b].length;
            if (lb !== la) return lb - la;
            return positions[a].length - positions[b].length;
        });
    let best = { placements: [], count: 0, totalLength: 0 };
    const used = [];
    function overlapsRange(s, e) {
        for (const u of used) { if (!(e < u.start || s > u.end)) return true; }
        return false;
    }
    function backtrack(idx, cur, curLen) {
        if (idx === order.length) {
            if (cur.length > best.count || (cur.length === best.count && curLen > best.totalLength))
                best = { placements: cur.slice(), count: cur.length, totalLength: curLen };
            return;
        }
        const bi = order[idx];
        const bl = blocks[bi].length;
        for (const s of positions[bi]) {
            const e = s + bl - 1;
            if (overlapsRange(s, e)) continue;
            used.push({ start: s, end: e });
            cur.push({ blockIndex: bi, start: s, length: bl });
            backtrack(idx + 1, cur, curLen + bl);
            cur.pop(); used.pop();
        }
        backtrack(idx + 1, cur, curLen);
    }
    backtrack(0, [], 0);
    return best;
}

self.onmessage = function(e) {
    const { jobId, candidates, letterBoxes, blocks, filterByBlocks } = e.data;
    const results = [];
    for (let i = 0; i < candidates.length; i++) {
        const w = candidates[i];
        // we assume candidates were already filtered by simple pattern match
        const match = matchBlocksForWord(w, blocks, letterBoxes);
        if (filterByBlocks && match.count === 0) continue;
        results.push({ word: w, match });
    }
    self.postMessage({ jobId, results });
};
