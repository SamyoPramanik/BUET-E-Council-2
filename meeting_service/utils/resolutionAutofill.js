// AI Resolution Autofill: a single retrieval-then-generation pipeline
// (deliberately NOT a tiered "copy exact precedent verbatim if similarity is
// high enough" shortcut — that was considered and rejected, see
// documentation.md's "AI Resolution Autofill" section for why: a shortcut
// that copies text without the model reading the full current agenda can't
// notice when a superficially-similar precedent is actually substantively
// different, e.g. two near-identical "applied for N days of leave" agendas
// where one is casual leave and the other is study-leave-abroad, which needs
// entirely different clauses. Always routing through generation means the
// model always reads the real agenda text and can catch that itself).
const axios = require('axios');

const RESOLUTION_AI_URL = process.env.RESOLUTION_AI_URL || 'http://resolution_ai:11434';
const RESOLUTION_AI_MODEL = process.env.RESOLUTION_AI_MODEL || 'aya-expanse:8b';
const GENERATE_TIMEOUT_MS = parseInt(process.env.RESOLUTION_AI_TIMEOUT_MS || '120000', 10);

// Fixed dropdown (frontend keeps its own copy of these + Bangla/English
// labels in components/RichTextEditor.tsx's resolution autofill UI — this is
// the validation source of truth). Also written to agenda.decision_type on
// save so future retrieval can rank same-category-AND-same-decision
// precedents higher (see db/migrations/2026_09_add_resolution_decision_type.sql
// for why historical rows are never backfilled with a guessed value).
const RESOLUTION_DECISION_TYPES = [
    'approved',
    'rejected',
    'approved_with_conditions',
    'deferred',
    'referred_to_committee',
    'amended_and_approved',
    'noted',
    'withdrawn',
];

const CONFIDENCE = {
    NEAR_IDENTICAL_PRECEDENT: 'near_identical_precedent',
    CONSISTENT_PATTERN: 'consistent_pattern',
    WEAK_PRECEDENT: 'weak_precedent',
    UNCONFIRMED: 'unconfirmed',
};

// Deliberately conservative (see documentation.md): a high aggregate
// similarity score can hide the fact that the one phrase that actually
// determines the correct resolution differs, because shared boilerplate
// dominates the score. Start strict, loosen only after observing real data.
const NEAR_IDENTICAL_SIMILARITY_THRESHOLD = 0.95;

const computeConfidence = (precedents, decisionType) => {
    if (!precedents.length) return CONFIDENCE.UNCONFIRMED;
    const top = precedents[0];
    if (top.similarity >= NEAR_IDENTICAL_SIMILARITY_THRESHOLD && top.decision_type === decisionType) {
        return CONFIDENCE.NEAR_IDENTICAL_PRECEDENT;
    }
    const sameDecisionCount = precedents.filter((p) => p.decision_type === decisionType).length;
    if (precedents.length >= 3 && sameDecisionCount >= 2) return CONFIDENCE.CONSISTENT_PATTERN;
    return CONFIDENCE.WEAK_PRECEDENT;
};

const truncate = (text, maxChars) => {
    if (!text) return '';
    return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
};

const SYSTEM_PROMPT = `You are drafting formal council resolutions for BUET E-Council. Resolutions are written in Bangla, English, or a natural mix, matching this institution's historical style exactly.

Rules:
1. Use ONLY facts present in the current agenda text or the author's rough decision. Never invent a specific name, date, amount, duration, or committee that isn't given to you.
2. If the resolution genuinely needs a specific detail that isn't available in what you were given, write an explicit placeholder in square brackets, in the same language as the surrounding text (for example [তারিখ] or [AMOUNT]), instead of guessing.
3. Match the phrasing, structure, and formality of the example past resolutions given below, when any are given.
4. Pay close attention to whether the current agenda is actually the same kind of case as an example, not just similarly worded — if it differs in a way that changes what the resolution needs to say (a different leave type, a different amount, a different condition), follow the current agenda's actual content, not the example's boilerplate.
5. Output ONLY the resolution text itself. No headings, no explanation, no markdown.`;

const buildUserPrompt = ({ agendaText, roughDraft, decisionTypeLabel, precedents }) => {
    let prompt = `Decision type: ${decisionTypeLabel}\n\nCurrent agenda:\n${truncate(agendaText, 3000)}\n\nAuthor's rough decision:\n${roughDraft}\n`;

    if (precedents.length > 0) {
        prompt += `\nPast resolutions for similar agenda items in this category, most relevant first:\n`;
        precedents.forEach((p, i) => {
            const similarityPct = Math.round((p.similarity || 0) * 100);
            const decisionNote = p.decision_type ? `, decision: ${p.decision_type}` : '';
            prompt += `\nExample ${i + 1} (similarity ${similarityPct}%${decisionNote}):\nAgenda: ${truncate(p.content_plain, 500)}\nResolution: ${truncate(p.resolution_plain, 500)}\n`;
        });
    } else {
        prompt += `\nNo similar past resolutions were found in this category — draft carefully from the agenda and rough decision alone, and lean more heavily on placeholders for any detail you're not sure belongs.\n`;
    }

    prompt += `\nDraft the formal resolution now.`;
    return prompt;
};

const PLACEHOLDER_RE = /\[[^[\]]{1,60}\]/g;

const extractPlaceholders = (text) => {
    const matches = text.match(PLACEHOLDER_RE) || [];
    return [...new Set(matches)];
};

const escapeHtml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Wraps placeholders in <mark> so they stay visually obvious in both the
// editor and any PDF export — styleRichTextHtml (meeting_service/utils/
// pdfGenerator.js) already fully styles <mark> elements.
const toResolutionHtml = (text) => {
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return '';
    return paragraphs.map((paragraph) => {
        const escaped = escapeHtml(paragraph).replace(/\n/g, '<br>');
        const marked = escaped.replace(PLACEHOLDER_RE, (m) => `<mark data-placeholder="true">${m}</mark>`);
        return `<p>${marked}</p>`;
    }).join('');
};

// Calls the local Ollama instance directly (no custom wrapper service) —
// mirrors how embeddingClient.js calls embedding_service's /embed.
const generateResolutionText = async (userPrompt) => {
    const { data } = await axios.post(`${RESOLUTION_AI_URL}/api/generate`, {
        model: RESOLUTION_AI_MODEL,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        stream: false,
        options: { temperature: 0.3 },
    }, { timeout: GENERATE_TIMEOUT_MS });

    return (data?.response || '').trim();
};

module.exports = {
    RESOLUTION_DECISION_TYPES,
    CONFIDENCE,
    computeConfidence,
    buildUserPrompt,
    extractPlaceholders,
    toResolutionHtml,
    generateResolutionText,
    RESOLUTION_AI_URL,
    RESOLUTION_AI_MODEL,
};
