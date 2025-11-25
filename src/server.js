import { buildAllCryptos } from './in.js';
import express from "express";

const app = express();
const PORT = 3000;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Function to execute buildAllCryptos with error handling
async function executeBuildAllCryptos() {
  try {
    console.log(`🕒 [${new Date().toISOString()}] Starting scheduled crypto data build...`);
    await buildAllCryptos();
    console.log(`✅ [${new Date().toISOString()}] Scheduled crypto data build completed`);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Scheduled crypto data build failed:`, error);
  }
}

// Execute immediately on server start
executeBuildAllCryptos();

// Schedule to run every 24 hours (24 * 60 * 60 * 1000 milliseconds)
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
setInterval(executeBuildAllCryptos, TWENTY_FOUR_HOURS);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});