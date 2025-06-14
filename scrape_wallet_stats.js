import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const SCRAPE_TIMEOUT_MS = 4000; // Configurable timeout in milliseconds
const CONCURRENCY_LIMIT = 2; // Number of addresses to process in parallel

// Function to extract addresses from smarts_data.json
function getUniqueAddresses() {
  try {
    const smartsDataContent = fs.readFileSync("WalletScrapper/smarts_data.json", "utf8");
    const smartsData = JSON.parse(smartsDataContent);
    const addresses = new Set();

    smartsData.forEach(coinEntry => {
      if (coinEntry.trades && Array.isArray(coinEntry.trades)) {
        // Using the slice from the user's provided file content
        coinEntry.trades.slice(0, 100).forEach(trade => {
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

async function extractMetricsFromPage(page, currentAddressForLog) {
  return page.evaluate((currentAddress) => {
    const getElementTextByXPath = (xpath) => {
      try {
        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return element ? element.textContent.trim() : null;
      } catch (e) {
        return null;
      }
    };

    const pnlPercentageXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]';
    const pnlAbsoluteXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]/div';
    const winRateXPath = '//div[contains(text(), "Win Rate")]/following-sibling::div[contains(text(), "%")]';
    const totalPnLXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[2]/div[1]/div[2]';
    const unrealizedProfitsXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[2]/div[2]/div[2]';
    const balXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[2]/div[2]';
    const txs7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[3]/div[2]';
    const avgDuration7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[4]/div[2]';
    const totalCost7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[5]/div[2]';
    const tokenAvgCost7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[6]/div[2]';
    const tokenAvgRealizedProfits7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[7]/div[2]';
    const distOver500XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[1]/div[2]';
    const dist200To500XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[2]/div[2]';
    const dist0To200XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[3]/div[2]';
    const dist0ToMinus50XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[4]/div[2]';
    const distMinus50XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[5]/div[2]';
    const blacklistXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[1]/div';
    const soldBoughtXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[3]/div';
    const didntBuyXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[4]/div';
    const buySell5SecsXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[4]/div';

    const pnlAbsolute = getElementTextByXPath(pnlAbsoluteXPath);
    let pnlPercentage = getElementTextByXPath(pnlPercentageXPath);
    if (pnlPercentage && pnlAbsolute && pnlPercentage.includes(pnlAbsolute)) {
      pnlPercentage = pnlPercentage.replace(pnlAbsolute, '').trim();
    }

    const metrics = {
      pnlPercentage: pnlPercentage !== null ? pnlPercentage : "N/A",
      pnlAbsolute: pnlAbsolute !== null ? pnlAbsolute : "N/A",
      winRate: getElementTextByXPath(winRateXPath) || "N/A",
      totalPnL: getElementTextByXPath(totalPnLXPath) || "N/A",
      unrealizedProfits: getElementTextByXPath(unrealizedProfitsXPath) || "N/A",
      bal: getElementTextByXPath(balXPath) || "N/A",
      txs7D: getElementTextByXPath(txs7DXPath) || "N/A",
      avgDuration7D: getElementTextByXPath(avgDuration7DXPath) || "N/A",
      totalCost7D: getElementTextByXPath(totalCost7DXPath) || "N/A",
      tokenAvgCost7D: getElementTextByXPath(tokenAvgCost7DXPath) || "N/A",
      tokenAvgRealizedProfits7D: getElementTextByXPath(tokenAvgRealizedProfits7DXPath) || "N/A",
      distOver500: getElementTextByXPath(distOver500XPath) || "N/A",
      dist200To500: getElementTextByXPath(dist200To500XPath) || "N/A",
      dist0To200: getElementTextByXPath(dist0To200XPath) || "N/A",
      dist0ToMinus50: getElementTextByXPath(dist0ToMinus50XPath) || "N/A",
      distMinus50: getElementTextByXPath(distMinus50XPath) || "N/A",
      blacklist: getElementTextByXPath(blacklistXPath) || "N/A",
      soldBought: getElementTextByXPath(soldBoughtXPath) || "N/A",
      didntBuy: getElementTextByXPath(didntBuyXPath) || "N/A",
      buySell5Secs: getElementTextByXPath(buySell5SecsXPath) || "N/A",
    };
    if (metrics.pnlPercentage === "N/A" && metrics.pnlAbsolute === "N/A" && metrics.winRate === "N/A") {
      console.warn(`Primary PnL/WinRate data missing for address ${currentAddress}.`);
    }
    return metrics;
  }, currentAddressForLog);
}

async function closeLoginModal(page, address) {
  const modalXPath = '//div[contains(@class, "ant-modal-content") and .//text()="Log In"]';
  const closeButtonXPath = '//*[@id="chakra-modal--header-:r6m:"]/div/svg';

  try {
    const modalHandle = await page.evaluateHandle((xpath) =>
      document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
      modalXPath
    );
    const modalElement = await modalHandle.asElement();

    if (modalElement) {
      console.log(`Login modal detected for address ${address}. Attempting to close...`);
      const clicked = await page.evaluate((xpath) => {
        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (element) { element.click(); return true; }
        return false;
      }, closeButtonXPath);

      if (clicked) {
        console.log(`Clicked modal close button using XPath: ${closeButtonXPath}.`);
        await page.waitForFunction(
          (xpath) => !document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
          { timeout: 5000 },
          modalXPath
        );
        console.log(`Login modal closed for address ${address}.`);
      } else {
        console.warn(`Modal close button not found or clickable using XPath: ${closeButtonXPath}. Modal might still be open.`);
      }
    }
    await modalHandle.dispose();
  } catch (error) {
    // console.log(`Login modal not detected or error during close attempt for address ${address}: ${error.message}`);
  }
}

export async function scrapeAddressData(browser, address) {
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const allTimeframeData = { address: address };
    const timeframes = [
      { keySuffix: '_7d', buttonXPath: null, displayName: '7D (Default)' },
      { keySuffix: '_1d', buttonXPath: '//div[text()="1d"]', displayName: '1D' },
      { keySuffix: '_30d', buttonXPath: '//div[text()="30d"]', displayName: '30D' },
      { keySuffix: '_all', buttonXPath: '//div[text()="All"]', displayName: 'All Time' },
    ];

    const url = `https://gmgn.ai/sol/address/${address}`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: SCRAPE_TIMEOUT_MS });

    await closeLoginModal(page, address);

    await page.waitForFunction('document.body && document.body.innerText.includes("7D Realized PnL") && document.body.innerText.includes("Win Rate")', { timeout: SCRAPE_TIMEOUT_MS });

    for (const timeframe of timeframes) {
      console.log(`Processing ${timeframe.displayName} data for address: ${address}`);
      let successThisTimeframe = true;
      if (timeframe.buttonXPath) {
        try {
          // Buttons are loaded instantly, no specific wait for button itself
          const clickSuccess = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (element) { element.click(); return true; }
            return false;
          }, timeframe.buttonXPath);

          if (clickSuccess) {
            console.log(`Clicked ${timeframe.displayName} button.`);
            // No explicit wait after click as per user's new information
          } else {
            console.warn(`Button for ${timeframe.displayName} not found or not clickable. Skipping.`);
            successThisTimeframe = false;
          }
        } catch (e) {
          console.error(`Error clicking ${timeframe.displayName} button: ${e.message}. Skipping.`);
          successThisTimeframe = false;
        }
      }

      let metrics;
      if (successThisTimeframe) {
        try {
          metrics = await extractMetricsFromPage(page, address);
        } catch (extractError) {
          console.error(`Error extracting metrics for ${timeframe.displayName}: ${extractError.message}`);
          successThisTimeframe = false;
        }
      }

      if (successThisTimeframe && metrics) {
        for (const metricKey in metrics) {
          allTimeframeData[`${metricKey}${timeframe.keySuffix}`] = metrics[metricKey];
        }
        console.log(`Successfully scraped ${timeframe.displayName} data for ${address}.`);
      } else {
        const metricKeys = Object.keys(await extractMetricsFromPage(page, address));
        for (const metricKey of metricKeys) {
          allTimeframeData[`${metricKey}${timeframe.keySuffix}`] = "N/A (Error)";
        }
        console.warn(`Failed to scrape ${timeframe.displayName} data for ${address}. Populating with N/A.`);
      }
    }
    allTimeframeData.timestamp = new Date().toISOString();
    return allTimeframeData;

  } catch (error) {
    console.error(`Major error for ${address}: ${error.message}`);
    const tfSuffixes = ['_7d', '_1d', '_30d', '_all'];
    const metricKeys = ["pnlPercentage", "pnlAbsolute", "winRate", "totalPnL", "unrealizedProfits", "bal", "txs7D", "avgDuration7D", "totalCost7D", "tokenAvgCost7D", "tokenAvgRealizedProfits7D", "distOver500", "dist200To500", "dist0To200", "dist0ToMinus50", "distMinus50", "blacklist", "soldBought", "didntBuy", "buySell5Secs"];
    const errorData = { address: address, error: error.message, timestamp: new Date().toISOString() };
    tfSuffixes.forEach(suffix => metricKeys.forEach(key => { errorData[`${key}${suffix}`] = "Error (Overall)"; }));
    return errorData;
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }
  }
}

