const hre = require('hardhat');
const chai = require('chai');
const {solidity} = require('ethereum-waffle');
chai.use(solidity);
const {expect} = chai;

const moveTimeForward = async (seconds) => {
  await network.provider.send('evm_increaseTime', [seconds]);
  await network.provider.send('evm_mine');
};

const toWantUnit = (num, isUSDC = false) => {
  if (isUSDC) {
    return ethers.BigNumber.from(num * 10 ** 8);
  }
  return ethers.utils.parseEther(num);
};

describe('Vaults', function () {
  // Strategy specific variables, need to be changed
  const wantAddress = '0x78e70eF4eE5cc72FC25A8bDA4519c45594CcD8d4';
  const poolId = 0;
  const wantHolder = '0x1E71AEE6081f62053123140aacC7a06021D77348'; // ftm-scarab
  const wantWhaleAddress = '0xd919296303D6166A25a8a0a4F328E43B07E0fb27'; // ftm-scarab
  const strategistAddress = '0x1E71AEE6081f62053123140aacC7a06021D77348';

  // Shared accross all strategies
  let Vault;
  let Strategy;
  let Treasury;
  let Want;
  let vault;
  let strategy;
  const paymentSplitterAddress = '0x63cbd4134c2253041F370472c130e92daE4Ff174';
  let treasury;
  let want;
  let self;
  let wantWhale;
  let selfAddress;
  let strategist;
  let owner;

  let whaleBalance;
  let whaleDepositAmount;
  let userBalance;
  let depositAmount;

  beforeEach(async function () {
    //reset network
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: 'https://rpc.ftm.tools/',
          },
        },
      ],
    });
    console.log('providers');
    //get signers
    [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [wantHolder],
    });
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [wantWhaleAddress],
    });
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [strategistAddress],
    });
    self = await ethers.provider.getSigner(wantHolder);
    wantWhale = await ethers.provider.getSigner(wantWhaleAddress);
    strategist = await ethers.provider.getSigner(strategistAddress);
    selfAddress = await self.getAddress();
    ownerAddress = await owner.getAddress();
    console.log('addresses');

    //get artifacts
    Strategy = await ethers.getContractFactory('ReaperStrategyScarab');
    Vault = await ethers.getContractFactory('ReaperVaultv1_4');
    Treasury = await ethers.getContractFactory('ReaperTreasury');
    Want = await ethers.getContractFactory('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20');
    console.log('artifacts');

    //deploy contracts
    treasury = await Treasury.deploy();
    console.log('treasury');
    want = await Want.attach(wantAddress);
    console.log('want attached');
    const depositFee = 0;
    vault = await Vault.deploy(
      wantAddress,
      'Scarab FTM-SCARAB Crypt',
      'rfWFTM-SCARAB',
      depositFee,
      ethers.utils.parseEther('999999'),
    );
    console.log('vault');

    console.log(`vault.address: ${vault.address}`);
    console.log(`treasury.address: ${treasury.address}`);

    console.log('strategy');
    strategy = await hre.upgrades.deployProxy(
      Strategy,
      [vault.address, [treasury.address, paymentSplitterAddress], [strategistAddress], wantAddress, poolId],
      {kind: 'uups'},
    );
    await strategy.deployed();

    await vault.initialize(strategy.address);

    console.log(`Strategy deployed to ${strategy.address}`);
    console.log(`Vault deployed to ${vault.address}`);
    console.log(`Treasury deployed to ${treasury.address}`);

    //approving LP token and vault share spend
    console.log('approving...');
    await want.approve(vault.address, ethers.utils.parseEther('1000000000'));
    await want.connect(self).approve(vault.address, ethers.utils.parseEther('1000000000'));
    await want.connect(wantWhale).approve(vault.address, ethers.utils.parseEther('1000000000'));

    userBalance = await want.balanceOf(selfAddress);
    depositAmount = userBalance.div(2);
    whaleBalance = await want.balanceOf(wantWhaleAddress);
    whaleDepositAmount = whaleBalance.mul(9).div(10);
  });

  xdescribe('Deploying the vault and strategy', function () {
    it('should initiate vault with a 0 balance', async function () {
      console.log(1);
      const totalBalance = await vault.balance();
      console.log(2);
      const availableBalance = await vault.available();
      console.log(3);
      const pricePerFullShare = await vault.getPricePerFullShare();
      console.log(4);
      expect(totalBalance).to.equal(0);
      console.log(5);
      expect(availableBalance).to.equal(0);
      console.log(6);
      expect(pricePerFullShare).to.equal(ethers.utils.parseEther('1'));
    });
  });
  describe('Vault Tests', function () {
    it('should allow deposits and account for them correctly', async function () {
      console.log('---------------------------------------------');
      const vaultBalance = await vault.balance();
      console.log(`vaultBalance: ${vaultBalance}`);
      await vault.connect(self).deposit(depositAmount);
      const newVaultBalance = await vault.balance();
      console.log(`newVaultBalance: ${newVaultBalance}`);
      const newUserBalance = await want.balanceOf(selfAddress);
      console.log(`newUserBalance: ${newUserBalance}`);
      const allowedInaccuracy = depositAmount.div(200);
      expect(depositAmount).to.be.closeTo(newVaultBalance, allowedInaccuracy);
    });

    it('should mint user their pool share', async function () {
      console.log('---------------------------------------------');
      await vault.connect(self).deposit(depositAmount);
      console.log((await vault.balance()).toString());

      await vault.connect(wantWhale).deposit(whaleDepositAmount);
      const selfWantBalance = await vault.balanceOf(selfAddress);
      console.log(selfWantBalance.toString());
      const ownerDepositAmount = toWantUnit('0.1');
      await want.connect(self).transfer(ownerAddress, ownerDepositAmount);
      const ownerBalance = await want.balanceOf(ownerAddress);

      console.log(ownerBalance.toString());
      await vault.deposit(ownerDepositAmount);
      console.log((await vault.balance()).toString());
      const ownerVaultWantBalance = await vault.balanceOf(ownerAddress);
      console.log(`ownerVaultWantBalance.toString(): ${ownerVaultWantBalance.toString()}`);
      await vault.withdrawAll();
      const ownerWantBalance = await want.balanceOf(ownerAddress);
      console.log(`ownerWantBalance: ${ownerWantBalance}`);
      const ownerVaultWantBalanceAfterWithdraw = await vault.balanceOf(ownerAddress);
      console.log(`ownerVaultWantBalanceAfterWithdraw: ${ownerVaultWantBalanceAfterWithdraw}`);
      const allowedImprecision = toWantUnit('0.0001');
      expect(ownerWantBalance).to.be.closeTo(ownerDepositAmount, allowedImprecision);
      expect(selfWantBalance).to.equal(depositAmount);
    });

    it('should allow withdrawals', async function () {
      console.log('---------------------------------------------');
      await vault.connect(self).deposit(depositAmount);
      console.log(`await want.balanceOf(selfAddress): ${await want.balanceOf(selfAddress)}`);

      await vault.connect(self).withdrawAll();
      const newUserVaultBalance = await vault.balanceOf(selfAddress);
      console.log(`newUserVaultBalance: ${newUserVaultBalance}`);
      const userBalanceAfterWithdraw = await want.balanceOf(selfAddress);
      const securityFee = 10;
      const percentDivisor = 10000;
      const withdrawFee = depositAmount.mul(securityFee).div(percentDivisor);
      const expectedBalance = userBalance.sub(withdrawFee);
      const smallDifference = expectedBalance.div(200);
      console.log(`expectedBalance.sub(userBalanceAfterWithdraw): ${expectedBalance.sub(userBalanceAfterWithdraw)}`);
      console.log(`smallDifference: ${smallDifference}`);
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw) < smallDifference;
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should allow small withdrawal', async function () {
      console.log('---------------------------------------------');
      await vault.connect(self).deposit(depositAmount);
      console.log(`await want.balanceOf(selfAddress): ${await want.balanceOf(selfAddress)}`);

      await vault.connect(wantWhale).deposit(whaleDepositAmount);

      await vault.connect(self).withdrawAll();
      const newUserVaultBalance = await vault.balanceOf(selfAddress);
      console.log(`newUserVaultBalance: ${newUserVaultBalance}`);
      const userBalanceAfterWithdraw = await want.balanceOf(selfAddress);
      const securityFee = 10;
      const depositFee = 10;
      const percentDivisor = 10000;
      const withdrawFee = depositAmount.mul(securityFee).div(percentDivisor);
      const depositFeePayed = depositAmount.mul(depositFee).div(percentDivisor);
      const expectedBalance = userBalance.sub(withdrawFee).sub(depositFeePayed);
      const smallDifference = depositAmount.div(100);
      console.log(`expectedBalance.sub(userBalanceAfterWithdraw): ${expectedBalance.sub(userBalanceAfterWithdraw)}`);
      console.log(`smallDifference: ${smallDifference}`);
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw) < smallDifference;
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should handle small deposit + withdraw', async function () {
      console.log('---------------------------------------------');

      await vault.connect(self).deposit(depositAmount);
      console.log(`await want.balanceOf(selfAddress): ${await want.balanceOf(selfAddress)}`);

      const percentDivisor = 10000;

      await vault.connect(self).withdraw(depositAmount);
      console.log(`await want.balanceOf(selfAddress): ${await want.balanceOf(selfAddress)}`);
      const newUserVaultBalance = await vault.balanceOf(selfAddress);
      console.log(`newUserVaultBalance: ${newUserVaultBalance}`);
      const userBalanceAfterWithdraw = await want.balanceOf(selfAddress);

      const securityFee = 10;
      const withdrawFee = depositAmount.mul(securityFee).div(percentDivisor);

      const expectedBalance = userBalance.sub(withdrawFee);
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw) < 200;
      console.log(`expectedBalance: ${expectedBalance}`);
      console.log(`userBalanceAfterWithdraw: ${userBalanceAfterWithdraw}`);
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should be able to harvest', async function () {
      console.log('---------------------------------------------');
      await vault.connect(self).deposit(depositAmount);
      const estimatedGas = await strategy.estimateGas.harvest();
      console.log(`estimatedGas: ${estimatedGas}`);
      await strategy.connect(self).harvest();
    });

    it('should provide yield', async function () {
      console.log('---------------------------------------------');
      const timeToSkip = 3600;

      await vault.connect(self).deposit(depositAmount);
      const initialVaultBalance = await vault.balance();

      await strategy.updateHarvestLogCadence(timeToSkip / 2);

      const numHarvests = 5;
      for (let i = 0; i < numHarvests; i++) {
        await moveTimeForward(timeToSkip);
        //await vault.connect(self).deposit(depositAmount);
        await strategy.harvest();
      }

      const finalVaultBalance = await vault.balance();
      console.log(`finalVaultBalance: ${finalVaultBalance}`);
      console.log(`initialVaultBalance: ${initialVaultBalance}`);
      expect(finalVaultBalance).to.be.gt(initialVaultBalance);

      const averageAPR = await strategy.averageAPRAcrossLastNHarvests(numHarvests);
      console.log(`Average APR across ${numHarvests} harvests is ${averageAPR} basis points.`);
    });
  });
  xdescribe('Strategy', function () {
    it('should be able to pause and unpause', async function () {
      console.log('---------------------------------------------');
      await strategy.pause();
      await expect(vault.connect(self).deposit(depositAmount)).to.be.reverted;
      await strategy.unpause();
      await expect(vault.connect(self).deposit(depositAmount)).to.not.be.reverted;
    });

    it('should be able to panic', async function () {
      console.log('---------------------------------------------');
      await vault.connect(self).deposit(depositAmount);
      const vaultBalance = await vault.balance();
      const strategyBalance = await strategy.balanceOf();
      await strategy.panic();
      expect(vaultBalance).to.equal(strategyBalance);
      const newVaultBalance = await vault.balance();
      const allowedImprecision = toWantUnit('0.000000001');
      expect(newVaultBalance).to.be.closeTo(vaultBalance, allowedImprecision);
    });

    it('should be able to retire strategy', async function () {
      console.log('---------------------------------------------');
      await vault.connect(self).deposit(depositAmount);
      const vaultBalance = await vault.balance();
      const strategyBalance = await strategy.balanceOf();
      expect(vaultBalance).to.equal(strategyBalance);
      await expect(strategy.retireStrat()).to.not.be.reverted;
      const newVaultBalance = await vault.balance();
      const newStrategyBalance = await strategy.balanceOf();
      const allowedImprecision = toWantUnit('0.001');
      expect(newVaultBalance).to.be.closeTo(vaultBalance, allowedImprecision);
      expect(newStrategyBalance).to.be.lt(allowedImprecision);
    });

    it('should be able to retire strategy with no balance', async function () {
      console.log('---------------------------------------------');
      await expect(strategy.retireStrat()).to.not.be.reverted;
    });

    it('should be able to estimate harvest', async function () {
      console.log('---------------------------------------------');
      await vault.connect(wantWhale).deposit(whaleDepositAmount);
      const minute = 60;
      const hour = 60 * minute;
      const day = 24 * hour;
      await moveTimeForward(100 * day);
      await strategy.harvest();
      await moveTimeForward(10 * day);
      const [profit, callFeeToUser] = await strategy.estimateHarvest();
      console.log(`profit: ${profit}`);
      const hasProfit = profit.gt(0);
      const hasCallFee = callFeeToUser.gt(0);
      expect(hasProfit).to.equal(true);
      expect(hasCallFee).to.equal(true);
    });
  });
});
