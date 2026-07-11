# ──────────────────────────────────────────────
# Existing Infrastructure (imported, NOT deleted)
# ──────────────────────────────────────────────

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "ticketflow-vpc"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Public subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "ticketflow-public-subnet"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Private subnet
resource "aws_subnet" "private" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = false

  tags = {
    Name        = "ticketflow-private-subnet"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Second private subnet in us-east-1b (required by RDS for DB subnet group)
resource "aws_subnet" "private_secondary" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.3.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = false

  tags = {
    Name        = "ticketflow-private-subnet-1b"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "ticketflow-igw"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "ticketflow-public-rt"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Route table association — public subnet (NOT needed — already imported with route table)


# ──────────────────────────────────────────────
# Security Groups
# ──────────────────────────────────────────────

# EC2 security group
resource "aws_security_group" "ec2" {
  name        = "ticketflow-ec2-sg"
  description = "Security group for TicketFlow EC2 instance"
  vpc_id      = aws_vpc.main.id

  # SSH from your IP
  ingress {
    description = "SSH from home IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # Frontend from ALB
  ingress {
    description = "Frontend from ALB"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Backend from ALB
  ingress {
    description = "Backend from ALB"
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Direct frontend access from your IP (for testing)
  ingress {
    description = "Frontend direct from home IP"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # Direct backend access from your IP (for testing)
  ingress {
    description = "Backend direct from home IP"
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "ticketflow-ec2-sg"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# RDS security group
resource "aws_security_group" "rds" {
  name        = "ticketflow-rds-sg"
  description = "Security group for TicketFlow RDS MySQL"
  vpc_id      = aws_vpc.main.id

  # MySQL from EC2 security group only
  ingress {
    description     = "MySQL from EC2"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "ticketflow-rds-sg"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# ALB security group
resource "aws_security_group" "alb" {
  name        = "ticketflow-alb-sg"
  description = "Security group for TicketFlow ALB"
  vpc_id      = aws_vpc.main.id

  # HTTP from anywhere
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "ticketflow-alb-sg"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}


# ──────────────────────────────────────────────
# RDS MySQL (NEW — created by Terraform)
# ──────────────────────────────────────────────

# DB subnet group (needs 2 AZs minimum)
resource "aws_db_subnet_group" "main" {
  name        = "ticketflow-db-subnet-group"
  description = "DB subnet group for TicketFlow RDS"
  subnet_ids  = [aws_subnet.private.id, aws_subnet.private_secondary.id]

  tags = {
    Name        = "ticketflow-db-subnet-group"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# RDS instance
resource "aws_db_instance" "main" {
  identifier     = "ticketflow-db"
  engine         = "mysql"
  engine_version = "8.0.42"
  instance_class = "db.t3.micro"

  db_name  = var.db_name
  username = var.db_master_username
  password = var.db_master_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false

  allocated_storage     = 20
  storage_type          = "gp2"
  storage_encrypted     = false

  skip_final_snapshot     = true
  final_snapshot_identifier = null

  multi_az               = false
  backup_retention_period = 0
  deletion_protection    = false

  tags = {
    Name        = "ticketflow-db"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}


# ──────────────────────────────────────────────
# EC2 Instance (NEW — created by Terraform)
# ──────────────────────────────────────────────

# Pick the AMI: use pre-built Packer AMI if ami_id is set, otherwise fall back to stock Ubuntu
locals {
  ec2_ami_id = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  user_data_template = var.ami_id != "" ? "user-data-ami.sh" : "user-data.sh"
}

# IAM role for EC2 (optional SSM access)
resource "aws_iam_role" "ec2" {
  name = "ticketflow-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "ticketflow-ec2-role"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

resource "aws_iam_instance_profile" "ec2" {
  name = "ticketflow-ec2-instance-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# EC2 instance — uses pre-built Packer AMI when var.ami_id is set
resource "aws_instance" "app" {
  ami                    = local.ec2_ami_id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = var.ssh_key_name

  iam_instance_profile = aws_iam_instance_profile.ec2.name
  user_data_replace_on_change = true

  # NOTE: Using .address (not .endpoint) to avoid port in hostname
  user_data_base64 = base64encode(templatefile("${path.module}/${local.user_data_template}", {
    rds_host        = aws_db_instance.main.address
    rds_port        = aws_db_instance.main.port
    db_user         = var.db_master_username
    db_password     = var.db_master_password
    db_name         = var.db_name
    admin_username  = var.admin_username
    admin_password  = var.admin_password
    repo_url        = var.github_repo_url
  }))

  root_block_device {
    volume_size = 20
    volume_type = "gp2"
  }

  tags = {
    Name        = "ticketflow-app"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }

  depends_on = [aws_db_instance.main]
}

# Ubuntu 22.04 AMI lookup
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}


# ──────────────────────────────────────────────
# Application Load Balancer (NEW — created by Terraform)
# ──────────────────────────────────────────────

# Second public subnet for ALB (multi-AZ requirement)
resource "aws_subnet" "public_secondary" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.4.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name        = "ticketflow-public-subnet-1b"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Route table association for second public subnet
resource "aws_route_table_association" "public_secondary" {
  subnet_id      = aws_subnet.public_secondary.id
  route_table_id = aws_route_table.public.id
}

# ALB
resource "aws_lb" "main" {
  name               = "ticketflow-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public.id, aws_subnet.public_secondary.id]

  enable_deletion_protection = false

  tags = {
    Name        = "ticketflow-alb"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Target group — pointing at frontend on port 3000
resource "aws_lb_target_group" "app" {
  name     = "ticketflow-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200"
  }

  tags = {
    Name        = "ticketflow-tg"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Target group attachment
resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app.id
  port             = 3000
}

# ALB listener on port 80
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