async function runWithConcurrency(concurrencyLimit, browser, addresses, existingDataMap, twentyFourHoursInMs) {
  const results = [];
  const executing = [];
  let processedCount = 0;
  const totalAddresses = addresses.length;

  for (const address of addresses) {
    const task = async () => {
      processedCount++;
      // Progress bar logic moved here
      const progress = Math.round((processedCount / totalAddresses) * 100);
      process.stdout.write(`Processing address ${processedCount} of ${totalAddresses} (${progress}%): ${address} \r`);

      const existingRecord = existingDataMap.get(address);
      if (existingRecord && existingRecord.timestamp) {
        const lastScrapedTime = new Date(existingRecord.timestamp).getTime();
        if ((Date.now() - lastScrapedTime) < twentyFourHoursInMs) {
          console.log(`\nAddress ${address} was scraped less than 24 hours ago. Skipping.`);
          existingDataMap.delete(address);
          return existingRecord;
        } else {
          console.log(`\nAddress ${address} was scraped more than 24 hours ago. Re-scraping.`);
          existingDataMap.delete(address);
        }
      } else {
        console.log(`\nAddress ${address} not found in existing data or no timestamp. Scraping.`);
      }
      return scrapeAddressData(browser, address);
    };

    const p = Promise.resolve().then(task);
    results.push(p);

    if (concurrencyLimit <= addresses.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}


async function main() {
  const uniqueAddresses = getUniqueAddresses();
  if (uniqueAddresses.length === 0) {
    console.log("No addresses to process. Exiting.");
    return;
  }

  let existingDataArray = [];
  const dataFilePath = "WalletScrapper/scraped_wallet_data.json";
  try {
    if (fs.existsSync(dataFilePath)) {
      const fileContent = fs.readFileSync(dataFilePath, "utf8");
      if (fileContent.trim() !== "") {
        existingDataArray = JSON.parse(fileContent);
        if (!Array.isArray(existingDataArray)) existingDataArray = [];
      }
    }
  } catch (e) {
    console.warn(`Could not read or parse existing ${dataFilePath}. Starting fresh. Error: ${e.message}`);
    existingDataArray = [];
  }

  const existingDataMap = new Map(existingDataArray.map(item => [item.address, item]));
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1280,800"],
  });

  const addressesToProcess = uniqueAddresses;
  console.log(`Processing ${addressesToProcess.length} addresses with concurrency ${CONCURRENCY_LIMIT}.`);

  const scrapedResults = await runWithConcurrency(CONCURRENCY_LIMIT, browser, addressesToProcess, existingDataMap, twentyFourHoursInMs);

  process.stdout.write("\n"); // New line after progress bar finishes

  const finalDataArray = [...scrapedResults];

  existingDataMap.forEach(value => finalDataArray.push(value));

  fs.writeFileSync(dataFilePath, JSON.stringify(finalDataArray.filter(item => item !== undefined), null, 2));
  console.log(`\nScraping complete. Data saved to ${dataFilePath}`);

  await browser.close();
}

main().catch((err) => console.error("Unexpected error in main:", err));
