# SafeSite AWS Deployment Guide

## Architecture Overview

```
Internet → CloudFront → S3 (Frontend)
                     → ALB → EC2 (Backend API)
                               → RDS PostgreSQL
                               → ElastiCache Redis
                               → S3 (Document Storage)
```

## Prerequisites

- AWS CLI installed and configured
- Docker installed locally
- Domain name (optional but recommended)

## Step 1: Create Infrastructure

### RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier safesites-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username safesites \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --storage-encrypted \
  --backup-retention-period 7
```

### ElastiCache Redis
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id safesites-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

### S3 Bucket for Documents
```bash
aws s3api create-bucket \
  --bucket safesites-documents \
  --region us-east-1

aws s3api put-bucket-encryption \
  --bucket safesites-documents \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### ECR Repository
```bash
aws ecr create-repository --repository-name safesites-backend
```

## Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets):

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | e.g., `us-east-1` |
| `EC2_HOST` | EC2 instance public IP/hostname |
| `EC2_USER` | e.g., `ubuntu` or `ec2-user` |
| `EC2_SSH_KEY` | Private SSH key for EC2 |
| `PRODUCTION_API_URL` | e.g., `https://api.safesites.com/api/v1` |
| `S3_FRONTEND_BUCKET` | S3 bucket for frontend assets |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |

## Step 3: EC2 Setup

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Create application directory
sudo mkdir -p /opt/safesites
sudo chown ubuntu:ubuntu /opt/safesites
cd /opt/safesites

# Create production .env
nano .env
# Add all production environment variables

# Copy docker-compose.yml
# (deploy via CI/CD or manual copy)
```

## Step 4: Frontend Deployment (S3 + CloudFront)

```bash
# Create S3 bucket for frontend
aws s3api create-bucket --bucket safesites-web --region us-east-1

# Enable static website hosting
aws s3 website s3://safesites-web --index-document index.html --error-document index.html

# Create CloudFront distribution
# (Use AWS Console for easiest setup with custom domain)
```

## Step 5: SSL Certificate

Using AWS Certificate Manager:
```bash
aws acm request-certificate \
  --domain-name safesites.com \
  --subject-alternative-names "*.safesites.com" \
  --validation-method DNS
```

## Step 6: Deploy

Push to `main` branch to trigger automated deployment:
```bash
git push origin main
```

Or manually trigger from GitHub Actions tab.

## Monitoring

- **CloudWatch Logs**: Backend logs stream automatically via Docker
- **Health Check**: `GET /health` endpoint on the backend
- **Uptime monitoring**: Configure AWS CloudWatch alarms on the health endpoint

## Database Backups

RDS automated backups are enabled with 7-day retention.

Manual backup:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier safesites-db \
  --db-snapshot-identifier safesites-backup-$(date +%Y%m%d)
```

## Scaling

- **Backend**: Increase EC2 instance type or add Auto Scaling Group
- **Database**: Enable Multi-AZ for RDS, or upgrade instance type
- **Redis**: Upgrade ElastiCache cluster size
- **Storage**: S3 scales automatically
