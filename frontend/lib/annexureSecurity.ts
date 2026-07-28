export const EXECUTABLE_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'vbs', 'vbe', 'js', 'jse', 
  'wsf', 'wsh', 'msc', 'com', 'scr', 'pif', 'msi', 'msp', 'hta', 'cpl', 
  'jar', 'py', 'pl', 'php', 'asp', 'aspx', 'jsp', 'cgi', 'htm', 'html', 'shtml'
];

export const ALLOWED_READABLE_EXTENSIONS = [
  // Documents
  'pdf', 'docx', 'doc', 'txt', 'rtf', 'odt',
  // Spreadsheets & Data
  'xlsx', 'xls', 'csv', 'ods',
  // Presentations
  'pptx', 'ppt', 'odp',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff',
  // Audio & Video
  'mp3', 'mp4', 'wav', 'm4a', 'avi', 'mkv',
  // Archives & Folder Packages
  'zip', 'rar', '7z', 'tar', 'gz'
];

export function getFileExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()!.toLowerCase();
}

export function isExecutableFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return EXECUTABLE_EXTENSIONS.includes(ext);
}

export function isAllowedReadableFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_READABLE_EXTENSIONS.includes(ext);
}

export function validateFilesList(files: File[] | FileList): { valid: boolean; offendingFile?: string } {
  const fileArray = Array.from(files);
  for (const file of fileArray) {
    if (isExecutableFile(file.name)) {
      return { valid: false, offendingFile: file.name };
    }
  }
  return { valid: true };
}
