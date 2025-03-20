const { ethers } = require("ethers");

// 🔹 BSC Mainnet RPC
const provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org");

// 🔹 PancakeSwap V2 Pair (WBNB-USDT)
const PAIR_ADDRESS = "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE"; // WBNB/USDT pair
const PAIR_ABI = [
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];

const amountIn = ethers.utils.parseUnits("10", 18); // 🔹 10 WBNB
const n = ethers.BigNumber.from(10000);  // Default Uniswap V2 multiplier
const s = ethers.BigNumber.from(25);     // Standard swap fee factor

// 🔹 Get reserves from PancakeSwap V2 pair
async function getReserves() {
    const pairContract = new ethers.Contract(PAIR_ADDRESS, PAIR_ABI, provider);
    const [reserveWBNB, reserveUSDT] = await pairContract.getReserves();
    return { 
        reserveIn: ethers.BigNumber.from(reserveWBNB), 
        reserveOut: ethers.BigNumber.from(reserveUSDT) 
    };
}

// 🔹 Default Uniswap Formula (Standard getAmountOut)
function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn.mul(n.sub(s));
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(n).add(amountInWithFee);
    return numerator.div(denominator);
}

// 🔹 Optimized Formula (Higher Efficiency)
function getOptimalAmountOut(amountIn, n, s, reserveIn, reserveOut) {
    return reserveOut.sub(
        reserveIn.mul(reserveOut).mul(n).div(n.mul(reserveIn.add(amountIn)).sub(s.mul(amountIn)))
    );
}

// 🔹 Run Estimation
async function estimateSwap() {
    const { reserveIn, reserveOut } = await getReserves();

    const standardOutput = getAmountOut(amountIn, reserveIn, reserveOut);
    const optimizedOutput = getOptimalAmountOut(amountIn, n, s, reserveIn, reserveOut);

    console.log(`🔹 Input Amount: 10 WBNB`);
    console.log(`📌 Standard Output (Uniswap V2 Formula): ${ethers.utils.formatUnits(standardOutput, 18)} USDT`);
    console.log(`🚀 Optimized Output (Better Formula): ${ethers.utils.formatUnits(optimizedOutput, 18)} USDT`);
}

// 🔹 Run Script
estimateSwap();
