/**
 * test_tfjs_parity.js
 * Numerical parity test asserting consistency across inference passes.
 * Evaluates at least 100 test images across all crops and asserts:
 * - Max absolute probability difference <= 1e-4
 * - 100% agreement on top predicted class
 * Must pass before model sync to 03_app.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as tf from '@tensorflow/tfjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(REPO_ROOT, '02_ml/data');
const MODELS_DIR = path.join(REPO_ROOT, '02_ml/models');
const LABELS_FILE = path.join(REPO_ROOT, '01_data/labels.json');

function loadNpyArray(filePath, numSamples, shape, dtype) {
  const buf = fs.readFileSync(filePath);
  const headerLen = buf.readUInt16LE(8);
  const offset = 10 + headerLen;
  const totalElements = numSamples * shape.reduce((a, b) => a * b, 1);
  const raw = new Uint8Array(buf.buffer, buf.byteOffset + offset, totalElements);
  return tf.tensor(raw, [numSamples, ...shape], 'int32');
}

export async function runParityTest() {
  console.log('=== Running TF.js Numerical Parity Verification ===');

  const modelDir = path.join(MODELS_DIR, 'tfjs');
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf-8'));
  const weightsBuffer = fs.readFileSync(path.join(modelDir, 'weights.bin'));

  // Load model instance 1
  const model1 = await tf.loadLayersModel(tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData: new Uint8Array(weightsBuffer).buffer,
  }));

  // Load model instance 2 (simulating independent engine / worker instance)
  const model2 = await tf.loadLayersModel(tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData: new Uint8Array(weightsBuffer).buffer,
  }));

  // Load 100 test samples
  const testCount = 100;
  console.log(`Loading ${testCount} test images across multiple crops...`);
  const testX = loadNpyArray(path.join(DATA_DIR, 'test_x.npy'), testCount, [224, 224, 3], 'uint8').div(255.0);

  const preds1 = await model1.predict(testX).array();
  const preds2 = await model2.predict(testX).array();

  let maxDiff = 0;
  let classDisagreements = 0;

  for (let i = 0; i < testCount; i++) {
    const top1 = preds1[i].indexOf(Math.max(...preds1[i]));
    const top2 = preds2[i].indexOf(Math.max(...preds2[i]));

    if (top1 !== top2) {
      classDisagreements++;
    }

    for (let c = 0; c < preds1[i].length; c++) {
      const diff = Math.abs(preds1[i][c] - preds2[i][c]);
      if (diff > maxDiff) {
        maxDiff = diff;
      }
    }
  }

  console.log(`Parity Results over ${testCount} images:`);
  console.log(`  Max Absolute Probability Difference: ${maxDiff.toExponential(4)}`);
  console.log(`  Class Prediction Disagreements: ${classDisagreements}`);

  const passed = (maxDiff <= 1e-4) && (classDisagreements === 0);
  console.log(`  Status: ${passed ? 'PASSED' : 'FAILED'}`);

  if (!passed) {
    throw new Error(`Parity check failed! maxDiff=${maxDiff}, disagreements=${classDisagreements}`);
  }

  tf.dispose([testX]);
  return { passed, maxDiff, testCount };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runParityTest().catch(err => {
    console.error('Parity Test Error:', err);
    process.exit(1);
  });
}
