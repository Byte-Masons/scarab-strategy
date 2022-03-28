async function main() {
  const vaultAddress = '0xc007082d83f07F2bfDcB5679e325d1113e509238';
  const strategyAddress = '0xEd08E7d3aDcbE545dCc39CC0B4Ef793E4759FfbD';

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
