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

async function extractMetricsFromPage(page, currentAddressForLog) {
  return page.evaluate((currentAddress) => {
    const getElementTextByXPath = (xpath) => {
      try {
        const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return element ? element.textContent.trim() : null;
      } catch (e) {
        // console.error(`XPath error for ${xpath} on address ${currentAddress}: ${e.message}`); // Logged in main try-catch
        return null;
      }
    };

    // XPath selectors for initial PnL and Win Rate
    const pnlPercentageXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]';
    const pnlAbsoluteXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]/div';
    const winRateXPath = '//div[contains(text(), "Win Rate")]/following-sibling::div[contains(text(), "%")]';
    const totalPnLXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[2]/div[1]/div[2]';
    const unrealizedProfitsXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[2]/div[1]/div[2]/div[2]/div[2]';

    // Analysis Block XPaths
    const balXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[2]/div[2]';
    const txs7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[3]/div[2]';
    const avgDuration7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[4]/div[2]';
    const totalCost7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[5]/div[2]';
    const tokenAvgCost7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[6]/div[2]';
    const tokenAvgRealizedProfits7DXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[1]/div[7]/div[2]';

    // Distribution Block XPaths
    const distOver500XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[1]/div[2]';
    const dist200To500XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[2]/div[2]';
    const dist0To200XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[3]/div[2]';
    const dist0ToMinus50XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[4]/div[2]';
    const distMinus50XPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[1]/div[2]/div[2]/div[5]/div[2]';

    // Phishing check Block XPaths
    const blacklistXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[1]/div';
    const soldBoughtXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[3]/div';
    const didntBuyXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[4]/div';
    const buySell5SecsXPath = '//*[@id="GlobalScrollDomId"]/div/div[1]/div[2]/div[3]/div[2]/div[2]/div[4]/div';


    const pnlAbsolute = getElementTextByXPath(pnlAbsoluteXPath);
    let pnlPercentage = getElementTextByXPath(pnlPercentageXPath);

    if (pnlPercentage && pnlAbsolute && pnlPercentage.includes(pnlAbsolute)) {
      pnlPercentage = pnlPercentage.replace(pnlAbsolute, '').trim();
    }
    
    const winRate = getElementTextByXPath(winRateXPath);
    const totalPnL = getElementTextByXPath(totalPnLXPath);
    const unrealizedProfits = getElementTextByXPath(unrealizedProfitsXPath);
    
    const bal = getElementTextByXPath(balXPath);
    const txs7D = getElementTextByXPath(txs7DXPath);
    const avgDuration7D = getElementTextByXPath(avgDuration7DXPath);
    const totalCost7D = getElementTextByXPath(totalCost7DXPath);
    const tokenAvgCost7D = getElementTextByXPath(tokenAvgCost7DXPath);
    const tokenAvgRealizedProfits7D = getElementTextByXPath(tokenAvgRealizedProfits7DXPath);
    
    const distOver500 = getElementTextByXPath(distOver500XPath);
    const dist200To500 = getElementTextByXPath(dist200To500XPath);
    const dist0To200 = getElementTextByXPath(dist0To200XPath);
    const dist0ToMinus50 = getElementTextByXPath(dist0ToMinus50XPath);
    const distMinus50 = getElementTextByXPath(distMinus50XPath);
    
    const blacklist = getElementTextByXPath(blacklistXPath);
    const soldBought = getElementTextByXPath(soldBoughtXPath);
    const didntBuy = getElementTextByXPath(didntBuyXPath);
    const buySell5Secs = getElementTextByXPath(buySell5SecsXPath);

    const metrics = {
      pnlPercentage: pnlPercentage !== null ? pnlPercentage : "N/A",
      pnlAbsolute: pnlAbsolute !== null ? pnlAbsolute : "N/A",
      winRate: winRate !== null ? winRate : "N/A",
      totalPnL: totalPnL !== null ? totalPnL : "N/A",
      unrealizedProfits: unrealizedProfits !== null ? unrealizedProfits : "N/A",
      bal: bal !== null ? bal : "N/A",
      txs7D: txs7D !== null ? txs7D : "N/A",
      avgDuration7D: avgDuration7D !== null ? avgDuration7D : "N/A",
      totalCost7D: totalCost7D !== null ? totalCost7D : "N/A",
      tokenAvgCost7D: tokenAvgCost7D !== null ? tokenAvgCost7D : "N/A",
      tokenAvgRealizedProfits7D: tokenAvgRealizedProfits7D !== null ? tokenAvgRealizedProfits7D : "N/A",
      distOver500: distOver500 !== null ? distOver500 : "N/A",
      dist200To500: dist200To500 !== null ? dist200To500 : "N/A",
      dist0To200: dist0To200 !== null ? dist0To200 : "N/A",
      dist0ToMinus50: dist0ToMinus50 !== null ? dist0ToMinus50 : "N/A",
      distMinus50: distMinus50 !== null ? distMinus50 : "N/A",
      blacklist: blacklist !== null ? blacklist : "N/A",
      soldBought: soldBought !== null ? soldBought : "N/A",
      didntBuy: didntBuy !== null ? didntBuy : "N/A",
      buySell5Secs: buySell5Secs !== null ? buySell5Secs : "N/A",
    };

    // Basic check if primary PnL data is missing, could indicate stale page or selector issue
    if (metrics.pnlPercentage === "N/A" && metrics.pnlAbsolute === "N/A" && metrics.winRate === "N/A") {
        console.warn(`Primary PnL/WinRate data missing for address ${currentAddress}. This might indicate an issue with page load or selectors for the current timeframe.`);
    }
    return metrics;

  }, currentAddressForLog);
}

