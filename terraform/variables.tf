variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ticketflow"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "db_master_username" {
  description = "RDS master username"
  type        = string
  default     = "admin"
}

variable "db_master_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "RDS initial database name"
  type        = string
  default     = "ticket_system"
}

variable "admin_username" {
  description = "Admin dashboard username"
  type        = string
  default     = "admin"
}

variable "admin_password" {
  description = "Admin dashboard password"
  type        = string
  sensitive   = true
  default     = "admin123"
}

variable "ssh_key_name" {
  description = "Name of the EC2 key pair to use for SSH access"
  type        = string
}

variable "github_repo_url" {
  description = "GitHub repository URL to clone on the EC2 instance"
  type        = string
  default     = "https://github.com/ZaidAsif/TicketFlow-With-AWS-Pipeline.git"
}

variable "ami_id" {
  description = "Pre-built Packer AMI ID. If empty, boots from stock Ubuntu 22.04 and runs full bootstrap."
  type        = string
  default     = ""
}

variable "my_ip" {
  description = "Your public IP for SSH and direct access (e.g. 125.209.102.118/32)"
  type        = string
  default     = "125.209.102.118/32"
}
