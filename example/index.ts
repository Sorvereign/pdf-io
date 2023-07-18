import { PdfImageExtractor } from "../pdf-image-extractor";

const pdfFilePath = "path/to/your/pdf/file.pdf";
const outputDirectory = "path/to/output/images";

// Create an instance of PdfImageExtractor
const extractor = new PdfImageExtractor(pdfFilePath, { outputDirectory });

// Extract images from the PDF
await extractor.extractImages();