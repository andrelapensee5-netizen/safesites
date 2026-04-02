# SafeSite - AI-Powered Document Review Platform

SafeSite is a comprehensive, production-ready document review platform featuring AI-powered analysis, OCR processing, notarization workflows, and flexible subscription management.

## Features

- **AI Document Analysis** – OpenAI GPT-4 powered contract review, risk assessment, and redline suggestions
- **OCR Processing** – Google Cloud Vision for document text extraction
- **Notarization Integration** – Seamless notarization workflow
- **Subscription Management** – $49/month with free 1-day trial and usage-based pricing
- **Multi-Platform** – Web, iOS, Android, and Desktop apps
- **Secure Storage** – AWS S3 with encryption
- **Stripe Payments** – Cards, PayPal, Apple Pay, Google Pay

## Repository Structure

```
safesites/
├── backend/          Node.js/Express/TypeScript API server
├── web/              React/TypeScript web application
├── mobile/           React Native (Expo) mobile app
├── desktop/          Electron desktop application
├── nginx/            Nginx reverse proxy configuration
├── docs/             Documentation
├── .github/          GitHub Actions CI/CD workflows
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/andrelapensee5-netizen/safesites.git
   cd safesites
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Start with Docker Compose**

   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**

   ```bash
   cd backend && npx prisma migrate deploy
   ```

5. **Open the app**

   - Web: http://localhost:3000
   - API: http://localhost:4000
   - API Docs: http://localhost:4000/api-docs

### Individual Services

```bash
# Backend
cd backend && npm install && npm run dev

# Web
cd web && npm install && npm start

# Mobile
cd mobile && npm install && npx expo start

# Desktop
cd desktop && npm install && npm run dev
```

## Configuration

See [docs/SETUP.md](docs/SETUP.md) for full configuration instructions.

Required API keys:
- `OPENAI_API_KEY` – OpenAI GPT-4
- `GOOGLE_CLOUD_KEY_FILE` – Google Cloud Vision
- `STRIPE_SECRET_KEY` – Stripe payments
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` – AWS S3

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full AWS deployment guide.

## API Documentation

See [docs/API.md](docs/API.md) or visit `/api-docs` when the server is running.

## Mobile App Submission

See [docs/APP_STORE.md](docs/APP_STORE.md) for App Store and Google Play submission guide.

## License

MIT
