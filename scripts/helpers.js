/* eslint-disable prettier/prettier */
/* eslint-disable node/no-unsupported-features/es-syntax */
export const getTools = async () => {
  const vaultAddress = '';
  const strategyAddress = '';
  const wantAddress = '';
  const Strategy = await ethers.getContracFactory('ReaperStrategyScarab');

  const [deployer] = await ethers.getSigners();
  const Vault = await ethers.getContracFactory('ReaperVaultv1_4');
  const Erc20 = await ethers.getContracFactory('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20');
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
