import * as fs from "fs";
import { rimraf } from "rimraf";
import { ColorType, PNG } from "pngjs";
import pako from "pako";
import {
  PDFDocument,
  PDFDocumentFactory,
  PDFIndirectReference,
  PDFName,
  PDFObject,
  PDFRawStream,
} from "pdf-lib";

// Definir tipos para el color de las imágenes PNG
enum PngColorTypes {
  Grayscale = 0,
  Rgb = 2,
  GrayscaleAlpha = 4,
  RgbAlpha = 6,
}

const ComponentsPerPixelOfColorType: Record<ColorType, number> = {
  [PngColorTypes.Rgb]: 3,
  [PngColorTypes.Grayscale]: 1,
  [PngColorTypes.RgbAlpha]: 4,
  [PngColorTypes.GrayscaleAlpha]: 2,
};

interface PDFImage {
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

export class PdfImageExtractor {
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
  ) {
    this.options = options;
    this.pdfFile = file;
    this.pdfDoc = PDFDocumentFactory.load(
      options?.isBuffer ? (file as Buffer) : fs.readFileSync(file)
    );
    this.imagesInDoc = [];
    this.objectIdx = 0;
    this.outputDirectory = options?.outputDirectory;
  }

  findImageObjects() {
    this.pdfDoc.index.index.forEach((pdfObject, ref) => {
      this.objectIdx += 1;
      if (!(pdfObject instanceof PDFRawStream)) return;

      const { lookupMaybe } = this.pdfDoc.index;
      const { dictionary: dict } = pdfObject;

      const smaskRef = dict.getMaybe("SMask");
      const colorSpace = lookupMaybe(dict.getMaybe("ColorSpace"));
      const subtype = lookupMaybe(dict.getMaybe("Subtype"));
      const width = lookupMaybe(dict.getMaybe("Width"));
      const height = lookupMaybe(dict.getMaybe("Height"));
      const name = lookupMaybe(dict.getMaybe("Name"));
      const bitsPerComponent = lookupMaybe(dict.getMaybe("BitsPerComponent"));
      const filter = lookupMaybe(dict.getMaybe("Filter"));

      if (subtype === PDFName.from("Image")) {
        this.imagesInDoc.push({
          ref,
          smaskRef,
          colorSpace,
          name: name
            ? (name as PDFName & { key: string }).key
            : `Object${this.objectIdx}`,
          width: (width as PDFName & { number: number }).number,
          height: (height as PDFName & { number: number }).number,
          bitsPerComponent: (bitsPerComponent as PDFName & { number: number })
            .number,
          data: pdfObject.content,
          type: filter === PDFName.from("DCTDecode") ? "jpg" : "png",
        });
      }
    });
  }

  markSMasksAsAlphaLayer() {
    this.imagesInDoc.forEach((image) => {
      if (image.type === "png" && image.smaskRef) {
        const smaskImg = this.imagesInDoc.find(
          ({ ref }) => ref === image.smaskRef
        );
        if (smaskImg) {
          smaskImg.isAlphaLayer = true;
          image.alphaLayer = image;
        }
      }
    });
  }

  async saveImageAsPNG(image: PDFImage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const isGrayscale = image.colorSpace === PDFName.from("DeviceGray");
      const colorPixels = pako.inflate(image.data);
      const alphaPixels = image.alphaLayer
        ? pako.inflate(image.alphaLayer.data)
        : undefined;

      const colorType: ColorType =
        isGrayscale && alphaPixels
          ? PngColorTypes.GrayscaleAlpha
          : !isGrayscale && alphaPixels
          ? PngColorTypes.RgbAlpha
          : isGrayscale
          ? PngColorTypes.Grayscale
          : PngColorTypes.Rgb;

      const colorByteSize = 1;
      const width = image.width * colorByteSize;
      const height = image.height * colorByteSize;
      const inputHasAlpha = [
        PngColorTypes.RgbAlpha,
        PngColorTypes.GrayscaleAlpha,
      ].includes(colorType);

      const png = new PNG({
        width,
        height,
        colorType,
        inputColorType: colorType,
        inputHasAlpha,
      });

      const componentsPerPixel = ComponentsPerPixelOfColorType[colorType];
      png.data = Buffer.from(
        new Uint8Array(width * height * componentsPerPixel)
      );

      let colorPixelIdx = 0;
      let pixelIdx = 0;

      // prettier-ignore
      while (pixelIdx < png.data.length) {
        if (colorType === PngColorTypes.Rgb) {
          png.data[pixelIdx++] = colorPixels[colorPixelIdx++];
          png.data[pixelIdx++] = colorPixels[colorPixelIdx++];
          png.data[pixelIdx++] = colorPixels[colorPixelIdx++];
        } else if (colorType === PngColorTypes.RgbAlpha) {
          png.data[pixelIdx++] = colorPixels[colorPixelIdx++];
          png.data[pixelIdx++] = colorPixels[colorPixelIdx++];
          png.data[pixelIdx++] = colorPixels[colorPixelIdx++];
          png.data[pixelIdx++] = alphaPixels![colorPixelIdx - 1]
        } else if (colorType === PngColorTypes.Grayscale) {
          const bit =
            (colorPixels[colorPixelIdx] >> 7) === 0 ? 0x00 : 0xff; // Read the most significant bit
          png.data[pixelIdx++] = bit;
          colorPixelIdx++;
        } else if (colorType === PngColorTypes.GrayscaleAlpha) {
          const bit =
            (colorPixels[colorPixelIdx] >> 7) === 0 ? 0x00 : 0xff; // Read the most significant bit
          png.data[pixelIdx++] = bit;
          png.data[pixelIdx++] = alphaPixels![colorPixelIdx - 1];
          colorPixelIdx++;
        } else {
          throw new Error(`Unknown colorType=${colorType}`);
        }
      }

      const buffer: number[] = [];
      png
        .pack()
        .on("data", (data) => buffer.push(...data))
        .on("end", () => resolve(Buffer.from(buffer)))
        .on("error", (err) => reject(err));
    });
  }

  async extractImages(): Promise<undefined | Uint8Array[] | Buffer[]> {
    this.findImageObjects();
    this.markSMasksAsAlphaLayer();
    const filesArray = [];

    if (this.options?.isBuffer) {
      for (const img of this.imagesInDoc) {
        if (!img.isAlphaLayer) {
          const imageData =
            img.type === "jpg" ? img.data : await this.saveImageAsPNG(img);
          filesArray.push(imageData);
        }
      }
    }

    if (this.options?.outputDirectory || !this.options?.isBuffer) {
      if (!fs.existsSync(`${this.outputDirectory}`)) {
        fs.mkdirSync(`${this.outputDirectory}`);
      }
      await rimraf(`${this.outputDirectory}/*.{jpg,png}`);
      let idx = 0;
      for (const img of this.imagesInDoc) {
        if (!img.isAlphaLayer) {
          const imageData =
            img.type === "jpg" ? img.data : await this.saveImageAsPNG(img);
          fs.writeFileSync(
            `${this.outputDirectory}/out${idx + 1}.png`,
            imageData
          );
          idx += 1;
        }
      }
      return;
    }
    return filesArray;
  }
}
