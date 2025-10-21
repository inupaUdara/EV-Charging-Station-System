# Quick Start Guide

## Prerequisites
- AWS Account
- GitHub repository
- **MongoDB Atlas account** (free at mongodb.com/cloud/atlas)

## Setup (6 steps)

### 1. Setup MongoDB Atlas
Follow the [MongoDB Atlas Setup Guide](./docs/MONGODB_ATLAS_SETUP.md) to:
- Create free cluster (M0 - $0/month)
- Create database user
- Get connection string
- Configure network access (use 0.0.0.0/0 for dev)

### 2. Configure GitHub Secrets
Add these to your repository settings → Secrets → Actions:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_ACCOUNT_ID
MONGODB_ATLAS_CONNECTION_STRING
JWT_SECRET_KEY
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

### 3. Create Terraform Backend
```bash
aws s3api create-bucket --bucket ev-charging-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket ev-charging-terraform-state --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name ev-charging-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### 4. Deploy Infrastructure
```bash
cd terraform
terraform init
terraform apply
# No database variables needed - using MongoDB Atlas!
```

### 5. Push to Deploy

### 3. Deploy Infrastructure
```bash
cd terraform
terraform init
terraform apply -var="mongodb_username=admin" -var="mongodb_password=SecurePass123!"
```

### 5. Push to Deploy
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 6. Get Your URL
```bash
kubectl get ingress -n ev-charging

# Your application will be available at:
# http://<LOAD_BALANCER_URL>        - Web App
# http://<LOAD_BALANCER_URL>/api    - API
```

## Access Monitoring
```bash
# Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# http://localhost:3000 (admin / get password from secret)

# Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
```

## Common Commands
```bash
# View logs
kubectl logs -f -n ev-charging deployment/webservice

# Scale app
kubectl scale deployment webservice -n ev-charging --replicas=5

# Rollback
kubectl rollout undo deployment/webservice -n ev-charging

# Check status
kubectl get all -n ev-charging
```

## Troubleshooting
- **Pods failing?** → `kubectl describe pod <name> -n ev-charging`
- **Can't connect to DB?** → Check DocumentDB security group
- **Ingress not working?** → Wait 2-3 minutes for ALB to provision
- **Build failing?** → Check GitHub Actions logs
- **No URL showing?** → `kubectl get ingress -n ev-charging -w` (wait for ADDRESS)

For detailed guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)
