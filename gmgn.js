import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    console.log("Opening the main page...");
    await page.goto(
      "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=swaps&direction=desc&filters[]=renounced&filters[]=frozen",
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );

    console.log("Fetching data...");
    const data = await page.evaluate(() => {
      return fetch(
        "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=swaps&direction=desc&filters[]=renounced&filters[]=frozen"
      )
        .then((res) => res.json())
        .then((json) => json.data.rank.map((item) => item.address));
    });

    console.log("Processing coins...");
    let smarts = [];

    for (const coinAddress of data) {
      const page2 = await browser.newPage();

      try {
        await page2.goto(
          `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${coinAddress}?orderby=profit&direction=desc`,
          { waitUntil: "domcontentloaded", timeout: 60000 }
        );

        const tradesData = await page2.evaluate(() => {
          return fetch(window.location.href)
            .then((res) => res.json())
            .then((json) =>
              json.data.map((item) => ({
                address: item.address,
				solAddress: item.native_transfer.from_address,
                profit: item.realized_profit,
                timestamp: item.created_at,
              }))
            );
        });

        // Deduplicate makers
        const uniqueTrades = [];
        const seenAddress = new Set();

        for (const trade of tradesData) {
          if (!seenAddress.has(trade.address)) {
            uniqueTrades.push(trade);
            seenAddress.add(trade.address);
          }
        }

        smarts.push({
          coin: coinAddress,
          trades: uniqueTrades,
        });

        console.log(`Processed coin: ${coinAddress}`);
      } catch (error) {
        console.error(`Error processing coin ${coinAddress}:`, error);
      } finally {
        await page2.close();
      }
    }

    // Save data to JSON file
    fs.writeFileSync("smarts_data.json", JSON.stringify(smarts, null, 2));
    console.log("Data saved to smarts_data.json!");
  } catch (error) {
    console.error("Error during processing:", error);
  } finally {
    await browser.close();
  }
}

main().catch((err) => console.error("Unexpected error:", err));
