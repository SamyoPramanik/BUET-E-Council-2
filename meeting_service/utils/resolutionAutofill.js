// AI Resolution Autofill: a retrieval-then-generation loop with the model
// able to ask the author clarifying questions through a floating chat widget
// (ResolutionView.tsx) instead of ever inventing a fact or emitting a
// [placeholder] the author has to notice and fill in themselves. Each turn
// the model returns structured JSON: either `needs_clarification` with 1-3
// questions, or `complete` with the final resolution text. The caller
// (agendaController.js's autofillResolution) re-calls this with the growing
// conversation history until `complete`.
//
// This deliberately does NOT short-circuit to a verbatim copy even when a
// near-duplicate past agenda is found — see documentation.md's "AI
// Resolution Autofill" section for why: a shortcut that copies text without
// the model reading the full current agenda can't notice when a
// superficially-similar precedent is actually substantively different, e.g.
// two near-identical "applied for N days of leave" agendas where one is
// casual leave and the other is study-leave-abroad, which needs entirely
// different clauses. Always routing through generation means the model
// always reads the real agenda text and can catch that itself — and now,
// ask about it via the chat widget instead of guessing.
const axios = require('axios');

const RESOLUTION_AI_URL = process.env.RESOLUTION_AI_URL || 'http://resolution_ai:11434';
const RESOLUTION_AI_MODEL = process.env.RESOLUTION_AI_MODEL || 'aya-expanse:8b';
const GENERATE_TIMEOUT_MS = parseInt(process.env.RESOLUTION_AI_TIMEOUT_MS || '120000', 10);

// Safety valve against a runaway back-and-forth: once the conversation hits
// this many answered rounds, the prompt forces the model to finalize with
// whatever it has rather than asking again.
const MAX_CLARIFICATION_ROUNDS = 4;

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
// No decision-type signal feeds this — there's no stored field for it (the
// model reads each precedent's actual resolution text directly instead of
// needing a separate structured label; see documentation.md for why that
// was tried and dropped), so confidence is purely a function of how many
// same-category precedents were found and how similar the closest one is.
const NEAR_IDENTICAL_SIMILARITY_THRESHOLD = 0.95;

const computeConfidence = (precedents) => {
    if (!precedents.length) return CONFIDENCE.UNCONFIRMED;
    if (precedents[0].similarity >= NEAR_IDENTICAL_SIMILARITY_THRESHOLD) return CONFIDENCE.NEAR_IDENTICAL_PRECEDENT;
    if (precedents.length >= 3) return CONFIDENCE.CONSISTENT_PATTERN;
    return CONFIDENCE.WEAK_PRECEDENT;
};

const truncate = (text, maxChars) => {
    if (!text) return '';
    return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
};

const SYSTEM_PROMPT = `You are drafting formal council resolutions for BUET E-Council. Resolutions are written in Bangla, English, or a natural mix, matching this institution's historical style exactly.

You must respond with ONLY a single JSON object, no other text, in one of these two shapes:

1. If you need to ask the author something before you can draft correctly:
{"status": "needs_clarification", "questions": ["question 1", "question 2"]}
Ask at most 2-3 questions, only for things that would genuinely change what the resolution says (a missing amount, an unclear duration, whether a condition applies) — never ask about something you can reasonably infer or that doesn't change the wording. Never leave a placeholder or bracket in text instead of asking — always ask through this field.

2. If you have everything you need:
{"status": "complete", "resolution": "the full resolution text"}

Rules:
- Use ONLY facts present in the current agenda, the author's rough decision, or their answers to your previous questions. Never invent a specific name, date, amount, duration, or committee.
- If an answer to a previous question was "I don't know", "skip", left blank, or otherwise unhelpful, do NOT ask about that same point again — proceed using your best reasonable judgment (state it plainly and generically in the resolution rather than a specific invented fact) and move on.
- Match the phrasing, structure, and formality of the example past resolutions given below, when any are given.
- Pay close attention to whether the current agenda is actually the same kind of case as an example, not just similarly worded — if it differs in a way that changes what the resolution needs to say, follow the current agenda's actual content, not the example's boilerplate.
- The "resolution" field must contain only the resolution text itself — no headings, no explanation, no markdown, no JSON inside it.`;

