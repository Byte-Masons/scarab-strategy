async function main() {
  const Vault = await ethers.getContractFactory('ReaperVaultv1_4');

  const wantAddress = '0x78e70eF4eE5cc72FC25A8bDA4519c45594CcD8d4';
  const tokenName = 'Scarab FTM-SCARAB Crypt'; // Protocol + Want + Crypt
  const tokenSymbol = 'rfSPIRIT-LP-FTM-SCARAB'; // rf + wantSymbol + pair if needed for clarification
  const depositFee = 0;
  const tvlCap = ethers.utils.parseEther('2000');
  const options = {gasPrice: 200000000000, gasLimit: 9000000};

  const vault = await Vault.deploy(wantAddress, tokenName, tokenSymbol, depositFee, tvlCap, options);

  await vault.deployed();
  console.log('Vault deployed to:', vault.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
