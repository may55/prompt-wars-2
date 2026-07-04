#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Color definitions for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}    Wayfinder VM Deployment Script (Git-Based)    ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Check for deploy.env file
ENV_FILE="./deploy.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: deploy.env configuration file not found!${NC}"
    echo -e "Please copy ${YELLOW}deploy.env.example${NC} to ${YELLOW}deploy.env${NC} and fill in your VM details."
    exit 1
fi

# Load variables from deploy.env
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Validate connection parameters
if [ -z "$VM_HOST" ] || [ -z "$VM_USER" ] || [ -z "$VM_KEY_PATH" ] || [ -z "$VM_TARGET_DIR" ]; then
    echo -e "${RED}Error: Connection parameters are missing in deploy.env!${NC}"
    exit 1
fi

# Expand path variables (e.g. ~ to actual home directory path)
VM_KEY_PATH="${VM_KEY_PATH/#\~/$HOME}"

if [ ! -f "$VM_KEY_PATH" ]; then
    echo -e "${RED}Error: Private key file not found at path: $VM_KEY_PATH${NC}"
    exit 1
fi

# Set default ports if not defined
BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}
GIT_REPO="https://github.com/may55/prompt-wars-2.git"

echo -e "${GREEN}✓ Local environment configuration loaded.${NC}"
echo -e "Target VM:   ${BLUE}$VM_USER@$VM_HOST${NC}"
echo -e "Target Dir:  ${BLUE}$VM_TARGET_DIR${NC}"
echo -e "Git Repo:    ${BLUE}$GIT_REPO${NC}"
echo -e "Ports:       Backend: ${BLUE}$BACKEND_PORT${NC} | Frontend: ${BLUE}$FRONTEND_PORT${NC}"

# Helper function to run SSH commands on the VM
ssh_cmd() {
    ssh -i "$VM_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=15 \
        -o ServerAliveInterval=15 \
        -o ServerAliveCountMax=4 \
        -o IPQoS=0 \
        -o TCPKeepAlive=yes \
        "$VM_USER@$VM_HOST" "$@"
}

# ==================================================
# Step 1: Push Local Changes to GitHub
# ==================================================
echo -e "\n${YELLOW}Step 1: Pushing local changes to GitHub...${NC}"
if git status --porcelain | grep -q '^[MADRCU]'; then
    echo -e "${YELLOW}Warning: You have uncommitted local changes. Committing and pushing now...${NC}"
    git add .
    git commit -m "auto-deploy: sync changes before deployment" || true
fi

echo "Pushing main branch to origin..."
git push origin main
echo -e "${GREEN}✓ GitHub repository updated.${NC}"

# ==================================================
# Step 2: Verify SSH Connection & VM Dependencies
# ==================================================
echo -e "\n${YELLOW}Step 2: Testing SSH connection and checking VM dependencies...${NC}"
if ! ssh_cmd "echo 'SSH Connection Successful!'" > /dev/null; then
    echo -e "${RED}Error: Failed to connect to $VM_HOST using username $VM_USER and key $VM_KEY_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection verified.${NC}"

# Ensure system package manager utilities (git, unzip, rsync) are installed on the VM
echo "Ensuring git and system dependencies are installed on VM..."
ssh_cmd "sudo apt-get update && sudo apt-get install -y git unzip curl build-essential rsync"

# Check and install Bun if not installed on the VM
echo -e "Checking Bun installation on VM..."
if ! ssh_cmd "command -v bun" > /dev/null 2>&1; then
    echo -e "${YELLOW}Bun is not installed on VM. Installing Bun...${NC}"
    ssh_cmd "curl -fsSL https://bun.sh/install | bash"
    ssh_cmd "sudo ln -sf \$HOME/.bun/bin/bun /usr/local/bin/bun"
else
    echo -e "${GREEN}✓ Bun is already installed on VM.${NC}"
fi

# Check and install PM2 if not installed on VM
echo -e "Checking PM2 installation on VM..."
if ! ssh_cmd "command -v pm2" > /dev/null 2>&1; then
    echo -e "${YELLOW}PM2 is not installed on VM. Installing PM2...${NC}"
    if ! ssh_cmd "command -v node" > /dev/null 2>&1; then
        ssh_cmd "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    fi
    ssh_cmd "sudo npm install -g pm2"
else
    echo -e "${GREEN}✓ PM2 is already installed on VM.${NC}"
fi

# Check and install Nginx if not installed on VM
echo -e "Checking Nginx installation on VM..."
if ! ssh_cmd "command -v nginx" > /dev/null 2>&1; then
    echo -e "${YELLOW}Nginx is not installed on VM. Installing Nginx...${NC}"
    ssh_cmd "sudo apt-get install -y nginx"
else
    echo -e "${GREEN}✓ Nginx is already installed on VM.${NC}"
fi

# ==================================================
# Step 3: Clone or Pull Codebase on the VM
# ==================================================
echo -e "\n${YELLOW}Step 3: Synchronizing codebase on the VM from GitHub...${NC}"
ssh_cmd "sudo mkdir -p $VM_TARGET_DIR && sudo chown -R \$USER:\$USER $VM_TARGET_DIR"

