type EventEmitterLike = { on(event: string, listener: (...args: any[]) => void): any };
type PdfDocLike = EventEmitterLike & { end(): void };

/**
 * Termine un PDF et résout quand le fichier est entièrement écrit.
 * Rejette si le flux d'écriture OU le document émet une erreur, afin d'éviter
 * une requête pendante (par ex. disque plein) qui n'aboutirait jamais.
 */
export function finalizePdf(doc: PdfDocLike, stream: EventEmitterLike): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
    doc.on('error', reject);
    doc.end();
  });
}
