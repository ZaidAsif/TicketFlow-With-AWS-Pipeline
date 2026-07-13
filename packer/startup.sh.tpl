#!/bin/bash
# TicketFlow startup script — runs on EC2 boot via user-data or systemd
set -e

# Get EC2 metadata
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
EC2_PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)

# ──────────────────────────────────────────────
# Backend
# ──────────────────────────────────────────────
cd /home/ubuntu/ticketflow/backend

cat > .env << EOF
DB_HOST=${db_host}
DB_PORT=3306
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

# Run migrations
npm run migrate || npx ts-node migrations/run.ts 2>/dev/null || echo "Migrations already run"
npm run seed || npx ts-node seed/run.ts 2>/dev/null || echo "Seed already run"

# Start backend
pm2 delete ticketflow-backend 2>/dev/null || true
pm2 start npm --name ticketflow-backend -- run dev

# ──────────────────────────────────────────────
# Frontend
# ──────────────────────────────────────────────
cd /home/ubuntu/ticketflow/frontend

cat > .env.local << EOF
# Use relative API paths — ALB routes /api/* to the backend in production
NEXT_PUBLIC_API_URL=
EOF

# Start frontend (already built during AMI creation)
pm2 delete ticketflow-frontend 2>/dev/null || true
pm2 start npm --name ticketflow-frontend -- run start

# Save PM2 config
pm2 save
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo "TicketFlow started!"
echo "Frontend: http://$EC2_PUBLIC_IP:3000"
echo "Backend:  http://$EC2_PUBLIC_IP:4000"
