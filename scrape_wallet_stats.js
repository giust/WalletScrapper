import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

// Function to extract addresses from smarts_data.json
function getUniqueAddresses() {
  try {
    const smartsDataContent = fs.readFileSync("WalletScrapper/smarts_data.json", "utf8");
    const smartsData = JSON.parse(smartsDataContent);
    const addresses = new Set();

    smartsData.forEach(coinEntry => {
      if (coinEntry.trades && Array.isArray(coinEntry.trades)) {
        coinEntry.trades.forEach(trade => {
          if (trade.address) {
            addresses.add(trade.address);
          }
          if (trade.solAddress) {
            addresses.add(trade.solAddress);
          }
        });
      }
    });
    console.log(`Found ${addresses.size} unique addresses.`);
    return Array.from(addresses);
  } catch (error) {
    console.error("Error reading or parsing smarts_data.json:", error);
    return [];
  }
}

async function scrapeAddressData(browser, address) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 }); // Set a common viewport size

  try {
    const url = `https://gmgn.ai/sol/address/${address}`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 }); // Increased timeout and wait until network is idle

    console.log(`Waiting for PnL and Win Rate data for address: ${address}`);

    // Wait for key text elements to appear on the page to ensure content is loaded
    await page.waitForFunction(
      'document.body && document.body.innerText.includes("7D Realized PnL") && document.body.innerText.includes("Win Rate")',
      { timeout: 60000 } // Increased timeout for waitForFunction
    );

    const scrapedValues = await page.evaluate((currentAddress) => {
      const getElementTextByXPath = (xpath) => {
        try {
          const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          return element ? element.textContent.trim() : null;
        } catch (e) {
          console.error(`XPath error for ${xpath} on address ${currentAddress}: ${e.message}`);
          return null;
        }
      };

      // XPath selectors provided by the user
      const pnlPercentageXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]';
      const pnlAbsoluteXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]/div';
      const winRateXPath = '//div[contains(text(), "Win Rate")]/following-sibling::div[contains(text(), "%")]';

      // New XPaths for Total PnL and Unrealized Profits
      const totalPnLXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[2]/div[1]/div[2]';
      const unrealizedProfitsXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[2]/div[2]/div[2]';

      // Analysis Block XPaths
      const balXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[2]/div[2]';
      const txs7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[3]/div[2]';
      const avgDuration7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[4]/div[2]';
      const totalCost7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[5]/div[2]';
      const tokenAvgCost7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[6]/div[2]';
      const tokenAvgRealizedProfits7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[7]/div[2]';

      // Distribution Block XPaths (corrected based on user's input)
      const distOver500XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[1]/div[2]';
      const dist200To500XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[2]/div[2]';
      const dist0To200XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[3]/div[2]';
      const dist0ToMinus50XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[4]/div[2]';
      const distMinus50XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[5]/div[2]';

      // Phishing check Block XPaths (corrected based on user's input)
      const blacklistXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[1]/div';
      const soldBoughtXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[3]/div';
      const didntBuyXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[4]/div';
      const buySell5SecsXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[4]/div'; // Corrected based on user feedback


      const pnlAbsolute = getElementTextByXPath(pnlAbsoluteXPath);
      let pnlPercentage = getElementTextByXPath(pnlPercentageXPath);

      if (pnlPercentage && pnlAbsolute && pnlPercentage.includes(pnlAbsolute)) {
        pnlPercentage = pnlPercentage.replace(pnlAbsolute, '').trim();
      }
      
      const winRate = getElementTextByXPath(winRateXPath);

      // Scrape Analysis metrics
      const bal = getElementTextByXPath(balXPath);
      const txs7D = getElementTextByXPath(txs7DXPath);
      const avgDuration7D = getElementTextByXPath(avgDuration7DXPath);
      const totalCost7D = getElementTextByXPath(totalCost7DXPath);
      const tokenAvgCost7D = getElementTextByXPath(tokenAvgCost7DXPath);
      const tokenAvgRealizedProfits7D = getElementTextByXPath(tokenAvgRealizedProfits7DXPath);

      // Scrape Distribution metrics
      const distOver500 = getElementTextByXPath(distOver500XPath);
      const dist200To500 = getElementTextByXPath(dist200To500XPath);
      const dist0To200 = getElementTextByXPath(dist0To200XPath);
      const dist0ToMinus50 = getElementTextByXPath(dist0ToMinus50XPath);
      const distMinus50 = getElementTextByXPath(distMinus50XPath);

      // Scrape Phishing check metrics
      const blacklist = getElementTextByXPath(blacklistXPath);
      const soldBought = getElementTextByXPath(soldBoughtXPath);
      const didntBuy = getElementTextByXPath(didntBuyXPath);
      const buySell5Secs = getElementTextByXPath(buySell5SecsXPath);

      // New metrics
      const totalPnL = getElementTextByXPath(totalPnLXPath);
      const unrealizedProfits = getElementTextByXPath(unrealizedProfitsXPath);


      if (pnlPercentage === null || pnlAbsolute === null || winRate === null) {
        let pnlText = "N/A";
        let winRateText = "N/A";
        try {
          const pnlContainer = document.evaluate('//div[contains(text(), "7D Realized PnL")]/following-sibling::div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (pnlContainer) pnlText = pnlContainer.innerText;
          const winRateContainer = document.evaluate('//div[contains(text(), "Win Rate")]/following-sibling::div', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (winRateContainer) winRateText = winRateContainer.innerText;
        } catch (e) { /* ignore */ }
        console.warn(`Could not find all expected data elements for address ${currentAddress}. PnL section text: "${pnlText}". Win Rate section text: "${winRateText}". Check selectors or page content if values are "N/A".`);
      }

      return {
        pnlPercentage: pnlPercentage !== null ? pnlPercentage : "N/A",
        pnlAbsolute: pnlAbsolute !== null ? pnlAbsolute : "N/A",
        winRate: winRate !== null ? winRate : "N/A",
        
        // New metrics
        totalPnL: totalPnL !== null ? totalPnL : "N/A",
        unrealizedProfits: unrealizedProfits !== null ? unrealizedProfits : "N/A",

        // Analysis metrics
        bal: bal !== null ? bal : "N/A",
        txs7D: txs7D !== null ? txs7D : "N/A",
        avgDuration7D: avgDuration7D !== null ? avgDuration7D : "N/A",
        totalCost7D: totalCost7D !== null ? totalCost7D : "N/A",
        tokenAvgCost7D: tokenAvgCost7D !== null ? tokenAvgCost7D : "N/A",
        tokenAvgRealizedProfits7D: tokenAvgRealizedProfits7D !== null ? tokenAvgRealizedProfits7D : "N/A",

        // Distribution metrics
        distOver500: distOver500 !== null ? distOver500 : "N/A",
        dist200To500: dist200To500 !== null ? dist200To500 : "N/A",
        dist0To200: dist0To200 !== null ? dist0To200 : "N/A",
        dist0ToMinus50: dist0ToMinus50 !== null ? dist0ToMinus50 : "N/A",
        distMinus50: distMinus50 !== null ? distMinus50 : "N/A",

        // Phishing check metrics
        blacklist: blacklist !== null ? blacklist : "N/A",
        soldBought: soldBought !== null ? soldBought : "N/A",
        didntBuy: didntBuy !== null ? didntBuy : "N/A",
        buySell5Secs: buySell5Secs !== null ? buySell5Secs : "N/A",
      };
    }, address); // Pass address for logging within evaluate

    console.log(`Data for ${address}: PnL %: ${scrapedValues.pnlPercentage}, PnL Abs: ${scrapedValues.pnlAbsolute}, Win Rate: ${scrapedValues.winRate}`);
    console.log(`Additional PnL: Total PnL: ${scrapedValues.totalPnL}, Unrealized Profits: ${scrapedValues.unrealizedProfits}`);
    console.log(`Analysis: Bal: ${scrapedValues.bal}, TXs: ${scrapedValues.txs7D}, Avg Duration: ${scrapedValues.avgDuration7D}, Total Cost: ${scrapedValues.totalCost7D}, Token Avg Cost: ${scrapedValues.tokenAvgCost7D}, Token Avg Realized Profits: ${scrapedValues.tokenAvgRealizedProfits7D}`);
    console.log(`Distribution: >500%: ${scrapedValues.distOver500}, 200-500%: ${scrapedValues.dist200To500}, 0-200%: ${scrapedValues.dist0To200}, 0--50%: ${scrapedValues.dist0ToMinus50}, <-50%: ${scrapedValues.distMinus50}`);
    console.log(`Phishing Check: Blacklist: ${scrapedValues.blacklist}, Sold>Bought: ${scrapedValues.soldBought}, Didn't Buy: ${scrapedValues.didntBuy}, Buy/Sell 5 Secs: ${scrapedValues.buySell5Secs}`);

    return {
      address,
      pnlPercentage: scrapedValues.pnlPercentage,
      pnlAbsolute: scrapedValues.pnlAbsolute,
      winRate: scrapedValues.winRate,
      
      // New metrics
      totalPnL: scrapedValues.totalPnL,
      unrealizedProfits: scrapedValues.unrealizedProfits,

      // Analysis metrics
      bal: scrapedValues.bal,
      txs7D: scrapedValues.txs7D,
      avgDuration7D: scrapedValues.avgDuration7D,
      totalCost7D: scrapedValues.totalCost7D,
      tokenAvgCost7D: scrapedValues.tokenAvgCost7D,
      tokenAvgRealizedProfits7D: scrapedValues.tokenAvgRealizedProfits7D,

      // Distribution metrics
      distOver500: scrapedValues.distOver500,
      dist200To500: scrapedValues.dist200To500,
      dist0To200: scrapedValues.dist0To200,
      dist0ToMinus50: scrapedValues.dist0ToMinus50,
      distMinus50: scrapedValues.distMinus50,

      // Phishing check metrics
      blacklist: scrapedValues.blacklist,
      soldBought: scrapedValues.soldBought,
      didntBuy: scrapedValues.didntBuy,
      buySell5Secs: scrapedValues.buySell5Secs,
    };

  } catch (error) {
    console.error(`Error scraping data for address ${address}:`, error.message);
    return {
      address,
      pnlPercentage: "Error",
      pnlAbsolute: "Error",
      winRate: "Error",
      error: error.message,
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const uniqueAddresses = getUniqueAddresses();
  if (uniqueAddresses.length === 0) {
    console.log("No addresses to process. Exiting.");
    return;
  }

  // Process all addresses
  const addressesToProcess = uniqueAddresses; 
  console.log(`Processing ${addressesToProcess.length} addresses.`);

  const browser = await puppeteer.launch({
    headless: true, // Set to false for debugging if needed
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1280,800"],
  });

  const allScrapedData = [];

  for (const address of addressesToProcess) {
    const data = await scrapeAddressData(browser, address);
    allScrapedData.push(data);
    // Optional: Add a small delay between requests to be polite to the server
    // await new Promise(resolve => setTimeout(resolve, 1000)); 
  }

  fs.writeFileSync(
    "WalletScrapper/scraped_wallet_data.json",
    JSON.stringify(allScrapedData, null, 2)
  );
  console.log("Scraped data saved to WalletScrapper/scraped_wallet_data.json");

  await browser.close();
}

main().catch((err) => console.error("Unexpected error in main:", err));
