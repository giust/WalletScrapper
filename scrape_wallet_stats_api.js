import fs from "fs";

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

async function fetchWalletStatsFromAPI(address) {
  // Potential API endpoints to try. We'll start with one.
  // Add more here if the first one doesn't work.
  const potentialApiUrls = [
    `https://gmgn.ai/defi/quotation/v1/wallet/sol/${address}/stats`, // Guess 1
    `https://gmgn.ai/api/v1/sol/address/${address}/summary`,      // Guess 2
    `https://gmgn.ai/sol/api/wallet/${address}`                   // Guess 3 - simpler
  ];

  for (const apiUrl of potentialApiUrls) {
    try {
      console.log(`Trying API for address ${address}: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          // Add any other headers that might be required, e.g., User-Agent
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.warn(`API request to ${apiUrl} failed with status: ${response.status} ${response.statusText}`);
        // Optionally log response body for errors if helpful
        // const errorBody = await response.text();
        // console.warn(`Error body: ${errorBody}`);
        continue; // Try next API URL
      }

      const data = await response.json();
      console.log(`Successfully fetched data from ${apiUrl} for address ${address}.`);
      console.log("API Response JSON:", JSON.stringify(data, null, 2));

      // --- Placeholder for data extraction ---
      // Once we know the JSON structure, we'll extract PnL and Win Rate here.
      // For now, we just log the whole response.
      // Example (assuming structure):
      // const pnlPercentage = data?.summary?.pnl_7d_percentage;
      // const pnlAbsolute = data?.summary?.pnl_7d_usd;
      // const winRate = data?.summary?.win_rate_7d;

      // For this first run, we are interested in the structure.
      // So, we will return a success marker and the raw data.
      return {
        address,
        apiUrlUsed: apiUrl,
        success: true,
        rawData: data,
        // pnlPercentage: pnlPercentage || "N/A",
        // pnlAbsolute: pnlAbsolute || "N/A",
        // winRate: winRate || "N/A",
      };

    } catch (error) {
      console.error(`Error fetching data from ${apiUrl} for address ${address}:`, error.message);
      // Continue to try the next API URL if one fails
    }
  }

  console.error(`All API attempts failed for address ${address}.`);
  return {
    address,
    success: false,
    pnlPercentage: "Error",
    pnlAbsolute: "Error",
    winRate: "Error",
    error: "All API attempts failed.",
  };
}

async function main() {
  const uniqueAddresses = getUniqueAddresses();
  if (uniqueAddresses.length === 0) {
    console.log("No addresses to process. Exiting.");
    return;
  }

  // For the first API discovery run, let's process only one address to see the response structure.
  const addressesToProcess = uniqueAddresses.slice(0, 1); 
  console.log(`Attempting to fetch API data for ${addressesToProcess.length} address(es) for discovery.`);

  const allScrapedData = [];

  for (const address of addressesToProcess) {
    const data = await fetchWalletStatsFromAPI(address);
    allScrapedData.push(data);
  }

  // For this discovery phase, we'll just log to console.
  // Later, we'll save structured data to a file.
  console.log("\n--- API Discovery Results ---");
  console.log(JSON.stringify(allScrapedData, null, 2));
  
  if (allScrapedData.length > 0 && allScrapedData[0].success) {
    console.log("\nSUCCESS: At least one API call was successful for the first address.");
    console.log("Please inspect the 'rawData' in the output above to determine the JSON structure and update the script to extract the correct PnL and Win Rate fields.");
  } else {
    console.log("\nFAILURE: No API calls were successful for the first address. Further investigation or different API URL guesses might be needed.");
  }
  console.log("---------------------------");

  // Once API structure is known and extraction logic is added, uncomment saving:
  /*
  fs.writeFileSync(
    "WalletScrapper/scraped_wallet_data_api.json",
    JSON.stringify(allScrapedData.map(d => ({ // map to save only relevant fields
        address: d.address,
        pnlPercentage: d.pnlPercentage,
        pnlAbsolute: d.pnlAbsolute,
        winRate: d.winRate,
        error: d.error
    })), null, 2)
  );
  console.log("Scraped data saved to WalletScrapper/scraped_wallet_data_api.json");
  */
}

main().catch((err) => console.error("Unexpected error in main:", err));
