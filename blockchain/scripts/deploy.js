const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Disaster Relief System Contracts...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("");
  
  // 1. Deploy ReliefStablecoin
  console.log("1️⃣ Deploying ReliefStablecoin...");
  const ReliefStablecoin = await hre.ethers.getContractFactory("ReliefStablecoin");
  const reliefToken = await ReliefStablecoin.deploy(
    "Disaster Relief USD",
    "drUSD"
  );
  await reliefToken.waitForDeployment();
  const reliefTokenAddress = await reliefToken.getAddress();
  console.log("   ✅ ReliefStablecoin deployed to:", reliefTokenAddress);
  
  // 2. Deploy SpendingController
  console.log("\n2️⃣ Deploying SpendingController...");
  const SpendingController = await hre.ethers.getContractFactory("SpendingController");
  const spendingController = await SpendingController.deploy(reliefTokenAddress);
  await spendingController.waitForDeployment();
  const spendingControllerAddress = await spendingController.getAddress();
  console.log("   ✅ SpendingController deployed to:", spendingControllerAddress);
  
  // 3. Deploy CampaignManager
  console.log("\n3️⃣ Deploying CampaignManager...");
  const CampaignManager = await hre.ethers.getContractFactory("CampaignManager");
  const campaignManager = await CampaignManager.deploy(
    reliefTokenAddress,
    spendingControllerAddress
  );
  await campaignManager.waitForDeployment();
  const campaignManagerAddress = await campaignManager.getAddress();
  console.log("   ✅ CampaignManager deployed to:", campaignManagerAddress);
  
  // 4. Configure contracts
  console.log("\n4️⃣ Configuring contracts...");
  
  // Set spending controller in ReliefStablecoin
  const setControllerTx = await reliefToken.setSpendingController(spendingControllerAddress);
  await setControllerTx.wait();
  console.log("   ✅ SpendingController set in ReliefStablecoin");
  
  // Grant MINTER_ROLE to CampaignManager
  const MINTER_ROLE = await reliefToken.MINTER_ROLE();
  const grantMinterTx = await reliefToken.grantRole(MINTER_ROLE, campaignManagerAddress);
  await grantMinterTx.wait();
  console.log("   ✅ MINTER_ROLE granted to CampaignManager");
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   ReliefStablecoin:    ", reliefTokenAddress);
  console.log("   SpendingController:  ", spendingControllerAddress);
  console.log("   CampaignManager:     ", campaignManagerAddress);
  
  console.log("\n📝 Save these addresses to your .env file:");
  console.log(`   RELIEF_TOKEN_ADDRESS=${reliefTokenAddress}`);
  console.log(`   SPENDING_CONTROLLER_ADDRESS=${spendingControllerAddress}`);
  console.log(`   CAMPAIGN_MANAGER_ADDRESS=${campaignManagerAddress}`);
  
  // Verify on Etherscan if not local
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n⏳ Waiting for block confirmations before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    
    console.log("\n🔍 Verifying contracts on Etherscan...");
    
    try {
      await hre.run("verify:verify", {
        address: reliefTokenAddress,
        constructorArguments: ["Disaster Relief USD", "drUSD"],
      });
      console.log("   ✅ ReliefStablecoin verified");
    } catch (e) {
      console.log("   ⚠️ ReliefStablecoin verification failed:", e.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: spendingControllerAddress,
        constructorArguments: [reliefTokenAddress],
      });
      console.log("   ✅ SpendingController verified");
    } catch (e) {
      console.log("   ⚠️ SpendingController verification failed:", e.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: campaignManagerAddress,
        constructorArguments: [reliefTokenAddress, spendingControllerAddress],
      });
      console.log("   ✅ CampaignManager verified");
    } catch (e) {
      console.log("   ⚠️ CampaignManager verification failed:", e.message);
    }
  }
  
  return {
    reliefToken: reliefTokenAddress,
    spendingController: spendingControllerAddress,
    campaignManager: campaignManagerAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
