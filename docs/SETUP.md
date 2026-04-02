# SafeSite Setup Guide

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

## API Keys Required

### 1. OpenAI (AI Analysis)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env` as `OPENAI_API_KEY`

### 2. Google Cloud Vision (OCR)
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable the Cloud Vision API
4. Create a service account and download the JSON key file
5. Save as `backend/google-credentials.json`
6. Add `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_KEY_FILE` to `.env`

### 3. Stripe (Payments)
1. Go to https://dashboard.stripe.com
2. Get your API keys from Developers > API keys
3. Create a product and monthly price in Stripe dashboard
4. Get the Price ID (starts with `price_`)
5. Add to `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_ID_MONTHLY`
6. Set up Stripe webhook in Dashboard > Developers > Webhooks
   - Endpoint URL: `https://yourapi.com/api/v1/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
7. Add webhook secret as `STRIPE_WEBHOOK_SECRET`

### 4. AWS (Storage)
1. Go to https://aws.amazon.com
2. Create an S3 bucket
3. Enable versioning and server-side encryption (AES256)
4. Create an IAM user with S3 permissions
5. Add to `.env`:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_BUCKET`
   - `AWS_REGION`

### 5. Email (SMTP)
- For development: Use Mailtrap or your own SMTP server
- For production: Use SendGrid, SES, or similar
- Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` to `.env`

### 6. NotarizeMe (Optional)
1. Sign up at https://notarizeme.com
2. Get your API key
3. Add `NOTARIZEME_API_KEY` to `.env`

## Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/andrelapensee5-netizen/safesites.git
cd safesites

# 2. Configure environment
cp .env.example .env
# Edit .env and fill in your API keys

# 3. Start databases with Docker
docker-compose up -d postgres redis

# 4. Setup backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# 5. Start frontend (in new terminal)
cd web
npm install
npm start
```

## Environment Variables Reference

See `.env.example` for all required environment variables.

## Troubleshooting

### PostgreSQL connection failed
- Ensure PostgreSQL is running: `docker-compose ps`
- Check `DATABASE_URL` in `.env`

### JWT errors
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set and at least 32 characters

### S3 upload fails
- Check AWS credentials and bucket permissions
- Ensure bucket region matches `AWS_REGION`

### OpenAI errors
- Check API key validity and quota at https://platform.openai.com/usage
