// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ReliefStablecoin
 * @dev ERC20 stablecoin for disaster relief fund distribution
 * 
 * Key Features:
 * - Minting restricted to MINTER_ROLE (Admin/NGO)
 * - Transfers only allowed to whitelisted beneficiaries
 * - Pausable for emergency situations
 * - Full audit trail via events
 * 
 * @author Disaster Relief System
 */
contract ReliefStablecoin is ERC20, ERC20Burnable, AccessControl, Pausable {
    
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============ State Variables ============
    
    // Whitelist mapping: address => is whitelisted
    mapping(address => bool) public whitelistedBeneficiaries;
    
    // Beneficiary details for transparency
    mapping(address => BeneficiaryInfo) public beneficiaryInfo;
    
    // Reference to SpendingController contract
    address public spendingController;
    
    // Track total minted for campaigns
    mapping(string => uint256) public campaignFunds; // campaignId => amount minted
    
    // ============ Structs ============
    
    struct BeneficiaryInfo {
        string name;           // Encrypted/hashed name for privacy
        string region;         // Disaster-affected region
        uint256 registeredAt;  // Timestamp of registration
        bool isActive;         // Whether beneficiary can receive funds
    }
    
    // ============ Events ============
    
    /// @notice Emitted when a beneficiary is whitelisted
    event BeneficiaryWhitelisted(
        address indexed beneficiary,
        string name,
        string region,
        uint256 timestamp
    );
    
    /// @notice Emitted when a beneficiary is removed from whitelist
    event BeneficiaryRemoved(
        address indexed beneficiary,
        uint256 timestamp,
        string reason
    );
    
    /// @notice Emitted when funds are minted for a campaign
    event FundsMinted(
        address indexed to,
        uint256 amount,
        string campaignId,
        string purpose,
        uint256 timestamp
    );
    
    /// @notice Emitted when relief funds are distributed to beneficiary
    event FundsDistributed(
        address indexed from,
        address indexed to,
        uint256 amount,
        string campaignId,
        uint256 timestamp
    );
    
    /// @notice Emitted when spending controller is updated
    event SpendingControllerUpdated(
        address indexed oldController,
        address indexed newController
    );
    
    // ============ Errors ============
    
    error NotWhitelisted(address account);
    error BeneficiaryAlreadyExists(address account);
    error InvalidAddress();
    error TransferNotAllowed(address from, address to);
    
    // ============ Constructor ============
    
    /**
     * @dev Initializes the relief stablecoin with admin as deployer
     * @param name Token name (e.g., "Disaster Relief USD")
     * @param symbol Token symbol (e.g., "drUSD")
     */
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        // Grant all roles to deployer initially
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Whitelist the contract deployer (for receiving minted tokens)
        whitelistedBeneficiaries[msg.sender] = true;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Set the spending controller contract address
     * @param _controller Address of SpendingController contract
     */
    function setSpendingController(address _controller) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (_controller == address(0)) revert InvalidAddress();
        
        address oldController = spendingController;
        spendingController = _controller;
        
        // Whitelist the spending controller for transfers
        whitelistedBeneficiaries[_controller] = true;
        
        emit SpendingControllerUpdated(oldController, _controller);
    }
    
    /**
     * @dev Add a beneficiary to the whitelist
     * @param beneficiary Address of the beneficiary
     * @param name Encrypted/hashed name for privacy
     * @param region Disaster-affected region
     */
    function whitelistBeneficiary(
        address beneficiary,
        string calldata name,
        string calldata region
    ) external onlyRole(ADMIN_ROLE) {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (whitelistedBeneficiaries[beneficiary]) {
            revert BeneficiaryAlreadyExists(beneficiary);
        }
        
        whitelistedBeneficiaries[beneficiary] = true;
        beneficiaryInfo[beneficiary] = BeneficiaryInfo({
            name: name,
            region: region,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        emit BeneficiaryWhitelisted(
            beneficiary,
            name,
            region,
            block.timestamp
        );
    }
    
    /**
     * @dev Remove a beneficiary from the whitelist
     * @param beneficiary Address to remove
     * @param reason Reason for removal (for audit trail)
     */
    function removeBeneficiary(
        address beneficiary,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) {
        if (!whitelistedBeneficiaries[beneficiary]) {
            revert NotWhitelisted(beneficiary);
        }
        
        whitelistedBeneficiaries[beneficiary] = false;
        beneficiaryInfo[beneficiary].isActive = false;
        
        emit BeneficiaryRemoved(beneficiary, block.timestamp, reason);
    }
    
    /**
     * @dev Batch whitelist multiple beneficiaries
     * @param beneficiaries Array of beneficiary addresses
     * @param names Array of encrypted names
     * @param regions Array of regions
     */
    function batchWhitelistBeneficiaries(
        address[] calldata beneficiaries,
        string[] calldata names,
        string[] calldata regions
    ) external onlyRole(ADMIN_ROLE) {
        require(
            beneficiaries.length == names.length && 
            names.length == regions.length,
            "Arrays length mismatch"
        );
        
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i] != address(0) && 
                !whitelistedBeneficiaries[beneficiaries[i]]) {
                
                whitelistedBeneficiaries[beneficiaries[i]] = true;
                beneficiaryInfo[beneficiaries[i]] = BeneficiaryInfo({
                    name: names[i],
                    region: regions[i],
                    registeredAt: block.timestamp,
                    isActive: true
                });
                
                emit BeneficiaryWhitelisted(
                    beneficiaries[i],
                    names[i],
                    regions[i],
                    block.timestamp
                );
            }
        }
    }
    
    // ============ Minting Functions ============
    
    /**
     * @dev Mint relief tokens for a campaign
     * @param to Address to receive tokens
     * @param amount Amount to mint
     * @param campaignId Campaign identifier
     * @param purpose Purpose of minting (for audit)
     */
    function mintForCampaign(
        address to,
        uint256 amount,
        string calldata campaignId,
        string calldata purpose
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert InvalidAddress();
        if (!whitelistedBeneficiaries[to] && !hasRole(ADMIN_ROLE, to)) {
            revert NotWhitelisted(to);
        }
        
        _mint(to, amount);
        campaignFunds[campaignId] += amount;
        
        emit FundsMinted(to, amount, campaignId, purpose, block.timestamp);
    }
    
    /**
     * @dev Distribute funds to a beneficiary
     * @param to Beneficiary address
     * @param amount Amount to distribute
     * @param campaignId Campaign identifier
     */
    function distributeFunds(
        address to,
        uint256 amount,
        string calldata campaignId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!whitelistedBeneficiaries[to]) {
            revert NotWhitelisted(to);
        }
        
        _transfer(msg.sender, to, amount);
        
        emit FundsDistributed(
            msg.sender,
            to,
            amount,
            campaignId,
            block.timestamp
        );
    }
    
    // ============ Pause Functions ============
    
    /**
     * @dev Pause all token transfers (emergency)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============ Override Functions ============
    
    /**
     * @dev Override transfer to enforce whitelist rules
     * Transfers are only allowed:
     * 1. From admin/minter to whitelisted beneficiaries
     * 2. From beneficiaries to spending controller
     * 3. From spending controller to merchants
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        // Allow minting (from = address(0))
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }
        
        // Allow burning (to = address(0))
        if (to == address(0)) {
            super._update(from, to, value);
            return;
        }
        
        // Allow transfers from admins/minters
        if (hasRole(ADMIN_ROLE, from) || hasRole(MINTER_ROLE, from)) {
            super._update(from, to, value);
            return;
        }
        
        // Allow transfers to spending controller
        if (to == spendingController) {
            super._update(from, to, value);
            return;
        }
        
        // Allow transfers from spending controller (to merchants)
        if (from == spendingController) {
            super._update(from, to, value);
            return;
        }
        
        // Block all other transfers
        revert TransferNotAllowed(from, to);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Check if an address is whitelisted
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelistedBeneficiaries[account];
    }
    
    /**
     * @dev Get beneficiary info
     */
    function getBeneficiaryInfo(address beneficiary) 
        external 
        view 
        returns (BeneficiaryInfo memory) 
    {
        return beneficiaryInfo[beneficiary];
    }
    
    /**
     * @dev Get total funds minted for a campaign
     */
    function getCampaignFunds(string calldata campaignId) 
        external 
        view 
        returns (uint256) 
    {
        return campaignFunds[campaignId];
    }
    
    /**
     * @dev Returns the number of decimals (6 like USDC)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
