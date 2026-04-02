import OpenAI from 'openai';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AnalysisResult {
  summary: string;
  riskScore: number;
  risks: Array<{ type: string; severity: string; description: string }>;
  clauses: Array<{ name: string; text: string; explanation: string }>;
  suggestions: Array<{ type: string; description: string; priority: string }>;
  redlines: Array<{ original: string; suggested: string; reason: string }>;
  model: string;
  processingTime: number;
}

const ANALYSIS_PROMPT = `You are an expert legal document analyst. Analyze the following document and provide a structured JSON response with these fields:

{
  "summary": "Brief summary of the document (2-3 sentences)",
  "riskScore": <integer 0-100, where 0=no risk, 100=extreme risk>,
  "risks": [{"type": "string", "severity": "low|medium|high|critical", "description": "string"}],
  "clauses": [{"name": "clause name", "text": "original text", "explanation": "plain English explanation"}],
  "suggestions": [{"type": "modification|addition|removal", "description": "string", "priority": "low|medium|high"}],
  "redlines": [{"original": "original text", "suggested": "suggested replacement", "reason": "why this change"}]
}

Document:`;

export const aiService = {
  async analyzeDocument(text: string, fileName: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

    try {
      const truncatedText = text.length > 15000 ? text.slice(0, 15000) + '\n...[truncated]' : text;

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert legal document analyst. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: `${ANALYSIS_PROMPT}\n\nFile: ${fileName}\n\n${truncatedText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(content);
      const processingTime = Date.now() - startTime;

      return {
        summary: parsed.summary || '',
        riskScore: Math.min(100, Math.max(0, Number(parsed.riskScore) || 0)),
        risks: parsed.risks || [],
        clauses: parsed.clauses || [],
        suggestions: parsed.suggestions || [],
        redlines: parsed.redlines || [],
        rawResponse: parsed,
        model,
        processingTime,
      } as AnalysisResult;
    } catch (err) {
      logger.error('AI analysis failed:', err);
      throw err;
    }
  },
};
