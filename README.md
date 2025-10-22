# EV Charging Station Booking System

A comprehensive cloud-native Electric Vehicle (EV) charging station management and booking platform built with modern microservices architecture and deployed on AWS EKS.

## 📋 Overview

The EV Charging Station Booking System is a full-stack web application that enables users to find, book, and manage electric vehicle charging sessions. The platform provides real-time station availability, booking management, user authentication, and administrative controls for charging station operators.

## ✨ Core Features

### User Management
- **Authentication & Authorization**: Secure JWT-based authentication system
- **Role-Based Access Control (RBAC)**: Admin, Station Owner, and EV Owner roles
- **User Profiles**: Complete profile management with password change capabilities
- **Multi-tenant Support**: Separate interfaces for different user types

### Charging Station Management
- **Station Registration**: Add and manage charging stations with detailed information
- **Real-time Availability**: Live status updates of charging slots
- **Location-based Search**: Find nearby stations using interactive maps
- **Station Details**: View pricing, connector types, power ratings, and amenities
- **Scheduling Windows**: Configure operating hours and availability patterns

### Booking System
- **Real-time Booking**: Instant reservation of available charging slots
- **Booking Management**: View, modify, and cancel reservations
- **Booking History**: Complete transaction history for users
- **Slot Management**: Dynamic slot creation and availability management
- **Conflict Prevention**: Automatic validation to prevent double-bookings

### EV Owner Management
- **Vehicle Registration**: Register and manage multiple EVs
- **Vehicle Profiles**: Store vehicle details, battery capacity, and charging preferences
- **Charging History**: Track all charging sessions and costs
- **Favorites**: Save frequently used charging stations

### Administrative Dashboard
- **Analytics & Metrics**: Real-time statistics on bookings, stations, and users
- **User Management**: Admin interface for managing all user accounts
- **Station Oversight**: Monitor and manage all registered charging stations
- **Booking Overview**: System-wide booking management and reporting

## 🛠 Technologies

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Hooks (useState, useEffect, custom hooks)
- **HTTP Client**: Axios with interceptors for API communication
- **Routing**: React Router v6 for SPA navigation
- **Maps Integration**: Interactive maps for station location
- **UI Components**: Custom reusable component library

### Backend
- **Framework**: .NET 8 (ASP.NET Core Web API)
- **Language**: C# 12
- **Authentication**: JWT (JSON Web Tokens) with Bearer authentication
- **API Documentation**: Swagger/OpenAPI
- **Validation**: Data annotations and custom validators
- **Error Handling**: Custom exception middleware
- **Security**: CORS, HTTPS, secure headers

### Database
- **Primary Database**: MongoDB Atlas (Cloud-hosted)
- **ODM**: MongoDB.Driver (Official .NET driver)
- **Data Models**: 
  - Users (Admin, Station Owners, EV Owners)
  - Charging Stations
  - Bookings
  - EV Owner profiles
  - Slots and Schedule Windows

### Infrastructure & DevOps

#### Cloud Platform (AWS)
- **Compute**: Amazon EKS (Elastic Kubernetes Service)
- **Container Registry**: Amazon ECR (Elastic Container Registry)
- **Networking**: Amazon VPC with public/private subnets across 3 AZs
- **Load Balancing**: AWS Application Load Balancer (ALB)
- **Infrastructure as Code**: Terraform

#### Container Orchestration
- **Kubernetes**: v1.28+
- **Container Runtime**: Docker
- **Service Mesh**: Kubernetes Services with ClusterIP and LoadBalancer types
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA)
- **High Availability**: Multi-replica deployments across availability zones

#### CI/CD
- **Pipeline**: GitHub Actions
- **Build Strategy**: Multi-stage Docker builds
- **Security Scanning**: Trivy for vulnerability scanning
- **Deployment Strategy**: Rolling updates with zero downtime
- **Automated Testing**: Integration with build pipeline

