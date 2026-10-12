import React, { useState } from 'react';
import labelsData from '../config/labels.json';
import careKnowledge from '../config/care_knowledge.json';

export function CropCare({ initialCrop }) {
  const crops = labelsData.crops || [];
  const displayNames = labelsData.cropDisplayNames || {};
  const validInitialSlug = (initialCrop?.slug && initialCrop.slug !== 'unknown' && crops.includes(initialCrop.slug))
    ? initialCrop.slug
    : (crops[0] || 'tomato');
  const [selectedCrop, setSelectedCrop] = useState(validInitialSlug);
  const [searchTerm, setSearchTerm] = useState('');

  const knowledgeClasses = careKnowledge.classes || careKnowledge || {};

  // Get all diseases belonging to the selected crop (format: <crop>__<disease>)
  const cropDiseaseClasses = (labelsData.classes || []).filter(cls => {
    const cropOfCls = cls.split('__')[0];
    return cropOfCls === selectedCrop;
  });

  // Filter by search term if provided
  const filteredClasses = cropDiseaseClasses.filter(cls => {
    const care = knowledgeClasses[cls];
    const name = care?.conditionName || care?.displayName || labelsData.classDisplayNames?.[cls] || cls;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      name.toLowerCase().includes(term) ||
      (care?.roleExplanation && care.roleExplanation.toLowerCase().includes(term)) ||
      (care?.nutrientFocus && care.nutrientFocus.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Crop Care & Nutrition Guide</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Evidence-based cultural sanitation, preventive nutrition, and field monitoring
        </p>
      </div>

      {/* Crop Selector Card */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <label
          htmlFor="crop-select"
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}
        >
          SELECT CROP:
        </label>
        <select
          id="crop-select"
          value={selectedCrop}
          onChange={e => setSelectedCrop(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '2px solid var(--border)',
            fontSize: '1rem',
            fontWeight: 600,
            background: '#fff'
          }}
        >
          {crops.map(slug => (
            <option key={slug} value={slug}>
              {displayNames[slug] || slug}
            </option>
          ))}
        </select>
      </div>

      {/* Disease Search within Selected Crop */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={`Search ${displayNames[selectedCrop] || selectedCrop} conditions...`}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '0.9rem',
            background: '#fff',
            boxSizing: 'border-box'
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '1rem'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Disease Guides List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredClasses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No conditions matching "{searchTerm}" for this crop.</p>
          </div>
        ) : (
          filteredClasses.map(cls => {
            const care = knowledgeClasses[cls];
            const name = care?.conditionName || care?.displayName || labelsData.classDisplayNames?.[cls] || cls;
            const isHealthy = cls.endsWith('__healthy');

            return (
              <div
                key={cls}
                className="card"
                style={{
                  borderLeft: isHealthy ? '4px solid var(--primary)' : '4px solid #ff9800'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--primary-dark)' }}>
                    {name}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: isHealthy ? '#e8f5e9' : '#fff3e0',
                      color: isHealthy ? '#2e7d32' : '#e65100',
                      textTransform: 'uppercase'
                    }}
                  >
                    {isHealthy ? 'Healthy State' : 'Pathology'}
                  </span>
                </div>

                {/* Role / Explanation */}
                {care?.roleExplanation && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '12px', lineHeight: 1.45 }}>
                    {care.roleExplanation}
                  </p>
                )}

                {/* Cultural Practices */}
                {care?.preventionPractices && care.preventionPractices.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>🌾 Cultural Practices:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {care.preventionPractices.map((prac, idx) => (
                        <li key={idx}>{prac}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preventive Nutrition */}
                {care?.nutrientFocus && (
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
                {care?.cautions && (
                  <div style={{ background: '#fff3e0', padding: '8px 10px', borderRadius: '6px', fontSize: '0.82rem', color: '#e65100', marginBottom: '8px' }}>
                    ⚠️ <strong>Caution:</strong> {care.cautions}
                  </div>
                )}

                {/* Dose Guidance */}
                {care?.doseGuidance && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    📋 <strong>Dosage Notice:</strong> {care.doseGuidance}
                  </div>
                )}

                {/* Verified Citation */}
                {care?.source && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    📖 <strong>Reference:</strong> {care.source}
                  </div>
                )}

                {/* Non-Curative Disclaimer */}
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ℹ️ Non-curative guidance. For severe outbreaks, contact local agricultural extension.
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
