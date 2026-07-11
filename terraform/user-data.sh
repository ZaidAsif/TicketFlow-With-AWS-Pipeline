#!/bin/bash
set -e

# ──────────────────────────────────────────────
# TicketFlow EC2 Bootstrap Script
# ──────────────────────────────────────────────

# Update system
apt-get update -y
apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git

# Install PM2 globally
npm install -g pm2

# Get EC2 public IP from metadata
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
EC2_PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)

# Clone the repository
cd /home/ubuntu
git clone ${repo_url} ticketflow 2>/dev/null || echo "Repo already cloned"
cd ticketflow

# ──────────────────────────────────────────────
# Backend setup
# ──────────────────────────────────────────────
echo ">>> Setting up backend..."
cd /home/ubuntu/ticketflow/backend

# Create .env file (unquoted EOF so shell expands $EC2_PUBLIC_IP)
cat > .env << EOF
# Database Configuration
DB_HOST=${rds_host}
DB_PORT=${rds_port}
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=${db_name}
PORT=4000
NODE_ENV=production
ADMIN_USERNAME=${admin_username}
ADMIN_PASSWORD=${admin_password}
CORS_ORIGIN=http://$EC2_PUBLIC_IP:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=50
EOF

# Install dependencies
npm install

# Install netcat for DB connection check
apt-get install -y netcat-openbsd 2>/dev/null || true

# Wait for RDS to be ready (retry up to 30 times, 10s apart)
echo "Waiting for RDS at ${rds_host}:${rds_port}..."
for i in $(seq 1 30); do
  if nc -z ${rds_host} ${rds_port} 2>/dev/null; then
    echo "RDS is ready! (attempt $i)"
    break
  fi
  echo "RDS not ready yet... (attempt $i/30)"
  sleep 10
done

# Run migrations (with retry just in case)
for i in $(seq 1 5); do
  if npm run migrate || npx ts-node migrations/run.ts; then
    echo "Migrations successful!"
    break
  fi
  echo "Migration attempt $i failed, retrying in 10s..."
  sleep 10
done

# Run seed (with retry just in case)
for i in $(seq 1 5); do
  if npm run seed || npx ts-node seed/run.ts; then
    echo "Seed successful!"
    break
  fi
  echo "Seed attempt $i failed, retrying in 10s..."
  sleep 10
done

# Start backend with PM2
pm2 delete ticketflow-backend 2>/dev/null || true
pm2 start npm --name ticketflow-backend -- run dev
pm2 save

# ──────────────────────────────────────────────
# Frontend setup
# ──────────────────────────────────────────────
echo ">>> Setting up frontend..."
cd /home/ubuntu/ticketflow/frontend

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$EC2_PUBLIC_IP:4000
EOF

# Install dependencies and build
npm install
npm run build

# Start frontend with PM2
pm2 delete ticketflow-frontend 2>/dev/null || true
pm2 start npm --name ticketflow-frontend -- run start
pm2 save

# ──────────────────────────────────────────────
# Configure PM2 to restart on boot
# ──────────────────────────────────────────────
pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

echo "============================================"
echo "  TicketFlow deployment complete!"
echo "  Frontend: http://$EC2_PUBLIC_IP:3000"
echo "  Backend:  http://$EC2_PUBLIC_IP:4000"
echo "  Health:   http://$EC2_PUBLIC_IP:4000/health"
echo "============================================"
