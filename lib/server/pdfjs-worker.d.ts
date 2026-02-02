/**
 * Type declaration for pdfjs-dist worker module
 * The worker module doesn't ship with TypeScript types, so we declare it here
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
