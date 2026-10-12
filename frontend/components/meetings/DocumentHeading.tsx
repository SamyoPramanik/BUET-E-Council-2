import { buildMeetingHeading, type HeadingDocType } from "../../lib/meetingHeading";

// University line + subtitle shown above a document, same as the generated PDF.
export default function DocumentHeading({ meeting, docType }: { meeting: any; docType: HeadingDocType }) {
  const heading = buildMeetingHeading(meeting, docType);
  return (
    <div className="text-center font-bold mb-6 leading-snug">
      <h2 className="text-[22pt] mb-2.5">বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়, ঢাকা</h2>
      <h3 className="underline text-[18pt] whitespace-pre-line">{heading.subtitle}</h3>
    </div>
  );
}
