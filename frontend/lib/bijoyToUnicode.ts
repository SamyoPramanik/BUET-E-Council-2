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

/**
 * Converts Bijoy 52 ANSI (SutonnyMJ) text to Unicode Bangla text.
 */
export function convertBijoyToUnicode(text: string): string {
  if (!text) return "";
  try {
    return pkgConvertBijoyToUnicode(text);
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

    const walkTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue && node.nodeValue.trim()) {
          const fontIsBijoy = inheritedFontIsBijoy(node.parentElement, node.nodeValue);
          if (isBijoyText(node.nodeValue, fontIsBijoy)) {
            node.nodeValue = convertBijoyToUnicode(node.nodeValue);
            // The text is Unicode now; leaving the Bijoy font on it would render
            // it in the wrong face and make a second conversion pass look valid.
            stripBijoyFontFromAncestors(node.parentElement);
            const ctx = bijoyContextOf(node);
            if (ctx) converted.add(ctx);
          } else if (opts.lenient) {
            leftovers.push(node as Text);
          }
        }
      } else {
        node.childNodes.forEach(walkTextNodes);
      }
    };

    walkTextNodes(doc.body);

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
