// pdf-image-extractor.d.ts
import { PDFDocument, PDFIndirectReference, PDFObject } from "pdf-lib";
export interface PDFImage {
  ref: PDFIndirectReference<PDFObject>;
  type: string;
  smaskRef: PDFObject | void;
  colorSpace: void | PDFObject;
  name: string;
  width: number;
  height: number;
  bitsPerComponent: number;
  data: Uint8Array;
  alphaLayer?: PDFImage;
  isAlphaLayer?: boolean;
}

export declare class PDFIO {
  pdfFile: string | Buffer;
  pdfDoc: PDFDocument;
  imagesInDoc: PDFImage[];
  objectIdx: number;
  outputDirectory?: string;
  options?: {
    isBuffer?: boolean;
    outputDirectory?: string;
  };

  constructor(
    file: Buffer | string,
    options?: {
      isBuffer?: boolean;
      outputDirectory?: string;
    }
  );

  findImageObjects(): void;
  markSMasksAsAlphaLayer(): void;
  saveImageAsPNG(image: PDFImage): Promise<Buffer>;
  extractImages(): Promise<undefined | Uint8Array[] | Buffer[]>;
}
