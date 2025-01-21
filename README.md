# Puppeteer Web Scraper for Gmgn AI

This project is a web scraper built using Puppeteer and Puppeteer Extra with the Stealth Plugin to scrape data from the Gmgn AI platform. The scraper collects information about the top Solana (SOL) token swaps and associated trades, processes it, and saves the results into a JSON file.

## Features
- Scrapes the top Solana token swaps data.
- Fetches associated trade data for each token.
- Deduplicates the trade data by ensuring only unique addresses are included.
- Saves the collected data into a `smarts_data.json` file.

## Requirements
- Node.js (v14 or higher recommended)
- npm (Node Package Manager)
- Puppeteer and Puppeteer Extra plugins

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/ademchaoua/WalletScrapper
   cd WalletScrapper
   ```

2. **Install the required dependencies:**

   Make sure Node.js and npm are installed. If not, download and install them from [nodejs.org](https://nodejs.org/).

   Then, run the following command to install the necessary dependencies:

   ```bash
   npm install
   ```

3. **Run the scraper:**

   After installing the dependencies, you can run the script with:

   ```bash
   node gmgn.js
   ```

   This will start the scraping process and the data will be saved in the `smarts_data.json` file.

## How it Works

1. The script opens the Gmgn AI website for the specified token swaps page.
2. It fetches a list of top tokens by swap volume.
3. For each token, it collects trading data about the top traders.
4. It processes the data and deduplicates it by eliminating trades with repeated addresses.
5. Finally, the processed data is saved in a `smarts_data.json` file.

## Error Handling
The scraper is designed to handle errors gracefully:
- If a coin's page cannot be opened or processed, it will log the error and move on to the next token.
- At the end of the process, any errors that occurred during the execution will be logged.

## Output

- The data is saved to a file named `smarts_data.json`.
- The file contains a JSON structure with the following format:

```json
[
  {
    "coin": "coin_address",
    "trades": [
      {
        "address": "trade_address",
        "solAddress": "native_transfer_from_address",
        "profit": "realized_profit",
        "timestamp": "trade_timestamp"
      }
    ]
  }
]
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

