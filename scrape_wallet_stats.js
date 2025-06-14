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
      // Keep the existing Win Rate XPath as it was working
      const winRateXPath = '//div[contains(text(), "Win Rate")]/following-sibling::div[contains(text(), "%")]';

      const pnlPercentage = getElementTextByXPath(pnlPercentageXPath);
      const pnlAbsolute = getElementTextByXPath(pnlAbsoluteXPath);
      const winRate = getElementTextByXPath(winRateXPath);

      if (pnlPercentage === null || pnlAbsolute === null || winRate === null) {
        // Attempt to log more details from the browser console if data is missing
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
      };
    }, address); // Pass address for logging within evaluate

    console.log(`Data for ${address}: PnL %: ${scrapedValues.pnlPercentage}, PnL Abs: ${scrapedValues.pnlAbsolute}, Win Rate: ${scrapedValues.winRate}`);

    return {
      address,
      pnlPercentage: scrapedValues.pnlPercentage,
      pnlAbsolute: scrapedValues.pnlAbsolute,
      winRate: scrapedValues.winRate,
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

  // Limit the number of addresses for testing to avoid long runs initially
  const addressesToProcess = uniqueAddresses.slice(0, 5); 
  // const addressesToProcess = uniqueAddresses; // Uncomment this line for full run after testing
  console.log(`Processing ${addressesToProcess.length} addresses for testing.`);

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
