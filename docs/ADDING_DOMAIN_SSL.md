# Adding Custom Domain & SSL (Optional)

If you want to add a custom domain and SSL certificate later, follow these steps:

## Prerequisites
- Domain name registered (Route 53 or external)
- SSL certificate in AWS Certificate Manager (ACM)

## Steps

### 1. Request SSL Certificate in ACM
```bash
# Request certificate
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names "*.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
aws acm list-certificates --region us-east-1
```

### 2. Update Kubernetes Ingress
Edit `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ev-charging-ingress
  namespace: ev-charging
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webservice
            port:
              number: 80
```

### 3. Update ConfigMap
Edit `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-app-config
  namespace: ev-charging
data:
  VITE_API_URL: "https://api.yourdomain.com"
```

### 4. Apply Changes
```bash
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/configmap.yaml
kubectl rollout restart deployment/web-app -n ev-charging
```

### 5. Configure DNS
```bash
# Get ALB address
ALB_URL=$(kubectl get ingress ev-charging-ingress -n ev-charging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Create these DNS records in Route 53:"
echo "yourdomain.com     CNAME  $ALB_URL"
echo "api.yourdomain.com CNAME  $ALB_URL"
```

### 6. Update GitHub Secrets
Add to your repository secrets:
```
ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID
```

### 7. Update CI/CD Workflow
In `.github/workflows/ci-cd.yml`, add back the ACM certificate variable:

```yaml
- name: Deploy to Kubernetes
  env:
    AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
    IMAGE_TAG: ${{ github.sha }}
    ACM_CERTIFICATE_ARN: ${{ secrets.ACM_CERTIFICATE_ARN }}
```

And update the sed command:
```bash
-e "s|\${ACM_CERTIFICATE_ARN}|$ACM_CERTIFICATE_ARN|g" {} +
```

## Verification
After DNS propagates (5-60 minutes):

```bash
# Test HTTPS
curl https://yourdomain.com
curl https://api.yourdomain.com/health

# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

## Benefits of Adding Domain + SSL
- ✅ HTTPS encryption for secure communication
- ✅ Custom branding with your domain
- ✅ SEO benefits
- ✅ Professional appearance
- ✅ Required for production apps handling sensitive data

## Cost
- ACM certificates: **Free** for AWS resources
- Route 53 hosted zone: **$0.50/month**
- Route 53 queries: **$0.40 per million queries**

For now, the HTTP load balancer URL works perfectly for development and testing!
