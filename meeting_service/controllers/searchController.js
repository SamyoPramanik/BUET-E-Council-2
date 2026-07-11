const crypto = require('crypto');
const CustomError = require('../errors/CustomError');
const db = require('../db');
const { embedTexts } = require('../utils/embeddingClient');

const RESULT_LIMIT = 30;
const SNIPPET_OPTS = 'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, MaxFragments=1';

const parseFilters = (req) => {
    const q = (req.query.q || '').trim();
    const scope = req.query.scope === 'agenda' ? 'agenda' : 'both';
    const tags = req.query.tags
        ? req.query.tags.split(',').map(t => t.trim()).filter(Boolean)
        : null;
    const dateFrom = req.query.dateFrom || null;
    const dateTo = req.query.dateTo || null;
    return { q, scope, tags, dateFrom, dateTo };
};

const resultRow = (row, matchType) => ({
    agenda_id: row.agenda_id,
    meeting_id: row.meeting_id,
    title: row.title,
    meeting_title: row.meeting_title,
    type: row.type,
    meeting_date: row.meeting_date,
    status: row.status,
    matched_in: row.matched_in,
    match_type: matchType,
    snippet: row.snippet
});

// `seen` tracks (agenda_id, matched_in) pairs already surfaced by an earlier
// (higher-priority) bucket, so e.g. an agenda's resolution can still surface
// via semantic search even though its agenda content already matched by
// keyword - they're different links/snippets on the results page.
const idsFor = (seen, matchedIn) => [...seen]
    .filter(k => k.endsWith(`:${matchedIn}`))
    .map(k => k.slice(0, k.lastIndexOf(':')));

const seenKey = (row) => `${row.agenda_id}:${row.matched_in}`;

// Keyword bucket: Postgres full-text search over the plain-text mirrors,
// with an ILIKE fallback for short/partial tokens that tsquery misses.
const runKeywordSearch = async (tsqueryText, { scope, tags, dateFrom, dateTo }, seen) => {
    const filterSql = `
        AND ($2::uuid[] IS NULL OR EXISTS (SELECT 1 FROM agenda_tags at2 WHERE at2.agenda_id = a.id AND at2.tag_id = ANY($2::uuid[])))
        AND ($3::date IS NULL OR m.meeting_date >= $3::date)
        AND ($4::date IS NULL OR m.meeting_date <= $4::date)
        AND a.id <> ALL($5::uuid[])
    `;

    const agendaParams = [tsqueryText, tags, dateFrom, dateTo, idsFor(seen, 'agenda')];
    const agendaQuery = `
        SELECT a.id as agenda_id, a.meeting_id, m.title, m.meeting_title, m.type, m.meeting_date, m.status,
               'agenda' as matched_in,
               ts_rank(a.content_tsv, websearch_to_tsquery('simple', $1)) as rank,
               ts_headline('simple', coalesce(a.content_plain, ''), websearch_to_tsquery('simple', $1), '${SNIPPET_OPTS}') as snippet
        FROM agenda a
        JOIN meetings m ON m.id = a.meeting_id
        WHERE (a.content_tsv @@ websearch_to_tsquery('simple', $1) OR a.content_plain ILIKE '%' || $1 || '%')
        ${filterSql}
        ORDER BY rank DESC
        LIMIT ${RESULT_LIMIT}
    `;

    const queries = [db.query(agendaQuery, agendaParams)];

    if (scope === 'both') {
        const resolutionParams = [tsqueryText, tags, dateFrom, dateTo, idsFor(seen, 'resolution')];
        const resolutionQuery = `
            SELECT a.id as agenda_id, a.meeting_id, m.title, m.meeting_title, m.type, m.meeting_date, m.status,
                   'resolution' as matched_in,
                   ts_rank(a.resolution_tsv, websearch_to_tsquery('simple', $1)) as rank,
                   ts_headline('simple', coalesce(a.resolution_plain, ''), websearch_to_tsquery('simple', $1), '${SNIPPET_OPTS}') as snippet
            FROM agenda a
            JOIN meetings m ON m.id = a.meeting_id
            WHERE (a.resolution_tsv @@ websearch_to_tsquery('simple', $1) OR a.resolution_plain ILIKE '%' || $1 || '%')
            ${filterSql}
            ORDER BY rank DESC
            LIMIT ${RESULT_LIMIT}
        `;
        queries.push(db.query(resolutionQuery, resolutionParams));
    }

    const results = await Promise.all(queries);
    return results.flatMap(r => r.rows).sort((a, b) => b.rank - a.rank);
};

