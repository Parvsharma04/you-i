import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const ORIGINAL_ENV = process.env;
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('passes with DATABASE_URL and the default gemini provider key set', () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    process.env.GEMINI_API_KEY = 'key';
    delete process.env.LLM_PROVIDER;
    delete process.env.GROQ_API_KEY;

    const env = validateEnv();

    expect(env.DATABASE_URL).toBe('postgres://localhost:5432/db');
    expect(env.PORT).toBe(8081);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.GEMINI_API_KEY = 'key';

    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits when LLM_PROVIDER=groq but GROQ_API_KEY is missing', () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    process.env.LLM_PROVIDER = 'groq';
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;

    validateEnv();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
