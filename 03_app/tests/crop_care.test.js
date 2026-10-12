import { describe, it, expect } from 'vitest';
import labelsData from '../src/config/labels.json';
import careKnowledge from '../src/config/care_knowledge.json';

describe('Crop Care & Nutrition Module', () => {
  const knowledgeClasses = careKnowledge.classes || careKnowledge;

  it('contains care guidance for all 38 taxonomy classes', () => {
    expect(labelsData.classes.length).toBe(38);
    labelsData.classes.forEach(cls => {
      const care = knowledgeClasses[cls];
      expect(care, `Care knowledge missing for ${cls}`).toBeDefined();
      expect(care.conditionName).toBeTruthy();
      expect(care.roleExplanation).toBeTruthy();
      expect(care.preventionPractices.length).toBeGreaterThan(0);
      expect(care.source).toBeTruthy();
    });
  });

  it('maps each crop to its conditions without errors using cls.split("__")[0]', () => {
    expect(labelsData.crops.length).toBe(14);
    labelsData.crops.forEach(cropSlug => {
      const cropConditions = labelsData.classes.filter(cls => cls.split('__')[0] === cropSlug);
      expect(cropConditions.length).toBeGreaterThan(0);
      cropConditions.forEach(cls => {
        expect(cls.startsWith(cropSlug + '__')).toBe(true);
      });
    });
  });

  it('verifies non-curative disclaimers and caution text across conditions', () => {
    expect(careKnowledge.disclaimer).toBeDefined();
    expect(careKnowledge.disclaimer.toLowerCase()).toContain('fertilizer does not cure');
    
    // Check non-healthy classes have cautions against nitrogen surges or infected debris
    const nonHealthy = labelsData.classes.filter(cls => !cls.endsWith('__healthy'));
    nonHealthy.forEach(cls => {
      const care = knowledgeClasses[cls];
      expect(care.cautions, `Caution missing for ${cls}`).toBeTruthy();
      expect(care.doseGuidance).toBeTruthy();
    });
  });
});
