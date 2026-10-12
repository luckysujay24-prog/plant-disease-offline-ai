import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as tf from '@tensorflow/tfjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

function loadNpyArray(filePath, numSamples, shape, dtype) {
  const buf = fs.readFileSync(filePath);
  const headerLen = buf.readUInt16LE(8);
  const offset = 10 + headerLen;
  const totalElements = numSamples * shape.reduce((a, b) => a * b, 1);
  const raw = new Uint8Array(buf.buffer, buf.byteOffset + offset, totalElements);
  return tf.tensor(raw, [numSamples, ...shape], 'int32');
}

async function main() {
  console.log('=== FORENSIC MODEL DIAGNOSTIC RUN ===');

  const modelDir = path.join(REPO_ROOT, '03_app/public/model');
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf-8'));
  const weightsBuffer = fs.readFileSync(path.join(modelDir, 'weights.bin'));

  const model = await tf.loadLayersModel(tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData: new Uint8Array(weightsBuffer).buffer,
  }));

  const labels = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '03_app/src/config/labels.json'), 'utf-8'));
  const modelMeta = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '03_app/src/config/model_meta.json'), 'utf-8'));

  console.log('Model parameters:', model.countParams());
  console.log('Classes count in labels.json:', labels.classes.length);
  console.log('Classes count in model_meta.json:', modelMeta.classes.length);

  // Check class order matching
  let classMismatch = false;
  for (let i = 0; i < labels.classes.length; i++) {
    if (labels.classes[i] !== modelMeta.classes[i]) {
      console.error(`Class mismatch at index ${i}: labels='${labels.classes[i]}' vs meta='${modelMeta.classes[i]}'`);
      classMismatch = true;
    }
  }
  if (!classMismatch) {
    console.log('[OK] Class orders in labels.json and model_meta.json match 100%.');
  }

  // 1. Evaluate on user images in ../leaves
  const userNpyPath = path.join(__dirname, 'user_leaves_x.npy');
  const userFileNames = ['2.webp', '3.webp', 'septoria-leaf-spot-septoria-lycopersici-on-tomat-331x205.webp'];
  const userTensors = loadNpyArray(userNpyPath, 3, [224, 224, 3], 'uint8').div(255.0);

  console.log('\n--- Evaluating Real User Photos from ../leaves ---');
  for (let i = 0; i < 3; i++) {
    const singleTensor = userTensors.slice([i, 0, 0, 0], [1, 224, 224, 3]);
    const rawPred = model.predict(singleTensor);
    const probs = await rawPred.data();
    tf.dispose([singleTensor, rawPred]);

    // Unconditioned (all 38 classes)
    const allSorted = Array.from(probs)
      .map((p, idx) => ({ classId: labels.classes[idx], prob: p }))
      .sort((a, b) => b.prob - a.prob);

    console.log(`\nImage [${i + 1}/3]: ${userFileNames[i]}`);
    console.log('  Top 3 (Crop-Unknown / All 38 classes):');
    allSorted.slice(0, 3).forEach(x => {
      console.log(`    - ${x.classId}: ${(x.prob * 100).toFixed(2)}%`);
    });

    // Tomato crop-conditioned (10 classes)
    const tomatoIndices = labels.cropToClassIndices['tomato'];
    const tomatoProbs = tomatoIndices.map(idx => ({ classId: labels.classes[idx], prob: probs[idx] }));
    const tomatoSum = tomatoProbs.reduce((acc, x) => acc + x.prob, 0);
    const tomatoNorm = tomatoProbs.map(x => ({ classId: x.classId, prob: x.prob / tomatoSum }))
      .sort((a, b) => b.prob - a.prob);

    console.log('  Top 3 (Crop-Known: Tomato / 10 classes):');
    tomatoNorm.slice(0, 3).forEach(x => {
      console.log(`    - ${x.classId}: ${(x.prob * 100).toFixed(2)}%`);
    });
  }

  // 2. Evaluate on 100 held-out test split images
  console.log('\n--- Evaluating on Held-Out Test Set (100 images) ---');
  const testNpyPath = path.join(REPO_ROOT, '02_ml/data/test_x.npy');
  const testYNpyPath = path.join(REPO_ROOT, '02_ml/data/test_y.npy');
  const testX = loadNpyArray(testNpyPath, 100, [224, 224, 3], 'uint8').div(255.0);
  const testYBuf = fs.readFileSync(testYNpyPath);
  const headerLenY = testYBuf.readUInt16LE(8);
  const rawY = new Int32Array(testYBuf.buffer, testYBuf.byteOffset + 10 + headerLenY, 100);

  const predsTensor = model.predict(testX);
  const allProbs = await predsTensor.data();
  tf.dispose([testX, predsTensor]);

  let top1CorrectUnknown = 0;
  let top3CorrectUnknown = 0;
  let top1CorrectKnown = 0;
  const unknownConfidences = [];
  const knownConfidences = [];

  for (let i = 0; i < 100; i++) {
    const rowProbs = allProbs.slice(i * 38, (i + 1) * 38);
    const trueClassIdx = rawY[i];
    const trueClassId = labels.classes[trueClassIdx];
    const trueCrop = trueClassId.split('__')[0];

    // Crop-Unknown
    const sortedUnknown = Array.from(rowProbs)
      .map((p, idx) => ({ idx, prob: p }))
      .sort((a, b) => b.prob - a.prob);

    unknownConfidences.push(sortedUnknown[0].prob);
    if (sortedUnknown[0].idx === trueClassIdx) top1CorrectUnknown++;
    if (sortedUnknown.slice(0, 3).some(x => x.idx === trueClassIdx)) top3CorrectUnknown++;

    // Crop-Known
    const cropIndices = labels.cropToClassIndices[trueCrop] || [];
    const cropProbs = cropIndices.map(idx => ({ idx, prob: rowProbs[idx] }));
    const cSum = cropProbs.reduce((acc, x) => acc + x.prob, 0);
    const sortedKnown = cropProbs.map(x => ({ idx: x.idx, prob: x.prob / cSum }))
      .sort((a, b) => b.prob - a.prob);

    knownConfidences.push(sortedKnown[0].prob);
    if (sortedKnown[0].idx === trueClassIdx) top1CorrectKnown++;
  }

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  console.log(`Test Results over 100 images:`);
  console.log(`  Crop-Unknown Top-1 Accuracy: ${(top1CorrectUnknown / 100 * 100).toFixed(2)}%`);
  console.log(`  Crop-Unknown Top-3 Accuracy: ${(top3CorrectUnknown / 100 * 100).toFixed(2)}%`);
  console.log(`  Crop-Unknown Mean Top-1 Confidence: ${(avg(unknownConfidences) * 100).toFixed(2)}% (Min: ${(Math.min(...unknownConfidences) * 100).toFixed(2)}%, Max: ${(Math.max(...unknownConfidences) * 100).toFixed(2)}%)`);
  console.log(`  Crop-Known Top-1 Accuracy: ${(top1CorrectKnown / 100 * 100).toFixed(2)}%`);
  console.log(`  Crop-Known Mean Top-1 Confidence: ${(avg(knownConfidences) * 100).toFixed(2)}% (Min: ${(Math.min(...knownConfidences) * 100).toFixed(2)}%, Max: ${(Math.max(...knownConfidences) * 100).toFixed(2)}%)`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
