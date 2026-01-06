const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Disaster Relief System", function () {
  let reliefToken;
  let spendingController;
  let campaignManager;
  let owner;
  let admin;
  let beneficiary1;
  let beneficiary2;
  let merchant;
  
  const DECIMALS = 6;
  const toTokens = (amount) => ethers.parseUnits(amount.toString(), DECIMALS);
  
  beforeEach(async function () {
    [owner, admin, beneficiary1, beneficiary2, merchant] = await ethers.getSigners();
    
    // Deploy ReliefStablecoin
    const ReliefStablecoin = await ethers.getContractFactory("ReliefStablecoin");
    reliefToken = await ReliefStablecoin.deploy("Disaster Relief USD", "drUSD");
    await reliefToken.waitForDeployment();
    
    // Deploy SpendingController
    const SpendingController = await ethers.getContractFactory("SpendingController");
    spendingController = await SpendingController.deploy(await reliefToken.getAddress());
    await spendingController.waitForDeployment();
    
    // Deploy CampaignManager
    const CampaignManager = await ethers.getContractFactory("CampaignManager");
    campaignManager = await CampaignManager.deploy(
      await reliefToken.getAddress(),
      await spendingController.getAddress()
    );
    await campaignManager.waitForDeployment();
    
    // Configure contracts
    await reliefToken.setSpendingController(await spendingController.getAddress());
    
    // Grant roles
    const ADMIN_ROLE = await reliefToken.ADMIN_ROLE();
    const MINTER_ROLE = await reliefToken.MINTER_ROLE();
    await reliefToken.grantRole(ADMIN_ROLE, admin.address);
    await reliefToken.grantRole(MINTER_ROLE, admin.address);
  });
  
  describe("ReliefStablecoin", function () {
    it("Should have correct name and symbol", async function () {
      expect(await reliefToken.name()).to.equal("Disaster Relief USD");
      expect(await reliefToken.symbol()).to.equal("drUSD");
    });
    
    it("Should have 6 decimals like USDC", async function () {
      expect(await reliefToken.decimals()).to.equal(6);
    });
    
    it("Should allow admin to whitelist beneficiaries", async function () {
      await reliefToken.whitelistBeneficiary(
        beneficiary1.address,
        "John Doe",
        "California"
      );
      
      expect(await reliefToken.isWhitelisted(beneficiary1.address)).to.be.true;
      
      const info = await reliefToken.getBeneficiaryInfo(beneficiary1.address);
      expect(info.name).to.equal("John Doe");
      expect(info.region).to.equal("California");
      expect(info.isActive).to.be.true;
    });
    
    it("Should allow minting for campaigns", async function () {
      await reliefToken.connect(admin).mintForCampaign(
        owner.address,
        toTokens(10000),
        "CAMPAIGN-001",
        "Initial fund allocation"
      );
      
      expect(await reliefToken.balanceOf(owner.address)).to.equal(toTokens(10000));
      expect(await reliefToken.getCampaignFunds("CAMPAIGN-001")).to.equal(toTokens(10000));
    });
    
    it("Should distribute funds to whitelisted beneficiaries", async function () {
      // Whitelist beneficiary
      await reliefToken.whitelistBeneficiary(beneficiary1.address, "Jane Doe", "Texas");
      
      // Mint tokens to admin
      await reliefToken.connect(admin).mintForCampaign(
        admin.address,
        toTokens(5000),
        "CAMPAIGN-002",
        "Relief funds"
      );
      
      // Distribute to beneficiary
      await reliefToken.connect(admin).distributeFunds(
        beneficiary1.address,
        toTokens(1000),
        "CAMPAIGN-002"
      );
      
      expect(await reliefToken.balanceOf(beneficiary1.address)).to.equal(toTokens(1000));
    });
    
    it("Should prevent transfers to non-whitelisted addresses", async function () {
      // Whitelist beneficiary1
      await reliefToken.whitelistBeneficiary(beneficiary1.address, "User1", "Region1");
      
      // Mint to beneficiary1
      await reliefToken.connect(admin).mintForCampaign(
        admin.address,
        toTokens(1000),
        "TEST",
        "Test"
      );
      await reliefToken.connect(admin).distributeFunds(beneficiary1.address, toTokens(500), "TEST");
      
      // Try to transfer to non-whitelisted address (should fail)
      await expect(
        reliefToken.connect(beneficiary1).transfer(beneficiary2.address, toTokens(100))
      ).to.be.revertedWithCustomError(reliefToken, "TransferNotAllowed");
    });
    
    it("Should be pausable", async function () {
      await reliefToken.pause();
      
      await expect(
        reliefToken.connect(admin).mintForCampaign(
          owner.address,
          toTokens(1000),
          "TEST",
          "Test"
        )
      ).to.be.revertedWithCustomError(reliefToken, "EnforcedPause");
      
      await reliefToken.unpause();
      
      await reliefToken.connect(admin).mintForCampaign(
        owner.address,
        toTokens(1000),
        "TEST",
        "Test"
      );
      expect(await reliefToken.balanceOf(owner.address)).to.equal(toTokens(1000));
    });
  });
  
  describe("SpendingController", function () {
    beforeEach(async function () {
      // Setup: whitelist beneficiary, mint tokens, set allowances
      await reliefToken.whitelistBeneficiary(beneficiary1.address, "Test User", "Test Region");
      await reliefToken.connect(admin).mintForCampaign(
        admin.address,
        toTokens(10000),
        "CAMP-TEST",
        "Test funds"
      );
      await reliefToken.connect(admin).distributeFunds(beneficiary1.address, toTokens(2000), "CAMP-TEST");
      
      // Register merchant
      await spendingController.registerMerchant(
        merchant.address,
        "Food Store",
        0, // FOOD category
        "123 Main St"
      );
      
      // Set allowances for beneficiary
      await spendingController.setAllAllowances(
        beneficiary1.address,
        toTokens(500),  // Food
        toTokens(300),  // Medical
        toTokens(400),  // Shelter
        toTokens(100),  // Utilities
        toTokens(100)   // Transport
      );
    });
    
    it("Should register merchants correctly", async function () {
      const merchantInfo = await spendingController.getMerchantInfo(merchant.address);
      expect(merchantInfo.name).to.equal("Food Store");
      expect(merchantInfo.category).to.equal(0); // FOOD
      expect(merchantInfo.isActive).to.be.true;
    });
    
    it("Should allow spending at registered merchants", async function () {
      // Approve spending controller
      await reliefToken.connect(beneficiary1).approve(
        await spendingController.getAddress(),
        toTokens(1000)
      );
      
      // Spend at merchant
      await spendingController.connect(beneficiary1).spend(
        merchant.address,
        toTokens(100),
        "Receipt-001"
      );
      
      expect(await reliefToken.balanceOf(merchant.address)).to.equal(toTokens(100));
      expect(await reliefToken.balanceOf(beneficiary1.address)).to.equal(toTokens(1900));
    });
    
    it("Should enforce category allowances", async function () {
      await reliefToken.connect(beneficiary1).approve(
        await spendingController.getAddress(),
        toTokens(1000)
      );
      
      // Try to spend more than food allowance
      await expect(
        spendingController.connect(beneficiary1).spend(
          merchant.address,
          toTokens(600), // More than 500 food allowance
          "Receipt-002"
        )
      ).to.be.revertedWithCustomError(spendingController, "InsufficientAllowance");
    });
    
    it("Should track spending correctly", async function () {
      await reliefToken.connect(beneficiary1).approve(
        await spendingController.getAddress(),
        toTokens(1000)
      );
      
      await spendingController.connect(beneficiary1).spend(
        merchant.address,
        toTokens(200),
        "Receipt-003"
      );
      
      const remaining = await spendingController.getRemainingAllowance(
        beneficiary1.address,
        0 // FOOD
      );
      expect(remaining).to.equal(toTokens(300)); // 500 - 200
    });
    
    it("Should return beneficiary status correctly", async function () {
      const [allowances, spending, balance, dailyRemaining] = 
        await spendingController.getBeneficiaryStatus(beneficiary1.address);
      
      expect(allowances[0]).to.equal(toTokens(500)); // Food allowance
      expect(balance).to.equal(toTokens(2000));
    });
  });
  
  describe("CampaignManager", function () {
    it("Should create campaigns", async function () {
      const now = Math.floor(Date.now() / 1000);
      
      await campaignManager.createCampaign(
        "Hurricane Relief 2024",
        "Emergency relief for hurricane victims",
        "Florida",
        2, // HURRICANE
        toTokens(100000),
        now,
        now + 86400 * 30, // 30 days
        "ipfs://Qm..."
      );
      
      const campaign = await campaignManager.getCampaign(1);
      expect(campaign.name).to.equal("Hurricane Relief 2024");
      expect(campaign.region).to.equal("Florida");
      expect(campaign.disasterType).to.equal(2);
    });
    
    it("Should manage campaign lifecycle", async function () {
      const now = Math.floor(Date.now() / 1000);
      
      await campaignManager.createCampaign(
        "Flood Relief",
        "Description",
        "Louisiana",
        1, // FLOOD
        toTokens(50000),
        now,
        now + 86400 * 14,
        ""
      );
      
      // Activate
      await campaignManager.activateCampaign(1);
      let campaign = await campaignManager.getCampaign(1);
      expect(campaign.status).to.equal(1); // ACTIVE
      
      // Pause
      await campaignManager.pauseCampaign(1);
      campaign = await campaignManager.getCampaign(1);
      expect(campaign.status).to.equal(2); // PAUSED
      
      // Complete
      await campaignManager.completeCampaign(1);
      campaign = await campaignManager.getCampaign(1);
      expect(campaign.status).to.equal(3); // COMPLETED
    });
    
    it("Should add beneficiaries to campaigns", async function () {
      const now = Math.floor(Date.now() / 1000);
      
      await campaignManager.createCampaign(
        "Test Campaign",
        "Description",
        "Region",
        0,
        toTokens(10000),
        now,
        now + 86400,
        ""
      );
      
      await campaignManager.addBeneficiaryToCampaign(
        1,
        beneficiary1.address,
        toTokens(500)
      );
      
      const beneficiaries = await campaignManager.getCampaignBeneficiaries(1);
      expect(beneficiaries.length).to.equal(1);
      expect(beneficiaries[0]).to.equal(beneficiary1.address);
      
      const allocation = await campaignManager.getBeneficiaryAllocation(1, beneficiary1.address);
      expect(allocation).to.equal(toTokens(500));
    });
  });
  
  describe("Integration Tests", function () {
    it("Should complete full relief flow", async function () {
      const now = Math.floor(Date.now() / 1000);
      
      // 1. Admin creates campaign
      await campaignManager.createCampaign(
        "Earthquake Relief",
        "Emergency relief for earthquake victims",
        "Japan",
        0, // EARTHQUAKE
        toTokens(100000),
        now,
        now + 86400 * 60,
        ""
      );
      
      // 2. Activate campaign
      await campaignManager.activateCampaign(1);
      
      // 3. Whitelist beneficiaries
      await reliefToken.whitelistBeneficiary(beneficiary1.address, "Victim1", "Tokyo");
      await reliefToken.whitelistBeneficiary(beneficiary2.address, "Victim2", "Osaka");
      
      // 4. Mint relief tokens
      await reliefToken.connect(admin).mintForCampaign(
        admin.address,
        toTokens(50000),
        "1",
        "Initial relief fund"
      );
      
      // 5. Distribute to beneficiaries
      await reliefToken.connect(admin).distributeFunds(beneficiary1.address, toTokens(5000), "1");
      await reliefToken.connect(admin).distributeFunds(beneficiary2.address, toTokens(5000), "1");
      
      expect(await reliefToken.balanceOf(beneficiary1.address)).to.equal(toTokens(5000));
      expect(await reliefToken.balanceOf(beneficiary2.address)).to.equal(toTokens(5000));
      
      // 6. Register merchants
      await spendingController.registerMerchant(merchant.address, "Local Pharmacy", 1, "Tokyo"); // MEDICAL
      
      // 7. Set beneficiary allowances
      await spendingController.setAllAllowances(
        beneficiary1.address,
        toTokens(2000), // Food
        toTokens(2000), // Medical
        toTokens(1000), // Shelter
        toTokens(0),
        toTokens(0)
      );
      
      // 8. Beneficiary spends
      await reliefToken.connect(beneficiary1).approve(
        await spendingController.getAddress(),
        toTokens(5000)
      );
      
      await spendingController.connect(beneficiary1).spend(
        merchant.address,
        toTokens(500),
        "Medicine purchase"
      );
      
      // Verify final state
      expect(await reliefToken.balanceOf(beneficiary1.address)).to.equal(toTokens(4500));
      expect(await reliefToken.balanceOf(merchant.address)).to.equal(toTokens(500));
      
      const remaining = await spendingController.getRemainingAllowance(beneficiary1.address, 1);
      expect(remaining).to.equal(toTokens(1500)); // 2000 - 500
    });
  });
});
