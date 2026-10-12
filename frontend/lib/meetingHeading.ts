import { toBanglaDigits } from "./banglaNumerals";

export type HeadingDocType = "agenda" | "suppli-agenda" | "resolution" | "resolution-status";

// Document heading (university line + subtitle), computed like
// meeting_service/utils/pdfGenerator.js (buildMeetingHtml) so the PDF preview
// and the read-only viewer match the generated PDF.
export function buildMeetingHeading(meeting: any, docType: HeadingDocType) {
  const docLabel =
    docType === "resolution"
      ? "কার্যবিবরণী"
      : docType === "resolution-status"
        ? "সিদ্ধান্ত বাস্তবায়ন অবস্থা"
        : docType === "suppli-agenda"
          ? "সম্পূরক আলোচ্যসূচি"
          : "আলোচ্যসূচী";
  const isEmergency = meeting?.is_regular === false;

  const formatMeetingSerial = (rawTitle: string) =>
    !rawTitle
      ? ""
      : toBanglaDigits(
          String(rawTitle)
            .trim()
            .replace(/^(meeting\s*|councel\s*|council\s*)/i, "")
            .replace(/^(\d+)(st|nd|rd|th)$/i, "$1")
            .trim(),
        );

  const d = meeting?.meeting_date ? new Date(meeting.meeting_date) : null;
  const dateShort = d
    ? `${toBanglaDigits(d.getDate(), 2)}-${toBanglaDigits(String(d.getMonth() + 1).padStart(2, "0"), 2)}-${toBanglaDigits(d.getFullYear())}`
    : "";
  const meetingDate = d
    ? toBanglaDigits(d.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" }))
    : "";
  const serialNo = formatMeetingSerial(meeting?.title || "Untitled");
  const serialNoDigits = serialNo.replace(/[^\d০-৯]/g, "");
  const formattedSerial = serialNoDigits ? toBanglaDigits(serialNoDigits, 2) : toBanglaDigits(serialNo, 2);
  const meetingSerialLabel =
    serialNo.includes("সভা") || serialNo.includes("কাউন্সিল") ? serialNo : `${serialNo}তম সভার`;
  const typeStr = (meeting?.type || "").toLowerCase();
  const isSyndicate = typeStr === "syndicate" || typeStr.includes("syndicate");
  const councilLabel = isSyndicate ? "সিন্ডিকেটের" : "একাডেমিক কাউন্সিলের";
  // Every heading names the council; skip it only if a custom title already does.
  const meetingCouncilLabel = /কাউন্সিল|সিন্ডিকেট/.test(meetingSerialLabel) ? meetingSerialLabel : `${councilLabel} ${meetingSerialLabel}`;
  const dateVerb = docType === "resolution" || docType === "resolution-status" ? "অনুষ্ঠিত" : "অনুষ্ঠিতব্য";

  if (docType === "suppli-agenda") {
    return {
      university: true,
      subtitle: `${meetingDate} তারিখে অনুষ্ঠিতব্য ${councilLabel}\n${serialNo}তম সভার সাপ্লিমেন্টারী আলোচ্যসূচী।`,
    };
  }
  if (isEmergency) {
    return {
      university: true,
      subtitle: `${dateShort} তারিখে অনুষ্ঠিতব্য ${councilLabel}\n${formattedSerial}তম জরুরী (Immediate) সভার ${docLabel}`,
    };
  }
  return {
    university: true,
    subtitle: `${meetingDate} তারিখে ${dateVerb} ${meetingCouncilLabel.replace(/^(.*?(?:সিন্ডিকেটের|কাউন্সিলের))\s+/, "$1\n")} ${docLabel}`,
  };
}
