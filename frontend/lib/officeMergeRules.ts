// Mirrors departmentMergeRules.ts, but for the `office` free-text field on
// imported presentees. Unlike departments (which cover ~27 fairly distinct
// legacy spellings), office text mostly varies only for the two university-wide
// leadership posts (Vice Chancellor / Pro-Vice Chancellor) — e.g. legacy JSON
// exports often say "উপাচার্য ও সভাপতি" (Vice Chancellor AND Chairman) instead
// of the canonical "উপাচার্য" office row, so an exact string match silently
// fails and the VC gets dropped into manual/unresolved resolution.
//
// Per-faculty Dean / per-department Head offices are intentionally NOT covered
// here: a wrong guess there would misattribute someone to the wrong faculty or
// department, which is worse than asking a human to resolve it once. The VC and
// Pro-VC posts are university-wide singletons, so a false match isn't possible.
interface MergeRule {
  pattern: RegExp;
  target: string;
}

export const OFFICE_MERGE_RULES: MergeRule[] = [
  // Leadership & Vice Chancellor rules
  { pattern: /(উপ-?উপাচার্য|প্রো-?ভিসি|Pro-?VC)/i, target: "উপ-উপাচার্য, বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়" },
  { pattern: /(উপাচার্য|ভিসি\b|Vice\s*Chancellor)/i, target: "উপাচার্য, বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়" },

  // Dean Offices rules
  { pattern: /(ডিন|ডীন|Dean).*(স্থাপত্য|স্হাপত্য|পরিকল্পনা|আর্কিটেকচার)/i, target: "ডিন, স্থাপত্য ও পরিকল্পনা অনুষদ" },
  { pattern: /(ডিন|ডীন|Dean).*(যন্ত্র|যন্ত|মেকানিক্যাল)/i, target: "ডিন, যন্ত্রকৌশল অনুষদ" },
  { pattern: /(ডিন|ডীন|Dean).*(কেমিক্যাল|কেমিকেল|ম্যাটেরিয়ালস|মেটেরিয়ালস|এফ[,.\s]*সি[,.\s]*এম[,.\s]*ই)/i, target: "ডিন, কেমিক্যাল ও ম্যাটেরিয়ালস কৌশল অনুষদ (এফসিএমই)" },
  { pattern: /(ডিন|ডীন|Dean).*(পুরকৌশল|পূর্কৌশল|সিভিল|প্রকৌশল অনুষদ)/i, target: "ডিন, পুরকৌশল অনুষদ" },
  { pattern: /(ডিন|ডীন|Dean).*(তড়িৎ|তড়িৎ|ইলেক্ট্রনিক|ইলেকট্রনিক|ইলেকট্রিক্যাল)/i, target: "ডিন, তড়িৎ ও ইলেক্ট্রনিক কৌশল অনুষদ" },
  { pattern: /(ডিন|ডীন|Dean).*(বিজ্ঞান|সাইন্স|সায়েন্স)/i, target: "ডিন, বিজ্ঞান অনুষদ" },
  { pattern: /(ডিন|ডীন|Dean).*(স্নাতকোত্তর|স্নাতকোত্তোর|পোস্ট\s*গ্রাজুয়েট|পোষ্ট\s*গ্রাজুয়েট|Post\s*Grad|Post\s*Graduate)/i, target: "ডিন, স্নাতকোত্তর স্টাডিজ অনুষদ" },

  // Department Head Office Rules (matches "প্রধান, ...", "বিভাগীয় প্রধান, ...", "Head, ...")
  { pattern: /(প্রধান|Head).*(কম্পিউটার|সি[.,\s]*এস[.,\s]*ই)/i, target: "বিভাগীয় প্রধান, কম্পিউটার সায়েন্স এন্ড ইঞ্জিনিয়ারিং বিভাগ (সিএসই)" },
  { pattern: /(প্রধান|Head).*(তড়িৎ|তড়িৎ|ইলেক্ট্রনিক|ইলেকট্রনিক|ইইই)/i, target: "বিভাগীয় প্রধান, তড়িৎ ও ইলেক্ট্রনিক কৌশল বিভাগ (ইইই)" },
  { pattern: /(প্রধান|Head).*(যন্ত্র|যন্ত|মেকানিক্যাল)/i, target: "বিভাগীয় প্রধান, যন্ত্রকৌশল বিভাগ (এমই)" },
  { pattern: /(প্রধান|Head).*(পুরকৌশল|সিভিল|সি[.,\s]*ই[.,\s]*ই|সি[.,\s]*ই\b)/i, target: "বিভাগীয় প্রধান, পুরকৌশল বিভাগ (সিই)" },
  { pattern: /(প্রধান|Head).*(কেমিকৌশল|কেমিক্যাল|কেমিকেল)/i, target: "বিভাগীয় প্রধান, কেমিকৌশল বিভাগ (সিএইচই)" },
  { pattern: /(প্রধান|Head).*(বস্তু|ধাতব|মেটালার্জিক্যাল)/i, target: "বিভাগীয় প্রধান, বস্তু ও ধাতব কৌশল বিভাগ (এমএমই)" },
  { pattern: /(প্রধান|Head).*(স্থাপত্য|স্হাপত্য|আর্কিটেকচার)/i, target: "বিভাগীয় প্রধান, স্থাপত্য বিভাগ (আর্চ)" },
  { pattern: /(প্রধান|Head).*(নগর|পরিকল্পনা|ইউ[.,\s]*আর[.,\s]*পি)/i, target: "বিভাগীয় প্রধান, নগর ও অঞ্চল পরিকল্পনা বিভাগ (ইউআরপি)" },
  { pattern: /(প্রধান|Head).*(শিল্প|উৎপাদন|আই[.,\s]*পি[.,\s]*ই)/i, target: "বিভাগীয় প্রধান, শিল্প ও উৎপাদন কৌশল বিভাগ (আইপিই)" },
  { pattern: /(প্রধান|Head).*(নৌযান|নৌযন্ত্র|নৌ|নেভাল)/i, target: "বিভাগীয় প্রধান, নৌযান ও নৌযন্ত্র কৌশল বিভাগ (এনএএমই)" },
  { pattern: /(প্রধান|Head).*(বায়োমেডিক্যাল|বায়োমেডিকেল|বিএমই)/i, target: "বিভাগীয় প্রধান, বায়োমেডিকেল ইঞ্জিনিয়ারিং বিভাগ (বিএমই)" },
  { pattern: /(প্রধান|Head).*(ন্যানোম্যাটেরিয়ালস|সিরামিক|এনসিই|গ্লাস)/i, target: "বিভাগীয় প্রধান, ন্যানোম্যাটেরিয়ালস এন্ড সিরামিক ইঞ্জিনিয়ারিং বিভাগ (এনসিই)" },
  { pattern: /(প্রধান|Head).*(পেট্রোলিয়াম|মিনারেল|পিএমআরই)/i, target: "বিভাগীয় প্রধান, পেট্রোলিয়াম ও মিনারেল রিসোর্সেস প্রকৌশল বিভাগ (পিএমআরই)" },
  { pattern: /(প্রধান|Head).*(পানি সম্পদ|পানিসম্পদ|ডব্লিউআরই)/i, target: "বিভাগীয় প্রধান, পানি সম্পদ কৌশল বিভাগ (ডব্লিউআরই)" },
  { pattern: /(প্রধান|Head).*(রসায়ন|কেমিষ্ট্রি)/i, target: "বিভাগীয় প্রধান, রসায়ন বিভাগ (কেম)" },
  { pattern: /(প্রধান|Head).*(গণিত|গনিত|ম্যাথ)/i, target: "বিভাগীয় প্রধান, গণিত বিভাগ (ম্যাথ)" },
  { pattern: /(প্রধান|Head).*(পদার্থ|ফিজিক্স)/i, target: "বিভাগীয় প্রধান, পদার্থবিজ্ঞান বিভাগ (ফিজিক্স)" },
  { pattern: /(প্রধান|Head).*(মানবিক|হিউম)/i, target: "বিভাগীয় প্রধান, মানবিক বিভাগ (হিউম)" },
];




