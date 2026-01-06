#!/bin/bash
# Demo Setup Script for Disaster Relief System
# This script sets up everything needed for a hackathon demo

echo "🌍 Disaster Relief System - Demo Setup"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check Python
if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python not found. Please install Python 3.10+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Install blockchain dependencies
echo -e "\n${YELLOW}Installing blockchain dependencies...${NC}"
cd blockchain
npm install
echo -e "${GREEN}✓ Blockchain dependencies installed${NC}"

# Compile smart contracts
echo -e "\n${YELLOW}Compiling smart contracts...${NC}"
npx hardhat compile
echo -e "${GREEN}✓ Smart contracts compiled${NC}"

# Install frontend dependencies
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
cd ../frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Install backend dependencies
echo -e "\n${YELLOW}Installing backend dependencies...${NC}"
cd ../backend
python -m venv venv 2>/dev/null || python3 -m venv venv
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate
pip install -r requirements.txt
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Create sample .env files if they don't exist
echo -e "\n${YELLOW}Creating sample environment files...${NC}"

cd ../blockchain
if [ ! -f .env ]; then
    cat > .env << EOF
# Get a Sepolia RPC URL from Infura or Alchemy
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Your deployer wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# For contract verification on Etherscan
ETHERSCAN_API_KEY=your_etherscan_api_key
EOF
    echo -e "${GREEN}✓ Created blockchain/.env${NC}"
fi

cd ../frontend
if [ ! -f .env ]; then
    cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
VITE_API_URL=http://localhost:8000/api

# Smart Contract Addresses (after deployment)
VITE_RELIEF_TOKEN_ADDRESS=
VITE_SPENDING_CONTROLLER_ADDRESS=
VITE_CAMPAIGN_MANAGER_ADDRESS=
EOF
    echo -e "${GREEN}✓ Created frontend/.env${NC}"
fi

cd ../backend
if [ ! -f .env ]; then
    cat > .env << EOF
DEBUG=True
SECRET_KEY=your-secret-key-for-development-only

# Database (using Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Ethereum
WEB3_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
RELIEF_TOKEN_ADDRESS=
SPENDING_CONTROLLER_ADDRESS=
CAMPAIGN_MANAGER_ADDRESS=
DEPLOYER_PRIVATE_KEY=
EOF
    echo -e "${GREEN}✓ Created backend/.env${NC}"
fi

cd ..

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Demo setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update .env files with your actual keys"
echo "2. Set up Supabase project and run migrations"
echo "3. Deploy smart contracts: cd blockchain && npx hardhat run scripts/deploy.js --network sepolia"
echo "4. Start backend: cd backend && python manage.py runserver"
echo "5. Start frontend: cd frontend && npm run dev"
echo ""
echo -e "${YELLOW}For the hackathon demo:${NC}"
echo "- Use Sepolia testnet (get test ETH from sepoliafaucet.com)"
echo "- MetaMask should be connected to Sepolia"
echo "- Demo accounts are created with Google OAuth"
echo ""
echo -e "📖 See README.md for detailed documentation"
