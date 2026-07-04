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
echo -e "${BLUE}       Wayfinder VM Deployment Script             ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Check for deploy.env file
ENV_FILE="./deploy.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: deploy.env configuration file not found!${NC}"
    echo -e "Please copy ${YELLOW}deploy.env.example${NC} to ${YELLOW}deploy.env${NC} and fill in your VM details."
    exit 1
fi

# Load variables from deploy.env
# Suppress comments and empty lines
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

echo -e "${GREEN}✓ Local environment configuration loaded.${NC}"
echo -e "Target VM:   ${BLUE}$VM_USER@$VM_HOST${NC}"
echo -e "Target Dir:  ${BLUE}$VM_TARGET_DIR${NC}"
echo -e "SSH Key:     ${BLUE}$VM_KEY_PATH${NC}"
echo -e "Ports:       Backend: ${BLUE}$BACKEND_PORT${NC} | Frontend: ${BLUE}$FRONTEND_PORT${NC}"

# Helper function to run SSH commands on the VM
ssh_cmd() {
    ssh -i "$VM_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VM_USER@$VM_HOST" "$@"
}

echo -e "\n${YELLOW}Step 1: Testing SSH connection and checking system dependencies...${NC}"
if ! ssh_cmd "echo 'SSH Connection Successful!'" > /dev/null; then
    echo -e "${RED}Error: Failed to connect to $VM_HOST using username $VM_USER and key $VM_KEY_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection verified.${NC}"

# Check and install Bun if not installed
echo -e "Checking Bun installation..."
if ! ssh_cmd "command -v bun" > /dev/null 2>&1; then
    echo -e "${YELLOW}Bun is not installed on VM. Installing Bun...${NC}"
    ssh_cmd "curl -fsSL https://bun.sh/install | bash"
    # Make sure bun path is added to PATH on the server
    # Bun installation path defaults to ~/.bun/bin/bun
    ssh_cmd "sudo ln -sf \$HOME/.bun/bin/bun /usr/local/bin/bun"
else
    echo -e "${GREEN}✓ Bun is already installed on VM.${NC}"
fi

# Check Node.js and NPM (often needed for global installs or packages)
echo -e "Checking Node/NPM installation..."
if ! ssh_cmd "command -v node" > /dev/null 2>&1; then
    echo -e "${YELLOW}Node.js is not installed on VM. Installing Node.js (Active LTS)...${NC}"
    ssh_cmd "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
else
    echo -e "${GREEN}✓ Node.js is already installed on VM.${NC}"
fi

# Check and install PM2 if not installed
echo -e "Checking PM2 installation..."
if ! ssh_cmd "command -v pm2" > /dev/null 2>&1; then
    echo -e "${YELLOW}PM2 is not installed on VM. Installing PM2...${NC}"
    ssh_cmd "sudo npm install -g pm2"
else
    echo -e "${GREEN}✓ PM2 is already installed on VM.${NC}"
fi

# Check and install Nginx if not installed
echo -e "Checking Nginx installation..."
if ! ssh_cmd "command -v nginx" > /dev/null 2>&1; then
    echo -e "${YELLOW}Nginx is not installed on VM. Installing Nginx...${NC}"
    ssh_cmd "sudo apt-get update && sudo apt-get install -y nginx"
else
    echo -e "${GREEN}✓ Nginx is already installed on VM.${NC}"
fi

# Step 2: Create target directory on VM
echo -e "\n${YELLOW}Step 2: Preparing remote directory...${NC}"
ssh_cmd "sudo mkdir -p $VM_TARGET_DIR && sudo chown -R \$USER:\$USER $VM_TARGET_DIR"
echo -e "${GREEN}✓ Remote directory structure ready.${NC}"

# Step 3: Copying code to VM via rsync
echo -e "\n${YELLOW}Step 3: Synchronizing local files to VM...${NC}"
rsync -avz -e "ssh -i $VM_KEY_PATH -o StrictHostKeyChecking=no" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.output' \
    --exclude='.lovable' \
    --exclude='.wrangler' \
    --exclude='deploy.env' \
    --exclude='prompt-war-2-backend/.env' \
    --exclude='prompt-war-2-frontend/.env' \
    --exclude='prompt-war-2-frontend/dist' \
    ./ "$VM_USER@$VM_HOST:$VM_TARGET_DIR/"

