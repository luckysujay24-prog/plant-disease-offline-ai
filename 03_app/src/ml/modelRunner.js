/**
 * modelRunner.js
 * In-browser edge neural network inference engine using @tensorflow/tfjs.
 * Precached model loading, WebGL/WASM/CPU fallback, warm-up inference,
 * client-side canvas downscaling (~640px), and crop-aware logit masking.
 */

import * as tf from '@tensorflow/tfjs';
import labelsData from '../config/labels.json';
import modelMetaData from '../config/model_meta.json';

let loadedModel = null;
let isWarmedUp = false;
let currentBackend = 'cpu';

/**
 * Initialize TensorFlow.js backend and warm up model
 */
export async function initModel(onStatusChange = () => {}) {
  if (loadedModel && isWarmedUp) {
    return { model: loadedModel, backend: currentBackend };
  }

  try {
    onStatusChange('Initializing AI engine...');
    // Attempt WebGL backend, fallback to WASM or CPU
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      currentBackend = 'webgl';
    } catch (e) {
      console.warn('WebGL backend unavailable, falling back to CPU:', e);
      await tf.setBackend('cpu');
      await tf.ready();
      currentBackend = 'cpu';
    }

    onStatusChange('Loading offline model weights...');
    // Load model from precached public URL
    const modelUrl = '/model/model.json';
    loadedModel = await tf.loadLayersModel(modelUrl);

    // Warm-up inference with dummy input
    onStatusChange('Optimizing on-device neural network...');
    const dummyInput = tf.zeros([1, 224, 224, 3]);
    const warmupResult = loadedModel.predict(dummyInput);
    await warmupResult.data();
    tf.dispose([dummyInput, warmupResult]);

    isWarmedUp = true;
    onStatusChange('AI ready on this device');
    console.log(`TF.js initialized successfully on ${currentBackend} backend.`);
    return { model: loadedModel, backend: currentBackend };
  } catch (err) {
    console.error('Failed to initialize model:', err);
    onStatusChange('AI model load error');
    throw err;
  }
}

/**
 * Downscale image to max ~640px longest side and generate Blob for IndexedDB storage
 */
export function downscaleImage(fileOrBlob, maxDimension = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(fileOrBlob);
  });
}

/**
 * Preprocess an HTML Image or Canvas element to a 224x224 RGB Tensor
 */
function preprocessImageElement(imageElement) {
  return tf.tidy(() => {
    const tensor = tf.browser.fromPixels(imageElement);
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);
    const normalized = resized.div(255.0);
    return normalized.expandDims(0); // [1, 224, 224, 3]
  });
}

/**
 * Run crop-aware disease detection inference
 */
export async function runInference({
  imageElement,
  selectedCrop = 'tomato',
  cropMode = 'known', // 'known' | 'unknown'
}) {
  if (!loadedModel) {
    await initModel();
  }

  const inputTensor = preprocessImageElement(imageElement);
  const t0 = performance.now();
  const rawPreds = loadedModel.predict(inputTensor);
  const probs = await rawPreds.data();
  const latencyMs = performance.now() - t0;
  tf.dispose([inputTensor, rawPreds]);

  const classes = labelsData.classes;
  const cropToIndices = labelsData.cropToClassIndices;

  let finalProbs = Array.from(probs);
  let predictedCrop = selectedCrop;

  if (cropMode === 'known') {
    // Crop-Known mode: Logit masking
    // Mask probabilities of classes not belonging to selectedCrop to 0
    const allowedIndices = new Set(cropToIndices[selectedCrop] || []);
    let sumAllowed = 0;

    for (let i = 0; i < finalProbs.length; i++) {
      if (!allowedIndices.has(i)) {
        finalProbs[i] = 0;
      } else {
        sumAllowed += finalProbs[i];
      }
    }

    // Re-normalize probabilities over allowed crop classes
    if (sumAllowed > 0) {
      for (let i = 0; i < finalProbs.length; i++) {
        finalProbs[i] /= sumAllowed;
      }
    }
  } else {
    // Crop-Unknown mode: Softmax over all classes, identify predicted crop
    let bestCrop = 'unknown';
    let maxCropSum = -1;
    for (const [cropSlug, indices] of Object.entries(cropToIndices)) {
      const cropSum = indices.reduce((sum, idx) => sum + probs[idx], 0);
      if (cropSum > maxCropSum) {
        maxCropSum = cropSum;
        bestCrop = cropSlug;
      }
    }
    predictedCrop = bestCrop;
  }

  // Extract Top 3 Classes
  const indexedProbs = finalProbs.map((p, idx) => ({
    classId: classes[idx],
    displayName: labelsData.classDisplayNames[classes[idx]] || classes[idx],
    prob: p,
    index: idx,
  }));
  indexedProbs.sort((a, b) => b.prob - a.prob);

  const top1 = indexedProbs[0];
  const top2 = indexedProbs[1];
  const top3 = indexedProbs.slice(0, 3);

  // Confidence and Reject Option Threshold check
  const tau = cropMode === 'known' ? modelMetaData.calibratedTau.known : modelMetaData.calibratedTau.unknown;
  const belowThreshold = top1.prob < tau;

  // Calibrated Reliability Category (Good / Fair / Low)
  const conf = parseFloat(top1.prob.toFixed(4));
  const bands = modelMetaData.reliabilityBands || { good: 0.70, fair: 0.40, low: 0.00 };
  let reliability = 'Low';
  if (conf >= bands.good) {
    reliability = 'Good';
  } else if (conf >= bands.fair) {
    reliability = 'Fair';
  }

  return {
    predictedClass: top1.classId,
    displayName: top1.displayName,
    confidence: conf,
    reliability,
    predictedCrop,
    cropMode,
    belowThreshold,
    tauThreshold: tau,
    secondCandidate: top2 && (top1.prob - top2.prob < 0.20) ? top2 : null,
    top3,
    latencyMs: parseFloat(latencyMs.toFixed(1)),
    modelVersion: modelMetaData.modelVersion,
    taxonomyVersion: labelsData.taxonomyVersion,
    backend: currentBackend,
  };
}
