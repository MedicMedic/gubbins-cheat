// Worker: receives { jobId, candidates, letterBoxes, blocks, filterByBlocks }
// and returns { jobId, results: [{word, match}] }

function matchesPattern(word, boxes) {
    if (word.length !== boxes.length) return false;
    for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (!b) continue;
        if (word[i] !== b.toLowerCase()) return false;
    }
    return true;
}

function buildFilledPrefix(letterBoxesLocal) {
    const prefix = new Array(letterBoxesLocal.length + 1).fill(0);
    for (let i = 0; i < letterBoxesLocal.length; i++) {
        prefix[i + 1] = prefix[i] + (letterBoxesLocal[i] && letterBoxesLocal[i] !== '' ? 1 : 0);
    }
    return prefix;
}

function hasFilledInRange(prefix, start, length) {
    return (prefix[start + length] - prefix[start]) > 0;
}

function matchBlocksForWord(word, blocks, filledPrefix) {
    if (!blocks || blocks.length === 0) return { placements: [], count: 0, totalLength: 0 };
    const positions = blocks.map(block => {
        const starts = [];
        const bl = block.length;
        for (let i = 0; i <= word.length - bl; i++) {
            if (!word.startsWith(block, i)) continue;
            if (!hasFilledInRange(filledPrefix, i, bl)) starts.push(i);
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
    const filledPrefix = buildFilledPrefix(letterBoxes);
    const results = [];
    for (let i = 0; i < candidates.length; i++) {
        const w = candidates[i];
        if (!matchesPattern(w, letterBoxes)) continue;
        // Fast gate: skip expensive placement search when no block appears at all.
        let maybeHasBlock = false;
        for (let j = 0; j < blocks.length; j++) {
            if (w.indexOf(blocks[j]) !== -1) { maybeHasBlock = true; break; }
        }
        const match = maybeHasBlock
            ? matchBlocksForWord(w, blocks, filledPrefix)
            : { placements: [], count: 0, totalLength: 0 };
        if (filterByBlocks && match.count === 0) continue;
        results.push({ word: w, match });
    }
    self.postMessage({ jobId, results });
};
