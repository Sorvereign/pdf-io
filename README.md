# PdfImageExtractor

PdfImageExtractor is a TypeScript library that allows you to extract images from PDF files. It provides functionalities to parse a PDF, find image objects, and save the images as PNG files. The library is built using pdf-lib and pngjs.

## Installation

To use PdfImageExtractor in your project, you can install it via npm:

npm install pdf-image-extractor

csharp


## Usage

```typescript
import { PdfImageExtractor } from "pdf-image-extractor";

const pdfFilePath = "path/to/your/pdf/file.pdf";
const outputDirectory = "path/to/output/images";

// Create an instance of PdfImageExtractor
const extractor = new PdfImageExtractor(pdfFilePath, { outputDirectory });

// Extract images from the PDF
await extractor.extractImages();
```

# API

constructor(file: Buffer | string, options?: { isBuffer?: boolean; outputDirectory?: string; })

Creates a new instance of PdfImageExtractor.

    file: The path to the PDF file or a Buffer containing the PDF data.
    options: An optional object with the following properties:
        isBuffer: If true, the file parameter is treated as a Buffer. Default is false.
        outputDirectory: The path to the directory where the extracted images will be saved. Only used if isBuffer is false.

async extractImages(): Promise<undefined | Uint8Array[] | Buffer[]>

Extracts images from the PDF and saves them as PNG files.

    If isBuffer was set to true during construction, this function returns an array of Uint8Array containing the image data.
    If isBuffer was set to false during construction, this function saves the images as PNG files in the specified outputDirectory.

License

This library is licensed under the MIT License. See the LICENSE file for details.
Contributing

Contributions to PdfImageExtractor are welcome! Please see the CONTRIBUTING.md file for guidelines.
Acknowledgements

    This library is built on top of pdf-lib and pngjs.
    Special thanks to the contributors of pdf-lib and pngjs.

Support

For any issues or questions, please open an issue on the GitHub repository.