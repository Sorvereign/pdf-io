import { PDFIO } from "../pdf-io";

const pdfFilePath = "path/to/your/pdf/file.pdf";
const outputDirectory = "path/to/output/images";

// Create an instance of PDFIO
const extractor = new PDFIO(pdfFilePath, { outputDirectory });

// Extract images from the PDF
await extractor.extractImages();