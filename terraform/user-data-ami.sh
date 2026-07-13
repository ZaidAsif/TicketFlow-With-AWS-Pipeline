#!/bin/bash
# ──────────────────────────────────────────────
# TicketFlow EC2 Bootstrap — Pre-baked AMI variant
# ──────────────────────────────────────────────
# This runs on a Packer-built AMI that already has:
#   - Node.js 18, PM2, git installed
#   - Repo cloned to /home/ubuntu/ticketflow
#   - Backend + frontend node_modules installed
#   - Frontend already built (npm run build)
#
# All we do here: create .env files, wait for RDS,
# run migrations, and start PM2 processes.
set -e

EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# ──────────────────────────────────────────────
# Backend .env
# ──────────────────────────────────────────────
echo ">>> Setting up backend .env..."
cd /home/ubuntu/ticketflow/backend

cat > .env << EOF
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

# ──────────────────────────────────────────────
# Wait for RDS
# ──────────────────────────────────────────────
echo "Waiting for RDS at ${rds_host}:${rds_port}..."
apt-get install -y netcat-openbsd 2>/dev/null || true
for i in $(seq 1 30); do
  if nc -z ${rds_host} ${rds_port} 2>/dev/null; then
    echo "RDS is ready! (attempt $i)"
    break
  fi
  echo "RDS not ready yet... (attempt $i/30)"
  sleep 10
done

# ──────────────────────────────────────────────
# Migrations
# ──────────────────────────────────────────────
echo ">>> Running migrations..."
for i in $(seq 1 5); do
  if cd /home/ubuntu/ticketflow/backend && npm run migrate 2>/dev/null || npx ts-node migrations/run.ts; then
    echo "Migrations successful!"
    break
  fi
  echo "Migration attempt $i failed, retrying in 10s..."
  sleep 10
done

# ──────────────────────────────────────────────
# Seed
# ──────────────────────────────────────────────
echo ">>> Running seed..."
for i in $(seq 1 5); do
  if cd /home/ubuntu/ticketflow/backend && npm run seed 2>/dev/null || npx ts-node seed/run.ts; then
    echo "Seed successful!"
    break
  fi
  echo "Seed attempt $i failed, retrying in 10s..."
  sleep 10
done

# ──────────────────────────────────────────────
# Frontend .env.local
# ──────────────────────────────────────────────
echo ">>> Setting up frontend .env.local..."
cd /home/ubuntu/ticketflow/frontend
cat > .env.local << EOF
# Use relative API paths — ALB routes /api/* to the backend in production
# For local dev, Next.js rewrites proxy /api/* to localhost:4000
NEXT_PUBLIC_API_URL=
EOF

# ──────────────────────────────────────────────
# Start backend + frontend with PM2
# ──────────────────────────────────────────────
echo ">>> Starting backend..."
cd /home/ubuntu/ticketflow/backend
pm2 delete ticketflow-backend 2>/dev/null || true
pm2 start npm --name ticketflow-backend -- run dev

echo ">>> Starting frontend..."
cd /home/ubuntu/ticketflow/frontend
pm2 delete ticketflow-frontend 2>/dev/null || true
pm2 start npm --name ticketflow-frontend -- run start

# ──────────────────────────────────────────────
# PM2 auto-start on boot
# ──────────────────────────────────────────────
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
pm2 save

echo "============================================"
echo "  TicketFlow deployment complete!"
echo "  Frontend: http://$EC2_PUBLIC_IP:3000"
echo "  Backend:  http://$EC2_PUBLIC_IP:4000"
echo "  Health:   http://$EC2_PUBLIC_IP:4000/health"
echo "============================================"
