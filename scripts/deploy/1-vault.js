async function main() {
  const Vault = await ethers.getContractFactory('ReaperVaultv1_4');

  const wantAddress = '0x27228140D72a7186F70eD3052C3318f2D55c404d';
  const tokenName = 'Scarab FTM-GSCARAB Crypt'; // Protocol + Want + Crypt
  const tokenSymbol = 'rfSPIRIT-LP-FTM-GSCARAB'; // rf + wantSymbol + pair if needed for clarification
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