/**
 * Storage key for user-created / manual office merge mappings
 */
const CUSTOM_OFFICE_RULES_KEY = "custom_office_merge_rules";

export function getCustomOfficeRules(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CUSTOM_OFFICE_RULES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomOfficeRule(rawName: string, targetOfficeId: string) {
  if (typeof window === "undefined" || !rawName || !targetOfficeId) return;
  try {
    const current = getCustomOfficeRules();
    const normalized = rawName.replace(/\s+/g, ' ').trim().toLowerCase();
    current[normalized] = targetOfficeId;
    localStorage.setItem(CUSTOM_OFFICE_RULES_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save custom office rule", e);
  }
}

/**
 * Resolves a raw (unmatched) office string to an office id using both custom
 * saved mappings and static merge rules.
 */
export function resolveOfficeByMergeRule(
  rawName: string,
  offices: Array<{ id: string; name_bangla?: string; name_english?: string }>
): string | null {
  if (!rawName) return null;
  const normalizedRaw = rawName.replace(/\s+/g, ' ').trim();
  const normalizedRawKey = normalizedRaw.toLowerCase();

  // 1. Check custom user-saved mappings first
  const customRules = getCustomOfficeRules();
  if (customRules[normalizedRawKey]) {
    const matchedOffice = offices.find((o) => o.id === customRules[normalizedRawKey]);
    if (matchedOffice) return matchedOffice.id;
  }

  // 2. Check static predefined rules
  const rule = OFFICE_MERGE_RULES.find((r) => r.pattern.test(normalizedRaw));
  if (!rule) return null;

  const targetName = rule.target.replace(/\s+/g, ' ').trim().toLowerCase();

  const target = offices.find((o) => {
    const bName = o.name_bangla?.replace(/\s+/g, ' ').trim().toLowerCase();
    const eName = o.name_english?.replace(/\s+/g, ' ').trim().toLowerCase();
    return bName === targetName || eName === targetName || bName?.includes(targetName) || targetName.includes(bName || '___never___');
  });

  return target ? target.id : null;
}


