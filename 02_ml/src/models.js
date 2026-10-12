/**
 * models.js
 * Definitions for M0, M1, M2, and M3 multi-crop disease classification models
 * built natively with TensorFlow.js.
 * Matches in-browser architecture directly to ensure 100% parity.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * M0: Small Custom CNN Baseline
 */
export function createCustomCNN(inputShape = [224, 224, 3], numClasses = 38) {
  const model = tf.sequential();
  model.add(tf.layers.conv2d({
    inputShape,
    filters: 32,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.conv2d({
    filters: 64,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  model.add(tf.layers.conv2d({
    filters: 128,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.globalAveragePooling2d({}));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({
    units: numClasses,
    activation: 'softmax',
    kernelInitializer: 'glorotUniform',
  }));
  return model;
}

/**
 * Depthwise Separable Conv block helper
 */
function addDepthwiseSeparableBlock(model, filters, strides = 1) {
  model.add(tf.layers.separableConv2d({
    filters,
    kernelSize: 3,
    strides,
    padding: 'same',
    depthMultiplier: 1,
    activation: 'relu',
    depthwiseInitializer: 'heNormal',
    pointwiseInitializer: 'heNormal',
  }));
  model.add(tf.layers.batchNormalization());
}

/**
 * M1: MobileNetV3-Small Inspired Inverted Architecture (Primary Deployment Candidate)
 * Designed for low memory footprint (< 15 MB) and sub-100ms in-browser inference.
 */
export function createMobileNetV3Small(inputShape = [224, 224, 3], numClasses = 38) {
  const model = tf.sequential();

  // Stem Conv
  model.add(tf.layers.conv2d({
    inputShape,
    filters: 16,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.batchNormalization());

  // Inverted Bottleneck / Depthwise Separable Stages
  addDepthwiseSeparableBlock(model, 24, 2);
  addDepthwiseSeparableBlock(model, 40, 2);
  addDepthwiseSeparableBlock(model, 48, 1);
  addDepthwiseSeparableBlock(model, 96, 2);
  addDepthwiseSeparableBlock(model, 144, 1);

  // Global Average Pooling Head
  model.add(tf.layers.globalAveragePooling2d({}));
  model.add(tf.layers.dense({ units: 256, activation: 'relu', kernelInitializer: 'heNormal' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({
    units: numClasses,
    activation: 'softmax',
    kernelInitializer: 'glorotUniform',
  }));
  return model;
}

/**
 * M2: MobileNetV3-Large Reference Architecture
 */
export function createMobileNetV3Large(inputShape = [224, 224, 3], numClasses = 38) {
  const model = tf.sequential();
  model.add(tf.layers.conv2d({
    inputShape,
    filters: 24,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.batchNormalization());

  addDepthwiseSeparableBlock(model, 32, 2);
  addDepthwiseSeparableBlock(model, 64, 2);
  addDepthwiseSeparableBlock(model, 80, 1);
  addDepthwiseSeparableBlock(model, 128, 2);
  addDepthwiseSeparableBlock(model, 160, 1);
  addDepthwiseSeparableBlock(model, 256, 1);

  model.add(tf.layers.globalAveragePooling2d({}));
  model.add(tf.layers.dense({ units: 512, activation: 'relu', kernelInitializer: 'heNormal' }));
  model.add(tf.layers.dropout({ rate: 0.25 }));
  model.add(tf.layers.dense({
    units: numClasses,
    activation: 'softmax',
    kernelInitializer: 'glorotUniform',
  }));
  return model;
}

/**
 * M3: EfficientNet-Style Teacher / Ceiling Architecture
 */
export function createEfficientNet(inputShape = [224, 224, 3], numClasses = 38) {
  const model = tf.sequential();
  model.add(tf.layers.conv2d({
    inputShape,
    filters: 32,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  model.add(tf.layers.batchNormalization());

  addDepthwiseSeparableBlock(model, 48, 2);
  addDepthwiseSeparableBlock(model, 80, 2);
  addDepthwiseSeparableBlock(model, 112, 1);
  addDepthwiseSeparableBlock(model, 192, 2);
  addDepthwiseSeparableBlock(model, 320, 1);

  model.add(tf.layers.globalAveragePooling2d({}));
  model.add(tf.layers.dense({ units: 640, activation: 'relu', kernelInitializer: 'heNormal' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({
    units: numClasses,
    activation: 'softmax',
    kernelInitializer: 'glorotUniform',
  }));
  return model;
}
