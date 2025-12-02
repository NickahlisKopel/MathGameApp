require('dotenv').config();
const { MongoClient } = require('mongodb');

async function clearEmailAccounts() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Count accounts before deletion
    const beforeCount = await db.collection('emailAccounts').countDocuments();
    console.log(`\n📊 Found ${beforeCount} email accounts`);

    if (beforeCount === 0) {
      console.log('✅ Collection is already empty');
      return;
    }

    // Show sample of accounts
    const sampleAccounts = await db.collection('emailAccounts').find({}).limit(5).toArray();
    console.log('\n📋 Sample accounts:');
    sampleAccounts.forEach(acc => {
      console.log(`  - ${acc.email} (userId: ${acc.userId})`);
    });

    console.log('\n🗑️  Deleting all email accounts...');
    const result = await db.collection('emailAccounts').deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} email accounts`);

    // Verify
    const afterCount = await db.collection('emailAccounts').countDocuments();
    console.log(`\n✅ Final count: ${afterCount} accounts remaining`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

console.log('⚠️  WARNING: This will delete ALL email accounts!');
console.log('⚠️  Players will need to create new accounts.\n');

clearEmailAccounts();