// Function to attempt closing the login modal
async function closeLoginModal(page, address) {
  const modalXPath = '//div[contains(@class, "ant-modal-content") and .//text()="Log In"]'; // XPath for the modal content
  const closeButtonCoords = { x: 705, y: 65 }; // Coordinates of the 'X' button

  try {
    // Check if the modal is visible
    await page.waitForXPath(modalXPath, { timeout: 5000 });
    console.log(`Login modal detected for address ${address}. Attempting to close...`);

    // Click the 'X' button using the provided XPath
    const closeButtonXPath = '//*[@id="chakra-modal--header-:r6m:"]/div/svg'; // User provided XPath
    const clickSuccess = await page.evaluate((xpath) => {
      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (element) {
        element.click();
        return true;
      }
      return false;
    }, closeButtonXPath);

    if (clickSuccess) {
      console.log(`Clicked modal close button using XPath: ${closeButtonXPath}.`);
    } else {
      console.warn(`Modal close button not found or clickable using XPath: ${closeButtonXPath}.`);
    }

    // Wait for the modal to disappear
    await page.waitForFunction(
      (xpath) => !document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
      { timeout: 10000 },
      modalXPath
    );
    console.log(`Login modal closed for address ${address}.`);
    return true;
  } catch (error) {
    console.log(`Login modal not detected or could not be closed for address ${address}: ${error.message}`);
    return false;
  }
}


