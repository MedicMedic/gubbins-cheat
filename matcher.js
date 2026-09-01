// Shared block-placement matcher, used by both the page (index.html) and blockWorker.js
// (via importScripts). Keep all matching logic here so the two never drift apart.

// Fast pattern matcher without RegExp allocation. A '?' box is a pencil: some letter will be
// written there, so it matches any letter (but still counts as a filled cell for placement).
function matchesPattern(word, boxes) {
    if (word.length !== boxes.length) return false;
    for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (!b || b === '?') continue;
        if (word[i] !== b.toLowerCase()) return false;
    }
    return true;
}

// Wildcard-aware startsWith: does `block` fit the word at position i? A '?' in a block is a
// pencil letter that matches anything.
function blockMatchesAt(word, block, i) {
    if (i < 0 || i + block.length > word.length) return false;
    for (let j = 0; j < block.length; j++) {
        const c = block[j];
        if (c !== '?' && word[i + j] !== c) return false;
    }
    return true;
}

// Can this block lend the single letter `ch`? True if the letter is in the block, or the block
// holds a pencil ('?') that can be written as `ch`.
function blockHasLetter(block, ch) {
    return block.indexOf(ch) !== -1 || block.indexOf('?') !== -1;
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

// A per-block letter mask from disabled letters: null = unrestricted; otherwise the whole tile
// can't be placed (a disabled letter wouldn't be used) and only `allowed` letters can be borrowed.
function buildBlockMask(block) {
    const dis = block && block.disabled;
    if (!dis || dis.length === 0) return null;
    const allowed = [];
    for (let i = 0; i < block.text.length; i++) if (!dis.includes(i)) allowed.push(block.text[i]);
    return { wholeAllowed: false, allowed };
}

// Block-placement matcher. A block may be used FULLY (its whole sequence, contiguous) or
// PARTIALLY (one of its letters, the rest left over). Full uses are chosen first and always
// preferred; remaining blocks then lend a single letter into still-free positions via
// bipartite matching.
// Returns { placements:[{blockIndex,start,length,partial,leftover?}], count, fullCount, totalLength }.
// `forced` (optional): { blockIndex: {start,length} } — manual "use this letter here" choices
// that are pre-placed; the remaining blocks are then optimized around them.
// `masks` (optional): per-block { wholeAllowed, allowed } from disabled letters (or null entries).
function matchBlocksForWord(word, blocks, filledPrefix, forced, masks) {
    if (!blocks || blocks.length === 0) return { placements: [], count: 0, fullCount: 0, totalLength: 0 };
    const n = blocks.length;

    function leftoverOf(bi, start, length) {
        if (length === blocks[bi].length) return '';
        const ch = word[start];
        let at = blocks[bi].indexOf(ch);
        if (at < 0) at = blocks[bi].indexOf('?'); // the pencil was written as this letter
        return at >= 0 ? blocks[bi].slice(0, at) + blocks[bi].slice(at + 1) : blocks[bi];
    }

    const occupied = new Array(word.length).fill(false);
    for (let i = 0; i < word.length; i++) if (hasFilledInRange(filledPrefix, i, 1)) occupied[i] = true;

    // --- 0) Pre-place any forced (user-chosen) placements ---
    // An override of { off:true } means "don't use this block in this word at all" — it gets
    // neither a full placement nor an auto-lent letter, so saving won't force it onto the board.
    const placements = [];
    const isForced = new Array(n).fill(false);
    const offBlock = new Array(n).fill(false);
    if (forced) {
        for (const key in forced) {
            const bi = +key;
            if (bi < 0 || bi >= n) continue;
            const f = forced[key];
            if (f && f.off) { isForced[bi] = true; offBlock[bi] = true; continue; }
            const { start, length } = f;
            for (let i = start; i < start + length; i++) if (i >= 0 && i < word.length) occupied[i] = true;
            placements.push({ blockIndex: bi, start, length, partial: length !== blocks[bi].length, leftover: leftoverOf(bi, start, length) });
            isForced[bi] = true;
        }
    }

    // --- 1) Best set of non-overlapping FULL placements for the remaining blocks ---
    const fullPositions = blocks.map((block, bi) => {
        const starts = [];
        if (isForced[bi]) return starts;
        if (masks && masks[bi] && !masks[bi].wholeAllowed) return starts; // disabled letter ⇒ no whole-tile use
        const bl = block.length;
        for (let i = 0; i <= word.length - bl; i++) {
            let ok = true;
            for (let j = 0; j < bl; j++) if (occupied[i + j]) { ok = false; break; }
            if (ok && blockMatchesAt(word, block, i)) starts.push(i);
        }
        return starts;
    });
    const order = [];
    for (let i = 0; i < n; i++) if (!isForced[i]) order.push(i);
    order.sort((a, b) => {
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
    for (const p of bestFull.placements) placements.push(p);

    // --- 2) Lend a single letter from each not-yet-used block into a free position ---
    for (const p of placements) for (let i = p.start; i < p.start + p.length; i++) occupied[i] = true;
    const usedBlock = new Array(n).fill(false);
    for (const p of placements) usedBlock[p.blockIndex] = true;
    const freePos = [];
    for (let i = 0; i < word.length; i++) if (!occupied[i]) freePos.push(i);

    if (freePos.length) {
        const blockLetterSet = blocks.map((b, bi) => (masks && masks[bi]) ? new Set(masks[bi].allowed) : new Set(b.split('')));
        const posOwner = new Map(); // free position -> blockIndex it currently lends to
        function tryAssign(bi, seen) {
            for (const pos of freePos) {
                if (seen.has(pos) || !(blockLetterSet[bi].has(word[pos]) || blockLetterSet[bi].has('?'))) continue;
                seen.add(pos);
                if (!posOwner.has(pos) || tryAssign(posOwner.get(pos), seen)) {
                    posOwner.set(pos, bi);
                    return true;
                }
            }
            return false;
        }
        for (let bi = 0; bi < n; bi++) {
            if (!usedBlock[bi] && !offBlock[bi] && blocks[bi].length >= 2) tryAssign(bi, new Set());
        }
        for (const [pos, bi] of posOwner.entries()) {
            placements.push({ blockIndex: bi, start: pos, length: 1, partial: true, leftover: leftoverOf(bi, pos, 1) });
        }
    }

    let totalLength = 0, fullCount = 0;
    for (const p of placements) { totalLength += p.length; if (!p.partial) fullCount++; }
    return { placements, count: placements.length, fullCount, totalLength };
}

// All candidate placements (full + single-letter) for one block in a word, given which
// positions are already taken by filled boxes and the OTHER blocks' current placements.
function candidatePlacementsForBlock(word, blocks, bi, occupied, mask) {
    const block = blocks[bi], bl = block.length, cands = [];
    if (!(mask && !mask.wholeAllowed)) {                  // full (skipped if a letter is disabled)
        for (let i = 0; i <= word.length - bl; i++) {
            let ok = true;
            for (let j = 0; j < bl; j++) if (occupied[i + j]) { ok = false; break; }
            if (ok && blockMatchesAt(word, block, i)) cands.push({ start: i, length: bl });
        }
    }
    if (bl >= 2) {                                        // single letters
        for (let i = 0; i < word.length; i++) {
            if (!occupied[i] && blockHasLetter(block, word[i]) && (!mask || mask.allowed.includes(word[i]) || mask.allowed.includes('?'))) cands.push({ start: i, length: 1 });
        }
    }
    cands.sort((a, b) => a.start - b.start || b.length - a.length);
    return cands;
}
