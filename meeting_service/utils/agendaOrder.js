// Work out the final serial order for a meeting's agendas from the order the
// client sends. Pure (no DB) so it can be tested on its own.
//
//   rows         the meeting's current, non-archived agendas of this kind
//                (main or supplementary), already in their current order:
//                [{ id, content }, ...]
//   submittedIds the new order the client wants (ids of agendas in `rows`)
//   isSuppli     supplementary agendas have no "বিবিধ" item
//
// Agendas the client did not mention (added or restored meanwhile) keep their
// relative order after the submitted ones, and the "বিবিধ :" item always ends
// up last on the main agenda. Returns { ids } or { error }.

const isBibidhaContent = (content) => {
    if (!content) return false;
    return String(content).replace(/<[^>]*>/g, '').trim().startsWith('বিবিধ');
};

const computeAgendaOrder = (rows, submittedIds, isSuppli) => {
    if (!Array.isArray(rows) || !Array.isArray(submittedIds)) return { error: 'Invalid order' };
    const known = new Map(rows.map((r) => [r.id, r]));

    const seen = new Set();
    const submitted = [];
    for (const id of submittedIds) {
        if (!known.has(id)) return { error: 'The order contains an agenda that is not part of this meeting' };
        if (seen.has(id)) continue;
        seen.add(id);
        submitted.push(id);
    }

    const rest = rows.map((r) => r.id).filter((id) => !seen.has(id));
    let ids = [...submitted, ...rest];

    if (!isSuppli) {
        const bibidhaId = ids.find((id) => isBibidhaContent(known.get(id).content));
        if (bibidhaId) ids = [...ids.filter((id) => id !== bibidhaId), bibidhaId];
    }
    return { ids };
};

module.exports = { computeAgendaOrder, isBibidhaContent };
