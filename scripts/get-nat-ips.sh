#!/bin/bash

# Script to get NAT Gateway IPs for MongoDB Atlas whitelisting

echo "🔍 Getting NAT Gateway IPs for MongoDB Atlas..."
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS CLI is not configured"
    echo "   Run: aws configure"
    exit 1
fi

# Get NAT Gateway IPs
echo "📡 Fetching NAT Gateway public IPs..."
NAT_IPS=$(aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=ev-charging-vpc-*" "Name=state,Values=available" \
  --query 'NatGateways[*].NatGatewayAddresses[*].PublicIp' \
  --output text 2>/dev/null)

if [ -z "$NAT_IPS" ]; then
    echo "⚠️  No NAT Gateways found for ev-charging-vpc"
    echo "   Make sure your infrastructure is deployed: make apply"
    echo ""
    echo "   If you haven't deployed yet, you can temporarily use 0.0.0.0/0"
    echo "   in MongoDB Atlas Network Access for development."
    exit 0
fi

echo ""
echo "✅ NAT Gateway IPs found!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Add these IPs to MongoDB Atlas Network Access:"
echo ""

for IP in $NAT_IPS; do
    echo "   $IP/32"
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Steps to add in MongoDB Atlas:"
echo "   1. Go to https://cloud.mongodb.com"
echo "   2. Select your cluster"
echo "   3. Click 'Network Access' in left menu"
echo "   4. Click 'Add IP Address'"
echo "   5. Enter each IP above with /32"
echo "   6. Add comment: 'EKS NAT Gateway'"
echo "   7. Click 'Confirm'"
echo ""
echo "⚠️  Important: Add ALL IPs above for high availability"
echo "   (Your cluster uses multiple availability zones)"
