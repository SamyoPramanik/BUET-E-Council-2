/**
 * Bijoy 52 (SutonnyMJ ANSI) to Unicode Bangla Converter Engine
 * Powered by the official `bijoy2unicode` library (behind bijoy2unicode.com).
 */

import {
  convertBijoyToUnicode as pkgConvertBijoyToUnicode,
  shouldConvertAsBijoy as pkgShouldConvertAsBijoy,
  hasBengaliUnicode as pkgHasBengaliUnicode
} from 'bijoy2unicode';

// Mirrors the (unexported) font-name lists bijoy2unicode/docx uses to decide
// whether a Word run's own font-family settles the question outright. Kept
// in sync by hand since the package doesn't export these.
const BIJOY_FONT_PATTERNS = [
  /Sutonny\s*MJ/i,
  /SutonnyMJ/i,
  /SutonnyOMJ/i,
  /Sutonny\s*OMJ/i,
  /Sutonny\s*XMJ/i,
  /SutonnyXMJ/i,
  /Sulekha[a-z\s]*/i,
  /Boishakhi/i,
  /Lekhoni/i,
  /BijoyEkattor/i,
  /Bijoy[a-z0-9 ]*MJ/i,
  /[A-Za-z]+MJ\b/i,
  /\bMJ\s+[A-Za-z]+/i,
];

const UNICODE_FONT_PATTERNS = [
  /Nikosh/i,
  /SolaimanLipi/i,
  /Solaiman\s*Lipi/i,
  /Kalpurush/i,
  /Siyam\s*Rupali/i,
  /Mukti/i,
  /Vrinda/i,
  /Shonar\s*Bangla/i,
  /Hind\s*Siliguri/i,
  /Noto\s*Sans\s*Bengali/i,
  /Noto\s*Serif\s*Bengali/i,
  /AdorshoLipi/i,
];

export function fontIsBijoyName(name: string): boolean {
  return BIJOY_FONT_PATTERNS.some((p) => p.test(name));
}

function fontIsUnicodeBanglaName(name: string): boolean {
  return UNICODE_FONT_PATTERNS.some((p) => p.test(name));
}

