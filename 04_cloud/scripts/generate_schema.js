import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const labelsPath = path.resolve(__dirname, '../../01_data/labels.json');
const outputPath = path.resolve(__dirname, '../infra/scan-schema.json');

const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));

const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PlantScanRecord',
  description: 'Schema for synchronized crop disease diagnosis scans',
  type: 'object',
  required: [
    'scanId',
    'selectedCrop',
    'cropMode',
    'predictedCrop',
    'predictedClass',
    'displayName',
    'confidence',
    'weatherSnapshot',
    'risk',
    'createdAt'
  ],
  properties: {
    scanId: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]{1,64}$'
    },
    selectedCrop: {
      type: 'string',
      enum: [...labels.crops, 'unknown']
    },
    cropMode: {
      type: 'string',
      enum: ['known', 'unknown']
    },
    predictedCrop: {
      type: 'string',
      enum: labels.crops
    },
    predictedClass: {
      type: 'string',
      enum: labels.classes
    },
    displayName: {
      type: 'string',
      minLength: 1,
      maxLength: 120
    },
    confidence: {
      type: 'number',
      minimum: 0.0,
      maximum: 1.0
    },
    belowThreshold: {
      type: 'boolean'
    },
    secondCandidate: {
      type: ['object', 'null']
    },
    latencyMs: {
      type: 'number'
    },
    modelVersion: {
      type: 'string'
    },
    taxonomyVersion: {
      type: 'string'
    },
    weatherSnapshot: {
      type: 'object',
      required: ['temperatureC', 'humidityPct', 'rainMm', 'source', 'sourceLabel'],
      properties: {
        temperatureC: { type: 'number' },
        humidityPct: { type: 'number' },
        rainMm: { type: 'number' },
        source: { type: 'string', enum: ['live', 'cache', 'fallback'] },
        sourceLabel: { type: 'string' }
      }
    },
    risk: {
      type: 'object',
      required: ['score', 'category'],
      properties: {
        score: { type: 'number', minimum: 0.0, maximum: 1.0 },
        category: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        notAssessed: { type: 'boolean' },
        isApproximate: { type: 'boolean' }
      }
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    }
  },
  additionalProperties: true
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf8');
console.log(`Successfully generated JSON schema with ${labels.classes.length} class enums at: ${outputPath}`);
