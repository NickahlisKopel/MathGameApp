require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI not found in .env file');
        return;
    }
    
    console.log('Testing MongoDB connection...');
    console.log('URI:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('✅ Connected successfully!');
        
        const db = client.db(process.env.DB_NAME || 'mathgame');
        const collections = await db.listCollections().toArray();
        
        console.log('\nCollections found:');
        collections.forEach(c => console.log(`  - ${c.name}`));
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Check username/password in MONGODB_URI');
        console.log('2. URL encode special characters in password');
        console.log('3. Verify database user exists in Atlas');
        console.log('4. Check IP whitelist in Network Access');
    } finally {
        await client.close();
    }
}

testConnection();
