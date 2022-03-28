/* eslint-disable prettier/prettier */
/* eslint-disable node/no-unsupported-features/es-syntax */
module.exports.getTools = async () => {
  const vaultAddress = '0xCf6b9984f44bA20bA3bBaf929380A5E9189Be9C4';
  const strategyAddress = '0xB0f0b751994820eA36644b74644683E1DdF2188B';
  const wantAddress = '0x78e70eF4eE5cc72FC25A8bDA4519c45594CcD8d4';
  const Strategy = await ethers.getContractFactory('ReaperStrategyScarab');

  const [deployer] = await ethers.getSigners();
  const Vault = await ethers.getContractFactory('ReaperVaultv1_4');
  const Erc20 = await ethers.getContractFactory('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20');
  const vault = Vault.attach(vaultAddress);
  const strategy = Strategy.attach(strategyAddress);
  const want = await Erc20.attach(wantAddress);

  return {
    deployer: deployer,
    vault: vault,
    strategy: strategy,
    want: want
  };
};
