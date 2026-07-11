output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "Private subnet ID"
  value       = aws_subnet.private.id
}

output "ec2_sg_id" {
  description = "EC2 security group ID"
  value       = aws_security_group.ec2.id
}

output "rds_sg_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "ec2_public_ip" {
  description = "EC2 instance public IP"
  value       = aws_instance.app.public_ip
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "Application URL (via ALB)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ec2_ami_id" {
  description = "AMI ID used by the EC2 instance"
  value       = aws_instance.app.ami
}

output "direct_app_url" {
  description = "Direct EC2 URL (for testing before ALB DNS propagates)"
  value       = "http://${aws_instance.app.public_ip}:3000"
}
