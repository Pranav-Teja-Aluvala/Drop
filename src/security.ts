/** Normalize OS-sensitive names without filtering file extensions or file contents. */
export function safeFilename(name: string): string {
  let clean = name.normalize('NFC').replace(/[\x00-\x1f\x7f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/g, '_').replace(/[. ]+$/g, '') || 'download';
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(clean)) clean = '_' + clean;
  if (clean.length > 180) {
    const dot = clean.lastIndexOf('.');
    const extension = dot > 0 && clean.length - dot <= 32 ? clean.slice(dot) : '';
    clean = clean.slice(0, 180 - extension.length) + extension;
  }
  return clean;
}
