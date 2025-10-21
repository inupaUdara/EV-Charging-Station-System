output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "ecr_webservice_repository_url" {
  description = "ECR repository URL for webservice"
  value       = aws_ecr_repository.webservice.repository_url
}

output "ecr_web_app_repository_url" {
  description = "ECR repository URL for web-app"
  value       = aws_ecr_repository.web_app.repository_url
}

# MongoDB Atlas connection - configured externally
output "mongodb_note" {
  description = "MongoDB Atlas configuration note"
  value       = "Using MongoDB Atlas - connection string configured via Kubernetes secret"
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}
