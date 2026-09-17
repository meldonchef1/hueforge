/** Hands a generated file to the browser's downloader. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Turns an image name into a safe base for an export file name. */
export function exportBaseName(source: string, fallback = 'hueforge'): string {
  const withoutExtension = source.replace(/\.[^.]+$/, '');
  const cleaned = withoutExtension.replace(/[^\w\-. ]+/g, '').trim();
  return cleaned.length > 0 ? cleaned : fallback;
}