async function scrapeAddressData(browser, address) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const allTimeframeData = { address: address };
  const timeframes = [
    { keySuffix: '_7d', buttonXPath: null, displayName: '7D (Default)' },
    { keySuffix: '_1d', buttonXPath: '//div[text()="1d"]', displayName: '1D' },
    { keySuffix: '_30d', buttonXPath: '//div[text()="30d"]', displayName: '30D' },
    { keySuffix: '_all', buttonXPath: '//div[text()="All"]', displayName: 'All Time' },
  ];

  try {
    const url = `https://gmgn.ai/sol/address/${address}`;
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // Attempt to close login modal if present
    await closeLoginModal(page, address);

    // Initial wait for page to load (7D data)
    console.log(`Waiting for initial (7D) PnL and Win Rate data for address: ${address}`);
    await page.waitForFunction(
      'document.body && document.body.innerText.includes("7D Realized PnL") && document.body.innerText.includes("Win Rate")',
      { timeout: 60000 }
    );

    for (const timeframe of timeframes) {
      console.log(`Processing ${timeframe.displayName} data for address: ${address}`);
      let successThisTimeframe = true;

      if (timeframe.buttonXPath) {
        try {
          // Wait for the button to be present using page.waitForFunction with XPath
          await page.waitForFunction((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return !!element; // Return true if element exists
          }, { timeout: 10000 }, timeframe.buttonXPath);

          const clickSuccess = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (element) {
              element.click();
              return true;
            }
            return false;
          }, timeframe.buttonXPath);

          if (clickSuccess) {
            console.log(`Clicked ${timeframe.displayName} button. Waiting for content to update...`);
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000))); // Workaround for page.waitForTimeout
            // A more robust wait would be to check for a change in a key metric's value
            // For example: await page.waitForFunction(() => document.querySelector('some-selector-for-pnl-value').innerText !== 'old-value');
          } else {
            console.warn(`Button for ${timeframe.displayName} not found or clickable using XPath: ${timeframe.buttonXPath}. Skipping this timeframe.`);
            successThisTimeframe = false;
          }
        } catch (e) {
          console.error(`Error during click operation or waiting for button for ${timeframe.displayName} (XPath: ${timeframe.buttonXPath}): ${e.message}. Skipping this timeframe.`);
          successThisTimeframe = false;
        }
      }

      let metrics;
      if (successThisTimeframe) {
        try {
          metrics = await extractMetricsFromPage(page, address);
        } catch (extractError) {
          console.error(`Error extracting metrics for ${timeframe.displayName} for address ${address}: ${extractError.message}`);
          successThisTimeframe = false;
        }
      }
      
      if (successThisTimeframe && metrics) {
        for (const metricKey in metrics) {
          allTimeframeData[`${metricKey}${timeframe.keySuffix}`] = metrics[metricKey];
        }
        console.log(`Successfully scraped ${timeframe.displayName} data for ${address}.`);
      } else {
        // Populate with N/A if button click failed or metrics extraction failed
        const defaultMetrics = await extractMetricsFromPage(page, address); // Get keys
        for (const metricKey in defaultMetrics) {
            allTimeframeData[`${metricKey}${timeframe.keySuffix}`] = "N/A (Error)";
        }
        console.warn(`Failed to scrape ${timeframe.displayName} data for ${address}. Populating with N/A.`);
      }
    }
  } catch (error) {
    console.error(`Major error processing address ${address}:`, error.message);
    // Populate all possible fields with "Error" if a major error occurs
    const timeframesForError = ['_7d', '_1d', '_30d', '_all'];
    const metricKeysForError = ["pnlPercentage", "pnlAbsolute", "winRate", "totalPnL", "unrealizedProfits", "bal", "txs7D", "avgDuration7D", "totalCost7D", "tokenAvgCost7D", "tokenAvgRealizedProfits7D", "distOver500", "dist200To500", "dist0To200", "dist0ToMinus50", "distMinus50", "blacklist", "soldBought", "didntBuy", "buySell5Secs"];
    timeframesForError.forEach(suffix => {
        metricKeysForError.forEach(key => {
            allTimeframeData[`${key}${suffix}`] = "Error (Overall)";
        });
    });
    allTimeframeData.error = error.message;
  } finally {
    if (page && !page.isClosed()) {
       await page.close();
    }
  }
  return allTimeframeData;
}

async function main() {
  const uniqueAddresses = getUniqueAddresses();
  if (uniqueAddresses.length === 0) {
    console.log("No addresses to process. Exiting.");
    return;
  }

  const addressesToProcess = uniqueAddresses.slice(0, 3); // Process only 3 addresses for testing
  console.log(`Processing ${addressesToProcess.length} addresses for testing.`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1280,800"],
  });

  const allScrapedData = [];
  // For testing, process only a few addresses
  // const testAddresses = addressesToProcess.slice(0, 2); 
  // for (const address of testAddresses) { 
  for (const address of addressesToProcess) { // Uncomment for full run
    const data = await scrapeAddressData(browser, address);
    allScrapedData.push(data);
    // Optional: Add a small delay between requests to be polite to the server
    // await new Promise(resolve => setTimeout(resolve, 2000)); 
  }

  fs.writeFileSync(
    "WalletScrapper/scraped_wallet_data.json",
    JSON.stringify(allScrapedData, null, 2)
  );
  console.log("Scraped data saved to WalletScrapper/scraped_wallet_data.json");

  await browser.close();
}

main().catch((err) => console.error("Unexpected error in main:", err));
