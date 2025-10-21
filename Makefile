# Makefile for EV Charging Station Deployment

.PHONY: help init plan apply destroy docker-build docker-push k8s-deploy local-up local-down

# Variables
AWS_REGION ?= us-east-1
AWS_ACCOUNT_ID ?= $(shell aws sts get-caller-identity --query Account --output text)
IMAGE_TAG ?= $(shell git rev-parse --short HEAD)
CLUSTER_NAME ?= ev-charging-cluster

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## Local Development
local-up: ## Start local development environment with Docker Compose
	docker-compose up -d
	@echo "Services starting..."
	@echo "Web App: http://localhost:80"
	@echo "API: http://localhost:8080"
	@echo "Grafana: http://localhost:3000 (admin/admin123)"
	@echo "Prometheus: http://localhost:9090"

local-down: ## Stop local development environment
	docker-compose down

local-logs: ## View logs from local environment
	docker-compose logs -f

## Terraform
init: ## Initialize Terraform
	cd terraform && terraform init

plan: ## Run Terraform plan
	cd terraform && terraform plan \
		-var="mongodb_username=${MONGODB_USERNAME}" \
		-var="mongodb_password=${MONGODB_PASSWORD}"

apply: ## Apply Terraform changes
	cd terraform && terraform apply \
		-var="mongodb_username=${MONGODB_USERNAME}" \
		-var="mongodb_password=${MONGODB_PASSWORD}"

destroy: ## Destroy Terraform infrastructure
	cd terraform && terraform destroy \
		-var="mongodb_username=${MONGODB_USERNAME}" \
		-var="mongodb_password=${MONGODB_PASSWORD}"

outputs: ## Show Terraform outputs
	cd terraform && terraform output

## Docker
docker-build: ## Build Docker images
	docker build -t ev-charging-webservice:$(IMAGE_TAG) ./WebService
	docker build -t ev-charging-web-app:$(IMAGE_TAG) ./Web-Application

docker-push: ## Push Docker images to ECR
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	
	docker tag ev-charging-webservice:$(IMAGE_TAG) \
		$(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/ev-charging-webservice:$(IMAGE_TAG)
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/ev-charging-webservice:$(IMAGE_TAG)
	
	docker tag ev-charging-web-app:$(IMAGE_TAG) \
		$(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/ev-charging-web-app:$(IMAGE_TAG)
	docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/ev-charging-web-app:$(IMAGE_TAG)

## Kubernetes
k8s-config: ## Update kubeconfig for EKS
	aws eks update-kubeconfig --name $(CLUSTER_NAME) --region $(AWS_REGION)

k8s-deploy: ## Deploy to Kubernetes
	@echo "Deploying to Kubernetes..."
	export AWS_ACCOUNT_ID=$(AWS_ACCOUNT_ID) && \
	export AWS_REGION=$(AWS_REGION) && \
	export IMAGE_TAG=$(IMAGE_TAG) && \
	find k8s/ -type f -name "*.yaml" -exec sed -i.bak \
		-e "s|\$${AWS_ACCOUNT_ID}|$$AWS_ACCOUNT_ID|g" \
		-e "s|\$${AWS_REGION}|$$AWS_REGION|g" \
		-e "s|\$${IMAGE_TAG}|$$IMAGE_TAG|g" {} + && \
	kubectl apply -f k8s/ && \
	echo "Waiting for deployments..." && \
	kubectl rollout status deployment/webservice -n ev-charging --timeout=5m && \
	kubectl rollout status deployment/web-app -n ev-charging --timeout=5m && \
	echo "Getting Load Balancer URL..." && \
	sleep 30 && \
	LB_URL=$$(kubectl get ingress ev-charging-ingress -n ev-charging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}') && \
	echo "Application URL: http://$$LB_URL"

k8s-status: ## Check Kubernetes deployment status
	kubectl get all -n ev-charging
	kubectl get ingress -n ev-charging

k8s-url: ## Get application URLs
	@./scripts/get-urls.sh

k8s-logs-api: ## View API logs
	kubectl logs -f -n ev-charging -l app=webservice --tail=100

k8s-logs-web: ## View Web App logs
	kubectl logs -f -n ev-charging -l app=web-app --tail=100

k8s-restart-api: ## Restart API deployment
	kubectl rollout restart deployment/webservice -n ev-charging

k8s-restart-web: ## Restart Web App deployment
	kubectl rollout restart deployment/web-app -n ev-charging

k8s-scale-api: ## Scale API deployment (REPLICAS=3)
	kubectl scale deployment/webservice -n ev-charging --replicas=$(REPLICAS)

k8s-rollback-api: ## Rollback API deployment
	kubectl rollout undo deployment/webservice -n ev-charging

## Monitoring
monitoring-grafana: ## Port forward Grafana
	kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

monitoring-prometheus: ## Port forward Prometheus
	kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

monitoring-password: ## Get Grafana admin password
	@kubectl get secret -n monitoring prometheus-grafana \
		-o jsonpath="{.data.admin-password}" | base64 --decode && echo

## Testing
test-web: ## Run Web Application tests
	cd Web-Application && npm test

test-api: ## Run API tests
	cd WebService && dotnet test

lint-web: ## Lint Web Application
	cd Web-Application && npm run lint

## Database
db-backup: ## Create DocumentDB backup
	aws docdb create-db-cluster-snapshot \
		--db-cluster-identifier ev-charging-docdb \
		--db-cluster-snapshot-identifier ev-charging-backup-$(shell date +%Y%m%d-%H%M%S)

db-list-backups: ## List DocumentDB backups
	aws docdb describe-db-cluster-snapshots \
		--db-cluster-identifier ev-charging-docdb

## Utilities
clean: ## Clean build artifacts
	rm -rf Web-Application/dist
	rm -rf Web-Application/node_modules
	rm -rf WebService/bin
	rm -rf WebService/obj
	find k8s/ -name "*.yaml.bak" -delete

install-tools: ## Install required tools
	@echo "Installing required tools..."
	@command -v aws >/dev/null 2>&1 || { echo "Installing AWS CLI..."; curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg" && sudo installer -pkg AWSCLIV2.pkg -target /; }
	@command -v terraform >/dev/null 2>&1 || { echo "Installing Terraform..."; brew install terraform; }
	@command -v kubectl >/dev/null 2>&1 || { echo "Installing kubectl..."; brew install kubectl; }
	@command -v docker >/dev/null 2>&1 || { echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"; }
	@echo "All tools installed!"

validate: ## Validate configurations
	@echo "Validating Terraform..."
	cd terraform && terraform fmt -check -recursive && terraform validate
	@echo "Validating Kubernetes manifests..."
	find k8s/ -name "*.yaml" -exec kubectl apply --dry-run=client -f {} \;
	@echo "All validations passed!"
