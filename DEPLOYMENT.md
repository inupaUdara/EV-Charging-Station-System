# EV Charging Station - Production Deployment Guide

## 🏗️ Architecture Overview

> **Note**: This setup uses HTTP with AWS Load Balancer URLs. To add a custom domain with SSL/HTTPS, see [Adding Domain & SSL Guide](./docs/ADDING_DOMAIN_SSL.md).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Internet / Users                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   AWS ALB        │
                    │  (Load Balancer) │
                    │  HTTP only       │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐       ┌─────▼──────┐      ┌─────▼──────┐
   │ Web App  │       │ WebService │      │ WebService │
   │  (React) │       │   (.NET)   │      │   (.NET)   │
   └──────────┘       └─────┬──────┘      └─────┬──────┘
                            │                    │
                    ┌───────▼────────────────────▼────────┐
                    │       AWS EKS Cluster                │
                    │  ┌─────────────────────────────┐    │
                    │  │    Kubernetes Services      │    │
                    │  │  - Deployments              │    │
                    │  │  - HPA (Auto-scaling)       │    │
                    │  │  - Services & Ingress       │    │
                    │  └─────────────────────────────┘    │
                    └───────┬────────────────────┬─────────┘
                            │                    │
                  ┌─────────▼────────┐  ┌────────▼─────────┐
                  │  DocumentDB      │  │  Monitoring      │
                  │  (MongoDB)       │  │  - Prometheus    │
                  │  - Multi-AZ      │  │  - Grafana       │
                  │  - Encrypted     │  │  - Loki          │
                  └──────────────────┘  │  - CloudWatch    │
                                        └──────────────────┘
```

## 📋 Prerequisites

### Required Tools
- AWS CLI v2+
- Terraform v1.5+
- kubectl v1.28+
- Docker v24+
- Git

### AWS Requirements
- AWS Account with appropriate permissions
- AWS CLI configured with credentials

### GitHub Secrets Configuration
Configure the following secrets in your GitHub repository:

```bash
AWS_ACCESS_KEY_ID          # AWS access key
AWS_SECRET_ACCESS_KEY      # AWS secret key
AWS_ACCOUNT_ID             # AWS account ID
MONGODB_USERNAME           # DocumentDB username
MONGODB_PASSWORD           # DocumentDB password (min 8 chars)
SLACK_WEBHOOK_URL          # Slack webhook for notifications (optional)
```

## 🚀 Deployment Steps

### 1. Initial Setup

#### Create S3 Backend for Terraform State
```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket ev-charging-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ev-charging-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket ev-charging-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name ev-charging-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

#### Clone Repository
```bash
git clone https://github.com/sachithnim/EV-Charging-Station-Booking-System.git
cd EV-Charging-Station-Booking-System
```

### 2. Infrastructure Provisioning

```bash
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan \
  -var="mongodb_username=admin" \
  -var="mongodb_password=YourSecurePassword123!"

# Apply infrastructure
terraform apply \
  -var="mongodb_username=admin" \
  -var="mongodb_password=YourSecurePassword123!"

# Save outputs
terraform output -json > ../outputs.json
```

This will create:
- ✅ VPC with public/private subnets across 3 AZs
- ✅ EKS cluster with managed node groups
- ✅ DocumentDB cluster (MongoDB-compatible)
- ✅ ECR repositories for Docker images
- ✅ IAM roles and security groups
- ✅ Monitoring stack (Prometheus, Grafana, Loki)
- ✅ AWS Load Balancer Controller

### 3. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name ev-charging-cluster \
  --region us-east-1

# Verify connection
kubectl get nodes
kubectl get namespaces
```

### 4. Deploy Applications via GitHub Actions

#### Option A: Automatic Deployment (Recommended)
Push to main branch to trigger CI/CD:
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

The GitHub Actions workflow will:
1. ✅ Lint and test both applications
2. ✅ Run security scans (Trivy)
3. ✅ Build Docker images
4. ✅ Push to ECR
5. ✅ Deploy to EKS
6. ✅ Run smoke tests
7. ✅ Send notifications

#### Option B: Manual Deployment
```bash
# Build and push Docker images
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push WebService
cd WebService
docker build -t ev-charging-webservice .
docker tag ev-charging-webservice:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ev-charging-webservice:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ev-charging-webservice:latest

# Build and push Web-Application
cd ../Web-Application
docker build -t ev-charging-web-app .
docker tag ev-charging-web-app:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ev-charging-web-app:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ev-charging-web-app:latest

# Deploy to Kubernetes
cd ..
export IMAGE_TAG=latest

# Replace placeholders
find k8s/ -type f -name "*.yaml" -exec sed -i.bak \
  -e "s|\${AWS_ACCOUNT_ID}|$AWS_ACCOUNT_ID|g" \
  -e "s|\${AWS_REGION}|$AWS_REGION|g" \
  -e "s|\${IMAGE_TAG}|$IMAGE_TAG|g" {} +

# Apply manifests
kubectl apply -f k8s/

# Get your application URL
echo "Waiting for load balancer..."
sleep 60
kubectl get ingress ev-charging-ingress -n ev-charging
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -n ev-charging

# Check services
kubectl get svc -n ev-charging

# Check ingress
kubectl get ingress -n ev-charging

