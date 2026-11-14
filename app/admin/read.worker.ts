import { readWorkbook } from '@/shared/import-workbook.mjs';

self.onmessage = ({
  data,
}: MessageEvent<{ bytes: ArrayBuffer; name: string }>) => {
  try {
    self.postMessage({
      sheets: readWorkbook(new Uint8Array(data.bytes), data.name),
    });
  } catch (e) {
    self.postMessage({
      error: e instanceof Error ? e.message : 'Could not read this file.',
    });
  }
};
