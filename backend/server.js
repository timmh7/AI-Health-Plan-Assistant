import express from 'express';
import { spawn } from 'child_process';  // node.js module to run python script
import cors from 'cors';  // node.js module for listening on different ports
import dotenv from 'dotenv';
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";


// ------------------- INITIALIZATION -------------------  //
dotenv.config(); // Initialize .env file

const openai_client = new OpenAI({  // Initialize openAI
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(  // Intiialize supabase
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const app = express();  // Initialize express for routes

app.use(cors({ origin: 'http://localhost:8080' }));  // Initialize cors for cross port interactions
app.use(express.json()); // Middleware to parse JSON bodies


// ------------------- ROUTES -------------------  //
// ROUTE 1: Define a POST endpoint at /api/extract-pdf
app.post('/api/extract-pdf', (req, res) => {
  console.log("API extraction route successfully called")
  
  // 1. Get the PDF URL from request body
  const { pdfUrl } = req.body;
  
  if (!pdfUrl) {
    return res.status(400).json({ success: false, error: 'PDF URL is required' });
  }

  console.log("Processing PDF URL:", pdfUrl);

  // 2. Start a Python process to run "docling_runner.py" with the PDF URL as an argument
  const python = spawn('python', ['docling_runner.py', pdfUrl],{
      env: {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
      }
    });
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

// ROUTE 2: Define a POST endpoint at /api/semantic-search
app.post('/api/semantic-search', async (req, res) => {
  console.log("Semantic search route successfully called");

  const { query, topK = 5 } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required' });
  }

  try {
    // 1. Embed the user query
    const openai_client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const queryEmbedding = (await openai_client.embeddings.create({
      input: query,
      model: 'text-embedding-3-large',
    })).data[0].embedding;

    // 2. Query Supabase embeddings table using vector similarity
    // Assuming you have pgvector installed and your embedding column is a vector type
    const { data: chunks, error } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_count: topK
    });

    if (error) throw error;
    console.log("Chunks returned from Supabase RPC:", chunks);
    res.json({ chunks });
  } catch (err) {
    console.error("Error in semantic search:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Server listening on port 3001');
});
