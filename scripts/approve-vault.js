async function main() {
  const vaultAddress = '';
  const wantAddress = '0x78e70eF4eE5cc72FC25A8bDA4519c45594CcD8d4';
  
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
