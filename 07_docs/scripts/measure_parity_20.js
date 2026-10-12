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
  const modelDir = path.join(REPO_ROOT, '03_app/public/model');
  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf-8'));
  const weightsBuffer = fs.readFileSync(path.join(modelDir, 'weights.bin'));

  const model = await tf.loadLayersModel(tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData: new Uint8Array(weightsBuffer).buffer,
  }));

  const inputTensor = loadNpyArray(path.join(__dirname, 'parity_20_x.npy'), 20, [224, 224, 3], 'uint8').div(255.0);
  const preds = model.predict(inputTensor);
  const probs = await preds.data();
  tf.dispose([inputTensor, preds]);

  fs.writeFileSync(path.join(__dirname, 'tfjs_preds_20.json'), JSON.stringify(Array.from(probs)));
  console.log('Saved tfjs_preds_20.json successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
