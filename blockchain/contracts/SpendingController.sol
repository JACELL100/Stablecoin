// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReliefStablecoin.sol";

/**
 * @title SpendingController
 * @dev Controls and validates beneficiary spending based on categories
 * 
 * Key Features:
 * - Category-based spending allowances (Food, Medical, Shelter)
 * - Merchant category tagging
 * - Spending validation and limits
 * - Complete audit trail for transparency
 * 
 * @author Disaster Relief System
 */
contract SpendingController is AccessControl, Pausable, ReentrancyGuard {
    
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MERCHANT_MANAGER_ROLE = keccak256("MERCHANT_MANAGER_ROLE");
    
    // ============ Enums ============
    
    /// @notice Spending categories for relief funds
    enum SpendingCategory {
        FOOD,       // 0 - Food and groceries
        MEDICAL,    // 1 - Medicine and healthcare
        SHELTER,    // 2 - Housing and temporary shelter
        UTILITIES,  // 3 - Basic utilities (water, electricity)
        TRANSPORT   // 4 - Emergency transportation
    }
    
    // ============ State Variables ============
    
    /// @notice Reference to the relief stablecoin contract
    ReliefStablecoin public reliefToken;
    
    /// @notice Merchant registry: address => MerchantInfo
    mapping(address => MerchantInfo) public merchants;
    
    /// @notice List of all registered merchant addresses
    address[] public merchantList;
    
    /// @notice Beneficiary allowances: beneficiary => category => amount
    mapping(address => mapping(SpendingCategory => uint256)) public categoryAllowances;
    
    /// @notice Beneficiary spending: beneficiary => category => spent amount
    mapping(address => mapping(SpendingCategory => uint256)) public categorySpending;
    
    /// @notice Daily spending limits per beneficiary
    mapping(address => uint256) public dailySpendingLimit;
    
    /// @notice Daily spending tracker: beneficiary => day => amount spent
    mapping(address => mapping(uint256 => uint256)) public dailySpent;
    
    /// @notice Default daily spending limit (in token units with 6 decimals)
    uint256 public defaultDailyLimit = 500 * 10**6; // 500 drUSD
    
    /// @notice Transaction counter for unique IDs
    uint256 public transactionCounter;
    
    // ============ Structs ============
    
    struct MerchantInfo {
        string name;                    // Merchant business name
        SpendingCategory category;      // Primary category
        string location;                // Physical location
        bool isActive;                  // Whether merchant can receive payments
        uint256 registeredAt;           // Registration timestamp
        uint256 totalReceived;          // Total funds received
    }
    
    struct SpendingRecord {
        uint256 transactionId;
        address beneficiary;
        address merchant;
        uint256 amount;
        SpendingCategory category;
        uint256 timestamp;
        string externalRef;             // External reference (receipt, etc.)
    }
    
    // ============ Events ============
    
    /// @notice Emitted when a merchant is registered
    event MerchantRegistered(
        address indexed merchant,
        string name,
        SpendingCategory category,
        string location,
        uint256 timestamp
    );
    
    /// @notice Emitted when a merchant is deactivated
    event MerchantDeactivated(
        address indexed merchant,
        string reason,
        uint256 timestamp
    );
    
    /// @notice Emitted when allowances are set for a beneficiary
    event AllowancesSet(
        address indexed beneficiary,
        SpendingCategory category,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice Emitted when spending occurs
    event SpendingExecuted(
        uint256 indexed transactionId,
        address indexed beneficiary,
        address indexed merchant,
        uint256 amount,
        SpendingCategory category,
        string externalRef,
        uint256 timestamp
    );
    
    /// @notice Emitted when spending is rejected
    event SpendingRejected(
        address indexed beneficiary,
        address indexed merchant,
        uint256 amount,
        SpendingCategory attemptedCategory,
        string reason,
        uint256 timestamp
    );
    
    /// @notice Emitted for audit trail
    event AuditLog(
        uint256 indexed transactionId,
        string action,
        address indexed actor,
        bytes data,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error MerchantNotActive(address merchant);
    error InsufficientAllowance(SpendingCategory category, uint256 requested, uint256 available);
    error DailyLimitExceeded(uint256 requested, uint256 remaining);
    error CategoryMismatch(SpendingCategory merchantCategory, SpendingCategory requestedCategory);
    error InsufficientBalance(uint256 requested, uint256 available);
    error MerchantAlreadyExists(address merchant);
    error InvalidAmount();
    error InvalidAddress();
    
    // ============ Constructor ============
    
    /**
     * @dev Initialize the spending controller
     * @param _reliefToken Address of the ReliefStablecoin contract
     */
    constructor(address _reliefToken) {
        if (_reliefToken == address(0)) revert InvalidAddress();
        
        reliefToken = ReliefStablecoin(_reliefToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MERCHANT_MANAGER_ROLE, msg.sender);
    }
    
    // ============ Merchant Management ============
    
    /**
     * @dev Register a new merchant
     * @param merchant Merchant wallet address
     * @param name Business name
     * @param category Primary spending category
     * @param location Physical location
     */
    function registerMerchant(
        address merchant,
        string calldata name,
        SpendingCategory category,
        string calldata location
    ) external onlyRole(MERCHANT_MANAGER_ROLE) {
        if (merchant == address(0)) revert InvalidAddress();
        if (merchants[merchant].isActive) revert MerchantAlreadyExists(merchant);
        
        merchants[merchant] = MerchantInfo({
            name: name,
            category: category,
            location: location,
            isActive: true,
            registeredAt: block.timestamp,
            totalReceived: 0
        });
        
        merchantList.push(merchant);
        
        emit MerchantRegistered(
            merchant,
            name,
            category,
            location,
            block.timestamp
        );
        
        // Audit log
        emit AuditLog(
            ++transactionCounter,
            "MERCHANT_REGISTERED",
            msg.sender,
            abi.encode(merchant, name, category),
            block.timestamp
        );
    }
    
    /**
     * @dev Batch register multiple merchants
     */
    function batchRegisterMerchants(
        address[] calldata merchantAddresses,
        string[] calldata names,
        SpendingCategory[] calldata categories,
        string[] calldata locations
    ) external onlyRole(MERCHANT_MANAGER_ROLE) {
        require(
            merchantAddresses.length == names.length &&
            names.length == categories.length &&
            categories.length == locations.length,
            "Arrays length mismatch"
        );
        
        for (uint256 i = 0; i < merchantAddresses.length; i++) {
            if (merchantAddresses[i] != address(0) && !merchants[merchantAddresses[i]].isActive) {
                merchants[merchantAddresses[i]] = MerchantInfo({
                    name: names[i],
                    category: categories[i],
                    location: locations[i],
                    isActive: true,
                    registeredAt: block.timestamp,
                    totalReceived: 0
                });
                
                merchantList.push(merchantAddresses[i]);
                
                emit MerchantRegistered(
                    merchantAddresses[i],
                    names[i],
                    categories[i],
                    locations[i],
                    block.timestamp
                );
            }
        }
    }
    
    /**
     * @dev Deactivate a merchant
     * @param merchant Merchant address to deactivate
     * @param reason Reason for deactivation
     */
    function deactivateMerchant(
        address merchant,
        string calldata reason
    ) external onlyRole(MERCHANT_MANAGER_ROLE) {
        if (!merchants[merchant].isActive) revert MerchantNotActive(merchant);
        
        merchants[merchant].isActive = false;
        
        emit MerchantDeactivated(merchant, reason, block.timestamp);
    }
    
    // ============ Allowance Management ============
    
    /**
     * @dev Set spending allowances for a beneficiary
     * @param beneficiary Beneficiary address
     * @param category Spending category
     * @param amount Allowance amount
     */
    function setAllowance(
        address beneficiary,
        SpendingCategory category,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        if (beneficiary == address(0)) revert InvalidAddress();
        
        categoryAllowances[beneficiary][category] = amount;
        
        emit AllowancesSet(beneficiary, category, amount, block.timestamp);
    }
    
    /**
     * @dev Set all category allowances at once
     * @param beneficiary Beneficiary address
     * @param foodAllowance Food category allowance
     * @param medicalAllowance Medical category allowance
     * @param shelterAllowance Shelter category allowance
     * @param utilitiesAllowance Utilities category allowance
     * @param transportAllowance Transport category allowance
     */
    function setAllAllowances(
        address beneficiary,
        uint256 foodAllowance,
        uint256 medicalAllowance,
        uint256 shelterAllowance,
        uint256 utilitiesAllowance,
        uint256 transportAllowance
    ) external onlyRole(ADMIN_ROLE) {
        if (beneficiary == address(0)) revert InvalidAddress();
        
        categoryAllowances[beneficiary][SpendingCategory.FOOD] = foodAllowance;
        categoryAllowances[beneficiary][SpendingCategory.MEDICAL] = medicalAllowance;
        categoryAllowances[beneficiary][SpendingCategory.SHELTER] = shelterAllowance;
        categoryAllowances[beneficiary][SpendingCategory.UTILITIES] = utilitiesAllowance;
        categoryAllowances[beneficiary][SpendingCategory.TRANSPORT] = transportAllowance;
        
        emit AllowancesSet(beneficiary, SpendingCategory.FOOD, foodAllowance, block.timestamp);
        emit AllowancesSet(beneficiary, SpendingCategory.MEDICAL, medicalAllowance, block.timestamp);
        emit AllowancesSet(beneficiary, SpendingCategory.SHELTER, shelterAllowance, block.timestamp);
        emit AllowancesSet(beneficiary, SpendingCategory.UTILITIES, utilitiesAllowance, block.timestamp);
        emit AllowancesSet(beneficiary, SpendingCategory.TRANSPORT, transportAllowance, block.timestamp);
    }
    
    /**
     * @dev Set daily spending limit for a beneficiary
     */
    function setDailyLimit(
        address beneficiary,
        uint256 limit
    ) external onlyRole(ADMIN_ROLE) {
        dailySpendingLimit[beneficiary] = limit;
    }
    
    // ============ Spending Functions ============
    
    /**
     * @dev Execute a spending transaction
     * @param merchant Merchant to pay
     * @param amount Amount to spend
     * @param externalRef External reference (receipt ID, etc.)
     */
    function spend(
        address merchant,
        uint256 amount,
        string calldata externalRef
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        
        // Validate merchant
        MerchantInfo storage merchantInfo = merchants[merchant];
        if (!merchantInfo.isActive) {
            emit SpendingRejected(
                msg.sender,
                merchant,
                amount,
                merchantInfo.category,
                "Merchant not active",
                block.timestamp
            );
            revert MerchantNotActive(merchant);
        }
        
        SpendingCategory category = merchantInfo.category;
        
        // Check category allowance
        uint256 allowance = categoryAllowances[msg.sender][category];
        uint256 spent = categorySpending[msg.sender][category];
        uint256 remaining = allowance > spent ? allowance - spent : 0;
        
        if (amount > remaining) {
            emit SpendingRejected(
                msg.sender,
                merchant,
                amount,
                category,
                "Insufficient category allowance",
                block.timestamp
            );
            revert InsufficientAllowance(category, amount, remaining);
        }
        
        // Check daily limit
        uint256 today = block.timestamp / 1 days;
        uint256 dailyLimit = dailySpendingLimit[msg.sender];
        if (dailyLimit == 0) dailyLimit = defaultDailyLimit;
        
        uint256 todaySpent = dailySpent[msg.sender][today];
        uint256 dailyRemaining = dailyLimit > todaySpent ? dailyLimit - todaySpent : 0;
        
        if (amount > dailyRemaining) {
            emit SpendingRejected(
                msg.sender,
                merchant,
                amount,
                category,
                "Daily limit exceeded",
                block.timestamp
            );
            revert DailyLimitExceeded(amount, dailyRemaining);
        }
        
        // Check token balance
        uint256 balance = reliefToken.balanceOf(msg.sender);
        if (amount > balance) {
            emit SpendingRejected(
                msg.sender,
                merchant,
                amount,
                category,
                "Insufficient token balance",
                block.timestamp
            );
            revert InsufficientBalance(amount, balance);
        }
        
        // Execute transfer: beneficiary -> this contract -> merchant
        // First, beneficiary approves this contract, then we transfer
        reliefToken.transferFrom(msg.sender, merchant, amount);
        
        // Update state
        categorySpending[msg.sender][category] += amount;
        dailySpent[msg.sender][today] += amount;
        merchantInfo.totalReceived += amount;
        
        uint256 txId = ++transactionCounter;
        
        emit SpendingExecuted(
            txId,
            msg.sender,
            merchant,
            amount,
            category,
            externalRef,
            block.timestamp
        );
        
        // Audit log
        emit AuditLog(
            txId,
            "SPENDING_EXECUTED",
            msg.sender,
            abi.encode(merchant, amount, category, externalRef),
            block.timestamp
        );
    }
    
    // ============ Pause Functions ============
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get remaining allowance for a beneficiary in a category
     */
    function getRemainingAllowance(
        address beneficiary,
        SpendingCategory category
    ) external view returns (uint256) {
        uint256 allowance = categoryAllowances[beneficiary][category];
        uint256 spent = categorySpending[beneficiary][category];
        return allowance > spent ? allowance - spent : 0;
    }
    
    /**
     * @dev Get all allowances and spending for a beneficiary
     */
    function getBeneficiaryStatus(address beneficiary) 
        external 
        view 
        returns (
            uint256[5] memory allowances,
            uint256[5] memory spending,
            uint256 tokenBalance,
            uint256 dailyRemaining
        ) 
    {
        for (uint256 i = 0; i < 5; i++) {
            SpendingCategory cat = SpendingCategory(i);
            allowances[i] = categoryAllowances[beneficiary][cat];
            spending[i] = categorySpending[beneficiary][cat];
        }
        
        tokenBalance = reliefToken.balanceOf(beneficiary);
        
        uint256 today = block.timestamp / 1 days;
        uint256 limit = dailySpendingLimit[beneficiary];
        if (limit == 0) limit = defaultDailyLimit;
        uint256 todaySpent = dailySpent[beneficiary][today];
        dailyRemaining = limit > todaySpent ? limit - todaySpent : 0;
    }
    
    /**
     * @dev Get merchant info
     */
    function getMerchantInfo(address merchant) 
        external 
        view 
        returns (MerchantInfo memory) 
    {
        return merchants[merchant];
    }
    
    /**
     * @dev Get total number of merchants
     */
    function getMerchantCount() external view returns (uint256) {
        return merchantList.length;
    }
    
    /**
     * @dev Get merchant by index
     */
    function getMerchantByIndex(uint256 index) 
        external 
        view 
        returns (address, MerchantInfo memory) 
    {
        require(index < merchantList.length, "Index out of bounds");
        address merchant = merchantList[index];
        return (merchant, merchants[merchant]);
    }
    
    /**
     * @dev Get category name as string
     */
    function getCategoryName(SpendingCategory category) 
        external 
        pure 
        returns (string memory) 
    {
        if (category == SpendingCategory.FOOD) return "Food";
        if (category == SpendingCategory.MEDICAL) return "Medical";
        if (category == SpendingCategory.SHELTER) return "Shelter";
        if (category == SpendingCategory.UTILITIES) return "Utilities";
        if (category == SpendingCategory.TRANSPORT) return "Transport";
        return "Unknown";
    }
}
