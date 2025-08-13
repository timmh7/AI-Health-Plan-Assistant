import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import PDFServicesSdk from '@adobe/pdfservices-node-sdk';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors({
  origin: 'http://localhost:8080',  // frontend origin
  methods: ['POST'],
}));

const upload = multer();

const PORT = process.env.PORT || 3001;

app.post('/api/extract-pdf', upload.single('file'), async (req, res) => {
  try {
    const credentials = PDFServicesSdk.Credentials
      .servicePrincipalCredentialsBuilder()
      .withClientId(process.env.PDF_SERVICES_CLIENT_ID)
      .withClientSecret(process.env.PDF_SERVICES_CLIENT_SECRET)
      .build();

    const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

    // Receive PDF file from frontend as buffer
    const pdfBuffer = req.file.buffer;

    // Create FileRef from buffer
    const input = PDFServicesSdk.FileRef.createFromBuffer(pdfBuffer, PDFServicesSdk.FileRef.MediaType.APPLICATION_PDF);
    extractPDFOperation.setInput(input);

    // Set options to extract text and tables
    const options = new PDFServicesSdk.ExtractPDF.options.ExtractOptions.Builder()
      .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT)
      .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TABLES)
      .build();
    extractPDFOperation.setOptions(options);

    // Execute extraction
    const result = await extractPDFOperation.execute(executionContext);

    // Save result to memory and parse JSON from zipped output
    // Adobe returns a zip file, you’ll need to unzip and parse JSON inside
    const zipBuffer = await result.readAllBytes();

    // Here you can either:
    // 1. Send zip back to frontend and parse there
    // 2. Unzip on backend and extract JSON, then send JSON back (recommended)

    // For example, send zip as base64:
    res.json({
      success: true,
      data: zipBuffer.toString('base64'),
      message: 'Extraction complete. Please unzip and parse JSON on client.'
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => console.log('Server listening on port ' + PORT));
