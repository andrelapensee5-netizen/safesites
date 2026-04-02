import vision from '@google-cloud/vision';
import { logger } from '../utils/logger';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

export const ocrService = {
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        // For PDFs use document text detection
        const [result] = await client.documentTextDetection({
          image: { content: buffer.toString('base64') },
        });
        return result.fullTextAnnotation?.text || '';
      }

      const [result] = await client.textDetection({
        image: { content: buffer.toString('base64') },
      });

      const detections = result.textAnnotations || [];
      return detections.length > 0 ? detections[0].description || '' : '';
    } catch (err) {
      logger.error('OCR extraction failed:', err);
      throw err;
    }
  },
};
