#!/usr/bin/env node

/**
 * Database Reset Script
 * This script will:
 * 1. Clear all data from the server database
 * 2. Instructions for clearing local app data
 */

const https = require('https');
const http = require('http');

const SERVER_URL = process.env.SERVER_URL || 'https://mathgameapp.onrender.com';
const CONFIRMATION_KEY = 'RESET_ALL_DATA_CONFIRM';

async function resetServerDatabase() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SERVER_URL}/api/admin/reset-database`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = JSON.stringify({
      confirmationKey: CONFIRMATION_KEY
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('🔄 Connecting to server...');
    console.log(`📍 Server: ${SERVER_URL}`);

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.success) {
            console.log('\n✅ SERVER DATABASE RESET SUCCESSFUL!\n');
            console.log('📊 Results:');
            if (response.deleted) {
              console.log(`   - Players deleted: ${response.deleted.players || 0}`);
              console.log(`   - Friend requests deleted: ${response.deleted.friendRequests || 0}`);
            }
            console.log(`   - Timestamp: ${response.timestamp}`);
            resolve(response);
          } else {
            console.error('\n❌ SERVER DATABASE RESET FAILED!\n');
            console.error('Error:', response.error || response.message);
            reject(new Error(response.error || response.message));
          }
        } catch (error) {
          console.error('❌ Failed to parse server response:', error.message);
          console.error('Response data:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Connection error:', error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\n⚠️  DATABASE RESET SCRIPT ⚠️\n');
  console.log('This will DELETE ALL DATA from the server database.');
  console.log('This action CANNOT be undone!\n');

  // Wait 3 seconds to allow user to cancel
  console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('2...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('1...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('\n');

  try {
    await resetServerDatabase();
    
    console.log('\n📱 CLIENT-SIDE CLEANUP INSTRUCTIONS:\n');
    console.log('To complete the reset, each user needs to:');
    console.log('1. Close the Math Game app completely');
    console.log('2. Clear app data:');
    console.log('   iOS: Settings > General > iPhone Storage > Math Game > Delete App');
    console.log('   Android: Settings > Apps > Math Game > Storage > Clear Data');
    console.log('3. Reinstall the app (if deleted)');
    console.log('4. Open the app - they will see the sign-up screen\n');
    
    console.log('OR for testing/development:');
    console.log('1. Stop the Expo dev server (Ctrl+C)');
    console.log('2. Run: npx expo start -c (to clear cache)');
    console.log('3. In the app, they will be prompted to sign in/sign up again\n');
    
    console.log('✅ Reset complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
