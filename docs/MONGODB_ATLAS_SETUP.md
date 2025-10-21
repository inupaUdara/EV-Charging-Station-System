# MongoDB Atlas Setup Guide

## ✅ Why MongoDB Atlas is Great

Using MongoDB Atlas instead of AWS DocumentDB offers several advantages:

### Benefits
- ✅ **Lower Cost**: Free tier available, pay-as-you-grow pricing
- ✅ **Better MongoDB Compatibility**: 100% MongoDB compatible (DocumentDB has some limitations)
- ✅ **Global Deployment**: Easily deploy to multiple regions
- ✅ **Managed Service**: Automatic backups, monitoring, scaling
- ✅ **No AWS Lock-in**: Can use with any cloud or on-premise
- ✅ **Better Performance**: Native MongoDB, not a compatible alternative
- ✅ **Advanced Features**: Full text search, aggregation pipeline, change streams

### Cost Comparison
| Service | Cost |
|---------|------|
| MongoDB Atlas M0 (Free) | **$0/month** |
| MongoDB Atlas M10 (Prod) | **~$57/month** |
| AWS DocumentDB (2 instances) | **~$200/month** |

**You save ~$140/month with MongoDB Atlas!**

## 🚀 Setup Steps

### 1. Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up with email or Google/GitHub
4. Verify your email

### 2. Create a Cluster

1. Click "Build a Database"
2. Choose deployment option:
   - **Free (M0)**: Perfect for development/testing
   - **Serverless**: Pay per use, auto-scales
   - **Dedicated (M10+)**: Production workloads

3. Choose cloud provider: **AWS**
4. Choose region: **us-east-1** (or same as your EKS cluster)
5. Name your cluster: `ev-charging-cluster`
6. Click "Create"

### 3. Configure Database Access

1. Go to **Database Access** in left menu
2. Click "Add New Database User"
3. Choose authentication: **Password**
4. Username: `ev_charging_user`
5. Password: Generate a strong password (save this!)
6. Database User Privileges: **Read and write to any database**
7. Click "Add User"

### 4. Configure Network Access

You need to whitelist your EKS cluster's IP addresses.

#### Option A: Allow from Anywhere (Development)
1. Go to **Network Access** in left menu
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" → Add `0.0.0.0/0`
4. Add description: "Development - EKS Cluster"
5. Click "Confirm"

⚠️ **Note**: This is convenient but less secure. For production, use Option B.

#### Option B: Whitelist EKS NAT Gateway IPs (Production)

After deploying your infrastructure:

```bash
# Get NAT Gateway IPs
aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=ev-charging-vpc-*" \
  --query 'NatGateways[*].NatGatewayAddresses[*].PublicIp' \
  --output text

# Add each IP in MongoDB Atlas Network Access
```

### 5. Get Connection String

1. Go to **Database** in left menu
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: **Node.js** (or any, format is the same)
5. Copy the connection string:

```
mongodb+srv://ev_charging_user:<password>@ev-charging-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. Replace `<password>` with your actual password
7. Add database name before `?`:

```
mongodb+srv://ev_charging_user:YOUR_PASSWORD@ev-charging-cluster.xxxxx.mongodb.net/evcharging?retryWrites=true&w=majority
```

### 6. Add to GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add these secrets:

```
Name: MONGODB_ATLAS_CONNECTION_STRING
Value: mongodb+srv://ev_charging_user:YOUR_PASSWORD@ev-charging-cluster.xxxxx.mongodb.net/evcharging?retryWrites=true&w=majority

Name: JWT_SECRET_KEY
Value: (generate a random 32+ character string)
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

### 7. Test Connection Locally

Update your `.env` file:
```bash
ConnectionStrings__MongoDB=mongodb+srv://ev_charging_user:YOUR_PASSWORD@ev-charging-cluster.xxxxx.mongodb.net/evcharging?retryWrites=true&w=majority
```

Test the connection:
```bash
cd WebService
dotnet run
# Should connect successfully
```

## 🎯 Updated Deployment

Your deployment is now configured to use MongoDB Atlas!

