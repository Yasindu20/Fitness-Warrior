const fs = require('fs');
const path = require('path');

// Path to your weights file
const weightsPath = path.join(__dirname, 'assets', 'tfjs_model', 'group1-shard1of1.bin');

// Read the binary file
const weightsBuffer = fs.readFileSync(weightsPath);

// Convert to base64
const base64Weights = weightsBuffer.toString('base64');

// Write to a JavaScript file
const outputPath = path.join(__dirname, 'modelWeights.js');
fs.writeFileSync(
  outputPath,
  `export const MODEL_WEIGHTS_BASE64 = "${base64Weights}";`
);

console.log(`Converted weights file to base64 and saved to ${outputPath}`);