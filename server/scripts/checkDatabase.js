require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections in database:');
    console.log('═'.repeat(50));

    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`\n📁 ${collection.name}: ${count} documents`);

      // Show sample for small collections
      if (count > 0 && count <= 10) {
        const samples = await db.collection(collection.name).find({}).limit(3).toArray();
        console.log('   Sample data:');
        samples.forEach((doc, i) => {
          const preview = JSON.stringify(doc, null, 2).split('\n').slice(0, 3).join('\n');
          console.log(`   [${i + 1}] ${preview}...`);
        });
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('\n💡 To clear a collection, use:');
    console.log('   node scripts/clearEmailAccounts.js');
    console.log('   node scripts/clearPasswordResetTokens.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkDatabase();
