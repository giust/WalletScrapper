import { maxTokens } from '../../config/config.js';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

class gmgn {
    async getTokens(tokens) {
        if(tokens > maxTokens) {
            throw new Error(`Maximum tokens limit exceeded. Please limit to ${maxTokens} tokens.`);
        }

        puppeteer.use(StealthPlugin());

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        
        await page.goto(
            "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=swaps&direction=desc&filters[]=renounced&filters[]=frozen",
            { waitUntil: "domcontentloaded", timeout: 60000 }
        );

        const data = await page.evaluate(async () => {
            const res = await fetch("https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=swaps&direction=desc&filters[]=renounced&filters[]=frozen");
            const json = await res.json();
            return json.data.rank.map((item) => item.address);
        });

        return data.slice(0, tokens);
    }

    async getTrades(coinAddress) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page2 = await browser.newPage();

        await page2.goto(
            `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${coinAddress}?orderby=profit&direction=desc`,
            { waitUntil: "domcontentloaded", timeout: 60000 }
        );

        const tradesData = await page2.evaluate(async () => {
            const res = await fetch(window.location.href);
            const json = await res.json();
            return json.data.map((item) => ({
                address: item.address,
                solAddress: item.native_transfer.from_address,
                profit: item.realized_profit,
                timestamp: item.created_at,
            }));
        });

        return tradesData;
    }
}

export default gmgn;

// (async () => {
//     try {
//         const test = new gmgn();
//         const tokens = await test.getTokens(10); // Example: Fetch 10 tokens
//         console.log("Tokens:", tokens);

//         for (const token of tokens) {
//             const trades = await test.getTrades(token);
//             console.log(`Trades for ${token}:`, trades);
//         }
//     } catch (error) {
//         console.error("Error:", error);
//     }
// })();