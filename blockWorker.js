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

// A block may be used FULLY (whole sequence, contiguous) or PARTIALLY (one of its letters,
// the rest left over). Full uses are chosen first and preferred; remaining blocks then lend a
// single letter into still-free positions via bipartite matching.
// Returns { placements:[{blockIndex,start,length,partial,leftover?}], count, fullCount, totalLength }.
function matchBlocksForWord(word, blocks, filledPrefix) {
    if (!blocks || blocks.length === 0) return { placements: [], count: 0, fullCount: 0, totalLength: 0 };
    const n = blocks.length;

    // 1) Best set of non-overlapping FULL placements (maximize count, then letters).
    const fullPositions = blocks.map(block => {
        const starts = [];
        const bl = block.length;
        for (let i = 0; i <= word.length - bl; i++) {
            if (word.startsWith(block, i) && !hasFilledInRange(filledPrefix, i, bl)) starts.push(i);
        }
        return starts;
    });
    const order = Array.from({ length: n }, (_, i) => i)
        .sort((a, b) => {
            const la = blocks[a].length, lb = blocks[b].length;
            if (lb !== la) return lb - la;
            return fullPositions[a].length - fullPositions[b].length;
        });
    let bestFull = { placements: [], count: 0, totalLength: 0 };
    const used = [];
    function overlapsRange(s, e) {
        for (const u of used) { if (!(e < u.start || s > u.end)) return true; }
        return false;
    }
    function backtrack(idx, cur, curLen) {
        if (idx === order.length) {
            if (cur.length > bestFull.count || (cur.length === bestFull.count && curLen > bestFull.totalLength))
                bestFull = { placements: cur.slice(), count: cur.length, totalLength: curLen };
            return;
        }
        const bi = order[idx];
        const bl = blocks[bi].length;
        for (const s of fullPositions[bi]) {
            const e = s + bl - 1;
            if (overlapsRange(s, e)) continue;
            used.push({ start: s, end: e });
            cur.push({ blockIndex: bi, start: s, length: bl, partial: false });
            backtrack(idx + 1, cur, curLen + bl);
            cur.pop(); used.pop();
        }
        backtrack(idx + 1, cur, curLen);
    }
    backtrack(0, [], 0);

    // 2) Lend a single letter from each not-yet-used block into a free position.
    const placements = bestFull.placements.slice();
    const occupied = new Array(word.length).fill(false);
    for (const p of placements) for (let i = p.start; i < p.start + p.length; i++) occupied[i] = true;
    for (let i = 0; i < word.length; i++) if (hasFilledInRange(filledPrefix, i, 1)) occupied[i] = true;

    const usedBlock = new Array(n).fill(false);
    for (const p of placements) usedBlock[p.blockIndex] = true;
    const freePos = [];
    for (let i = 0; i < word.length; i++) if (!occupied[i]) freePos.push(i);

    if (freePos.length) {
        const blockLetterSet = blocks.map(b => new Set(b.split('')));
        const posOwner = new Map();
        function tryAssign(bi, seen) {
            for (const pos of freePos) {
                if (seen.has(pos) || !blockLetterSet[bi].has(word[pos])) continue;
                seen.add(pos);
                if (!posOwner.has(pos) || tryAssign(posOwner.get(pos), seen)) {
                    posOwner.set(pos, bi);
                    return true;
                }
            }
            return false;
        }
        for (let bi = 0; bi < n; bi++) {
            if (!usedBlock[bi] && blocks[bi].length >= 2) tryAssign(bi, new Set());
        }
        for (const [pos, bi] of posOwner.entries()) {
            const ch = word[pos];
            const at = blocks[bi].indexOf(ch);
            const leftover = blocks[bi].slice(0, at) + blocks[bi].slice(at + 1);
            placements.push({ blockIndex: bi, start: pos, length: 1, partial: true, leftover });
        }
    }

    let totalLength = 0;
    for (const p of placements) totalLength += p.length;
    return { placements, count: placements.length, fullCount: bestFull.count, totalLength };
}

self.onmessage = function(e) {
    const { jobId, candidates, letterBoxes, blocks, filterByBlocks, soft, softTotal, softReq, softReqTotal, softFilter } = e.data;
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
        for (let k = 0; k < softArr.length; k++) { if (softArr[k] && w[k] === softArr[k]) softScore++; }
        if (softFilter) {
            if (softReqCount > 0) {
                let ok = true;
                for (let k = 0; k < softReqArr.length; k++) { if (softReqArr[k] && w[k] !== softReqArr[k]) { ok = false; break; } }
                if (!ok) continue;
            } else if (softCount > 0 && softScore !== softCount) continue;
        }
        const match = blocks.length
            ? matchBlocksForWord(w, blocks, filledPrefix)
            : { placements: [], count: 0, fullCount: 0, totalLength: 0 };
        if (filterByBlocks && match.count === 0) continue;
        results.push({ word: w, match, softScore, softFull: softCount > 0 && softScore === softCount });
    }
    self.postMessage({ jobId, results });
};
