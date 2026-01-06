// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ReliefStablecoin.sol";
import "./SpendingController.sol";

/**
 * @title CampaignManager
 * @dev Manages disaster relief campaigns and fund allocation
 * 
 * Key Features:
 * - Campaign creation and lifecycle management
 * - Fund allocation tracking
 * - Multi-campaign support
 * - Complete audit trail
 * 
 * @author Disaster Relief System
 */
contract CampaignManager is AccessControl {
    
    // ============ Roles ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CAMPAIGN_MANAGER_ROLE = keccak256("CAMPAIGN_MANAGER_ROLE");
    
    // ============ Enums ============
    
    enum CampaignStatus {
        DRAFT,      // Campaign created but not active
        ACTIVE,     // Campaign is accepting donations and distributing
        PAUSED,     // Temporarily paused
        COMPLETED,  // All funds distributed
        CANCELLED   // Campaign cancelled
    }
    
    enum DisasterType {
        EARTHQUAKE,
        FLOOD,
        HURRICANE,
        WILDFIRE,
        PANDEMIC,
        CONFLICT,
        DROUGHT,
        OTHER
    }
    
    // ============ State Variables ============
    
    ReliefStablecoin public reliefToken;
    SpendingController public spendingController;
    
    /// @notice Campaign counter for unique IDs
    uint256 public campaignCounter;
    
    /// @notice Campaigns mapping
    mapping(uint256 => Campaign) public campaigns;
    
    /// @notice Campaign beneficiaries: campaignId => beneficiary[]
    mapping(uint256 => address[]) public campaignBeneficiaries;
    
    /// @notice Beneficiary allocation: campaignId => beneficiary => amount
    mapping(uint256 => mapping(address => uint256)) public beneficiaryAllocations;
    
    // ============ Structs ============
    
    struct Campaign {
        uint256 id;
        string name;
        string description;
        string region;
        DisasterType disasterType;
        CampaignStatus status;
        address creator;
        uint256 targetAmount;
        uint256 raisedAmount;
        uint256 distributedAmount;
        uint256 beneficiaryCount;
        uint256 createdAt;
        uint256 startDate;
        uint256 endDate;
        string metadataURI;     // IPFS link for additional data
    }
    
    // ============ Events ============
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string name,
        string region,
        DisasterType disasterType,
        uint256 targetAmount,
        address indexed creator,
        uint256 timestamp
    );
    
    event CampaignStatusUpdated(
        uint256 indexed campaignId,
        CampaignStatus oldStatus,
        CampaignStatus newStatus,
        uint256 timestamp
    );
    
    event FundsRaised(
        uint256 indexed campaignId,
        uint256 amount,
        uint256 totalRaised,
        uint256 timestamp
    );
    
    event BeneficiaryAddedToCampaign(
        uint256 indexed campaignId,
        address indexed beneficiary,
        uint256 allocation,
        uint256 timestamp
    );
    
    event FundsDistributedToBeneficiary(
        uint256 indexed campaignId,
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );
    
    // ============ Errors ============
    
    error CampaignNotFound(uint256 campaignId);
    error CampaignNotActive(uint256 campaignId);
    error InvalidCampaignDates();
    error InsufficientFunds(uint256 requested, uint256 available);
    error BeneficiaryAlreadyInCampaign(uint256 campaignId, address beneficiary);
    
    // ============ Constructor ============
    
    constructor(address _reliefToken, address _spendingController) {
        reliefToken = ReliefStablecoin(_reliefToken);
        spendingController = SpendingController(_spendingController);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(CAMPAIGN_MANAGER_ROLE, msg.sender);
    }
    
    // ============ Campaign Management ============
    
    /**
     * @dev Create a new disaster relief campaign
     */
    function createCampaign(
        string calldata name,
        string calldata description,
        string calldata region,
        DisasterType disasterType,
        uint256 targetAmount,
        uint256 startDate,
        uint256 endDate,
        string calldata metadataURI
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) returns (uint256) {
        if (endDate <= startDate) revert InvalidCampaignDates();
        
        uint256 campaignId = ++campaignCounter;
        
        campaigns[campaignId] = Campaign({
            id: campaignId,
            name: name,
            description: description,
            region: region,
            disasterType: disasterType,
            status: CampaignStatus.DRAFT,
            creator: msg.sender,
            targetAmount: targetAmount,
            raisedAmount: 0,
            distributedAmount: 0,
            beneficiaryCount: 0,
            createdAt: block.timestamp,
            startDate: startDate,
            endDate: endDate,
            metadataURI: metadataURI
        });
        
        emit CampaignCreated(
            campaignId,
            name,
            region,
            disasterType,
            targetAmount,
            msg.sender,
            block.timestamp
        );
        
        return campaignId;
    }
    
    /**
     * @dev Activate a campaign
     */
    function activateCampaign(uint256 campaignId) 
        external 
        onlyRole(CAMPAIGN_MANAGER_ROLE) 
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.id == 0) revert CampaignNotFound(campaignId);
        
        CampaignStatus oldStatus = campaign.status;
        campaign.status = CampaignStatus.ACTIVE;
        
        emit CampaignStatusUpdated(
            campaignId,
            oldStatus,
            CampaignStatus.ACTIVE,
            block.timestamp
        );
    }
    
    /**
     * @dev Pause a campaign
     */
    function pauseCampaign(uint256 campaignId) 
        external 
        onlyRole(CAMPAIGN_MANAGER_ROLE) 
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.id == 0) revert CampaignNotFound(campaignId);
        
        CampaignStatus oldStatus = campaign.status;
        campaign.status = CampaignStatus.PAUSED;
        
        emit CampaignStatusUpdated(
            campaignId,
            oldStatus,
            CampaignStatus.PAUSED,
            block.timestamp
        );
    }
    
    /**
     * @dev Complete a campaign
     */
    function completeCampaign(uint256 campaignId) 
        external 
        onlyRole(CAMPAIGN_MANAGER_ROLE) 
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.id == 0) revert CampaignNotFound(campaignId);
        
        CampaignStatus oldStatus = campaign.status;
        campaign.status = CampaignStatus.COMPLETED;
        
        emit CampaignStatusUpdated(
            campaignId,
            oldStatus,
            CampaignStatus.COMPLETED,
            block.timestamp
        );
    }
    
    // ============ Fund Management ============
    
    /**
     * @dev Record funds raised for a campaign (called after minting)
     */
    function recordFundsRaised(
        uint256 campaignId,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.id == 0) revert CampaignNotFound(campaignId);
        
        campaign.raisedAmount += amount;
        
        emit FundsRaised(
            campaignId,
            amount,
            campaign.raisedAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Add beneficiary to campaign with allocation
     */
    function addBeneficiaryToCampaign(
        uint256 campaignId,
        address beneficiary,
        uint256 allocation
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.id == 0) revert CampaignNotFound(campaignId);
        
        if (beneficiaryAllocations[campaignId][beneficiary] > 0) {
            revert BeneficiaryAlreadyInCampaign(campaignId, beneficiary);
        }
        
        campaignBeneficiaries[campaignId].push(beneficiary);
        beneficiaryAllocations[campaignId][beneficiary] = allocation;
        campaign.beneficiaryCount++;
        
        emit BeneficiaryAddedToCampaign(
            campaignId,
            beneficiary,
            allocation,
            block.timestamp
        );
    }
    
    /**
     * @dev Distribute funds to a beneficiary
     */
    function distributeTobeneficiary(
        uint256 campaignId,
        address beneficiary,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.id == 0) revert CampaignNotFound(campaignId);
        if (campaign.status != CampaignStatus.ACTIVE) {
            revert CampaignNotActive(campaignId);
        }
        
        uint256 available = campaign.raisedAmount - campaign.distributedAmount;
        if (amount > available) {
            revert InsufficientFunds(amount, available);
        }
        
        campaign.distributedAmount += amount;
        
        emit FundsDistributedToBeneficiary(
            campaignId,
            beneficiary,
            amount,
            block.timestamp
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get campaign details
     */
    function getCampaign(uint256 campaignId) 
        external 
        view 
        returns (Campaign memory) 
    {
        return campaigns[campaignId];
    }
    
    /**
     * @dev Get campaign beneficiaries
     */
    function getCampaignBeneficiaries(uint256 campaignId) 
        external 
        view 
        returns (address[] memory) 
    {
        return campaignBeneficiaries[campaignId];
    }
    
    /**
     * @dev Get beneficiary allocation in a campaign
     */
    function getBeneficiaryAllocation(
        uint256 campaignId,
        address beneficiary
    ) external view returns (uint256) {
        return beneficiaryAllocations[campaignId][beneficiary];
    }
    
    /**
     * @dev Get campaign statistics
     */
    function getCampaignStats(uint256 campaignId) 
        external 
        view 
        returns (
            uint256 targetAmount,
            uint256 raisedAmount,
            uint256 distributedAmount,
            uint256 beneficiaryCount,
            uint256 remainingFunds
        ) 
    {
        Campaign storage campaign = campaigns[campaignId];
        return (
            campaign.targetAmount,
            campaign.raisedAmount,
            campaign.distributedAmount,
            campaign.beneficiaryCount,
            campaign.raisedAmount - campaign.distributedAmount
        );
    }
    
    /**
     * @dev Get disaster type name
     */
    function getDisasterTypeName(DisasterType dtype) 
        external 
        pure 
        returns (string memory) 
    {
        if (dtype == DisasterType.EARTHQUAKE) return "Earthquake";
        if (dtype == DisasterType.FLOOD) return "Flood";
        if (dtype == DisasterType.HURRICANE) return "Hurricane";
        if (dtype == DisasterType.WILDFIRE) return "Wildfire";
        if (dtype == DisasterType.PANDEMIC) return "Pandemic";
        if (dtype == DisasterType.CONFLICT) return "Conflict";
        if (dtype == DisasterType.DROUGHT) return "Drought";
        return "Other";
    }
}
