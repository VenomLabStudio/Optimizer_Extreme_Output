const { ethers } = require("ethers");

// 🔹 BSC Mainnet RPC
const provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org");

// 🔹 PancakeSwap V2 Pair (WBNB-USDT)
const PAIR_ADDRESS = "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE"; // WBNB/USDT pair
const PAIR_ABI = [
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];

// 🔹 Configurations
const amountIn = ethers.utils.parseUnits("10", 18); // 10 WBNB
const n = ethers.BigNumber.from(10000);  // Default Uniswap V2 multiplier
const s = ethers.BigNumber.from(25);     // Standard swap fee factor
const slippageTolerance = 5; // 0.5% slippage (in basis points)
const gasLimit = ethers.BigNumber.from(210000); // Estimated gas limit

// 🔹 Get reserves from PancakeSwap V2 pair
async function getReserves() {
    try {
        const pairContract = new ethers.Contract(PAIR_ADDRESS, PAIR_ABI, provider);
        const [reserveWBNB, reserveUSDT] = await pairContract.getReserves();
        return { 
            reserveIn: ethers.BigNumber.from(reserveWBNB), 
            reserveOut: ethers.BigNumber.from(reserveUSDT) 
        };
    } catch (error) {
        console.error("❌ Error fetching reserves:", error);
        return { reserveIn: ethers.BigNumber.from(0), reserveOut: ethers.BigNumber.from(0) };
    }
}

// 🔹 Default Uniswap Formula (Standard getAmountOut)
function getAmountOut(amountIn, reserveIn, reserveOut) {
    if (reserveIn.isZero() || reserveOut.isZero()) return ethers.BigNumber.from(0);

    const amountInWithFee = amountIn.mul(n.sub(s));
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(n).add(amountInWithFee);
    
    return numerator.div(denominator);
}

// 🔹 Optimized Formula (Higher Efficiency)
function getOptimalAmountOut(amountIn, n, s, reserveIn, reserveOut) {
    if (reserveIn.isZero() || reserveOut.isZero()) return ethers.BigNumber.from(0);
    
    return reserveOut.sub(
        reserveIn.mul(reserveOut).mul(n).div(n.mul(reserveIn.add(amountIn)).sub(s.mul(amountIn)))
    );
}

// 🔹 Get Estimated Gas Fees
async function getGasFee() {
    try {
        const feeData = await provider.getFeeData();
        return gasLimit.mul(feeData.gasPrice); // Gas fee in wei
    } catch (error) {
        console.error("❌ Error fetching gas price:", error);
        return ethers.BigNumber.from(0);
    }
}

// 🔹 Run Estimation
async function estimateSwap() {
    const { reserveIn, reserveOut } = await getReserves();
    if (reserveIn.isZero() || reserveOut.isZero()) {
        console.log("⚠️ Insufficient reserves. Swap estimation cannot be performed.");
        return;
    }

    const standardOutput = getAmountOut(amountIn, reserveIn, reserveOut);
    const optimizedOutput = getOptimalAmountOut(amountIn, n, s, reserveIn, reserveOut);
    const gasFee = await getGasFee();

    // Apply slippage (in basis points)
    const minStandardOutput = standardOutput.mul(ethers.BigNumber.from(10000 - slippageTolerance)).div(10000);
    const minOptimizedOutput = optimizedOutput.mul(ethers.BigNumber.from(10000 - slippageTolerance)).div(10000);

    console.log(`🔹 Input Amount: 10 WBNB`);
    console.log(`📌 Standard Output (Uniswap V2 Formula): ${ethers.utils.formatUnits(standardOutput, 18)} USDT`);
    console.log(`🔻 Minimum Standard Output (with ${slippageTolerance / 100}% slippage): ${ethers.utils.formatUnits(minStandardOutput, 18)} USDT`);
    console.log(`🚀 Optimized Output (Better Formula): ${ethers.utils.formatUnits(optimizedOutput, 18)} USDT`);
    console.log(`🔻 Minimum Optimized Output (with ${slippageTolerance / 100}% slippage): ${ethers.utils.formatUnits(minOptimizedOutput, 18)} USDT`);
    console.log(`⛽ Estimated Gas Fee: ${ethers.utils.formatUnits(gasFee, 18)} BNB`);
}

// 🔹 Run Script
estimateSwap();
