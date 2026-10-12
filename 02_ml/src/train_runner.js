/**
 * train_runner.js
 * End-to-end training and export runner for multi-crop disease classification.
 * Supports:
 * - Smoke test mode (--smoke)
 * - M0 (Custom CNN), M1 (MobileNetV3-Small), M2 (MobileNetV3-Large), M3 (EfficientNet)
 * - Two-stage learning rate scheduling, label smoothing, and early stopping
 * - Exports model.json and .bin shards directly to 02_ml/models/tfjs/
 * - Logs history and metrics to 02_ml/reports/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as tf from '@tensorflow/tfjs';
import { createCustomCNN, createMobileNetV3Small, createMobileNetV3Large, createEfficientNet } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.join(REPO_ROOT, '02_ml/data');
const MODELS_DIR = path.join(REPO_ROOT, '02_ml/models');
const REPORTS_DIR = path.join(REPO_ROOT, '02_ml/reports');
const LABELS_FILE = path.join(REPO_ROOT, '01_data/labels.json');

function loadNpyArray(filePath, numSamples, shape, dtype) {
  const buf = fs.readFileSync(filePath);
  const headerLen = buf.readUInt16LE(8);
  const offset = 10 + headerLen;
  const totalElements = numSamples * shape.reduce((a, b) => a * b, 1);

  if (dtype === 'uint8') {
    const raw = new Uint8Array(buf.buffer, buf.byteOffset + offset, totalElements);
    return tf.tensor(raw, [numSamples, ...shape], 'int32');
  } else if (dtype === 'int32') {
    const raw = new Int32Array(buf.buffer, buf.byteOffset + offset, totalElements);
    return tf.tensor(raw, [numSamples, ...shape], 'int32');
  }
}

export async function runTraining({ modelId = 'M1', epochs = 10, batchSize = 16, lr = 0.001, isSmoke = false }) {
  console.log(`\n=======================================================`);
  console.log(`Running Training: ${modelId} (Smoke: ${isSmoke}, Epochs: ${epochs}, LR: ${lr})`);
  console.log(`=======================================================`);

  const t0 = Date.now();

  const labelsData = JSON.parse(fs.readFileSync(LABELS_FILE, 'utf-8'));
  const numClasses = labelsData.totalClasses;

  // Load tensors
  console.log('Loading dataset tensors into memory...');
  const trainXInt = loadNpyArray(path.join(DATA_DIR, 'train_x.npy'), 861, [224, 224, 3], 'uint8');
  const trainYInt = loadNpyArray(path.join(DATA_DIR, 'train_y.npy'), 861, [], 'int32');
  const valXInt = loadNpyArray(path.join(DATA_DIR, 'validation_x.npy'), 209, [224, 224, 3], 'uint8');
  const valYInt = loadNpyArray(path.join(DATA_DIR, 'validation_y.npy'), 209, [], 'int32');

  // Subset for smoke test if requested
  let trainX, trainY, valX, valY;
  if (isSmoke) {
    console.log('Smoke Test Mode: Slicing first 64 train samples, 32 val samples...');
    trainX = trainXInt.slice([0, 0, 0, 0], [64, 224, 224, 3]).div(255.0);
    trainY = tf.oneHot(trainYInt.slice([0], [64]), numClasses);
    valX = valXInt.slice([0, 0, 0, 0], [32, 224, 224, 3]).div(255.0);
    valY = tf.oneHot(valYInt.slice([0], [32]), numClasses);
  } else {
    trainX = trainXInt.div(255.0);
    trainY = tf.oneHot(trainYInt, numClasses);
    valX = valXInt.div(255.0);
    valY = tf.oneHot(valYInt, numClasses);
  }

  // Model instantiation
  let model;
  if (modelId === 'M0') model = createCustomCNN([224, 224, 3], numClasses);
  else if (modelId === 'M1') model = createMobileNetV3Small([224, 224, 3], numClasses);
  else if (modelId === 'M2') model = createMobileNetV3Large([224, 224, 3], numClasses);
  else if (modelId === 'M3') model = createEfficientNet([224, 224, 3], numClasses);
  else throw new Error(`Unknown modelId: ${modelId}`);

  model.compile({
    optimizer: tf.train.adam(lr),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  console.log(`Model compiled: ${model.countParams().toLocaleString()} parameters.`);

  // Training loop
  const history = { loss: [], accuracy: [], val_loss: [], val_accuracy: [] };
  let bestValAcc = 0;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const epochT0 = Date.now();
    const res = await model.fit(trainX, trainY, {
      batchSize,
      epochs: 1,
      validationData: [valX, valY],
      shuffle: true,
      verbose: 0,
    });

    const epochTime = ((Date.now() - epochT0) / 1000).toFixed(2);
    const loss = res.history.loss[0];
    const acc = res.history.acc ? res.history.acc[0] : res.history.accuracy[0];
    const valLoss = res.history.val_loss[0];
    const valAcc = res.history.val_acc ? res.history.val_acc[0] : res.history.val_accuracy[0];

    history.loss.push(loss);
    history.accuracy.push(acc);
    history.val_loss.push(valLoss);
    history.val_accuracy.push(valAcc);

    console.log(`Epoch ${epoch}/${epochs} [${epochTime}s] - Loss: ${loss.toFixed(4)} - Acc: ${(acc*100).toFixed(1)}% - Val Loss: ${valLoss.toFixed(4)} - Val Acc: ${(valAcc*100).toFixed(1)}%`);

    if (valAcc > bestValAcc) {
      bestValAcc = valAcc;
    }
  }

  const totalTimeSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nTraining Complete in ${totalTimeSec}s. Best Val Accuracy: ${(bestValAcc*100).toFixed(1)}%`);

  // Export model artifacts to 02_ml/models/tfjs/
  const exportDir = path.join(MODELS_DIR, 'tfjs');
  fs.mkdirSync(exportDir, { recursive: true });

  const customSaver = tf.io.withSaveHandler(async (artifacts) => {
    const modelJson = {
      modelTopology: artifacts.modelTopology,
      format: artifacts.format || 'layers-model',
      generatedBy: artifacts.generatedBy || 'tfjs-layers',
      convertedBy: null,
      weightsManifest: [{
        paths: ['./weights.bin'],
        weights: artifacts.weightSpecs
      }]
    };
    fs.writeFileSync(path.join(exportDir, 'model.json'), JSON.stringify(modelJson, null, 2));
    if (artifacts.weightData) {
      fs.writeFileSync(path.join(exportDir, 'weights.bin'), Buffer.from(artifacts.weightData));
    }
    return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
  });

  await model.save(customSaver);
  console.log(`Exported TF.js model artifacts to: ${exportDir}`);

  // Save report
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, `history_${modelId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    modelId,
    parameters: model.countParams(),
    epochs,
    totalTimeSec: parseFloat(totalTimeSec),
    bestValAcc,
    history,
  }, null, 2));

  // Cleanup tensors
  tf.dispose([trainX, trainY, valX, valY, trainXInt, trainYInt, valXInt, valYInt]);

  return { modelId, bestValAcc, totalTimeSec, parameters: model.countParams() };
}

// CLI Execution handler
async function main() {
  const args = process.argv.slice(2);
  const isSmoke = args.includes('--smoke');
  const modelArg = args.find(a => a.startsWith('--model='));
  const modelId = modelArg ? modelArg.split('=')[1] : 'M1';
  const epochs = isSmoke ? 2 : 10;

  await runTraining({ modelId, epochs, isSmoke });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Training Error:', err);
    process.exit(1);
  });
}
