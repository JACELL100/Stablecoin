"""
Blockchain service for interacting with smart contracts.

Provides methods for:
- Minting relief tokens
- Whitelisting beneficiaries
- Distributing funds
- Registering approved merchants
- Checking balances and allowances
"""
import logging
from decimal import Decimal
from typing import Optional, List, Tuple
from django.conf import settings

logger = logging.getLogger(__name__)

# Check if web3 is available
try:
    from web3 import Web3
    from eth_account import Account
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    logger.warning("web3 package not installed - blockchain features disabled")


# Contract ABIs (simplified for key functions)
RELIEF_TOKEN_ABI = [
    {
        "inputs": [{"name": "beneficiary", "type": "address"}, {"name": "name", "type": "string"}, {"name": "region", "type": "string"}],
        "name": "whitelistBeneficiary",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}, {"name": "campaignId", "type": "string"}, {"name": "purpose", "type": "string"}],
        "name": "mintForCampaign",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "isWhitelisted",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "beneficiaries", "type": "address[]"}, {"name": "names", "type": "string[]"}, {"name": "regions", "type": "string[]"}],
        "name": "batchWhitelistBeneficiaries",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
]

SPENDING_CONTROLLER_ABI = [
    {
        "inputs": [{"name": "merchant", "type": "address"}, {"name": "name", "type": "string"}, {"name": "category", "type": "uint8"}, {"name": "location", "type": "string"}],
        "name": "registerMerchant",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "beneficiary", "type": "address"}, {"name": "foodAllowance", "type": "uint256"}, {"name": "medicalAllowance", "type": "uint256"}, {"name": "shelterAllowance", "type": "uint256"}, {"name": "utilitiesAllowance", "type": "uint256"}, {"name": "transportAllowance", "type": "uint256"}],
        "name": "setAllAllowances",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "beneficiary", "type": "address"}, {"name": "category", "type": "uint8"}],
        "name": "categoryAllowances",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "beneficiary", "type": "address"}, {"name": "category", "type": "uint8"}],
        "name": "categorySpending",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "merchant", "type": "address"}],
        "name": "merchants",
        "outputs": [
            {"name": "name", "type": "string"},
            {"name": "category", "type": "uint8"},
            {"name": "location", "type": "string"},
            {"name": "isActive", "type": "bool"},
            {"name": "registeredAt", "type": "uint256"},
            {"name": "totalReceived", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "merchant", "type": "address"}, {"name": "reason", "type": "string"}],
        "name": "deactivateMerchant",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
]

# Spending category mapping
SPENDING_CATEGORIES = {
    'food': 0,
    'medical': 1,
    'shelter': 2,
    'utilities': 3,
    'transport': 4,
}