function grabStyleProp(style: string, prop: string): string | undefined {
  const m = style.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`, "i"));
  return m ? m[1] : undefined;
}

/**
 * Walks up from a pasted text node's parent looking for an explicit
 * font-family and matches it against known Bijoy vs. Unicode Bangla font
 * names. Word/Bijoy documents split a paragraph into many small per-run
 * spans on copy, so an individual run can be too short for isBijoyText's
 * byte-heuristic to trust on its own — the source font, when present, is a
 * much stronger signal.
 *
 * Word's HTML export can carry up to four separate font slots per run
 * (legacy `<font face>`, plain `font-family`, and the `mso-ascii-font-family`
 * / `mso-bidi-font-family` / `mso-fareast-font-family` inline properties for
 * its ascii/complex-script/east-asian font overrides), and a run that
 * contains any non-ASCII byte is rendered with the complex-script
 * (`mso-bidi-font-family`) font, not the plain one — exactly mirroring how
 * bijoy2unicode's own docx converter picks `w:cs` over `w:ascii` for such
 * runs (see chooseRelevantFont in the installed package). A run typed with
 * `font-family:"Times New Roman"; mso-bidi-font-family:"SutonnyMJ"` — common
 * for incidental table text (labels, footnotes) where only the
 * complex-script slot was ever set to a Bijoy font — was invisible to a
 * plain `font-family` check alone.
 */
function inheritedFontIsBijoy(el: Element | null, text: string): boolean | undefined {
  const hasNonAscii = /[^\x00-\x7e]/.test(text);
  let cur: Element | null = el;
  while (cur) {
    const face = cur.getAttribute?.("face");
    if (face) {
      if (fontIsBijoyName(face)) return true;
      if (fontIsUnicodeBanglaName(face)) return false;
    }
    const style = cur.getAttribute?.("style") || "";
    const props = hasNonAscii
      ? ["mso-bidi-font-family", "font-family", "mso-ascii-font-family", "mso-fareast-font-family"]
      : ["font-family", "mso-ascii-font-family", "mso-bidi-font-family", "mso-fareast-font-family"];
    for (const prop of props) {
      const fams = grabStyleProp(style, prop);
      if (!fams) continue;
      if (fontIsBijoyName(fams)) return true;
      if (fontIsUnicodeBanglaName(fams)) return false;
    }
    cur = cur.parentElement;
  }
  return undefined;
}

/**
 * Detects if a text string is Bijoy ANSI formatted.
 * Ignores English acronyms (like SME, BUET, CSE) and standard English sentences.
 *
 * `fontIsBijoy`, when known (see inheritedFontIsBijoy), overrides the
 * byte-range/vowel heuristic below outright: true forces conversion even
 * for a too-short-to-trust fragment, false protects a run explicitly
 * styled in a real Unicode Bangla or Latin font from a false-positive.
 */
export function isBijoyText(text: string, fontIsBijoy?: boolean): boolean {
  if (!text || typeof text !== "string") return false;
  if (pkgHasBengaliUnicode(text)) return false;
  if (fontIsBijoy === true) return true;
  if (fontIsBijoy === false) return false;

  // The package's own heuristic just checks whether ANY character falls in
  // legacy Windows-1252 "high byte" territory (codes 128-591, or the
  // 8208-8250 typographic punctuation block). SutonnyMJ/Bijoy hijacks
  // exactly those byte positions to draw Bangla glyphs, but so does every
  // English smart quote, em/en-dash, ellipsis, "©", "™", "£", "°", and
  // accented Latin letter that Word/Docs/browsers insert automatically.
  // A single stray one of those in an English paste used to be enough to
  // trigger a full ANSI->Bangla conversion, corrupting perfectly good
  // English text into gibberish.
  if (!pkgShouldConvertAsBijoy(text)) return false;

  const trimmed = text.trim();
  if (!trimmed) return false;

  let highByteCount = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if ((code >= 128 && code <= 591) || (code >= 8208 && code <= 8250)) {
      highByteCount++;
    }
  }
  // Real Bijoy-encoded text carries several such bytes (one per Bangla
  // vowel-sign/conjunct); a single em-dash or curly quote is ordinary
  // English typography, not a signal on its own.
  if (highByteCount < 2) return false;

  // If the plain-ASCII-letter skeleton of the text reads like real English
  // (normal vowel density, e.g. "committee's decision" or "twelfth draft"),
  // trust that over the package's coarse byte-range check. Bijoy's
  // ASCII-letter skeleton (SutonnyMJ keystrokes) is comparatively
  // vowel-poor since most vowel sounds are drawn from the high-byte range
  // instead of a/e/i/o/u. Content here is only ever Bangla or English, so
  // no need to account for other languages' accented letters.
  // A line dense with Bijoy-only characters (e.g. "Uv‡g© †iwR‡÷ªk‡bi Rb¨") is
  // Bijoy no matter how vowel-rich its letter skeleton happens to be; the
  // English protection below is for prose with the odd stray accent.
  let signatureCount = 0;
  for (let i = 0; i < trimmed.length; i++) if (hasBijoySignature(trimmed[i])) signatureCount++;
  const denseSignature = signatureCount >= 4 && signatureCount / trimmed.replace(/\s/g, "").length >= 0.15;

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (!denseSignature && letters.length >= 4) {
    let vowels = 0;
    for (const c of letters.toLowerCase()) {
      if ("aeiouy".includes(c)) vowels++;
    }
    if (vowels / letters.length >= 0.3) return false;
  }

  return true;
}

// Short English words that the vowel-density test below can't vouch for
// (too short, or containing the Bijoy vowel-sign letter "v").
const ENGLISH_ALLOWLIST = new Set([
  "add", "drop", "and", "the", "for", "not", "cgpa", "bsc", "msc", "phd", "mphil",
  "have", "give", "live", "over", "ever", "even", "very", "move", "save", "love",
  "case", "term", "dean", "head", "form", "type", "list", "note", "date", "page",
  "faculty", "roll", "withdraw", "backlog", "fall", "spring",
  "proctor", "provost", "pro", "registrar", "treasurer",
  "of", "vice", "post", "bio", "chemistry", "civil", "physics", "naval", "planning", "ministry", "test",
]);
// Abbreviations that are only English when written with their full stop
// ("No." / "Dr."): without it they are as likely to be a short Bijoy word.
const ENGLISH_ABBREVIATIONS_WITH_DOT = new Set([
  "dept", "arch", "sl", "no", "dr", "prof", "md", "mr", "mrs", "ms", "st", "stn", "engg",
]);
// Short acronyms with no vowel to recognise them by; uppercase only, as in
// "ME" / "VC" (Vice-Chancellor).
const ENGLISH_DEPT_CODES = new Set(["ME", "CE", "EE", "IPE", "NAME", "VC", "DVC", "DSW", "AC", "TC", "SC", "ChE", "Phy"]);

/**
 * True when an all-letter ASCII token is an English word rather than Bijoy
 * keystrokes. Bijoy words are vowel-poor in ASCII letters, carry stray capitals
 * mid-word ("wWbm") and lean on "v" (া) right after a consonant, so a
 * vowel-dense word of four or more letters without those traits is English.
 */
function isEnglishWord(word: string): boolean {
  if (!/^[A-Za-z]+$/.test(word)) return false;
  if (ENGLISH_DEPT_CODES.has(word)) return true;
  if (ENGLISH_ALLOWLIST.has(word.toLowerCase())) return true;
  // Acronyms: BUET, CSE, CGPA.
  if (word.length >= 3 && word === word.toUpperCase()) return /[AEIOU]/.test(word);
  if (word.length < 4) return false;
  if (/[a-z][A-Z]/.test(word)) return false;
  const hasV = /v/i.test(word);
  if (hasV && (word.length < 6 || /[bcdfghjklmnpqrstwxz]v/i.test(word))) return false;
  const vowels = (word.match(/[aeiou]/gi) || []).length;
  return vowels / word.length >= (hasV ? 0.35 : 0.3);
}

/**
 * Bijoy documents routinely embed real English ("Forwarded", "Add/Drop",
 * "Thesis-G" for "Thesis-এ"). Pushed through the converter blindly those come
 * out as gibberish ("ঋড়ৎধিৎফবফ"), so English words are lifted out and the
 * rest is converted as before.
 */
function convertKeepingEnglish(text: string, convert: (s: string) => string): string {
  return text.replace(/[^\s/()]+/g, (tok) => {
    // Bijoy's "&" is the hasant (্), which never stands alone between spaces:
    // a lone "&" is the English ampersand ("Materials & Metallurgical").
    if (tok === "&") return tok;
    const m = tok.match(/^(.*?)([.,:;!?|]*)$/);
    const core = m ? m[1] : tok;
    const trail = m ? m[2] : "";
    if (ENGLISH_DEPT_CODES.has(core) || (trail.startsWith(".") && ENGLISH_ABBREVIATIONS_WITH_DOT.has(core.toLowerCase()))) {
      return core + convert(trail);
    }
    // "Thesis-G": Bijoy "G" is the suffix "এ" attached to an English word.
    const suffixed = core.match(/^([A-Za-z]{4,})-G$/);
    if (suffixed && isEnglishWord(suffixed[1])) {
      return `${suffixed[1]}-এ${convert(trail)}`;
    }
    const parts = core.split("-");
    // "CSE-2106007": English words kept, the number left as typed.
    if (parts.some(isEnglishWord) && parts.every((part) => isEnglishWord(part) || /^\d+$/.test(part))) {
      return parts.map((part) => (isEnglishWord(part) ? part : convert(part))).join("-") + convert(trail);
    }
    return convert(tok);
  });
}

// Corrects Bijoy source sequences the underlying converter mishandles:
// - "ø" is the ল-ফলা conjunct ("Dwjø" → উল্লি); the package maps it to স্ন.
// - A reph "©" typed after a vowel sign or conjunct suffix ("wkÿv_x©",
//   "KZ…©K", "cv‡k¦©") belongs before that mark: the reph attaches to the
//   whole cluster, not to whatever the mark happens to follow.
// - Word-processor typos can double the reph ("Uvg©©"), which is never valid.
// - A lone "t" is Bijoy's visarga key (ঃ), which authors use as a colon
//   ("gZvgZ t" for "মতামত :"). A real visarga only ever sits inside a word
//   ("মূলতঃ"), never alone between spaces, so a standalone one is a colon.
function normalizeBijoySource(text: string): string {
  return text
    .replace(/(^|\s)t(?=\s|$)/g, "$1:")
    .replace(/ø/g, "¬")
    .replace(/©{2,}/g, "©")
    .replace(/([xyz…„¦¬ª«]+)©/g, "©$1");
}

/**
 * Converts Bijoy 52 ANSI (SutonnyMJ) text to Unicode Bangla text.
 * English words embedded in the text are kept as-is unless `keepEnglish` is
 * false (used by "Force convert", which treats everything as Bijoy).
 */
export function convertBijoyToUnicode(text: string, opts: { keepEnglish?: boolean } = {}): string {
  if (!text) return "";
  try {
    // The package turns every ASCII digit into a Bangla one; digits (roll
    // numbers, years, credits like 8.5) are kept exactly as typed.
    const convert = (s: string) =>
      s
        .split(/(\d+(?:[.,]\d+)*)/)
        .map((part, i) => (i % 2 === 1 ? part : part ? pkgConvertBijoyToUnicode(normalizeBijoySource(part)) : ""))
        .join("");
    return opts.keepEnglish === false ? convert(text) : convertKeepingEnglish(text, convert);
  } catch (err) {
    console.error("Bijoy conversion error:", err);
    return text;
  }
}

function stripBijoyFontFromAncestors(el: Element | null) {
  const fontProps = /^(font-family|mso-ascii-font-family|mso-bidi-font-family|mso-fareast-font-family)$/i;
  for (let cur = el; cur && cur.tagName !== "BODY"; cur = cur.parentElement) {
    const face = cur.getAttribute("face");
    if (face && fontIsBijoyName(face)) cur.removeAttribute("face");
    const style = cur.getAttribute("style");
    if (!style) continue;
    const kept = style
      .split(";")
      .filter((decl) => {
        const [prop, ...rest] = decl.split(":");
        return !(fontProps.test(prop.trim()) && fontIsBijoyName(rest.join(":")));
      })
      .join(";")
      .trim();
    if (kept) cur.setAttribute("style", kept);
    else cur.removeAttribute("style");
  }
}

const BENGALI_UNICODE = /[\u0980-\u09FF]/;
// Words that look vowel-less to the fragment heuristic but are ordinary English
// abbreviations found in Bangla council documents.
const ENGLISH_ABBREVIATIONS = /^(st|stn|no|nos|sl|dr|md|mr|mrs|ms|prof|vs|etc|pg|ph|d|m|b|sc|sci|engg|dept|hr|kg|km|cm|mm|rs|tk)$/i;

/**
 * True when the text contains characters that only ever show up in Bijoy
 * (SutonnyMJ) output: the Latin-1/Latin Extended range and a few typographic
 * marks. Smart quotes and dashes are excluded because Word inserts them into
 * ordinary English too.
 */
export function hasBijoySignature(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if ((c >= 128 && c <= 591) || c === 710 || c === 732 || c === 8224 || c === 8225 || c === 8240 || c === 8249 || c === 8250) {
      return true;
    }
  }
  return false;
}

/**
 * Judges a short leftover fragment (a table cell label such as "wWbm KwgwU/")
 * that sits next to text already known to be Bijoy. Only used by the explicit
 * "convert" button, never for paste.
 */
function isBijoyFragmentInBijoyContext(text: string): boolean {
  if (!text.trim() || BENGALI_UNICODE.test(text)) return false;
  if (hasBijoySignature(text)) return true;
  const words = text.match(/[A-Za-z]+/g) || [];
  if (words.length === 0) return false;
  // Acronyms (CGPA, BPGS, CSE) and abbreviations (Stn., St. No.) are English.
  if (words.every((w) => w === w.toUpperCase() || ENGLISH_ABBREVIATIONS.test(w))) return false;
  const letters = words.join("");
  if (letters.length < 3) return false;
  let vowels = 0;
  for (const c of letters.toLowerCase()) if ("aeiouy".includes(c)) vowels++;
  return vowels / letters.length < 0.3;
}

function bijoyBlockOf(node: Node): Element | null {
  for (let cur = node.parentElement; cur && cur.tagName !== "BODY"; cur = cur.parentElement) {
    if (/^(P|LI|DIV|H[1-6]|TD|TH)$/.test(cur.tagName)) return cur;
  }
  return null;
}

function bijoyContextOf(node: Node): Element | null {
  let cur: Element | null = node.parentElement;
  let block: Element | null = null;
  while (cur && cur.tagName !== "BODY") {
    if (cur.tagName === "TR") return cur;
    if (!block && /^(P|LI|DIV|H[1-6]|TD|TH)$/.test(cur.tagName)) block = cur;
    cur = cur.parentElement;
  }
  return block;
}

/**
 * Safely converts Bijoy text within an HTML string by traversing text nodes only,
 * preserving HTML tags (<p>, <table>, <td>, etc.).
 *
 * With `lenient`, a second pass also converts short leftover fragments that sit
 * in the same table row / paragraph as text that was confidently converted, so a
 * cell like "‡gvU" or "wWbm KwgwU/" that the byte heuristic rejects on its own
 * isn't stranded. Text that already contains Unicode Bangla is never touched.
 */
export function convertHtmlBijoyToUnicode(html: string, opts: { lenient?: boolean } = {}): string {
  if (!html) return "";
  if (typeof window === "undefined") return convertBijoyToUnicode(html);

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const converted = new Set<Element>();
    const leftovers: Text[] = [];

    // Word splits one Bijoy word into several runs at arbitrary points
    // ("Uvg" | "©", "‡" | "gvU", "me©‡" | "kl"). Converting each run alone
    // strands pre-base vowels (‡ † w) and reph/vowel-sign marks away from their
    // consonant, so a word spanning runs is converted as one unit first.
    const INLINE = /^(SPAN|FONT|B|I|U|S|EM|STRONG|A|SUB|SUP|MARK|SMALL|BIG|O:P)$/;
    const textNodes: Text[] = [];
    // Text nodes that start after a <br>, block or table boundary: a word
    // never continues across one.
    const afterBarrier = new Set<Text>();
    let barrier = false;
    const collect = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.nodeValue) return;
        const text = node as Text;
        if (barrier) afterBarrier.add(text);
        barrier = false;
        textNodes.push(text);
      } else {
        const inline = node.nodeType === Node.ELEMENT_NODE && INLINE.test((node as Element).tagName);
        if (!inline) barrier = true;
        node.childNodes.forEach(collect);
        if (!inline) barrier = true;
      }
    };
    collect(doc.body);

    const isBijoyNode = new Map<Text, boolean>();
    const glued = (a: Text, b: Text) =>
      !afterBarrier.has(b) && !/\s$/.test(a.nodeValue as string) && !/^\s/.test(b.nodeValue as string);
    // A run judged on its own, exactly as a plain paste would: its font when
    // known, else the byte heuristic. Standalone English runs ("one", "grade")
    // fail this and stay English.
    const undecided: Text[] = [];
    for (const node of textNodes) {
      const value = node.nodeValue as string;
      if (!value.trim()) {
        isBijoyNode.set(node, false);
        continue;
      }
      const fontIsBijoy = inheritedFontIsBijoy(node.parentElement, value);
      const bijoy = isBijoyText(value, fontIsBijoy);
      isBijoyNode.set(node, bijoy);
      if (!bijoy && fontIsBijoy === undefined && !BENGALI_UNICODE.test(value)) undecided.push(node);
    }
    // Word splits a word into runs, and a fragment like "©" or "gvU" can't be
    // judged alone. A fontless run that is glued to a Bijoy run with no space
    // between them is the same word, so it is Bijoy too. Anything separated by
    // whitespace is left as judged above, so English in a Bijoy paragraph is
    // never dragged along.
    const index = new Map(textNodes.map((n, i) => [n, i]));
    for (let changed = true; changed; ) {
      changed = false;
      for (const node of undecided) {
        if (isBijoyNode.get(node)) continue;
        const i = index.get(node) as number;
        const prev = textNodes[i - 1];
        const next = textNodes[i + 1];
        if ((prev && isBijoyNode.get(prev) && glued(prev, node)) || (next && isBijoyNode.get(next) && glued(node, next))) {
          isBijoyNode.set(node, true);
          changed = true;
        }
      }
    }

    // Hand the trailing part of a word to the next run when the word continues
    // there, so the pair converts together.
    let pending = "";
    textNodes.forEach((node, i) => {
      if (!isBijoyNode.get(node)) {
        if (opts.lenient && (node.nodeValue as string).trim()) leftovers.push(node);
        return;
      }
      let raw = pending + (node.nodeValue as string);
      pending = "";
      const next = textNodes[i + 1];
      if (next && isBijoyNode.get(next) && glued(node, next)) {
        const tail = raw.match(/\S+$/);
        if (tail && tail[0].length < raw.length) {
          pending = tail[0];
          raw = raw.slice(0, raw.length - pending.length);
        } else if (tail) {
          pending = raw;
          raw = "";
        }
      }
      node.nodeValue = raw ? convertBijoyToUnicode(raw) : "";
      // The text is Unicode now; leaving the Bijoy font on it would render
      // it in the wrong face and make a second conversion pass look valid.
      stripBijoyFontFromAncestors(node.parentElement);
      const ctx = bijoyContextOf(node);
      if (ctx) converted.add(ctx);
    });

    const convertLeftover = (node: Text) => {
      node.nodeValue = convertBijoyToUnicode(node.nodeValue || "");
      stripBijoyFontFromAncestors(node.parentElement);
    };
    // Fragments carrying Bijoy-only characters are unambiguous; converting them
    // first also marks their row/paragraph as Bijoy for the ambiguous ones.
    const ambiguous: Text[] = [];
    for (const node of leftovers) {
      const text = node.nodeValue || "";
      if (BENGALI_UNICODE.test(text)) continue;
      if (hasBijoySignature(text)) {
        const ctx = bijoyContextOf(node);
        convertLeftover(node);
        if (ctx) converted.add(ctx);
      } else {
        ambiguous.push(node);
      }
    }
    for (const node of ambiguous) {
      const ctx = bijoyContextOf(node);
      if (ctx && converted.has(ctx) && isBijoyFragmentInBijoyContext(node.nodeValue || "")) {
        convertLeftover(node);
      }
    }

    return doc.body.innerHTML;
  } catch (e) {
    return convertBijoyToUnicode(html);
  }
}
