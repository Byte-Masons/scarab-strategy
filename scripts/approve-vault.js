async function main() {
  const vaultAddress = '0xc007082d83f07F2bfDcB5679e325d1113e509238';
  const wantAddress = '0x27228140D72a7186F70eD3052C3318f2D55c404d';

  const ERC20 = await ethers.getContractFactory('contracts/ERC20.sol:ERC20');
  const erc20 = await ERC20.attach(wantAddress);
  const [deployer] = await ethers.getSigners();
  console.log(await erc20.allowance(deployer.address, vaultAddress));
  await erc20.approve(vaultAddress, ethers.utils.parseEther('100'));
  console.log('erc20 approved');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
