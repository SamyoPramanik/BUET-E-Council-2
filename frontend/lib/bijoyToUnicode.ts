/**
 * Bijoy 52 (SutonnyMJ ANSI) to Unicode Bangla Converter Engine
 * Powered by the official `bijoy2unicode` library (behind bijoy2unicode.com).
 */

import {
  convertBijoyToUnicode as pkgConvertBijoyToUnicode,
  looksLikeBijoy as pkgLooksLikeBijoy,
  hasBengaliUnicode as pkgHasBengaliUnicode
} from 'bijoy2unicode';

/**
 * Detects if a text string is Bijoy ANSI formatted.
 */
export function isBijoyText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  if (pkgHasBengaliUnicode(text)) return false;

  // Use package detection logic + custom fallback regex for BUET terms
  if (pkgLooksLikeBijoy(text)) return true;

  const bijoyCharRegex = /[‡‰ˆÂÃÄÅÁÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ®©]/;
  if (bijoyCharRegex.test(text)) return true;

  const bijoyPattern = /(wmwÛ|‡KU|GKv|‡WwgK|evsjv|ey‡qU|KvDÝil|wgwis)/;
  return bijoyPattern.test(text);
}

/**
 * Converts Bijoy 52 ANSI (SutonnyMJ) text to Unicode Bangla text using the official engine.
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
