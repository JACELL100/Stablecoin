import { ethers } from 'ethers';

// Contract ABIs (simplified for key functions)
const ReliefStablecoinABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function isWhitelisted(address) view returns (bool)",
  "function getBeneficiaryInfo(address) view returns (tuple(string name, string region, uint256 registeredAt, bool isActive))",
  "event BeneficiaryWhitelisted(address indexed beneficiary, string name, string region, uint256 timestamp)",
  "event FundsMinted(address indexed to, uint256 amount, string campaignId, string purpose, uint256 timestamp)",
  "event FundsDistributed(address indexed from, address indexed to, uint256 amount, string campaignId, uint256 timestamp)",
];

const SpendingControllerABI = [
  "function spend(address merchant, uint256 amount, string reference)",
  "function getRemainingAllowance(address beneficiary, uint8 category) view returns (uint256)",
  "function getBeneficiaryStatus(address) view returns (uint256[5] allowances, uint256[5] spending, uint256 tokenBalance, uint256 dailyRemaining)",
  "function getMerchantInfo(address) view returns (tuple(string name, uint8 category, string location, bool isActive, uint256 registeredAt, uint256 totalReceived))",
  "event SpendingExecuted(uint256 indexed transactionId, address indexed beneficiary, address indexed merchant, uint256 amount, uint8 category, string reference, uint256 timestamp)",
  "event SpendingRejected(address indexed beneficiary, address indexed merchant, uint256 amount, uint8 attemptedCategory, string reason, uint256 timestamp)",
];

// Contract addresses
const RELIEF_TOKEN_ADDRESS = import.meta.env.VITE_RELIEF_TOKEN_ADDRESS || '';
const SPENDING_CONTROLLER_ADDRESS = import.meta.env.VITE_SPENDING_CONTROLLER_ADDRESS || '';
const CAMPAIGN_MANAGER_ADDRESS = import.meta.env.VITE_CAMPAIGN_MANAGER_ADDRESS || '';
const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '31337';
const RPC_URL = import.meta.env.VITE_BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';

// Spending categories
export const SPENDING_CATEGORIES = {
  0: 'Food',
  1: 'Medical',
  2: 'Shelter',
  3: 'Utilities',
  4: 'Transport',
};

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.reliefToken = null;
    this.spendingController = null;
  }

  async connect() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();

    // Initialize contracts
    if (RELIEF_TOKEN_ADDRESS) {
      this.reliefToken = new ethers.Contract(
        RELIEF_TOKEN_ADDRESS,
        ReliefStablecoinABI,
        this.signer
      );
    }

    if (SPENDING_CONTROLLER_ADDRESS) {
      this.spendingController = new ethers.Contract(
        SPENDING_CONTROLLER_ADDRESS,
        SpendingControllerABI,
        this.signer
      );
    }

    return accounts[0];
  }

  async getAddress() {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }

  async signMessage(message) {
    if (!this.signer) throw new Error('Not connected');
    return await this.signer.signMessage(message);
  }

  async getBalance(address) {
    if (!this.reliefToken) throw new Error('Contract not initialized');
    const balance = await this.reliefToken.balanceOf(address);
    return ethers.formatUnits(balance, 6);
  }

  async isWhitelisted(address) {
    if (!this.reliefToken) throw new Error('Contract not initialized');
    return await this.reliefToken.isWhitelisted(address);
  }

  async getBeneficiaryStatus(address) {
    if (!this.spendingController) throw new Error('Contract not initialized');
    const [allowances, spending, tokenBalance, dailyRemaining] = 
      await this.spendingController.getBeneficiaryStatus(address);
    
    return {
      allowances: allowances.map((a) => ethers.formatUnits(a, 6)),
      spending: spending.map((s) => ethers.formatUnits(s, 6)),
      tokenBalance: ethers.formatUnits(tokenBalance, 6),
      dailyRemaining: ethers.formatUnits(dailyRemaining, 6),
    };
  }

  async approveSpending(amount) {
    if (!this.reliefToken || !this.signer) throw new Error('Not connected');
    
    const amountWei = ethers.parseUnits(amount, 6);
    const tx = await this.reliefToken.approve(SPENDING_CONTROLLER_ADDRESS, amountWei);
    return tx;
  }

  async spend(merchantAddress, amount, reference) {
    if (!this.spendingController || !this.signer) throw new Error('Not connected');
    
    const amountWei = ethers.parseUnits(amount, 6);
    const tx = await this.spendingController.spend(merchantAddress, amountWei, reference);
    return tx;
  }

  async getMerchantInfo(address) {
    if (!this.spendingController) throw new Error('Contract not initialized');
    const info = await this.spendingController.getMerchantInfo(address);
    
    return {
      name: info.name,
      category: SPENDING_CATEGORIES[info.category],
      location: info.location,
      isActive: info.isActive,
      registeredAt: new Date(Number(info.registeredAt) * 1000),
      totalReceived: ethers.formatUnits(info.totalReceived, 6),
    };
  }

  async switchToSepolia() {
    if (!window.ethereum) throw new Error('MetaMask is not installed');
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
      });
    } catch (error) {
      // If Sepolia is not added, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'SEP',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  async switchToLocalHardhat() {
    if (!window.ethereum) throw new Error('MetaMask is not installed');
    
    const chainIdHex = '0x7a69'; // 31337 in hex (Hardhat local)
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error) {
      // If local network is not added, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: 'Hardhat Local',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [RPC_URL],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  async switchToConfiguredNetwork() {
    // Switch based on configured chain ID
    if (CHAIN_ID === '31337') {
      await this.switchToLocalHardhat();
    } else {
      await this.switchToSepolia();
    }
  }

  getContractAddresses() {
    return {
      reliefToken: RELIEF_TOKEN_ADDRESS,
      spendingController: SPENDING_CONTROLLER_ADDRESS,
      campaignManager: CAMPAIGN_MANAGER_ADDRESS,
    };
  }

  formatAmount(amount) {
    return ethers.formatUnits(amount, 6);
  }

  parseAmount(amount) {
    return ethers.parseUnits(amount, 6);
  }
}

export const blockchain = new BlockchainService();