if ssh_cmd "[ ! -d \"$VM_TARGET_DIR/.git\" ]"; then
    echo "Cloning repository from GitHub on VM..."
    ssh_cmd "sudo rm -rf $VM_TARGET_DIR && sudo mkdir -p $VM_TARGET_DIR && sudo chown -R \$USER:\$USER $VM_TARGET_DIR"
    ssh_cmd "git clone $GIT_REPO $VM_TARGET_DIR"
else
    echo "Pulling latest changes from GitHub on VM..."
    ssh_cmd "cd $VM_TARGET_DIR && git fetch origin && git reset --hard origin/main"
fi
echo -e "${GREEN}✓ Codebase synchronized on VM.${NC}"

# ==================================================
# Step 4: Install Dependencies & Build on the VM
# ==================================================
echo -e "\n${YELLOW}Step 4: Installing dependencies and building projects on the VM...${NC}"

echo "Building backend..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-backend && bun install && bun build src/index.ts --outfile dist/index.js --target bun"
echo -e "${GREEN}✓ Backend successfully compiled on VM.${NC}"

echo "Building frontend..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-frontend && bun install && NITRO_PRESET=node-server VITE_API_URL=\"\" bun run build"
echo -e "${GREEN}✓ Frontend successfully compiled on VM.${NC}"

# ==================================================
# Step 5: Write Environment configurations
# ==================================================
echo -e "\n${YELLOW}Step 5: Writing environment configuration...${NC}"
BACKEND_ENV_CONTENT="PORT=$BACKEND_PORT
AOAI_ENDPOINT=$AOAI_ENDPOINT
API_KEY=$API_KEY
DEPLOYMENT_NAME=$DEPLOYMENT_NAME
API_VERSION=$API_VERSION"

ssh_cmd "cat << 'EOF' > $VM_TARGET_DIR/prompt-war-2-backend/.env
$BACKEND_ENV_CONTENT
EOF"
echo -e "${GREEN}✓ Backend environment configuration written.${NC}"

# ==================================================
# Step 6: Start/Restart Services with PM2
# ==================================================
echo -e "\n${YELLOW}Step 6: Starting services via PM2 on the VM...${NC}"

# Clean existing PM2 instances
ssh_cmd "pm2 delete prompt-wars-backend prompt-wars-frontend > /dev/null 2>&1 || true"

# Start Hono Backend
echo "Starting backend process..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-backend && pm2 start \"bun dist/index.js\" --name \"prompt-wars-backend\""

# Start TanStack Start Frontend
echo "Starting frontend process..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-frontend && PORT=$FRONTEND_PORT pm2 start \"bun .output/server/index.mjs\" --name \"prompt-wars-frontend\""

ssh_cmd "pm2 save"
echo -e "${GREEN}✓ PM2 services started.${NC}"

# ==================================================
# Step 7: Configure Nginx Proxy
# ==================================================
echo -e "\n${YELLOW}Step 7: Configuring Nginx Reverse Proxy...${NC}"

NGINX_TEMPLATE="./nginx.conf.template"
if [ -f "$NGINX_TEMPLATE" ]; then
    LOCAL_NGINX_CONF="/tmp/prompt-wars-nginx.conf"
    cp "$NGINX_TEMPLATE" "$LOCAL_NGINX_CONF"
    
    sed -i.bak "s/__VM_HOST__/$VM_HOST/g" "$LOCAL_NGINX_CONF"
    sed -i.bak "s/__BACKEND_PORT__/$BACKEND_PORT/g" "$LOCAL_NGINX_CONF"
    sed -i.bak "s/__FRONTEND_PORT__/$FRONTEND_PORT/g" "$LOCAL_NGINX_CONF"
    rm -f "${LOCAL_NGINX_CONF}.bak"
    
    # Upload thin configuration file
    scp -i "$VM_KEY_PATH" -o StrictHostKeyChecking=no -o IPQoS=0 "$LOCAL_NGINX_CONF" "$VM_USER@$VM_HOST:/tmp/prompt-wars"
    rm -f "$LOCAL_NGINX_CONF"
    
    ssh_cmd "sudo mv /tmp/prompt-wars /etc/nginx/sites-available/prompt-wars && \
             sudo ln -sf /etc/nginx/sites-available/prompt-wars /etc/nginx/sites-enabled/prompt-wars && \
             sudo rm -f /etc/nginx/sites-enabled/default && \
             sudo nginx -t && \
             sudo systemctl reload nginx"
             
    echo -e "${GREEN}✓ Nginx reverse proxy configured and reloaded.${NC}"
else
    echo -e "${YELLOW}Warning: nginx.conf.template not found. Skipping auto Nginx config.${NC}"
fi

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${GREEN}            DEPLOYMENT COMPLETE SUCCESS!           ${NC}"
echo -e "Backend is running on port:  ${BLUE}$BACKEND_PORT${NC}"
echo -e "Frontend is running on port: ${BLUE}$FRONTEND_PORT${NC}"
echo -e "You can access your website at: ${GREEN}http://$VM_HOST/${NC}"
echo -e "${BLUE}==================================================${NC}"