#### Monitoring & Observability
- **Metrics**: Prometheus
- **Visualization**: Grafana
- **Logging**: Loki
- **Health Checks**: Kubernetes liveness and readiness probes
- **Alerts**: Configured through Prometheus AlertManager

## 🏗 Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        End Users                             │
│                  (Web Browsers/Mobile)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS Application Load Balancer                   │
│                    (Internet-facing)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Ingress                        │
│              (AWS Load Balancer Controller)                  │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────────┐
│   Web App Service       │    │   WebService API            │
│   (React + Nginx)       │    │   (.NET 8)                  │
│   - Port 8080           │    │   - Port 8080               │
│   - 2 Replicas (HPA)    │    │   - 3 Replicas (HPA)        │
│   - Health Checks       │    │   - JWT Authentication      │
│   - Static Assets       │    │   - Swagger API Docs        │
└─────────────────────────┘    └──────────┬──────────────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │   MongoDB Atlas      │
                               │   (Cloud Database)   │
                               │   - Auto-scaling     │
                               │   - Backup/Recovery  │
                               │   - TLS Encrypted    │
                               └──────────────────────┘
```

### Kubernetes Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         EKS Cluster                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Namespace: ev-charging                │  │
│  │                                                          │  │
│  │  ┌────────────────┐              ┌──────────────────┐   │  │
│  │  │  Web-App Pod   │              │  WebService Pod  │   │  │
│  │  │  ┌──────────┐  │              │  ┌────────────┐  │   │  │
│  │  │  │  nginx   │  │              │  │ .NET Core  │  │   │  │
│  │  │  │  :8080   │  │              │  │   API      │  │   │  │
│  │  │  └──────────┘  │              │  │   :8080    │  │   │  │
│  │  │  Volumes:      │              │  └────────────┘  │   │  │
│  │  │  - nginx-cache │              │  Volumes:        │   │  │
│  │  │  - nginx-run   │              │  - tmp           │   │  │
│  │  └────────────────┘              │  - aspnet-temp   │   │  │
│  │                                  └──────────────────┘   │  │
│  │                                                          │  │
│  │  ConfigMaps:                    Secrets:                │  │
│  │  - webservice-config            - webservice-secrets    │  │
│  │  - web-app-config               - MongoDB credentials   │  │
│  │                                 - JWT keys              │  │
│  │                                                          │  │
│  │  Services:                      Ingress:                │  │
│  │  - webservice (ClusterIP:80)   - ev-charging-ingress   │  │
│  │  - web-app (ClusterIP:80)      - Routes: /api, /       │  │
│  │                                                          │  │
│  │  HPA:                           Security:               │  │
│  │  - webservice: 3-10 replicas   - RBAC enabled          │  │
│  │  - web-app: 2-5 replicas       - Pod Security          │  │
│  │                                 - Network Policies      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Monitoring Stack                      │  │
│  │  - Prometheus (metrics collection)                       │  │
│  │  - Grafana (dashboards)                                  │  │
│  │  - Loki (log aggregation)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Network Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                          AWS VPC                               │
│                       CIDR: 10.0.0.0/16                        │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Public Subnet│  │ Public Subnet│  │ Public Subnet│        │
│  │  us-east-1a  │  │  us-east-1b  │  │  us-east-1c  │        │
│  │ 10.0.101.0/24│  │ 10.0.102.0/24│  │ 10.0.103.0/24│        │
│  │              │  │              │  │              │        │
│  │  - NAT GW    │  │  - NAT GW    │  │  - NAT GW    │        │
│  │  - ALB       │  │  - ALB       │  │  - ALB       │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐        │
│  │Private Subnet│  │Private Subnet│  │Private Subnet│        │
│  │  us-east-1a  │  │  us-east-1b  │  │  us-east-1c  │        │
│  │ 10.0.1.0/24  │  │ 10.0.2.0/24  │  │ 10.0.3.0/24  │        │
│  │              │  │              │  │              │        │
│  │  EKS Nodes   │  │  EKS Nodes   │  │  EKS Nodes   │        │
│  │  - General   │  │  - General   │  │  - General   │        │
│  │  - Spot      │  │  - Spot      │  │  - Spot      │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Security Architecture

- **Network Security**: 
  - VPC with public/private subnet isolation
  - Network policies for pod-to-pod communication
  - Security groups for EKS nodes
  
- **Container Security**:
  - Non-root containers (user 101 for nginx, user 1000 for .NET)
  - Read-only root filesystems
  - Dropped kernel capabilities
  - No privilege escalation
  
- **Application Security**:
  - JWT-based authentication
  - HTTPS/TLS encryption
  - CORS configuration
  - Secret management via Kubernetes secrets
  - Environment variable injection

- **Database Security**:
  - MongoDB Atlas with TLS
  - Network-restricted access
  - Encrypted at rest and in transit

## 🚀 Deployment

### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Terraform >= 1.5.0
- kubectl >= 1.28
- Docker
- Git
- MongoDB Atlas account

### Infrastructure Setup

1. **Clone the repository**:
```bash
git clone https://github.com/inupaUdara/EV-Charging-Station-System.git
cd EV-Charging-Station-System
```

2. **Configure AWS credentials**:
```bash
aws configure
```

3. **Initialize Terraform**:
```bash
cd terraform
terraform init
```

4. **Deploy infrastructure**:
```bash
terraform plan
terraform apply
```

This will create:
- VPC with 3 public and 3 private subnets
- EKS cluster with managed node groups
- ECR repositories for Docker images
- IAM roles and policies
- Load balancers and networking components

5. **Configure kubectl**:
```bash
aws eks update-kubeconfig --region us-east-1 --name ev-charging-eks-cluster
```

### Application Deployment

#### Option 1: Automated Deployment (GitHub Actions)

1. **Configure GitHub Secrets**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_ACCOUNT_ID`
   - `MONGODB_ATLAS_CONNECTION_STRING`
   - `JWT_SECRET_KEY`
   - `SLACK_WEBHOOK_URL` (optional)

