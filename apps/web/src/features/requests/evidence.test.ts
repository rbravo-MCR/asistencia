import { expect, it } from 'vitest';
import { prepareEvidence } from './evidence';

it('reads a private evidence file into the submission without a public URL', async () => {
  const files = [
    new File(['%PDF-1.7\nprivate'], 'constancia.pdf', {
      type: 'application/pdf',
    }),
  ];
  expect(await prepareEvidence(files)).toEqual([
    {
      filename: 'constancia.pdf',
      mimeType: 'application/pdf',
      contentBase64: btoa('%PDF-1.7\nprivate'),
    },
  ]);
});
it('rejects more than three files and files larger than one MiB before sending', async () => {
  const small = new File(['x'], 'a.pdf', { type: 'application/pdf' });
  await expect(prepareEvidence([small, small, small, small])).rejects.toThrow(
    'hasta 3',
  );
  await expect(
    prepareEvidence([
      new File([new Uint8Array(1024 * 1024 + 1)], 'large.pdf', {
        type: 'application/pdf',
      }),
    ]),
  ).rejects.toThrow('1 MiB');
});
it('rejects unsupported and empty evidence files', async () => {
  await expect(
    prepareEvidence([new File(['<html>'], 'page.html', { type: 'text/html' })]),
  ).rejects.toThrow('PDF, PNG o JPEG');
  await expect(
    prepareEvidence([new File([], 'empty.pdf', { type: 'application/pdf' })]),
  ).rejects.toThrow('vacío');
});
