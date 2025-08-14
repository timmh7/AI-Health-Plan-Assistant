import express from 'express';
import { spawn } from 'child_process';  // node.js module to run python script
import cors from 'cors';  // node.js module for listening on different ports

const app = express();

app.use(cors({ origin: 'http://localhost:8080' }));
app.use(express.json()); // Middleware to parse JSON bodies

// Define a POST endpoint at /api/extract-pdf
app.post('/api/extract-pdf', (req, res) => {
  console.log("Post endpoint successfully called")
  
  // 1. Get the PDF URL from request body
  const { pdfUrl } = req.body;
  
  if (!pdfUrl) {
    return res.status(400).json({ success: false, error: 'PDF URL is required' });
  }

  console.log("Processing PDF URL:", pdfUrl);

  // 2. Start a Python process to run "docling_runner.py" with the PDF URL as an argument
  const python = spawn('python', ['docling_runner.py', pdfUrl]);
  console.log("Docling python process sucessfully started");

  let data = '';
  let error = '';

  // When Python script writes data to stdout, append it to 'data'
  python.stdout.on('data', (chunk) => {
    data += chunk.toString();
  });

  // When Python script writes data to stderr, append it to 'error'
  python.stderr.on('data', (chunk) => {
    error += chunk.toString();
  });

  // 3. Once python script finishes running
  python.on('close', (code) => {
    console.log('Python exited with code:', code);
    console.log('Python stdout:', data);
    console.log('Python stderr:', error);

    if (code !== 0) {
      return res.status(500).json({ success: false, error });
    }
    try {
      // Try to parse Python's stdout as JSON and send it back to the client
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ success: false, error: 'Invalid JSON from Python' });
    }
  });
});

app.listen(3001, () => {
  console.log('Server listening on port 3001');
});
