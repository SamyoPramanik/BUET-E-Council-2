# Department Merge Rules

Source of truth for the regex-to-department mapping used when a JSON import's
`department` string doesn't exactly match a department's `name_bangla`/
`name_english`/`alias_bangla`/`alias_english`. Rules are matched **in order**;
the first matching pattern wins. Live implementation: `frontend/lib/departmentMergeRules.ts`.

| # | Pattern | Target Department |
|---|---------|-------------------|
| 1 | `তড়িৎ\|ইলেক` | Electrical and Electronic Engineering |
| 2 | `কম্পিউটার` | Computer Science and Engineering |
| 3 | `ইন্ডাষ্ট্রিয়াল\|ইন্ড্রাষ্ট্রিয়াল\|আই[,.\s]*পি[,.\s]*ই` | Industrial and Production Engineering |
| 4 | `এপ্রোপ্রিয়েট\|এ্যপ্রোপ্রিয়েট\|আই[,.\s]*এ[,.\s]*টি` | Institute of Appropriate Technology |
| 5 | `ইনফরমেশন এন্ড কমিউনিকেশন\|আই[,.\s]*আই[,.\s]*সি[,.\s]*টি` | Institute of Information and Communication Technology |
| 6 | `বন্যা\|আই[,.\s]*এফ[,.\s]*সি[,.\s]*ডি[,.\s]*আর\|আই[,.\s]*ডব্লিউ[,.\s]*এফ[,.\s]*এম` | Institute of Water and Flood Management |
| 7 | `পেট্রোলিয়াম\|মিনারেল` | Petroleum and Mineral Resources Engineering |
| 8 | `ধাতব\|মেটালার্জিক্যাল` | Materials and Metallurgical Engineering |
| 9 | `^গনিত বিভাগ$\|^গণিত বিভাগ$` | Mathematics |
| 10 | `পদার্থ` | Physics |
| 11 | `ফিজিকস বিভাগ` | Physics |   
| 12 | `গ্লাস এন্ড সিরামিক` | Nanomaterials and Ceramic Engineering |
| 13 | `যন্ত্র?কৌশল (অনুষদ\|বিভাগ)$\|যন্ত্রিকৌশল` | Mechanical Engineering |
| 14 | `নৌ\|জলযান` | Naval Architecture and Marine Engineering |
| 15 | `আর্কিটেকচার\|অস্থাপত্য\|স্হাপত্য বিভাগ$\|স্থাপত্য কৌশল বিভাগ\|^স্থাপত্য বিভাগ$\|^স্থাপত্য অনুষদ$` | Architecture |
| 16 | `স্থাপত্য ও পরিকল্পনা\|স্হাপত্য ও পরিকল্পনা` | Architecture |
| 17 | `নগর ও (অঞ্চল )?পরিকল্পনা\|^পরিকল্পনা বিভাগ$\|আই[,.\s]*উ[,.\s]*আর[,.\s]*পি\|ইউ[,.\s]*আর[,.\s]*পি` | Urban and Regional Planning |
| 18 | `পানিসম্পদ\|পানি সম্পদ` | Water Resources Engineering |    
| 19 | `কেমিকেল ইনজিনিয়ারিং\|^কেমিকৌশল(\s+বিজ্ঞান)?` | Chemical Engineering |
| 20 | `সিভিল ইনজিনিয়ারিং\|^পুরকৌশল (বিভাগ\|বিভা\|অনুষদ)\|^প্রকৌশল অনুষদ$` | Civil Engineering |
| 21 | `কেমিষ্ট্রি বিভাগ\|^রসায়ন বিভাগ$` | Chemistry |
| 22 | `^মানবিক বিভাগ$` | Humanities |
| 23 | `ইলেকট্রিক্যাল ইনজিনিয়ারিং` | Electrical and Electronic Engineering |
| 24 | `^সি[.,\s]*এস[.,\s]*ই\b` | Computer Science and Engineering |
| 25 | `^ত[.,\s]*ই[.,\s]*,?\s*কৌশল` | Electrical and Electronic Engineering |
| 26 | `^পি[.,\s]*এম[.,\s]*আর[.,\s]*ই\b` | Petroleum and Mineral Resources Engineering |
| 27 | `^যন্ত্রকৌশল বিভাগ বাপ্রবি` | Mechanical Engineering |
| 28 | `বায়োমেডিক্যাল\|বায়োমেডিকেল` | Biomedical Engineering |
| 29 | `^সি[.,\s]*ই[.,\s]*ই\b` | Civil Engineering |

