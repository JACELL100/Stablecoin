# 🆘 Emergency & Disaster Relief Stablecoin System

A production-grade MVP for transparent, blockchain-based disaster relief fund distribution.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Django](https://img.shields.io/badge/Django-4.2-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-gray.svg)

## 🎯 Project Overview

This system enables:
- **Rapid, transparent distribution** of relief funds
- **Direct transfers** to verified beneficiaries
- **Controlled spending** based on categories (food, medicine, shelter)
- **Full public auditability** via blockchain
- **Real-world usability** for NGOs & governments

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Tailwind)                  │
├─────────────────────────────────────────────────────────────────┤
│  Landing │ Admin Dashboard │ Beneficiary │ Donor │ Audit View   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  BACKEND (Django REST Framework)                 │
├─────────────────────────────────────────────────────────────────┤
│  Auth │ Campaigns │ Beneficiaries │ Transactions │ ML Service   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌────────────────┐   ┌────────────────┐
│   Supabase    │   │   Blockchain   │   │  ML Service    │
│  PostgreSQL   │   │  (EVM/Sepolia) │   │ (HuggingFace)  │
│  + Google Auth│   │                │   │                │
└───────────────┘   └────────────────┘   └────────────────┘
```

## 📁 Project Structure

```
disaster-relief-system/
├── blockchain/              # Solidity smart contracts
│   ├── contracts/
│   ├── scripts/
│   └── test/
├── backend/                 # Django REST API
│   ├── core/               # Main Django app
│   ├── accounts/           # User management
│   ├── campaigns/          # Aid campaigns
│   ├── transactions/       # Transaction tracking
│   └── ml_service/         # Fraud detection
├── frontend/               # React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   └── public/
└── supabase/               # Database setup
    └── migrations/
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MetaMask wallet
- Supabase account

### 1. Clone & Setup Environment

```bash
cd disaster-relief-system

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp blockchain/.env.example blockchain/.env
```

### 2. Smart Contracts

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia
```

### 3. Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🎬 Demo Flow

1. **Admin creates** a disaster relief campaign
2. **Admin mints** stablecoins for the campaign
3. **Admin whitelists** verified beneficiaries
4. **Beneficiary receives** funds in their wallet
5. **Beneficiary spends** at approved merchants
6. **System blocks** unauthorized spending attempts
7. **Public dashboard** updates in real-time

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| Admin/NGO | Full access, mint tokens, manage campaigns |
| Donor | View campaigns, donate, track funds |
| Beneficiary | Receive funds, spend at merchants |
| Auditor | Read-only access to all data |

## 🪙 Smart Contracts

### ReliefStablecoin.sol
- ERC20-based stablecoin (mock USDC)
- Minting restricted to Admin/NGO
- Transfers only to whitelisted addresses
- Pausable for emergencies

### SpendingController.sol
- Category-based allowances (Food, Medical, Shelter)
- Merchant category tagging
- Spending validation & tracking
- Full event emission for auditing

## 🤖 ML Features

- **Fraud Detection**: Isolation Forest for anomaly detection
- **Risk Scoring**: Beneficiary behavior analysis
- **Real-time Alerts**: Suspicious activity notifications

## 📊 API Endpoints

### Authentication
- `POST /api/auth/google/` - Google OAuth login
- `POST /api/auth/connect-wallet/` - Connect MetaMask

### Campaigns
- `GET /api/campaigns/` - List all campaigns
- `POST /api/campaigns/` - Create campaign (Admin)
- `GET /api/campaigns/{id}/stats/` - Campaign statistics

### Beneficiaries
- `POST /api/beneficiaries/register/` - Register beneficiary
- `POST /api/beneficiaries/verify/` - Verify beneficiary (Admin)
- `GET /api/beneficiaries/{id}/spending/` - Spending history

### Transactions
- `GET /api/transactions/` - List transactions
- `GET /api/transactions/audit/` - Public audit data
- `GET /api/transactions/export/` - Export CSV/JSON

## 🛡️ Security Features

- Role-based access control (RBAC)
- Rate limiting on sensitive APIs
- Wallet signature verification
- Smart contract pausability
- On-chain audit trail

## 🌐 Environment Variables

### Backend (.env)
```env
DJANGO_SECRET_KEY=your-secret-key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-supabase-key
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/xxx
CONTRACT_ADDRESS=0x...
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CONTRACT_ADDRESS=0x...
```

## 📜 License

MIT License - feel free to use for humanitarian purposes.

## 🤝 Contributing

This is a hackathon project. PRs welcome for improvements!

---

**Built with ❤️ for disaster relief transparency**