echo -e "${GREEN}✓ File synchronization complete.${NC}"

# Step 4: Write Environment configuration on the VM
echo -e "\n${YELLOW}Step 4: Setting up backend environment variables...${NC}"
BACKEND_ENV_CONTENT="PORT=$BACKEND_PORT
AOAI_ENDPOINT=$AOAI_ENDPOINT
API_KEY=$API_KEY
DEPLOYMENT_NAME=$DEPLOYMENT_NAME
API_VERSION=$API_VERSION"

# Write backend .env on VM
ssh_cmd "cat << 'EOF' > $VM_TARGET_DIR/prompt-war-2-backend/.env
$BACKEND_ENV_CONTENT
EOF"
echo -e "${GREEN}✓ Backend environment configuration written.${NC}"

# Step 5: Install remote dependencies and build projects
echo -e "\n${YELLOW}Step 5: Installing dependencies and building projects on the VM...${NC}"
echo "Installing backend dependencies..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-backend && bun install"

echo "Installing frontend dependencies..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-frontend && bun install"

echo "Building frontend with Node Server preset..."
# We pass VITE_API_URL="" to ensure relative API fetches are made in production
# NITRO_PRESET=node-server compiles to a standard standalone Node/Bun web server
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-frontend && NITRO_PRESET=node-server VITE_API_URL=\"\" bun run build"
echo -e "${GREEN}✓ Dependencies installed and projects built.${NC}"

# Step 6: Start/Restart applications using PM2
echo -e "\n${YELLOW}Step 6: Managing processes with PM2...${NC}"

# Stop existing processes if they run to prevent port locks
ssh_cmd "pm2 delete prompt-wars-backend prompt-wars-frontend > /dev/null 2>&1 || true"

# Start backend hono service
echo "Starting backend service..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-backend && pm2 start \"bun src/index.ts\" --name \"prompt-wars-backend\""

# Start frontend TanStack Start service
echo "Starting frontend service..."
ssh_cmd "cd $VM_TARGET_DIR/prompt-war-2-frontend && PORT=$FRONTEND_PORT pm2 start \"bun .output/server/index.mjs\" --name \"prompt-wars-frontend\""

# Save PM2 state so they restart on system reboot
ssh_cmd "pm2 save"
echo -e "${GREEN}✓ Applications started successfully via PM2.${NC}"

# Step 7: Configure Nginx Reverse Proxy
echo -e "\n${YELLOW}Step 7: Configuring Nginx Reverse Proxy...${NC}"

# Check for local nginx configuration template
NGINX_TEMPLATE="./nginx.conf.template"
if [ -f "$NGINX_TEMPLATE" ]; then
    echo "Creating remote Nginx site configuration..."
    # Local replacement of template placeholders
    LOCAL_NGINX_CONF="/tmp/prompt-wars-nginx.conf"
    cp "$NGINX_TEMPLATE" "$LOCAL_NGINX_CONF"
    
    # Use sed to replace placeholder values
    # Handle domain or fall back to VM host IP
    sed -i.bak "s/__VM_HOST__/$VM_HOST/g" "$LOCAL_NGINX_CONF"
    sed -i.bak "s/__BACKEND_PORT__/$BACKEND_PORT/g" "$LOCAL_NGINX_CONF"
    sed -i.bak "s/__FRONTEND_PORT__/$FRONTEND_PORT/g" "$LOCAL_NGINX_CONF"
    rm -f "${LOCAL_NGINX_CONF}.bak"
    
    # Upload configurations to the VM
    scp -i "$VM_KEY_PATH" -o StrictHostKeyChecking=no "$LOCAL_NGINX_CONF" "$VM_USER@$VM_HOST:/tmp/prompt-wars"
    rm -f "$LOCAL_NGINX_CONF"
    
    # Install Nginx file and create symlinks on the remote VM
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