// Entity bucket: fuzzy-match the query against department/office/member
// names & aliases, then re-run the keyword search using their canonical
// terms. Entities are looked up live against their own tables, so matching
// is always current with no separate sync step.
const findMatchingEntityTerms = async (q) => {
    const [departments, offices, members] = await Promise.all([
        db.query(
            `SELECT name_bangla, name_english, alias_bangla, alias_english FROM departments
             WHERE similarity(name_bangla || ' ' || coalesce(name_english,'') || ' ' || coalesce(alias_bangla,'') || ' ' || coalesce(alias_english,''), $1) > 0.2
                OR name_bangla ILIKE '%' || $1 || '%' OR name_english ILIKE '%' || $1 || '%'
                OR alias_bangla ILIKE '%' || $1 || '%' OR alias_english ILIKE '%' || $1 || '%'
             LIMIT 5`,
            [q]
        ),
        db.query(
            `SELECT name_bangla, name_english FROM offices
             WHERE similarity(name_bangla || ' ' || coalesce(name_english,''), $1) > 0.2
                OR name_bangla ILIKE '%' || $1 || '%' OR name_english ILIKE '%' || $1 || '%'
             LIMIT 5`,
            [q]
        ),
        db.query(
            `SELECT name FROM members
             WHERE similarity(name, $1) > 0.2 OR name ILIKE '%' || $1 || '%'
             LIMIT 5`,
            [q]
        )
    ]);

    const terms = new Set();
    for (const row of departments.rows) {
        [row.name_bangla, row.name_english, row.alias_bangla, row.alias_english].filter(Boolean).forEach(t => terms.add(t));
    }
    for (const row of offices.rows) {
        [row.name_bangla, row.name_english].filter(Boolean).forEach(t => terms.add(t));
    }
    for (const row of members.rows) {
        if (row.name) terms.add(row.name);
    }
    return [...terms];
};

// Semantic bucket: cosine similarity over LaBSE chunk embeddings.
const runSemanticSearch = async (queryVector, { scope, tags, dateFrom, dateTo }, seen) => {
    const vectorLiteral = JSON.stringify(queryVector);
    const filterSql = `
        AND ($2::uuid[] IS NULL OR EXISTS (SELECT 1 FROM agenda_tags at2 WHERE at2.agenda_id = a.id AND at2.tag_id = ANY($2::uuid[])))
        AND ($3::date IS NULL OR m.meeting_date >= $3::date)
        AND ($4::date IS NULL OR m.meeting_date <= $4::date)
        AND a.id <> ALL($5::uuid[])
    `;

    const buildQuery = (chunkTable, matchedIn) => `
        SELECT * FROM (
            SELECT DISTINCT ON (c.agenda_id)
                c.agenda_id, a.meeting_id, m.title, m.meeting_title, m.type, m.meeting_date, m.status,
                '${matchedIn}' as matched_in,
                c.chunk_text as snippet,
                (c.embedding <=> $1::vector) as distance
            FROM ${chunkTable} c
            JOIN agenda a ON a.id = c.agenda_id
            JOIN meetings m ON m.id = a.meeting_id
            WHERE c.embedding IS NOT NULL
            ${filterSql}
            ORDER BY c.agenda_id, distance ASC
        ) sub
        ORDER BY distance ASC
        LIMIT ${RESULT_LIMIT}
    `;

    const queries = [
        db.query(buildQuery('agenda_chunks', 'agenda'), [vectorLiteral, tags, dateFrom, dateTo, idsFor(seen, 'agenda')])
    ];
    if (scope === 'both') {
        queries.push(
            db.query(buildQuery('resolution_chunks', 'resolution'), [vectorLiteral, tags, dateFrom, dateTo, idsFor(seen, 'resolution')])
        );
    }

    const results = await Promise.all(queries);
    return results.flatMap(r => r.rows).sort((a, b) => a.distance - b.distance);
};

const search = async (req, res, next) => {
    try {
        const filters = parseFilters(req);
        if (!filters.q) {
            return next(new CustomError('Search query (q) is required', 400));
        }

        // Opportunistic cleanup; the cache is otherwise wiped eagerly on every
        // agenda/resolution write, this just bounds unused entries.
        db.query("DELETE FROM search_cache WHERE created_at < NOW() - INTERVAL '24 hours'").catch(() => {});

        const cacheKey = crypto.createHash('sha256').update(JSON.stringify(filters)).digest('hex');
        const cached = await db.query('SELECT results FROM search_cache WHERE cache_key = $1', [cacheKey]);
        if (cached.rows.length > 0) {
            return res.status(200).json({ success: true, data: cached.rows[0].results, cached: true });
        }

        const seen = new Set();
        const finalResults = [];

        // 1. Keyword bucket
        const keywordRows = await runKeywordSearch(filters.q, filters, seen);
        for (const row of keywordRows) {
            seen.add(seenKey(row));
            finalResults.push(resultRow(row, 'keyword'));
        }

        // 2. Entity bucket
        const entityTerms = await findMatchingEntityTerms(filters.q);
        if (entityTerms.length > 0) {
            const entityQuery = entityTerms.map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
            const entityRows = await runKeywordSearch(entityQuery, filters, seen);
            for (const row of entityRows) {
                const key = seenKey(row);
                if (seen.has(key)) continue;
                seen.add(key);
                finalResults.push(resultRow(row, 'entity'));
            }
        }

        // 3. Semantic bucket
        try {
            const [queryVector] = await embedTexts([filters.q]);
            if (queryVector) {
                const semanticRows = await runSemanticSearch(queryVector, filters, seen);
                for (const row of semanticRows) {
                    const key = seenKey(row);
                    if (seen.has(key)) continue;
                    seen.add(key);
                    finalResults.push(resultRow(row, 'semantic'));
                }
            }
        } catch (err) {
            console.error('Semantic search unavailable:', err.message);
        }

        await db.query(
            `INSERT INTO search_cache (cache_key, query, filters, results)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (cache_key) DO UPDATE SET results = EXCLUDED.results, created_at = CURRENT_TIMESTAMP`,
            [cacheKey, filters.q, JSON.stringify(filters), JSON.stringify(finalResults)]
        );

        res.status(200).json({ success: true, data: finalResults, cached: false });
    } catch (error) {
        next(error);
    }
};

module.exports = { search };
