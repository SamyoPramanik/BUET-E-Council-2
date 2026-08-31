/**
 * Bijoy 52 (SutonnyMJ ANSI) to Unicode Bangla Converter Engine
 * Converts legacy Bijoy ANSI text (e.g. from MS Word / SutonnyMJ font) to standard Unicode Bangla.
 */

// Single Juktakkhor glyphs or single ANSI character class pattern
const JUKTAKKHOR_OR_CHAR = "(?:ÿ|Â|Ã|Ä|Å|Á|Æ|Ç|È|É|Ê|Ë|Ì|Í|Î|Ï|Ð|Ñ|Ò|Ó|Ô|Õ|Ö|×|Ø|Ù|Ú|Û|Ü|Ý|Þ|ß|à|á|â|ã|ä|å|æ|ç|è|é|ê|ë|ì|í|î|ï|ð|ñ|ò|ó|ô|õ|ö|÷|ø|ù|ú|û|ü|ý|þ|Av|[a-zA-Z0-9])";

// Exact Bijoy 52 ANSI (SutonnyMJ) to Unicode Bangla Character Mapping
const BIJOY_TO_UNICODE_MAP: [string, string][] = [
  // Dual Vowel Signs
  ["‡v", "ো"],
  ["‡u", "ৌ"],
  ["tv", "ো"],
  ["tu", "ৌ"],

  // Special Juktakkhor Glyphs (High ASCII / ANSI extended)
  ["ÿ", "ক্ষ"],
  ["Â", "ঞ্চ"],
  ["Ã", "ঞ্ছ"],
  ["Ä", "ঞ্জ"],
  ["Å", "ঞ্ঝ"],
  ["Á", "জ্ঞ"],
  ["Æ", "ট্ট"],
  ["Ç", "ট্"],
  ["È", "ড্ড"],
  ["É", "ণ্ট"],
  ["Ê", "ণ্ঠ"],
  ["Ë", "ণ্ড"],
  ["Ì", "ণ্ণ"],
  ["Í", "ত্ম"],
  ["Î", "ত্র"],
  ["Ï", "দ্দ"],
  ["Ð", "দ্ধ"],
  ["Ñ", "দ্ব"],
  ["Ò", "দ্ভ"],
  ["Ó", "দ্ম"],
  ["Ô", "ন্ত"],
  ["Õ", "ন্থ"],
  ["Ö", "ন্দ"],
  ["×", "ন্ধ"],
  ["Ø", "ন্ন"],
  ["Ù", "ন্ম"],
  ["Ú", "প্ট"],
  ["Û", "প্ত"],
  ["Ü", "প্ন"],
  ["Ý", "প্স"],
  ["Þ", "ফ্ল"],
  ["ß", "ব্জ"],
  ["à", "ব্দ"],
  ["á", "ব্ধ"],
  ["â", "ব্ল"],
  ["ã", "ভ্ল"],
  ["ä", "ম্ন"],
  ["å", "ম্প"],
  ["æ", "ম্ফ"],
  ["ç", "ম্ব"],
  ["è", "ম্ভ"],
  ["é", "ম্ম"],
  ["ê", "ম্ল"],
  ["ë", "ল্ক"],
  ["ì", "ল্গ"],
  ["í", "ল্ট"],
  ["î", "ল্ড"],
  ["ï", "ল্প"],
  ["ð", "ল্ফ"],
  ["ñ", "ল্ব"],
  ["ò", "ল্ম"],
  ["ó", "ল্ল"],
  ["ô", "শ্চ"],
  ["õ", "শ্ন"],
  ["ö", "শ্ল"],
  ["÷", "ষ্ক"],
  ["ø", "ষ্ট"],
  ["ù", "ষ্ঠ"],
  ["ú", "ষ্ণ"],
  ["û", "স্প"],
  ["ü", "স্ফ"],
  ["ý", "স্ত"],
  ["þ", "স্থ"],

  // Sworoborno (Vowels)
  ["Av", "আ"],
  ["A", "অ"],
  ["B", "ই"],
  ["C", "ঈ"],
  ["D", "উ"],
  ["E", "ঊ"],
  ["F", "ঋ"],
  ["G", "এ"],
  ["H", "ঐ"],
  ["I", "ও"],
  ["J", "ঔ"],

  // Digits
  ["0", "০"],
  ["1", "১"],
  ["2", "২"],
  ["3", "৩"],
  ["4", "৪"],
  ["5", "৫"],
  ["6", "৬"],
  ["7", "৭"],
  ["8", "৮"],
  ["9", "৯"],

  // Byanjonborno (Consonants)
  ["k", "ক"],
  ["K", "খ"],
  ["g", "গ"],
  ["G", "ঘ"],
  ["u", "ঙ"],
  ["c", "চ"],
  ["C", "ছ"],
  ["j", "জ"],
  ["J", "ঝ"],
  ["T", "ঞ"],
  ["t", "ট"],
  ["U", "ট"],
  ["T", "ঠ"],
  ["d", "ড"],
  ["W", "ড"],
  ["D", "ঢ"],
  ["b", "ণ"],
  ["z", "ত"],
  ["_", "থ"],
  ["d", "দ"],
  ["D", "ধ"],
  ["n", "ন"],
  ["p", "প"],
  ["P", "ফ"],
  ["e", "ব"],
  ["v", "ভ"],
  ["V", "ভ"],
  ["m", "ম"],
  ["Z", "য"],
  ["r", "র"],
  ["l", "ল"],
  ["S", "শ"],
  ["S", "ষ"],
  ["s", "স"],
  ["h", "হ"],
  ["H", "হ"],
  ["R", "ড়"],
  ["q", "য়"],
  ["Y", "য়"],

  // Kar (Vowel Signs) & Modifiers
  ["v", "া"],
  ["w", "ি"],
  ["x", "ী"],
  ["y", "ু"],
  ["z", "ূ"],
  ["„", "ৃ"],
  ["‡", "ে"],
  ["‰", "ৈ"],
  ["ˆ", "ৈ"],
  ["s", "ং"],
  ["o", "ঃ"],
  ["^", "ঁ"],
  ["&", "্"]
];