# Get load balancer URL
kubectl get ingress ev-charging-ingress -n ev-charging \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Access your application
# http://<LOAD_BALANCER_URL>        - Web Application
# http://<LOAD_BALANCER_URL>/api    - API

# View logs
kubectl logs -n ev-charging -l app=webservice --tail=100
kubectl logs -n ev-charging -l app=web-app --tail=100
```

## 📊 Monitoring & Observability

### Access Grafana Dashboard
```bash
# Get Grafana password
kubectl get secret -n monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward to access locally
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Open http://localhost:3000
# Username: admin
# Password: (from above command)
```

### Access Prometheus
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Open http://localhost:9090
```

### View Application Logs
```bash
# Tail logs for WebService
kubectl logs -f -n ev-charging deployment/webservice

# Tail logs for Web Application
kubectl logs -f -n ev-charging deployment/web-app

# View logs in CloudWatch
aws logs tail /aws/eks/ev-charging-cluster/cluster --follow
```

## 🔐 Security Best Practices Implemented

- ✅ **Network Security**: VPC with private subnets, security groups
- ✅ **Encryption**: 
  - Data at rest (EBS, DocumentDB, ECR with KMS)
  - Data in transit (TLS/SSL via ALB)
- ✅ **IAM**: 
  - IRSA (IAM Roles for Service Accounts)
  - Least privilege policies
  - Service account per application
- ✅ **Container Security**:
  - Non-root users
  - Read-only root filesystem
  - Security scanning with Trivy
  - Dropped capabilities
- ✅ **Secrets Management**: 
  - Kubernetes secrets
  - AWS Secrets Manager ready
- ✅ **Pod Security**:
  - Security contexts
  - Resource limits
  - Network policies ready

## 📈 Scaling

### Auto-scaling
- **HPA (Horizontal Pod Autoscaler)**: Automatically scales pods based on CPU/memory
- **Cluster Autoscaler**: EKS managed node groups auto-scale nodes
- **DocumentDB**: Multi-AZ deployment with read replicas

### Manual Scaling
```bash
# Scale WebService
kubectl scale deployment webservice -n ev-charging --replicas=5

# Scale Web Application
kubectl scale deployment web-app -n ev-charging --replicas=3
```

## 🔄 CI/CD Pipeline

### Workflow Triggers
- **Push to main**: Full deployment pipeline
- **Push to develop**: Build and test only
- **Pull Request**: Validation and testing
- **Terraform changes**: Infrastructure validation

### Pipeline Stages
1. **Lint & Test**: ESLint, .NET tests
2. **Security Scan**: Trivy vulnerability scanning
3. **Build**: Multi-arch Docker builds with BuildKit
4. **Push**: ECR with image scanning
5. **Deploy**: Rolling updates to EKS
6. **Verify**: Smoke tests and health checks
7. **Notify**: Slack notifications

## 🛠️ Maintenance

### Update Applications
```bash
# Update Docker image
git commit -am "Update application"
git push origin main
# CI/CD will handle the rest
```

### Update Infrastructure
```bash
cd terraform
terraform plan
terraform apply
```

### Backup DocumentDB
```bash
# Manual snapshot
aws docdb create-db-cluster-snapshot \
  --db-cluster-identifier ev-charging-docdb \
  --db-cluster-snapshot-identifier ev-charging-backup-$(date +%Y%m%d)
```

### Rollback Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/webservice -n ev-charging
kubectl rollout undo deployment/web-app -n ev-charging

# Check rollout status
kubectl rollout status deployment/webservice -n ev-charging
```

## 💰 Cost Optimization

- **Spot Instances**: Node group with spot instances for non-critical workloads
- **Auto-scaling**: HPA scales down during low traffic
- **ECR Lifecycle**: Automatic cleanup of old images
- **Resource Limits**: Right-sized container resources
- **Single NAT Gateway**: Option available in Terraform (not recommended for production)

### Estimated Monthly Costs
- EKS Cluster: ~$73
- EC2 Nodes (3x t3.large): ~$150
- DocumentDB (2x db.t3.medium): ~$200
- ALB: ~$20
- Data Transfer: Variable
- **Total**: ~$450-500/month (scales with traffic)

## 🚨 Troubleshooting

### Pods Not Starting
```bash
kubectl describe pod <pod-name> -n ev-charging
kubectl logs <pod-name> -n ev-charging
```

### Database Connection Issues
```bash
# Test DocumentDB connection
kubectl run -it --rm debug --image=mongo:6 --restart=Never -- \
  mongo --host <docdb-endpoint> --username admin --password
```

### Ingress Not Working
```bash
# Check ALB controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check ingress events
kubectl describe ingress ev-charging-ingress -n ev-charging

# Get load balancer URL
kubectl get ingress ev-charging-ingress -n ev-charging
```

### Application Not Loading
```bash
# Check if load balancer is ready
kubectl get ingress -n ev-charging -w

# Verify services are running
kubectl get svc -n ev-charging
kubectl get pods -n ev-charging

# Check logs
kubectl logs -n ev-charging -l app=webservice
kubectl logs -n ev-charging -l app=web-app
```

## 📚 Additional Resources

- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🤝 Support

For issues or questions:
1. Check logs in CloudWatch/Grafana
2. Review GitHub Actions workflow runs
3. Check Kubernetes events: `kubectl get events -n ev-charging`
4. Review Terraform state: `terraform show`

## 📄 License

This deployment configuration is part of the EV Charging Station Booking System project.