class BlockchainService:
    """
    Service for interacting with disaster relief smart contracts.
    """
    
    def __init__(self):
        self.w3 = None
        self.account = None
        self.relief_token = None
        self.spending_controller = None
        self._initialized = False
    
    def initialize(self) -> bool:
        """Initialize blockchain connection and contracts."""
        if not WEB3_AVAILABLE:
            logger.error("web3 package not available")
            return False
        
        try:
            rpc_url = settings.BLOCKCHAIN_RPC_URL
            if not rpc_url:
                logger.warning("BLOCKCHAIN_RPC_URL not configured")
                return False
            
            self.w3 = Web3(Web3.HTTPProvider(rpc_url))
            
            if not self.w3.is_connected():
                logger.error("Failed to connect to blockchain")
                return False
            
            # Load admin account
            private_key = settings.ADMIN_PRIVATE_KEY
            if private_key:
                if not private_key.startswith('0x'):
                    private_key = '0x' + private_key
                self.account = Account.from_key(private_key)
                logger.info(f"Blockchain admin account: {self.account.address}")
            
            # Initialize contracts
            relief_token_address = settings.RELIEF_TOKEN_ADDRESS
            if relief_token_address:
                self.relief_token = self.w3.eth.contract(
                    address=Web3.to_checksum_address(relief_token_address),
                    abi=RELIEF_TOKEN_ABI
                )
            
            spending_controller_address = settings.SPENDING_CONTROLLER_ADDRESS
            if spending_controller_address:
                self.spending_controller = self.w3.eth.contract(
                    address=Web3.to_checksum_address(spending_controller_address),
                    abi=SPENDING_CONTROLLER_ABI
                )
            
            self._initialized = True
            logger.info("Blockchain service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize blockchain service: {e}")
            return False
    
    def _ensure_initialized(self):
        """Ensure the service is initialized."""
        if not self._initialized:
            self.initialize()
        if not self._initialized:
            raise Exception("Blockchain service not initialized")
    
    def _send_transaction(self, contract_func, gas_limit: int = 500000) -> str:
        """Build, sign and send a transaction."""
        self._ensure_initialized()
        
        if not self.account:
            raise Exception("No admin account configured")
        
        # Build transaction
        tx = contract_func.build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': gas_limit,
            'gasPrice': self.w3.eth.gas_price,
        })
        
        # Sign and send
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt.status != 1:
            raise Exception(f"Transaction failed: {tx_hash.hex()}")
        
        return tx_hash.hex()
    
    # ============ Token Functions ============
    
    def get_balance(self, address: str) -> Decimal:
        """Get token balance for an address."""
        self._ensure_initialized()
        
        if not self.relief_token:
            return Decimal('0')
        
        checksum_address = Web3.to_checksum_address(address)
        balance_wei = self.relief_token.functions.balanceOf(checksum_address).call()
        return Decimal(balance_wei) / Decimal(10 ** 6)
    
    def is_whitelisted(self, address: str) -> bool:
        """Check if an address is whitelisted."""
        self._ensure_initialized()
        
        if not self.relief_token:
            return False
        
        checksum_address = Web3.to_checksum_address(address)
        return self.relief_token.functions.isWhitelisted(checksum_address).call()
    
    # ============ Admin Functions ============
    
    def mint_tokens(self, to_address: str, amount: Decimal, campaign_id: str, purpose: str) -> str:
        """
        Mint relief tokens for a campaign.
        
        Args:
            to_address: Recipient address (usually admin wallet or contract)
            amount: Amount to mint in drUSD
            campaign_id: Campaign identifier
            purpose: Purpose description for audit trail
        
        Returns:
            Transaction hash
        """
        self._ensure_initialized()
        
        if not self.relief_token:
            raise Exception("Relief token contract not configured")
        
        checksum_address = Web3.to_checksum_address(to_address)
        amount_wei = int(amount * 10 ** 6)
        
        func = self.relief_token.functions.mintForCampaign(
            checksum_address,
            amount_wei,
            str(campaign_id),
            purpose
        )
        
        tx_hash = self._send_transaction(func)
        logger.info(f"Minted {amount} drUSD to {to_address}, tx: {tx_hash}")
        return tx_hash
    
    def whitelist_beneficiary(self, address: str, name: str, region: str) -> str:
        """
        Whitelist a beneficiary on-chain.
        
        Args:
            address: Beneficiary wallet address
            name: Encrypted/hashed name
            region: Disaster-affected region
        
        Returns:
            Transaction hash
        """
        self._ensure_initialized()
        
        if not self.relief_token:
            raise Exception("Relief token contract not configured")
        
        checksum_address = Web3.to_checksum_address(address)
        
        func = self.relief_token.functions.whitelistBeneficiary(
            checksum_address,
            name,
            region
        )
        
        tx_hash = self._send_transaction(func)
        logger.info(f"Whitelisted beneficiary {address}, tx: {tx_hash}")
        return tx_hash
    
    def batch_whitelist_beneficiaries(
        self, 
        addresses: List[str], 
        names: List[str], 
        regions: List[str]
    ) -> str:
        """Batch whitelist multiple beneficiaries."""
        self._ensure_initialized()
        
        if not self.relief_token:
            raise Exception("Relief token contract not configured")
        
        checksum_addresses = [Web3.to_checksum_address(a) for a in addresses]
        
        func = self.relief_token.functions.batchWhitelistBeneficiaries(
            checksum_addresses,
            names,
            regions
        )
        
        tx_hash = self._send_transaction(func, gas_limit=1000000)
        logger.info(f"Batch whitelisted {len(addresses)} beneficiaries, tx: {tx_hash}")
        return tx_hash
    
    def distribute_funds(self, to_address: str, amount: Decimal) -> str:
        """
        Transfer funds to a whitelisted beneficiary.
        
        Args:
            to_address: Beneficiary wallet address
            amount: Amount to transfer in drUSD
        
        Returns:
            Transaction hash
        """
        self._ensure_initialized()
        
        if not self.relief_token:
            raise Exception("Relief token contract not configured")
        
        checksum_address = Web3.to_checksum_address(to_address)
        amount_wei = int(amount * 10 ** 6)
        
        func = self.relief_token.functions.transfer(
            checksum_address,
            amount_wei
        )
        
        tx_hash = self._send_transaction(func)
        logger.info(f"Distributed {amount} drUSD to {to_address}, tx: {tx_hash}")
        return tx_hash
    
    def set_beneficiary_allowances(
        self,
        address: str,
        food: Decimal = Decimal('0'),
        medical: Decimal = Decimal('0'),
        shelter: Decimal = Decimal('0'),
        utilities: Decimal = Decimal('0'),
        transport: Decimal = Decimal('0')
    ) -> str:
        """
        Set spending allowances for a beneficiary by category.
        
        Args:
            address: Beneficiary wallet address
            food: Food allowance in drUSD
            medical: Medical allowance in drUSD
            shelter: Shelter allowance in drUSD
            utilities: Utilities allowance in drUSD
            transport: Transport allowance in drUSD
        
        Returns:
            Transaction hash
        """
        self._ensure_initialized()
        
        if not self.spending_controller:
            raise Exception("Spending controller contract not configured")
        
        checksum_address = Web3.to_checksum_address(address)
        
        # Convert to wei (6 decimals)
        func = self.spending_controller.functions.setAllAllowances(
            checksum_address,
            int(food * 10 ** 6),
            int(medical * 10 ** 6),
            int(shelter * 10 ** 6),
            int(utilities * 10 ** 6),
            int(transport * 10 ** 6)
        )
        
        tx_hash = self._send_transaction(func)
        logger.info(f"Set allowances for {address}, tx: {tx_hash}")
        return tx_hash
    
    # ============ Merchant Functions ============
    
    def register_merchant(
        self,
        address: str,
        name: str,
        category: str,
        location: str
    ) -> str:
        """
        Register an approved merchant on-chain.
        
        Args:
            address: Merchant wallet address
            name: Business name
            category: Spending category (food, medical, shelter, utilities, transport)
            location: Physical location
        
        Returns:
            Transaction hash
        """
        self._ensure_initialized()
        
        if not self.spending_controller:
            raise Exception("Spending controller contract not configured")
        
        checksum_address = Web3.to_checksum_address(address)
        category_id = SPENDING_CATEGORIES.get(category.lower(), 0)
        
        func = self.spending_controller.functions.registerMerchant(
            checksum_address,
            name,
            category_id,
            location
        )
        
        tx_hash = self._send_transaction(func)
        logger.info(f"Registered merchant {name} at {address}, tx: {tx_hash}")
        return tx_hash
    
    def deactivate_merchant(self, address: str, reason: str) -> str:
        """Deactivate a merchant."""
        self._ensure_initialized()
        
        if not self.spending_controller:
            raise Exception("Spending controller contract not configured")
        
        checksum_address = Web3.to_checksum_address(address)
        
        func = self.spending_controller.functions.deactivateMerchant(
            checksum_address,
            reason
        )
        
        tx_hash = self._send_transaction(func)
        logger.info(f"Deactivated merchant {address}, tx: {tx_hash}")
        return tx_hash
    
    def get_merchant_info(self, address: str) -> dict:
        """Get merchant information from the blockchain."""
        self._ensure_initialized()
        
        if not self.spending_controller:
            return None
        
        checksum_address = Web3.to_checksum_address(address)
        info = self.spending_controller.functions.merchants(checksum_address).call()
        
        category_names = {v: k for k, v in SPENDING_CATEGORIES.items()}
        
        return {
            'name': info[0],
            'category': category_names.get(info[1], 'unknown'),
            'location': info[2],
            'is_active': info[3],
            'registered_at': info[4],
            'total_received': Decimal(info[5]) / Decimal(10 ** 6),
        }
    
    # ============ Query Functions ============
    
    def get_beneficiary_allowances(self, address: str) -> dict:
        """Get current allowances for a beneficiary."""
        self._ensure_initialized()
        
        if not self.spending_controller:
            return {}
        
        checksum_address = Web3.to_checksum_address(address)
        
        allowances = {}
        for category_name, category_id in SPENDING_CATEGORIES.items():
            allowance = self.spending_controller.functions.categoryAllowances(
                checksum_address, category_id
            ).call()
            spending = self.spending_controller.functions.categorySpending(
                checksum_address, category_id
            ).call()
            
            allowances[category_name] = {
                'allowance': Decimal(allowance) / Decimal(10 ** 6),
                'spent': Decimal(spending) / Decimal(10 ** 6),
                'remaining': Decimal(allowance - spending) / Decimal(10 ** 6),
            }
        
        return allowances


# Singleton instance
blockchain_service = BlockchainService()
