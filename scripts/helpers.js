/* eslint-disable prettier/prettier */
/* eslint-disable node/no-unsupported-features/es-syntax */
module.exports.getTools = async () => {
  const vaultAddress = '0xc007082d83f07F2bfDcB5679e325d1113e509238';
  const strategyAddress = '0xEd08E7d3aDcbE545dCc39CC0B4Ef793E4759FfbD';
  const wantAddress = '0x27228140D72a7186F70eD3052C3318f2D55c404d';
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
