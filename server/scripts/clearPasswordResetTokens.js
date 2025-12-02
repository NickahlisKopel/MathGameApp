require('dotenv').config();
const { MongoClient } = require('mongodb');

async function clearPasswordResetTokens() {
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

    // Count tokens before deletion
    const beforeCount = await db.collection('passwordResetTokens').countDocuments();
    console.log(`\n📊 Found ${beforeCount} password reset tokens`);

    if (beforeCount === 0) {
      console.log('✅ Collection is already empty, nothing to clear');
      return;
    }

    // Option 1: Delete all tokens
    console.log('\n🗑️  Deleting all password reset tokens...');
    const result = await db.collection('passwordResetTokens').deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} tokens`);

    // Option 2: Or drop the entire collection (uncomment to use)
    // console.log('\n🗑️  Dropping passwordResetTokens collection...');
    // await db.collection('passwordResetTokens').drop();
    // console.log('✅ Collection dropped');

    // Verify
    const afterCount = await db.collection('passwordResetTokens').countDocuments();
    console.log(`\n✅ Final count: ${afterCount} tokens remaining`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

clearPasswordResetTokens();
