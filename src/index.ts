import dotenv from 'dotenv';
import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';

dotenv.config();

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY || '',
  network: Network.ETH_MAINNET,
});

const MEME_KEYWORDS = ['doge', 'pepe', 'shib', 'elon', 'avax'];
const tokenCache = new Map<string, { name: string; symbol: string }>();

let lastBlock: number = 0;

async function isMemecoin(tokenAddress: string): Promise<boolean> {
  if (tokenCache.has(tokenAddress)) {
    const meta = tokenCache.get(tokenAddress)!;
    return MEME_KEYWORDS.some(k => meta.name?.toLowerCase().includes(k));
  }

  try {
    const meta = await alchemy.core.getTokenMetadata(tokenAddress);
    if (!meta?.name) return false;

    tokenCache.set(tokenAddress, { name: meta.name, symbol: meta.symbol || '' });
    return MEME_KEYWORDS.some(k => meta.name?.toLowerCase().includes(k));
  } catch {
    return false;
  }
}


async function poll() {
  try {
    const latestBlock = await alchemy.core.getBlockNumber();
    if (latestBlock === lastBlock) return;

    console.log(`New block detected: ${latestBlock}`);

    const transfers = await alchemy.core.getAssetTransfers({
      fromBlock: `0x${latestBlock.toString(16)}`,
      toBlock: `0x${latestBlock.toString(16)}`,
      category: [AssetTransfersCategory.ERC20],
      withMetadata: true,
    });

    for (const tx of transfers.transfers) {
      const token = tx.rawContract?.address?.toLowerCase();
      if (!token) continue;

      if (await isMemecoin(token)) {
        const meta = tokenCache.get(token);
        console.log({
          block: latestBlock,
          token: `${meta?.name} (${meta?.symbol})`,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          hash: tx.hash,
          time: tx.metadata.blockTimestamp,
        });
      }
    }

    // for (const transfer of transfers.transfers) {
    //   const txHash = transfer.hash;
    //   if (!txHash) continue;

    //   const tx = await alchemy.core.getTransaction(txHash);
    //   if (!tx?.to) continue;

    //   const receipt = await alchemy.core.getTransactionReceipt(txHash);
    //   if (!receipt?.contractAddress) continue;

    //   console.log({
    //     txHash,
    //     deployer: tx.from,
    //     contract: receipt.contractAddress,
    //     time: transfer.metadata.blockTimestamp,
    //     note: 'Contract deployment detected',
    //   });
    // }

    lastBlock = latestBlock;
  } catch (err) {
    console.error('❌ Error in polling:', err);
  }
}

async function main() {
  if (!process.env.ALCHEMY_API_KEY) {
    console.error('❌ ALCHEMY_API_KEY is not set in .env file');
    process.exit(1);
  }

  console.log('🚀 Starting memecoin indexer...');
  lastBlock = await alchemy.core.getBlockNumber() - 1;
  console.log(`Initial block: ${lastBlock}`);
  setInterval(poll, 10_000);
}

main().catch(console.error);