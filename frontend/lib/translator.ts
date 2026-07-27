/**
 * Utility to translate text between English and Bangla using Google Translate client API.
 */

export function isBanglaText(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

export async function translateText(text: string, targetLang: 'bn' | 'en'): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.trim())}`
    );
    if (!response.ok) return "";
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item: any) => item[0]).filter(Boolean).join(" ");
    }
    return "";
  } catch (error) {
    console.error("Auto translation error:", error);
    return "";
  }
}

/**
 * Auto-populates bilingual office or department fields given an initial input string.
 */
export async function autoFillBilingualFields(inputName: string): Promise<{ name_english: string; name_bangla: string }> {
  if (!inputName || !inputName.trim()) {
    return { name_english: '', name_bangla: '' };
  }
  const isBangla = isBanglaText(inputName);
  if (isBangla) {
    const translatedEn = await translateText(inputName, 'en');
    return {
      name_bangla: inputName.trim(),
      name_english: translatedEn || inputName.trim()
    };
  } else {
    const translatedBn = await translateText(inputName, 'bn');
    return {
      name_english: inputName.trim(),
      name_bangla: translatedBn || inputName.trim()
    };
  }
}
