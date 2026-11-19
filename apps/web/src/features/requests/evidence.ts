export interface EvidenceInput {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export async function prepareEvidence(files: File[]): Promise<EvidenceInput[]> {
  if (files.length > 3) throw new Error('Puedes adjuntar hasta 3 archivos.');
  for (const file of files) {
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))
      throw new Error('Las evidencias deben ser PDF, PNG o JPEG.');
    if (!file.size) throw new Error('No puedes adjuntar un archivo vacío.');
    if (file.size > 1024 * 1024)
      throw new Error('Cada evidencia debe ocupar como máximo 1 MiB.');
  }
  return Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      mimeType: file.type,
      contentBase64: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () =>
          reject(
            new Error(
              'No se pudo leer la evidencia. Selecciona el archivo otra vez.',
            ),
          );
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== 'string' || !result.includes(',')) {
            reject(new Error('No se pudo leer la evidencia.'));
            return;
          }
          resolve(result.slice(result.indexOf(',') + 1));
        };
        reader.readAsDataURL(file);
      }),
    })),
  );
}
