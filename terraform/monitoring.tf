# Prometheus Monitoring Stack
resource "helm_release" "prometheus" {
  name             = "prometheus"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "54.0.0"
  timeout          = 900  # 15 minutes
  wait             = true
  wait_for_jobs    = true

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          retention = "30d"
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }
          resources = {
            requests = {
              memory = "2Gi"
              cpu    = "1000m"
            }
            limits = {
              memory = "4Gi"
              cpu    = "2000m"
            }
          }
        }
      }
      grafana = {
        enabled = true
        adminPassword = "CHANGE_ME_IN_PRODUCTION"
        ingress = {
          enabled = false
        }
        persistence = {
          enabled = true
          storageClassName = "gp3"
          size = "10Gi"
        }
        service = {
          type = "LoadBalancer"
        }
      }
      alertmanager = {
        enabled = true
        alertmanagerSpec = {
          storage = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "10Gi"
                  }
                }
              }
            }
          }
        }
      }
    })
  ]

  depends_on = [module.eks]
}

# Loki for log aggregation
resource "helm_release" "loki" {
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "2.9.11"
  timeout          = 600  # 10 minutes
  wait             = true
  wait_for_jobs    = true

  values = [
    yamlencode({
      loki = {
        enabled = true
        persistence = {
          enabled = true
          storageClassName = "gp3"
          size = "50Gi"
        }
      }
      promtail = {
        enabled = true
      }
      grafana = {
        enabled = false # Using grafana from prometheus stack
      }
    })
  ]

  depends_on = [module.eks]
}

# CloudWatch Container Insights
resource "aws_iam_policy" "cloudwatch_container_insights" {
  name        = "${var.project_name}-cloudwatch-insights"
  description = "IAM policy for CloudWatch Container Insights"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "ec2:DescribeVolumes",
          "ec2:DescribeTags",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups",
          "logs:CreateLogStream",
          "logs:CreateLogGroup"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch_container_insights" {
  role       = module.eks.eks_managed_node_groups["general"].iam_role_name
  policy_arn = aws_iam_policy.cloudwatch_container_insights.arn
}
