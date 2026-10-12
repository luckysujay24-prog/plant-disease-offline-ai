import React from 'react';
import { ReliabilityBadge } from '../components/ReliabilityBadge.jsx';
import careKnowledge from '../config/care_knowledge.json';
import labelsData from '../config/labels.json';

export function Result({ scan, imageSrc, onScanAgain }) {
  if (!scan) return null;

  const {
    displayName,
    predictedClass,
    predictedCrop,
    confidence = 0,
    reliability,
    top3 = [],
    secondCandidate,
    isNotPlant,
    createdAt,
  } = scan;

  const cropName = labelsData.cropDisplayNames[predictedCrop] || predictedCrop;
  const isHealthy = predictedClass?.endsWith('__healthy');
  const care = (careKnowledge.classes || careKnowledge)[predictedClass] || null;

  // Reliability level
  const reliabilityLevel = reliability || (
    confidence >= 0.70 ? 'Good' : confidence >= 0.40 ? 'Fair' : 'Low'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Photo Thumbnail */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt="Scanned Leaf"
          style={{ width: '100%', height: '190px', objectFit: 'cover', borderRadius: '12px' }}
        />
      )}

      {/* Exception: Non-plant Leaf Guard */}
      {isNotPlant ? (
        <div className="card" style={{ borderColor: '#ef5350' }}>
          <h3 style={{ color: '#c62828', fontSize: '1.2rem', fontWeight: 700 }}>
            ⚠️ Non-Leaf Photo Detected
          </h3>
          <p style={{ fontSize: '0.95rem', marginTop: '6px' }}>
            The photo does not appear to contain a plant leaf. The system will not generate a false plant diagnosis.
          </p>
          <div className="tips-box" style={{ marginTop: '10px' }}>
            <strong>How to get a good result:</strong>
            <ul>
              <li>Position the camera close to the affected plant leaf.</li>
              <li>Ensure good lighting and avoid photographing non-plant surfaces.</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          {/* Main Diagnosis Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Crop: {cropName}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginTop: '2px', marginBottom: '6px' }}>
                  {displayName || predictedClass}
                </h2>
                <ReliabilityBadge level={reliabilityLevel} />
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {((confidence || 0) * 100).toFixed(0)}%
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Match</span>
              </div>
            </div>

            {/* Low Reliability Honest Hint */}
            {reliabilityLevel === 'Low' && (
              <div style={{
                background: '#fff8e1',
                borderLeft: '4px solid #ffb300',
                padding: '8px 12px',
                borderRadius: '4px',
                marginTop: '12px',
                fontSize: '0.85rem',
                color: '#8d6e63'
              }}>
                ℹ️ <strong>Low confidence:</strong> A close, well-lit photo of one leaf may help refine the diagnosis. Advice below provides general guidance.
              </div>
            )}

            {/* Close Second Candidate */}
            {secondCandidate && (
              <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginTop: '10px' }}>
                <strong>Also consider:</strong> {secondCandidate.displayName} ({((secondCandidate.prob || 0) * 100).toFixed(0)}%)
              </div>
            )}

            {/* Top 3 Breakdown */}
            {top3 && top3.length > 1 && (
              <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  TOP DIAGNOSTIC CANDIDATES:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {top3.map((cand, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: idx === 0 ? 700 : 500 }}>
                        {cand.displayName}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                        {((cand.prob || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Care & Nutrition Card (Always Present, Never Blank) */}
          {care && (
            <div className="card" style={{ borderColor: 'var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  What to Do (Care & Nutrition)
                </h3>
                {reliabilityLevel === 'Low' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    General Guidance
                  </span>
                )}
              </div>

              {/* Role & Explanation */}
              {care.roleExplanation && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '12px', lineHeight: 1.45 }}>
                  {care.roleExplanation}
                </p>
              )}

              {/* Cultural Prevention Practices */}
              {care.preventionPractices && care.preventionPractices.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>🌾 Cultural & Field Sanitation:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {care.preventionPractices.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preventive Nutrition Focus */}
              {care.nutrientFocus && (
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>🌱 Nutrition & Soil Focus:</strong>
                  <p style={{ margin: '2px 0 4px 0', fontSize: '0.85rem' }}>{care.nutrientFocus}</p>
                  {care.fertilizerTypes && care.fertilizerTypes.length > 0 && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <strong>Suggested sources:</strong> {care.fertilizerTypes.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Cautions */}
              {care.cautions && (
                <div style={{ background: '#fff3e0', padding: '8px 10px', borderRadius: '6px', fontSize: '0.82rem', color: '#e65100', marginBottom: '8px' }}>
                  ⚠️ <strong>Caution:</strong> {care.cautions}
                </div>
              )}

              {/* Dose Guidance */}
              {care.doseGuidance && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  📋 <strong>Dosage Notice:</strong> {care.doseGuidance}
                </div>
              )}

              {/* Verified Literature Citation */}
              {care.source && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  📖 <strong>Reference:</strong> {care.source}
                </div>
              )}

              {/* Non-curative Disclaimer */}
              <div style={{ marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                ℹ️ Non-curative guidance. For severe crop outbreaks, consult local agricultural extension officers.
              </div>
            </div>
          )}
        </>
      )}

      {/* Metadata & Persistence Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 4px' }}>
        <span>Saved on this device: {new Date(createdAt).toLocaleTimeString()}</span>
        <span>Status: {scan.syncStatus === 'SYNCED' ? 'Backed up' : 'Saved on this device'}</span>
      </div>

      <button
        className="big-button primary"
        style={{ minHeight: '54px', justifyContent: 'center' }}
        onClick={onScanAgain}
      >
        Check Another Leaf
      </button>
    </div>
  );
}
