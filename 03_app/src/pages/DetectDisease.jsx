import React, { useState, useRef } from 'react';
import { runInference, downscaleImage } from '../ml/modelRunner.js';
import { saveScan } from '../offline/db.js';
import { processInputImage } from '../image/decode.js';
import features from '../config/features.json';

export function DetectDisease({ selectedCrop, onDiagnosisComplete }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [qualityHint, setQualityHint] = useState(null);
  const [isNotPlant, setIsNotPlant] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatusMessage('Preparing image...');
      setQualityHint(null);
      setIsNotPlant(false);

      if (features.robustImageInput) {
        // Robust any-photo pipeline
        const processed = await processInputImage(file);
        setImageBlob(processed.storageBlob);
        setImageMeta(processed.imageMeta);
        setImageSrc(URL.createObjectURL(processed.storageBlob));

        if (!processed.quality.isPlant) {
          setIsNotPlant(true);
          setQualityHint(processed.quality.hint);
        } else if (processed.quality.hint) {
          setQualityHint(processed.quality.hint);
        }
      } else {
        // Baseline downscale path
        const downscaled = await downscaleImage(file, 640);
        setImageBlob(downscaled);
        setImageSrc(URL.createObjectURL(downscaled));
      }
    } catch (err) {
      console.error('Image processing failed:', err);
      setStatusMessage(err.message || 'Error processing photo');
    }
  };

  const handleRunDiagnosis = async () => {
    if (!imgRef.current) return;

    setIsProcessing(true);
    setStatusMessage('Running offline AI diagnosis...');

    try {
      // 1. In-Browser AI inference (zero network request)
      const inferenceResult = await runInference({
        imageElement: imgRef.current,
        selectedCrop: selectedCrop.slug,
        cropMode: selectedCrop.mode,
      });

      // 2. Local Persistence in IndexedDB
      setStatusMessage('Saving result on this device...');
      const scanId = crypto.randomUUID ? crypto.randomUUID() : `scan_${Date.now()}`;
      const scanRecord = {
        scanId,
        selectedCrop: selectedCrop.slug,
        cropMode: selectedCrop.mode,
        predictedCrop: inferenceResult.predictedCrop,
        predictedClass: inferenceResult.predictedClass,
        displayName: inferenceResult.displayName,
        confidence: inferenceResult.confidence,
        reliability: inferenceResult.reliability,
        top3: inferenceResult.top3,
        latencyMs: inferenceResult.latencyMs,
        modelVersion: inferenceResult.modelVersion,
        taxonomyVersion: inferenceResult.taxonomyVersion,
        imageMeta: imageMeta || undefined,
        syncStatus: 'LOCAL',
        syncAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveScan(scanRecord, imageBlob);
      setIsProcessing(false);
      onDiagnosisComplete(scanRecord, imageSrc);
    } catch (err) {
      console.error('Diagnosis failed:', err);
      setIsProcessing(false);
      setStatusMessage('Diagnosis failed: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Inspect Leaf</h2>
          <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
            Any photo works. Offline AI analysis.
          </p>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Crop: {selectedCrop.displayName}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {imageSrc ? (
          <div style={{ width: '100%', position: 'relative' }}>
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Leaf Preview"
              className="camera-preview"
            />
          </div>
        ) : (
          <div
            className="camera-preview"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span style={{ fontSize: '3rem' }}>📷</span>
            <span style={{ fontWeight: 600, marginTop: '8px' }}>Tap to Take Photo</span>
            <span style={{ fontSize: '0.8rem' }}>or choose from gallery</span>
          </div>
        )}

        {/* Quality Hint / Warning */}
        {qualityHint && (
          <div style={{
            background: isNotPlant ? '#ffebee' : '#fff3e0',
            color: isNotPlant ? '#c62828' : '#e65100',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            width: '100%'
          }}>
            {isNotPlant ? '⚠️ ' : 'ℹ️ '}{qualityHint}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            className="big-button"
            style={{ minHeight: '52px', justifyContent: 'center' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {imageSrc ? 'Retake Photo' : 'Choose Photo'}
          </button>

          {imageSrc && !isNotPlant && (
            <button
              className="big-button primary"
              style={{ minHeight: '52px', justifyContent: 'center' }}
              onClick={handleRunDiagnosis}
              disabled={isProcessing}
            >
              {isProcessing ? 'Analyzing...' : 'Check Leaf'}
            </button>
          )}
        </div>
      </div>

      {isProcessing && (
        <div style={{ textAlign: 'center', color: 'var(--primary-dark)', fontWeight: 600, padding: '10px' }}>
          ⏳ {statusMessage}
        </div>
      )}

      {/* Photo Tips Box */}
      <div className="tips-box">
        <strong>Photo Tips:</strong>
        <ul>
          <li>Focus on a single leaf with visible disease symptoms.</li>
          <li>Natural daylight without harsh shadows works best.</li>
          <li>Forwarded WhatsApp photos and gallery images are fully supported.</li>
        </ul>
      </div>
    </div>
  );
}