2. **Push to main branch**:
```bash
git push origin main
```

The GitHub Actions workflow will automatically:
- Build Docker images
- Scan for vulnerabilities
- Push to ECR
- Deploy to EKS
- Run smoke tests

#### Option 2: Manual Deployment

1. **Build and push Docker images**:
```bash
# Build webservice
docker build -t ev-charging-webservice ./WebService
docker tag ev-charging-webservice:latest ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ev-charging-webservice:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ev-charging-webservice:latest

# Build web-app
docker build -t ev-charging-web-app ./Web-Application
docker tag ev-charging-web-app:latest ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ev-charging-web-app:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ev-charging-web-app:latest
```

2. **Deploy to Kubernetes**:
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create configmaps
kubectl apply -f k8s/configmap.yaml

# Create secrets
kubectl create secret generic webservice-secrets \
  --from-literal=MongoDB__ConnectionString="your-mongodb-connection-string" \
  --from-literal=MongoDB__DatabaseName="EVChargingDB" \
  --from-literal=Jwt__Key="your-jwt-secret-key" \
  --from-literal=Jwt__Issuer="ev-charging-api" \
  --from-literal=Jwt__Audience="ev-charging-web" \
  --namespace=ev-charging

# Deploy applications
kubectl apply -f k8s/webservice-deployment.yaml
kubectl apply -f k8s/web-app-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for rollout
kubectl rollout status deployment/webservice -n ev-charging
kubectl rollout status deployment/web-app -n ev-charging
```

3. **Get the application URL**:
```bash
kubectl get ingress ev-charging-ingress -n ev-charging
```

### Post-Deployment

1. **Verify deployment**:
```bash
kubectl get pods -n ev-charging
kubectl get svc -n ev-charging
kubectl get ingress -n ev-charging
```

2. **Access the application**:
   - Frontend: `http://<LOAD_BALANCER_URL>`
   - API: `http://<LOAD_BALANCER_URL>/api`
   - Swagger: `http://<LOAD_BALANCER_URL>/api/swagger`
   - Health: `http://<LOAD_BALANCER_URL>/api/health`

