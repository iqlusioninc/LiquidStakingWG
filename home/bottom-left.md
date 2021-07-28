* All Staked ATOMs or other SDK chain assets should be available to issue a staking derivative without unbonding or redelegating them.
* The design will depend on deploying [epoch based staking](https://github.com/cosmos/cosmos-sdk/pull/9043) on the Hub.
* The base design will not solve for fungibility. Fungibility will be achieved though new hub modules, cosmwasms contract or new zones.
* This system will be implemented via an upgrade of Hub.
