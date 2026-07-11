packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "ami_name" {
  type    = string
  default = "ticketflow-ami"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "github_repo_url" {
  type    = string
}

variable "git_branch" {
  type    = string
  default = "main"
}

variable "db_host" {
  type    = string
}

variable "db_user" {
  type    = string
  default = "admin"
}

variable "db_password" {
  type    = string
  sensitive = true
}

variable "db_name" {
  type    = string
  default = "ticket_system"
}

variable "admin_username" {
  type    = string
  default = "admin"
}

variable "admin_password" {
  type    = string
  default = "admin123"
  sensitive = true
}

source "amazon-ebs" "ubuntu" {
  region        = var.aws_region
  source_ami    = "ami-0e86e20dae9224db8"  # Ubuntu 22.04 LTS us-east-1
  instance_type = "t3.micro"
  ssh_username  = "ubuntu"
  ami_name      = var.ami_name

  tags = {
    Name        = var.ami_name
    Project     = "TicketFlow"
    ManagedBy   = "Packer"
  }
}

build {
  name = "ticketflow-ami"
  sources = ["source.amazon-ebs.ubuntu"]

  # Install system dependencies
  provisioner "shell" {
    inline = [
      "sudo apt-get update -y",
      "sudo apt-get upgrade -y",
      "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -",
      "sudo apt-get install -y nodejs git unzip",
      "sudo npm install -g pm2",
      "node --version",
      "npm --version",
    ]
  }

  # Clone the repository
  provisioner "shell" {
    environment_vars = [
      "REPO_URL=${var.github_repo_url}",
      "BRANCH=${var.git_branch}",
    ]
    inline = [
      "cd /home/ubuntu",
      "git clone -b $BRANCH $REPO_URL ticketflow",
      "cd ticketflow",
      "git log --oneline -1",
    ]
  }

  # Install backend dependencies
  provisioner "shell" {
    inline = [
      "cd /home/ubuntu/ticketflow/backend",
      "npm ci",
    ]
  }

  # Install frontend dependencies and build
  provisioner "shell" {
    environment_vars = [
      "NEXT_PUBLIC_API_URL=http://localhost:4000",
    ]
    inline = [
      "cd /home/ubuntu/ticketflow/frontend",
      "npm ci",
      "npm run build",
    ]
  }

  # Create the startup script
  provisioner "file" {
    content = templatefile("${path.root}/startup.sh.tpl", {
      db_host         = var.db_host
      db_user         = var.db_user
      db_password     = var.db_password
      db_name         = var.db_name
      admin_username  = var.admin_username
      admin_password  = var.admin_password
    })
    destination = "/home/ubuntu/ticketflow/start-ticketflow.sh"
  }

  provisioner "shell" {
    inline = [
      "chmod +x /home/ubuntu/ticketflow/start-ticketflow.sh",
      "sudo mv /home/ubuntu/ticketflow/start-ticketflow.sh /usr/local/bin/start-ticketflow.sh",
    ]
  }

  post-processor "manifest" {
    output = "manifest.json"
  }
}
