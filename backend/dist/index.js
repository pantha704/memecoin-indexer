"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const alchemy_sdk_1 = require("alchemy-sdk");
dotenv_1.default.config();
const alchemy = new alchemy_sdk_1.Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY || "",
    network: alchemy_sdk_1.Network.ETH_MAINNET,
});
const MEME_KEYWORDS = ["doge", "pepe", "shib", "elon", "avax"];
const tokenCache = new Map();
let lastBlock;
function isMemecoin(tokenAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        if (tokenCache.has(tokenAddress)) {
            const meta = tokenCache.get(tokenAddress);
            return MEME_KEYWORDS.some((k) => { var _a; return (_a = meta.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(k); });
        }
        try {
            const meta = yield alchemy.core.getTokenMetadata(tokenAddress);
            if (!(meta === null || meta === void 0 ? void 0 : meta.name))
                return false;
            tokenCache.set(tokenAddress, {
                name: meta.name,
                symbol: meta.symbol || "",
            });
            return MEME_KEYWORDS.some((k) => { var _a; return (_a = meta.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(k); });
        }
        catch (_a) {
            return false;
        }
    });
}
function poll() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const latestBlock = yield alchemy.core.getBlockNumber();
            if (latestBlock === lastBlock)
                return;
            console.log(`New block detected: ${latestBlock}`);
            const transfers = yield alchemy.core.getAssetTransfers({
                fromBlock: `0x${latestBlock.toString(16)}`,
                toBlock: `0x${latestBlock.toString(16)}`,
                category: [alchemy_sdk_1.AssetTransfersCategory.ERC20],
                withMetadata: true,
            });
            for (const tx of transfers.transfers) {
                const token = (_b = (_a = tx.rawContract) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.toLowerCase();
                if (!token)
                    continue;
                if (yield isMemecoin(token)) {
                    const meta = tokenCache.get(token);
                    console.log({
                        block: latestBlock,
                        token: `${meta === null || meta === void 0 ? void 0 : meta.name} (${meta === null || meta === void 0 ? void 0 : meta.symbol})`,
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
        }
        catch (err) {
            console.error("❌ Error in polling:", err);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!process.env.ALCHEMY_API_KEY) {
            console.error("❌ ALCHEMY_API_KEY is not set in .env file");
            process.exit(1);
        }
        console.log("🚀 Starting memecoin indexer...");
        lastBlock = (yield alchemy.core.getBlockNumber()) - 1;
        console.log(`Initial block: ${lastBlock}`);
        setInterval(poll, 10000);
    });
}
main().catch(console.error);
