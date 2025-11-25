
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN // Your personal access token
  });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const REPO_OWNER = 'your-username';
const REPO_NAME = 'your-repo-name';
const FILE_PATH = 'data/crypto_data.json'; // Path in your repo

const COINMARKETCAP_API_KEY = '4f3141f7-70fa-41c5-8d69-a739635bf5d9';
const BASE_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
const URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map';
var cnfg = {
    currencies: 'bitcoin,sui,solana,injective,deepbook,virtuals'
}

export async function fetchCryptoMetadata() {
    try {
      const response = await axios.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/info', {
        headers: {
          'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
        },
        params: {
            slug: 'bitcoin,sui,solana,injective,deepbook-protocol,virtual-protocol,supra',
          }
      });
  
     // console.log('✅ Successfully fetched Metadata from CoinMarketCap');
      
      const data = response.data.data;
      const cryptocurrencies = Object.values(data);
    //  console.log(cryptocurrencies);
      return cryptocurrencies;
  
    } catch (error) {
      console.error('❌ Error fetching data from CoinMarketCap:');
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Message: ${error.response.data.status.error_message}`);
      } else {
        console.error(error.message);
      }
      
      return null;
    }
}

export async function fetchCryptos() {
    try {
      const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
        headers: {
          'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
        },
        params: {
          start: '1',
          limit: '200'
        }
      });
  
      console.log('✅ Successfully fetched data from CoinMarketCap');
      
      const data = response.data.data;
      const cryptocurrencies = Object.values(data);
      
      // Split the cnfg currencies into an array and convert to lowercase for comparison
      const targetCurrencies = cnfg.currencies.split(',').map(curr => curr.trim().toLowerCase());
      
      // Filter cryptocurrencies that match any of the target names/slugs
      const filteredCryptos = cryptocurrencies.filter(crypto => {
        const cryptoName = crypto.name.toLowerCase();
        const cryptoSlug = crypto.slug.toLowerCase();
        const cryptoSymbol = crypto.symbol.toLowerCase();
        
        // Check if any of the target currencies match name, slug, or symbol
        return targetCurrencies.some(target => 
          cryptoName.includes(target) || 
          cryptoSlug.includes(target) ||
          cryptoSymbol.includes(target)
        );
      });
      
      console.log(`\n🎯 Found ${filteredCryptos.length} matching cryptocurrencies:`);
      
      // Display only the filtered results
      filteredCryptos.forEach(crypto => {
    //    console.log(`\n📊 ${crypto.name} (${crypto.symbol})`);
    //    console.log(`   ID: ${crypto.id}`);
    //    console.log(`   Slug: ${crypto.slug}`);
    //    console.log(`   Price: $${crypto.quote?.USD?.price?.toFixed(2) || 'N/A'}`);
      });
  
      return filteredCryptos;
  
    } catch (error) {
      console.error('❌ Error fetching data from CoinMarketCap:');
      
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Message: ${error.response.data.status.error_message}`);
      } else {
        console.error(error.message);
      }
      
      return null;
    }
}

export async function fetchCryptoPrices() {
  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
      },
      params: {
        slug: 'bitcoin,sui,solana,injective,deepbook-protocol,virtual-protocol,supra',
        convert: 'USD' // Optional: specify currency to convert to
      }
    });

    console.log('✅ Successfully fetched data from CoinMarketCap');
    
    // The response structure groups by ID, so we need to extract the data
    const data = response.data.data;
    
    // Convert the object to an array for easier processing
    const cryptocurrencies = Object.values(data);
    

    return cryptocurrencies;

  } catch (error) {
    console.error('❌ Error fetching data from CoinMarketCap:');
    
    if (error.response) {
      // Server responded with error status
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data.status.error_message}`);
    } else {
      console.error(error.message);
    }
    
    return null;
  }
}

export async function buildAllCryptos() {
    try {
        const cryptocurrencies = await fetchCryptoMetadata();
        const prices = await fetchCryptoPrices();

        // Create the structured object
        const structuredData = {};

        // Process each cryptocurrency from metadata
        Object.entries(cryptocurrencies).forEach(([cryptoName, cryptoData]) => {
            // Find matching price data by ID
            const priceData = prices?.find(p => {
                const metadataEntry = Object.values(cryptocurrencies).find(meta => {
                    const cryptoMeta = Array.isArray(meta) ? meta[0] : meta;
                    return cryptoMeta && cryptoMeta.id === p.id;
                });
                return metadataEntry !== undefined;
            });

            const cryptoWithId = Array.isArray(cryptoData) ? cryptoData[0] : cryptoData;
            const priceDataById = cryptoWithId?.id ? prices?.find(p => p.id === cryptoWithId.id) : null;
            const finalPriceData = priceDataById || priceData;

            // Build the structured object
            structuredData[cryptoWithId.name] = {
                id: cryptoWithId?.id || finalPriceData?.id || null,
                name: cryptoWithId.name,
                symbol: cryptoWithId.symbol,
                slug: cryptoWithId?.slug || finalPriceData?.slug || cryptoName.toLowerCase(),
                urls: cryptoData.urls,
            };
        });

        console.log('🏗️ Built structured crypto data:');
        console.log('Prices data available:', prices?.length || 0, 'assets');
        console.log(structuredData);
        // Save to JSON file
        const filename = `crypto_data_${Date.now()}.json`;
        const data = {data: structuredData, last_updated: new Date().toISOString()};
        
        await uploadToGitHub(JSON.stringify(data, null, 2));

        const filePath = path.join(__dirname, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`💾 Data saved to: ${filename}`);

        return data;

    } catch (error) {
        console.error('❌ Error building crypto data:');
        
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${error.response.data?.status?.error_message}`);
        } else {
            console.error(error.message);
        }
        
        return null;
    }
}

async function uploadToGitHub(content) {
    try {
        // Get the current file SHA (required for updates)
        let sha;
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: FILE_PATH,
            });
            sha = data.sha;
        } catch (error) {
            // File doesn't exist yet, that's fine
            sha = null;
        }

        // Create or update file
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `Update crypto data - ${new Date().toISOString()}`,
            content: Buffer.from(content).toString('base64'),
            sha: sha,
        });

        console.log('📤 Successfully uploaded to GitHub');
    } catch (error) {
        console.error('❌ GitHub upload failed:', error);
        throw error;
    }
}