3. **Monitor the application**:
```bash
# View logs
kubectl logs -f deployment/webservice -n ev-charging
kubectl logs -f deployment/web-app -n ev-charging

# Check metrics
kubectl top pods -n ev-charging
kubectl top nodes
```

## 📊 Monitoring

### Prometheus Metrics

Access Prometheus at `http://<LOAD_BALANCER_URL>/prometheus`:
- Pod CPU/Memory usage
- HTTP request rates
- Response times
- Error rates

### Grafana Dashboards

Access Grafana at `http://<LOAD_BALANCER_URL>/grafana`:
- Kubernetes cluster overview
- Application performance
- Resource utilization
- Custom business metrics

### Logs

View aggregated logs in Loki or directly via kubectl:
```bash
kubectl logs -f -l app=webservice -n ev-charging
kubectl logs -f -l app=web-app -n ev-charging
```

## 🔧 Configuration

### Environment Variables

**WebService (Backend)**:
- `ASPNETCORE_ENVIRONMENT`: Production/Development
- `ASPNETCORE_URLS`: HTTP binding (http://+:8080)
- `MongoDB__ConnectionString`: MongoDB connection string
- `MongoDB__DatabaseName`: Database name
- `Jwt__Key`: JWT signing key
- `Jwt__Issuer`: JWT issuer
- `Jwt__Audience`: JWT audience

**Web-App (Frontend)**:
- `VITE_BASE_URL`: API base URL (injected at runtime)

### Scaling Configuration

Horizontal Pod Autoscaler settings:
- **WebService**: 3-10 replicas (CPU: 70%)
- **Web-App**: 2-5 replicas (CPU: 70%)

Modify in:
- `k8s/webservice-deployment.yaml`
- `k8s/web-app-deployment.yaml`

## 📝 API Documentation

API documentation is available via Swagger UI at `/api/swagger` after deployment.

### Main Endpoints

- **Authentication**:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login

- **Users**:
  - `GET /api/users` - List all users (Admin)
  - `GET /api/users/{id}` - Get user by ID
  - `PUT /api/users/{id}` - Update user
  - `DELETE /api/users/{id}` - Delete user

- **Charging Stations**:
  - `GET /api/stations` - List all stations
  - `GET /api/stations/{id}` - Get station details
  - `POST /api/stations` - Create station
  - `PUT /api/stations/{id}` - Update station
  - `DELETE /api/stations/{id}` - Delete station

- **Bookings**:
  - `GET /api/bookings` - List bookings
  - `GET /api/bookings/{id}` - Get booking details
  - `POST /api/bookings` - Create booking
  - `PUT /api/bookings/{id}` - Update booking
  - `DELETE /api/bookings/{id}` - Cancel booking

- **EV Owners**:
  - `GET /api/evowners` - List EV owners
  - `GET /api/evowners/{id}` - Get EV owner profile
  - `POST /api/evowners` - Create EV owner profile
  - `PUT /api/evowners/{id}` - Update profile

- **Profile**:
  - `GET /api/profile/me` - Get current user profile
  - `PUT /api/profile/change-password` - Change password

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- ## 📄 License

This project is licensed under the MIT License. -->

<!-- ## 👥 Authors

- **Inupa Udara** - [inupaUdara](https://github.com/inupaUdara) -->

## 🙏 Acknowledgments

- MongoDB Atlas for database hosting
- AWS for cloud infrastructure
- The open-source community for amazing tools and libraries

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Note**: This is a production-ready deployment with enterprise-grade security, scalability, and monitoring capabilities.
