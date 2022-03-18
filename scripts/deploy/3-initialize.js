async function main() {
  const vaultAddress = '0x9895Cfc6BfC454410796AcbeC9FED33157458FDE';
  const strategyAddress = '0x3630a380F320EA77284Ed03D09B4C73D1351C41e';

  const Vault = await ethers.getContractFactory('ReaperVaultv1_3');
  const vault = Vault.attach(vaultAddress);

  const options = { gasPrice: 300000000000, gasLimit: 9000000 };
  await vault.initialize(strategyAddress, options);
  console.log('Vault initialized');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
