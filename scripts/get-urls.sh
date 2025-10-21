#!/bin/bash

# Script to get application URLs after deployment

echo "🔍 Fetching EV Charging Station Application URLs..."
echo ""

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Error: kubectl is not configured or cluster is not accessible"
    echo "   Run: aws eks update-kubeconfig --name ev-charging-cluster --region us-east-1"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace ev-charging &> /dev/null; then
    echo "❌ Error: ev-charging namespace not found"
    echo "   Application may not be deployed yet"
    exit 1
fi

# Get ingress status
echo "📊 Checking ingress status..."
if ! kubectl get ingress ev-charging-ingress -n ev-charging &> /dev/null; then
    echo "❌ Error: Ingress not found"
    echo "   Run: kubectl apply -f k8s/"
    exit 1
fi

# Get load balancer URL
LB_URL=$(kubectl get ingress ev-charging-ingress -n ev-charging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)

if [ -z "$LB_URL" ]; then
    echo "⏳ Load balancer is still provisioning..."
    echo "   This usually takes 2-3 minutes"
    echo ""
    echo "   Run this script again in a few moments, or watch with:"
    echo "   kubectl get ingress -n ev-charging -w"
    exit 0
fi

# Display URLs
echo ""
echo "✅ Application is ready!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Web Application:"
echo "   http://$LB_URL"
echo ""
echo "🔌 API Endpoint:"
echo "   http://$LB_URL/api"
echo ""
echo "💚 Health Check:"
echo "   http://$LB_URL/api/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check pod status
echo "📦 Pod Status:"
kubectl get pods -n ev-charging

echo ""
echo "🔄 Service Status:"
kubectl get svc -n ev-charging

echo ""
echo "📈 To view logs:"
echo "   API:  kubectl logs -f -n ev-charging -l app=webservice"
echo "   Web:  kubectl logs -f -n ev-charging -l app=web-app"

echo ""
echo "📊 To access Grafana (monitoring):"
echo "   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo "   Then open: http://localhost:3000"
