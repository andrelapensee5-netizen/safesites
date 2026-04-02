# SafeSite API Documentation

The SafeSite API is a RESTful API built with Express.js and TypeScript.

**Base URL:** `https://api.safesites.com/api/v1`

**Interactive Docs (Swagger):** `https://api.safesites.com/api-docs`

## Authentication

All protected endpoints require a JWT Bearer token:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the refresh token endpoint to get a new one.

## Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| GET | `/auth/verify-email` | Verify email address |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update profile |
| PATCH | `/users/me/password` | Change password |

### Documents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/documents` | List user documents |
| POST | `/documents/upload` | Upload document (multipart/form-data) |
| GET | `/documents/:id` | Get document details |
| DELETE | `/documents/:id` | Delete document |
| GET | `/documents/:id/download` | Get signed download URL |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analysis/:documentId` | Get AI analysis |
| POST | `/analysis/:documentId/retry` | Re-run analysis |

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/subscriptions/status` | Get subscription status |
| POST | `/subscriptions/checkout` | Create Stripe checkout session |
| POST | `/subscriptions/portal` | Open Stripe billing portal |
| GET | `/subscriptions/invoices` | Get payment history |

### Notarizations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/notarizations/:documentId` | Initiate notarization |
| GET | `/notarizations/:documentId/status` | Get notarization status |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/stripe` | Stripe webhook receiver |

## Response Format

All responses use JSON. Errors follow this format:

```json
{
  "error": "Error message"
}
```

Success responses vary by endpoint but typically include the relevant data.

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Upload: 10 uploads per minute per user

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request – invalid input |
| 401 | Unauthorized – missing or invalid token |
| 403 | Forbidden – insufficient permissions or unverified email |
| 404 | Not Found |
| 409 | Conflict – resource already exists |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
