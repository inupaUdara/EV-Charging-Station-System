# Pre-Deployment Checklist

Use this checklist before deploying to ensure everything is configured correctly.

## ☑️ AWS Setup

- [ ] AWS Account created and accessible
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws sts get-caller-identity`)
- [ ] Sufficient IAM permissions for EKS, VPC, EC2, etc.

## ☑️ Required Tools

- [ ] `terraform` installed (>= 1.5.0)
- [ ] `kubectl` installed (>= 1.28)
- [ ] `docker` installed and running
- [ ] `git` installed

Check all tools:
```bash
make install-tools  # macOS with Homebrew
# or check manually:
aws --version
terraform --version
kubectl version --client
docker --version
git --version
```

## ☑️ GitHub Configuration

- [ ] Repository cloned locally
- [ ] GitHub secrets configured:
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `AWS_ACCOUNT_ID`
  - [ ] `MONGODB_USERNAME`
  - [ ] `MONGODB_PASSWORD` (min 8 characters)
  - [ ] `SLACK_WEBHOOK_URL` (optional)

## ☑️ Terraform Backend

- [ ] S3 bucket created for state (`ev-charging-terraform-state`)
- [ ] S3 versioning enabled
- [ ] S3 encryption enabled
- [ ] DynamoDB table created for locking (`ev-charging-terraform-locks`)

Quick setup:
```bash
# Run the commands from DEPLOYMENT.md section 1
aws s3api create-bucket --bucket ev-charging-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket ev-charging-terraform-state --versioning-configuration Status=Enabled
# ... etc
```

## ☑️ Local Testing (Optional but Recommended)

- [ ] Local environment works with Docker Compose
```bash
make local-up
# Check: http://localhost (Web) and http://localhost:8080 (API)
make local-down
```

## ☑️ Code Review

- [ ] No sensitive data in code (passwords, keys, etc.)
- [ ] `.env` files are in `.gitignore`
- [ ] Docker builds successfully locally
```bash
make docker-build
```

## ☑️ Infrastructure Planning

- [ ] Reviewed Terraform plan
```bash
cd terraform
terraform init
terraform plan -var="mongodb_username=admin" -var="mongodb_password=YourPassword123!"
```
- [ ] Estimated costs reviewed (~$450-500/month)
- [ ] Region selected (default: us-east-1)

## ☑️ Ready to Deploy?

If all items above are checked:

### 1. Deploy Infrastructure
```bash
make apply
# Enter MongoDB credentials when prompted
```

### 2. Configure kubectl
```bash
make k8s-config
kubectl get nodes  # Should show EKS nodes
```

### 3. Trigger Deployment
```bash
git add .
git commit -m "Initial production deployment"
git push origin main
```

### 4. Monitor Deployment
```bash
# Watch GitHub Actions
# https://github.com/YOUR_USERNAME/EV-Charging-Station-Booking-System/actions

# Or watch in terminal
kubectl get pods -n ev-charging -w
```

### 5. Get URLs
```bash
./scripts/get-urls.sh
# or
make k8s-url
```

## 🎯 Success Criteria

Your deployment is successful when:

- [ ] All pods are Running
```bash
kubectl get pods -n ev-charging
# All should show "Running" status
```

- [ ] Services are accessible
```bash
kubectl get svc -n ev-charging
# All should have ClusterIP
```

- [ ] Ingress has ADDRESS
```bash
kubectl get ingress -n ev-charging
# Should show load balancer hostname
```

- [ ] Application responds
```bash
# Get URL from: ./scripts/get-urls.sh
curl http://<LOAD_BALANCER_URL>/api/health
# Should return 200 OK
```

- [ ] Monitoring accessible
```bash
make monitoring-grafana
# Open http://localhost:3000
# Login: admin / (get password with make monitoring-password)
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Terraform state lock | `terraform force-unlock <LOCK_ID>` |
| kubectl not configured | `make k8s-config` |
| Pods in Pending state | Check node capacity: `kubectl describe nodes` |
| Ingress no ADDRESS | Wait 2-3 minutes for ALB provisioning |
| Docker build fails | Check Dockerfile paths, run `docker system prune` |
| GitHub Actions fails | Check secrets are set correctly |

## 📞 Need Help?

- Review logs: `kubectl logs -n ev-charging -l app=webservice`
- Check events: `kubectl get events -n ev-charging --sort-by='.lastTimestamp'`
- Describe resources: `kubectl describe pod <pod-name> -n ev-charging`
- Full guide: [DEPLOYMENT.md](../DEPLOYMENT.md)

---

**Estimated Setup Time**: 30-45 minutes (mostly waiting for AWS resources)

**Pro Tip**: Run `make validate` before deployment to catch configuration issues early!
