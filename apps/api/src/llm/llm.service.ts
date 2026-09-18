import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

export interface LLMProvider {
  generateContent(prompt: string): Promise<string>;
}

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  async generateContent(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

export class GroqProvider implements LLMProvider {
  private groq: Groq;
  constructor(apiKey: string) {
    this.groq = new Groq({ apiKey });
  }
  async generateContent(prompt: string): Promise<string> {
    const chatCompletion = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    return chatCompletion.choices[0]?.message?.content || '';
  }
}

@Injectable()
export class LlmService {
  private provider: LLMProvider;

  constructor() {
    const providerType = process.env.LLM_PROVIDER || 'gemini';
    console.log('Provider Type: ', providerType);
    if (providerType === 'groq') {
      this.provider = new GroqProvider(process.env.GROQ_API_KEY ?? '');
    } else {
      this.provider = new GeminiProvider(process.env.GEMINI_API_KEY ?? '');
    }
  }

  async generateContent(prompt: string): Promise<string> {
    return this.provider.generateContent(prompt);
  }
}