const buildUserPrompt = ({ agendaText, roughDraft, precedents, conversation, forceComplete }) => {
    let prompt = `Current agenda:\n${truncate(agendaText, 3000)}\n\nAuthor's rough decision:\n${roughDraft}\n`;

    if (precedents.length > 0) {
        prompt += `\nPast resolutions for similar agenda items in this category, most relevant first:\n`;
        precedents.forEach((p, i) => {
            const similarityPct = Math.round((p.similarity || 0) * 100);
            prompt += `\nExample ${i + 1} (similarity ${similarityPct}%):\nAgenda: ${truncate(p.content_plain, 500)}\nResolution: ${truncate(p.resolution_plain, 500)}\n`;
        });
    } else {
        prompt += `\nNo similar past resolutions were found — draft carefully from the agenda and rough decision alone, and ask if anything important is genuinely missing.\n`;
    }

    if (conversation && conversation.length > 0) {
        prompt += `\nYou already asked the author the following, in order:\n`;
        conversation.forEach((turn, i) => {
            prompt += `Q${i + 1}: ${turn.question}\nA${i + 1}: ${turn.answer || '(no answer given)'}\n`;
        });
    }

    if (forceComplete) {
        prompt += `\nYou have asked enough questions for this round limit. You MUST respond with "status": "complete" now, using your best judgment for anything still unclear rather than asking again.\n`;
    }

    prompt += `\nRespond now with the JSON object described in your instructions.`;
    return prompt;
};

// Defensive only: the prompt above tells the model to ask via `questions`
// instead of ever emitting a bracketed placeholder, but models don't always
// perfectly follow instructions — if one leaks through anyway, still flag it
// visually rather than silently shipping an unfilled blank.
const PLACEHOLDER_RE = /\[[^[\]]{1,60}\]/g;

const extractPlaceholders = (text) => {
    const matches = text.match(PLACEHOLDER_RE) || [];
    return [...new Set(matches)];
};

const escapeHtml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

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
// mirrors how embeddingClient.js calls embedding_service's /embed. Uses
// Ollama's JSON mode so the needs_clarification/complete shape parses
// reliably instead of scraping it out of free-form prose.
const runGenerationTurn = async (userPrompt) => {
    const { data } = await axios.post(`${RESOLUTION_AI_URL}/api/generate`, {
        model: RESOLUTION_AI_MODEL,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        format: 'json',
        stream: false,
        options: { temperature: 0.3 },
    }, { timeout: GENERATE_TIMEOUT_MS });

    const raw = (data?.response || '').trim();
    if (!raw) throw new Error('empty response from model');

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        throw new Error(`model did not return valid JSON: ${e.message}`);
    }

    if (parsed.status === 'needs_clarification') {
        const questions = Array.isArray(parsed.questions) ? parsed.questions.filter(Boolean).slice(0, 3) : [];
        if (questions.length === 0) throw new Error('needs_clarification with no questions');
        return { status: 'needs_clarification', questions };
    }

    if (parsed.status === 'complete') {
        const resolution = (parsed.resolution || '').trim();
        if (!resolution) throw new Error('complete with empty resolution');
        return { status: 'complete', resolution };
    }

    throw new Error(`unrecognized status "${parsed.status}" from model`);
};

module.exports = {
    CONFIDENCE,
    MAX_CLARIFICATION_ROUNDS,
    computeConfidence,
    buildUserPrompt,
    extractPlaceholders,
    toResolutionHtml,
    runGenerationTurn,
    RESOLUTION_AI_URL,
    RESOLUTION_AI_MODEL,
};
