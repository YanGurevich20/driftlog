#!/usr/bin/env node

// Check all currencies supported by ExchangeRate-API
const API_KEY = '6149d6eca53d8869f874fc98';
const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

async function checkCurrencies() {
  try {
    console.log('Fetching supported currencies from ExchangeRate-API...\n');
    
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (data.result === 'success') {
      const currencies = Object.keys(data.conversion_rates).sort();
      
      console.log(`Total supported currencies: ${currencies.length}\n`);
      console.log('All supported currency codes:');
      console.log('==============================');
      
      // Print in columns for readability
      for (let i = 0; i < currencies.length; i += 10) {
        console.log(currencies.slice(i, i + 10).join(', '));
      }
      
      // Check which currencies from our app are supported
      const ourCurrencies = [
        'USD', 'EUR', 'GBP', 'JPY', 'THB', 'SGD', 'VND', 'IDR', 'MYR', 'PHP',
        'INR', 'KRW', 'HKD', 'TWD', 'MXN', 'CAD', 'BRL', 'AUD', 'NZD', 'CHF',
        'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY'
      ];
      
      console.log('\n\nOur currencies support check:');
      console.log('==============================');
      
      const missing = ourCurrencies.filter(c => !currencies.includes(c));
      if (missing.length === 0) {
        console.log('✓ All our currencies are supported!');
      } else {
        console.log('✗ Missing currencies:', missing.join(', '));
      }
      
      // Suggest popular currencies we might want to add
      const popularNotInOurs = ['AED', 'CNY', 'RUB', 'ZAR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'];
      const available = popularNotInOurs.filter(c => currencies.includes(c));
      
      console.log('\n\nAdditional popular currencies available:');
      console.log('=========================================');
      console.log(available.join(', '));
      
    } else {
      console.error('API Error:', data);
    }
  } catch (error) {
    console.error('Failed to fetch currencies:', error);
  }
}

checkCurrencies();