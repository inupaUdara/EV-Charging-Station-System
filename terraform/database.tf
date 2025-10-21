# Using MongoDB Atlas - No AWS DocumentDB needed
# This file is kept for reference but resources are commented out
# MongoDB Atlas is managed externally and accessed via connection string

# If you want to use AWS DocumentDB instead of MongoDB Atlas,
# uncomment the resources below and update variables.tf

/*
# DocumentDB (MongoDB-compatible) cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "${var.project_name}-docdb"
  engine                  = "docdb"
  master_username         = var.mongodb_username
  master_password         = var.mongodb_password
  backup_retention_period = 7
  preferred_backup_window = "03:00-05:00"
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-docdb-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb.id]

  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  storage_encrypted = true
  kms_key_id       = aws_kms_key.docdb.arn

  tags = {
    Name = "${var.project_name}-docdb"
  }
}

resource "aws_docdb_cluster_instance" "main" {
  count              = 2
  identifier         = "${var.project_name}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.mongodb_instance_class

  tags = {
    Name = "${var.project_name}-docdb-${count.index}"
  }
}

resource "aws_docdb_subnet_group" "main" {
  name       = "${var.project_name}-docdb-subnet-group"
  subnet_ids = module.vpc.database_subnets

  tags = {
    Name = "${var.project_name}-docdb-subnet-group"
  }
}

resource "aws_security_group" "docdb" {
  name        = "${var.project_name}-docdb-sg"
  description = "Security group for DocumentDB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "MongoDB from EKS"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-docdb-sg"
  }
}

resource "aws_kms_key" "docdb" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-docdb-kms"
  }
}

resource "aws_kms_alias" "docdb" {
  name          = "alias/${var.project_name}-docdb"
  target_key_id = aws_kms_key.docdb.key_id
}
*/

# MongoDB Atlas Configuration
# 1. Create cluster at https://cloud.mongodb.com
# 2. Get connection string
# 3. Add to GitHub Secrets as MONGODB_ATLAS_CONNECTION_STRING
# 4. Whitelist EKS NAT Gateway IPs in Atlas Network Access
