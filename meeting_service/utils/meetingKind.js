// A meeting whose heading says "Immediate" (e.g. "জরুরী (Immediate) সভা") is an
// Immediate meeting, not a Regular one — is_regular = false.
const isImmediateHeading = (...headings) =>
    headings.some((h) => typeof h === 'string' && /immediate/i.test(h));

// Explicit boolean from the caller wins; otherwise infer it from the heading.
const resolveIsRegular = (explicit, ...headings) =>
    typeof explicit === 'boolean' ? explicit : !isImmediateHeading(...headings);

module.exports = { isImmediateHeading, resolveIsRegular };
