// Set required environment variables before any module is imported.
// Several services capture env vars at module load time (e.g. OpenAI API key,
// Notarize.me API key), so they must be present before the first import.

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

process.env.OPENAI_API_KEY = 'sk-test-dummy-openai-key';
process.env.OPENAI_MODEL = 'gpt-4-turbo-preview';

process.env.GOOGLE_CLOUD_KEY_FILE = '/tmp/fake-key.json';
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project';

process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
process.env.STRIPE_PRICE_ID_MONTHLY = 'price_test_monthly';

process.env.NOTARIZEME_API_URL = 'https://api.notarizeme.com/v1';
process.env.NOTARIZEME_API_KEY = 'test-notarize-key';

process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@safesites.com';
process.env.SMTP_PASS = 'test-smtp-pass';
process.env.EMAIL_FROM = 'noreply@safesites.com';

process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port to avoid conflicts