---

# Office & Dean Merge Rules

Source of truth for the regex-to-office mapping used when importing attendees with leadership or Dean roles. Live implementation: `frontend/lib/officeMergeRules.ts`.

| # | Pattern | Target Office | Catchable Typos & Variations |
|---|---------|---------------|-------------------------------|
| 1 | `(উপ-?উপাচার্য\|প্রো-?ভিসি\|Pro-?VC)` | `উপ-উপাচার্য, বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়` | `উপউপাচার্য`, `উপ-উপাচার্য`, `প্রো-ভিসি`, `Pro-VC` |
| 2 | `(উপাচার্য\|ভিসি\b\|Vice\s*Chancellor)` | `উপাচার্য, বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়` | `উপাচার্য`, `ভিসি`, `Vice Chancellor` |
| 3 | `(ডিন\|ডীন\|Dean).*(স্থাপত্য\|স্হাপত্য\|পরিকল্পনা\|আর্কিটেকচার)` | `ডিন, স্থাপত্য ও পরিকল্পনা অনুষদ` | `ডীন`, `স্হাপত্য`, `আর্কিটেকচার` |
| 4 | `(ডিন\|ডীন\|Dean).*(যন্ত্র\|যন্ত\|মেকানিক্যাল)` | `ডিন, যন্ত্রকৌশল অনুষদ` | `যন্ত`, `মেকানিক্যাল` |
| 5 | `(ডিন\|ডীন\|Dean).*(কেমিক্যাল\|কেমিকেল\|ম্যাটেরিয়ালস\|মেটেরিয়ালস\|এফ[,.\s]*সি[,.\s]*এম[,.\s]*ই)` | `ডিন, কেমিক্যাল ও ম্যাটেরিয়ালস কৌশল অনুষদ (এফসিএমই)` | `কেমিকেল`, `মেটেরিয়ালস`, `এফসিএমই` |
| 6 | `(ডিন\|ডীন\|Dean).*(পুরকৌশল\|পূর্কৌশল\|সিভিল)` | `ডিন, পুরকৌশল অনুষদ` | `পূর্কৌশল`, `সিভিল` |
| 7 | `(ডিন\|ডীন\|Dean).*(তড়িৎ\|তড়িৎ\|ইলেক্ট্রনিক\|ইলেকট্রনিক\|ইলেকট্রিক্যাল)` | `ডিন, তড়িৎ ও ইলেক্ট্রনিক কৌশল অনুষদ` | `তড়িৎ`, `ইলেকট্রনিক`, `ইলেকট্রিক্যাল` |
| 8 | `(ডিন\|ডীন\|Dean).*(বিজ্ঞান\|সাইন্স\|সায়েন্স)` | `ডিন, বিজ্ঞান অনুষদ` | `সাইন্স`, `সায়েন্স` |
| 9 | `(ডিন\|ডীন\|Dean).*(স্নাতকোত্তর\|স্নাতকোত্তোর\|পোস্ট\s*গ্রাজুয়েট\|পোষ্ট\s*গ্রাজুয়েট)` | `ডিন, স্নাতকোত্তর স্টাডিজ অনুষদ` | `ডীন`, `স্নাতকোত্তোর`, `পোষ্টগ্রাজুয়েট` |


