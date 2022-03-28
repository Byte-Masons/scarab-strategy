async function main() {
  const vaultAddress = '0xCf6b9984f44bA20bA3bBaf929380A5E9189Be9C4';
  const strategyAddress = '0xB0f0b751994820eA36644b74644683E1DdF2188B';

  const Vault = await ethers.getContractFactory('ReaperVaultv1_4');
  const vault = Vault.attach(vaultAddress);

  const options = {gasPrice: 300000000000, gasLimit: 9000000};
  await vault.initialize(strategyAddress, options);
  console.log('Vault initialized');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
