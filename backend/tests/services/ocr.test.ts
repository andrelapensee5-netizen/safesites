const mockTextDetection = jest.fn();
const mockDocumentTextDetection = jest.fn();

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    textDetection: mockTextDetection,
    documentTextDetection: mockDocumentTextDetection,
  })),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import { ocrService } from '../../src/services/ocr';

beforeEach(() => jest.clearAllMocks());

describe('ocrService.extractText', () => {
  it('uses documentTextDetection for PDFs and returns the full text', async () => {
    mockDocumentTextDetection.mockResolvedValue([{ fullTextAnnotation: { text: 'PDF text here' } }]);
    const text = await ocrService.extractText(Buffer.from('pdf'), 'application/pdf');
    expect(text).toBe('PDF text here');
    expect(mockDocumentTextDetection).toHaveBeenCalledTimes(1);
    expect(mockTextDetection).not.toHaveBeenCalled();
  });

  it('uses textDetection for JPEG images and returns the first annotation', async () => {
    mockTextDetection.mockResolvedValue([{
      textAnnotations: [{ description: 'Image text' }],
    }]);
    const text = await ocrService.extractText(Buffer.from('img'), 'image/jpeg');
    expect(text).toBe('Image text');
    expect(mockTextDetection).toHaveBeenCalledTimes(1);
    expect(mockDocumentTextDetection).not.toHaveBeenCalled();
  });

  it('uses textDetection for PNG images', async () => {
    mockTextDetection.mockResolvedValue([{
      textAnnotations: [{ description: 'PNG text' }],
    }]);
    const text = await ocrService.extractText(Buffer.from('img'), 'image/png');
    expect(text).toBe('PNG text');
  });

  it('returns an empty string when an image has no text annotations', async () => {
    mockTextDetection.mockResolvedValue([{ textAnnotations: [] }]);
    const text = await ocrService.extractText(Buffer.from('blank'), 'image/png');
    expect(text).toBe('');
  });

  it('returns an empty string when a PDF has no fullTextAnnotation', async () => {
    mockDocumentTextDetection.mockResolvedValue([{ fullTextAnnotation: null }]);
    const text = await ocrService.extractText(Buffer.from('blank'), 'application/pdf');
    expect(text).toBe('');
  });

  it('propagates errors from the Vision API', async () => {
    mockTextDetection.mockRejectedValue(new Error('Vision quota exceeded'));
    await expect(
      ocrService.extractText(Buffer.from('data'), 'image/jpeg'),
    ).rejects.toThrow('Vision quota exceeded');
  });
});
