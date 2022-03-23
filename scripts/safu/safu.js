/* eslint-disable prettier/prettier */
/* eslint-disable node/no-unsupported-features/es-syntax */
import { getTools } from "../helpers";

const main = async () => {
    const {deployer, vault, strategy, want} = await getTools();
    let wantBalance = want.balanceOf(deployer.address);
    await want.approve(vault.address, wantBalance);
    vault.depositAll().then(() => {
        console.log(`1 - Vault | Deposited ${wantBalance}`)
    });

    vault.withdrawAll().then(() => {
        console.log(`2 - Vault | Withdrew everything`)
    });

    wantBalance = want.balanceOf(deployer.address);
    await want.approve(vault.address, wantBalance);
    vault.depositAll().then(() => {
        console.log(`3 - Vault | Deposited ${wantBalance}`)
    });

    strategy.harvest().then(() => {
        console.log(`4 - Strategy | Harvested`)
    });

    strategy.panic().then(() => {
        console.log(`5 - Strategy | Panic!` )
    });

    vault.withdrawAll().then(() => {
        console.log(`6 - Vault | Withdrew everything`)
    });

    wantBalance = want.balanceOf(deployer.address);
    await want.approve(vault.address, wantBalance);
    try {
        vault.depositAll().then(() => {
            console.log(`Vault | Wrong place bud, you should not be here`);
        })
    } catch (error) {
        console.log(`7 - Vault | Deposit failed, that's good`);
    }

    strategy.unpause().then(() => {
        console.log(`8 - Strategy | Unpaused`)
    });

    vault.depositAll().then(() => {
        console.log(`9 - Vault | Deposited`);
    });
} 

main().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error(error);
    process.exit(1);
})