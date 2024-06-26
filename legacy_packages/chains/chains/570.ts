import type { Chain } from "../src/types";
export default {
  "chain": "SYS",
  "chainId": 570,
  "explorers": [
    {
      "name": "Rollux Explorer",
      "url": "https://explorer.rollux.com",
      "standard": "EIP3091"
    }
  ],
  "faucets": [
    "https://rollux.id/faucetapp"
  ],
  "infoURL": "https://rollux.com",
  "name": "Rollux Mainnet",
  "nativeCurrency": {
    "name": "Syscoin",
    "symbol": "SYS",
    "decimals": 18
  },
  "networkId": 570,
  "rpc": [
    "https://570.rpc.thirdweb.com/${THIRDWEB_API_KEY}",
    "https://rpc.rollux.com",
    "wss://rpc.rollux.com/wss",
    "https://rpc.ankr.com/rollux",
    "https://rollux.rpc.syscoin.org",
    "wss://rollux.rpc.syscoin.org/wss"
  ],
  "shortName": "sys-rollux",
  "slug": "rollux",
  "testnet": false
} as const satisfies Chain;