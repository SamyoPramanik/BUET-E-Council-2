const CustomError = require('../errors/CustomError');

// Allowed readable document, spreadsheet, presentation, image, audio/video, and archive formats
const ALLOWED_EXTENSIONS = [
    'pdf', 'docx', 'doc', 'txt', 'rtf', 'odt',
    'xlsx', 'xls', 'csv', 'ods',
    'pptx', 'ppt', 'odp',
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff',
    'mp3', 'mp4', 'wav', 'm4a', 'avi', 'mkv',
    'zip', 'rar', '7z', 'tar', 'gz'
];

// Strict executable & script blacklist
const EXECUTABLE_BLACKLIST = [
    'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'vbs', 'vbe', 'js', 'jse',
    'wsf', 'wsh', 'msc', 'com', 'scr', 'pif', 'msi', 'msp', 'hta', 'cpl',
    'jar', 'py', 'pl', 'php', 'asp', 'aspx', 'jsp', 'cgi', 'htm', 'html', 'shtml'
];

// Overridable via env so ops can raise/lower the cap without a code change.
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_ANNEXURE_SIZE_MB || '50', 10);

const fileFilter = (req, file, cb) => {
    let ext = (file.originalname.split('.').pop() || '').toLowerCase();

    // When the browser sends a Blob (not a File object), some environments name
    // it 'blob' with no real extension. Fall back to MIME type for archives.
    if (!ext || ext === 'blob' || file.originalname === 'blob') {
        const mime = (file.mimetype || '').toLowerCase();
        if (mime === 'application/zip' || mime === 'application/x-zip-compressed') ext = 'zip';
        else if (mime === 'application/x-rar-compressed') ext = 'rar';
        else if (mime === 'application/x-7z-compressed') ext = '7z';
        else if (mime === 'application/pdf') ext = 'pdf';
    }

    if (EXECUTABLE_BLACKLIST.includes(ext)) {
        cb(new CustomError(`Harmful file type uploaded in annexure ('${file.originalname}'). Executable files and scripts are strictly prohibited.`, 400));
        return;
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        cb(new CustomError(`Unsupported file type ('${file.originalname}'). Allowed formats: PDF, DOCX, TXT, XLSX, PPTX, PNG, JPG, ZIP, etc.`, 400));
        return;
    }

    cb(null, true);
};

module.exports = {
    ALLOWED_EXTENSIONS,
    EXECUTABLE_BLACKLIST,
    MAX_FILE_SIZE_MB,
    fileFilter,
};