### GitHub Secrets Required:
```
✅ AWS_ACCESS_KEY_ID
✅ AWS_SECRET_ACCESS_KEY
✅ AWS_ACCOUNT_ID
✅ MONGODB_ATLAS_CONNECTION_STRING  (NEW!)
✅ JWT_SECRET_KEY                   (NEW!)
✅ SLACK_WEBHOOK_URL (optional)

❌ MONGODB_USERNAME (not needed)
❌ MONGODB_PASSWORD (not needed)
```

### Deployment Commands

**Terraform (infrastructure only, no database):**
```bash
cd terraform
terraform init
terraform apply
# No database variables needed!
```

**Deploy application:**
```bash
git push origin main
# CI/CD will use MongoDB Atlas connection string from secrets
```

## 📊 MongoDB Atlas Dashboard

Access your database:
1. Go to https://cloud.mongodb.com
2. Login to your account
3. Click on your cluster
4. Click "Browse Collections" to see your data
5. Click "Metrics" to see performance

## 🔒 Security Best Practices

### 1. Network Access
For production, whitelist only your NAT Gateway IPs:
```bash
# Get IPs
./scripts/get-nat-ips.sh  # We'll create this

# Add to Atlas Network Access
```

### 2. Encryption
- ✅ Encryption at rest: Enabled by default
- ✅ Encryption in transit: TLS 1.2+ by default
- ✅ Connection string includes `ssl=true`

### 3. Backup
Enable backups in Atlas:
1. Go to your cluster
2. Click "Backup" tab
3. Enable "Continuous Backup" (Paid feature) or
4. Use "Serverless Continuous Backup" (Free with M10+)

### 4. Monitoring
Set up alerts:
1. Go to "Alerts" in left menu
2. Configure alerts for:
   - High CPU usage
   - High disk usage
   - Connection spike
   - Slow queries

## 💰 Cost Optimization

### Free Tier (M0)
- **Perfect for**: Development, testing, small projects
- **Limits**: 512 MB storage, shared resources
- **Cost**: **$0/month** 🎉

### Recommended for Production (M10)
- **Storage**: 10 GB (can increase)
- **RAM**: 2 GB
- **vCPU**: 2
- **Cost**: **~$57/month** (much cheaper than DocumentDB!)

### Scaling Tips
1. Start with M0 (free)
2. Upgrade to M10 when you need:
   - More than 512 MB storage
   - Production workload
   - Backups
   - Better performance
3. Enable auto-scaling for storage
4. Use read replicas for high-read workloads

## 🔄 Switching from DocumentDB

If you already deployed with DocumentDB:

1. **Export data from DocumentDB**
```bash
mongodump --uri="mongodb://username:password@docdb-endpoint:27017"
```

2. **Import to Atlas**
```bash
mongorestore --uri="mongodb+srv://user:pass@atlas-cluster/evcharging"
```

3. **Update secrets and redeploy**
```bash
# Update GitHub secret with Atlas connection string
git push origin main  # Redeploy
```

4. **Remove DocumentDB** (save ~$200/month!)
```bash
cd terraform
# Comment out database.tf resources (already done!)
terraform apply
```

## 🆘 Troubleshooting

### Connection Timeout
- Check network access whitelist in Atlas
- Verify NAT Gateway IPs are whitelisted
- Test connection: `telnet cluster-name.mongodb.net 27017`

### Authentication Failed
- Verify username/password in connection string
- Check database user exists in Atlas
- Ensure special characters in password are URL-encoded

### Database Not Found
- Database is created automatically on first write
- Check connection string includes `/evcharging` before `?`

### Too Many Connections
- Check connection pooling settings
- Upgrade to larger cluster tier
- Review connection leaks in application

## 📞 Support

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- MongoDB University (Free courses): https://university.mongodb.com/
- Community Forums: https://www.mongodb.com/community/forums/

## ✅ Summary

MongoDB Atlas is configured and ready! Your application will:
- ✅ Connect to MongoDB Atlas automatically
- ✅ Save ~$140/month vs DocumentDB
- ✅ Get better MongoDB compatibility
- ✅ Access advanced MongoDB features
- ✅ Scale easily as you grow

Deploy with confidence! 🚀