/**
 * Re-orders pre-vowels (w, ‡, tv) and Reph (®, ©) in Bijoy string before character substitution.
 */
function preProcessBijoy(src: string): string {
  let text = src;

  // 1. Dual Vowel combinations ‡...v -> ো and ‡...u -> ৌ
  const dualVowelPatternO = new RegExp(`‡(${JUKTAKKHOR_OR_CHAR})v`, "g");
  const dualVowelPatternOu = new RegExp(`‡(${JUKTAKKHOR_OR_CHAR})u`, "g");
  text = text.replace(dualVowelPatternO, "$1ো");
  text = text.replace(dualVowelPatternOu, "$1ৌ");

  // 2. Pre-vowels 'w' (i-kar), '‡' (e-kar), '‰' (oi-kar) appear BEFORE a single consonant/Juktakkhor in Bijoy, move them AFTER it
  const preVowelPattern = new RegExp(`([w‡‰ˆ])(${JUKTAKKHOR_OR_CHAR})`, "g");
  text = text.replace(preVowelPattern, "$2$1");

  // 3. Move Reph (®, ©) to the front of the preceding consonant/Juktakkhor as র্
  const rephPattern = new RegExp(`(${JUKTAKKHOR_OR_CHAR})([®©])`, "g");
  text = text.replace(rephPattern, "®$1");

  return text;
}

/**
 * Detects if a text string is Bijoy ANSI formatted.
 */
export function isBijoyText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  if (/[\u0980-\u09FF]/.test(text)) return false;

  const bijoyCharRegex = /[‡‰ˆÂÃÄÅÁÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ®©]/;
  if (bijoyCharRegex.test(text)) return true;

  const bijoyPattern = /(wmwÛ|‡KU|GKv|‡WwgK|evsjv|ey‡qU|KvDÝil|wgwis)/;
  return bijoyPattern.test(text);
}

/**
 * Converts Bijoy 52 ANSI (SutonnyMJ) text to Unicode Bangla text.
 */
export function convertBijoyToUnicode(text: string): string {
  if (!text) return "";

  let processed = preProcessBijoy(text);

  for (const [bijoy, unicode] of BIJOY_TO_UNICODE_MAP) {
    if (processed.includes(bijoy)) {
      processed = processed.split(bijoy).join(unicode);
    }
  }

  // Replace Reph marker
  processed = processed.replace(/®/g, "র্");

  return processed;
}

/**
 * Safely converts Bijoy text within an HTML string by traversing text nodes only,
 * preserving HTML tags (<p>, <table>, <td>, etc.).
 */
export function convertHtmlBijoyToUnicode(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") return convertBijoyToUnicode(html);

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const walkTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue && node.nodeValue.trim()) {
          node.nodeValue = convertBijoyToUnicode(node.nodeValue);
        }
      } else {
        node.childNodes.forEach(walkTextNodes);
      }
    };

    walkTextNodes(doc.body);
    return doc.body.innerHTML;
  } catch (e) {
    return convertBijoyToUnicode(html);
  }
}

