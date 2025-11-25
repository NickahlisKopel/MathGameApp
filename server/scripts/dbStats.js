require('dotenv').config();
const { MongoMaintenanceService } = require('../services/mongoMaintenanceService');

async function showStats() {
    const maintenance = new MongoMaintenanceService();
    
    try {
        await maintenance.connect();
        console.log('=== Database Statistics ===\n');
        
        const stats = await maintenance.getCollectionStats();
        for (const [collection, data] of Object.entries(stats)) {
            console.log(`${collection}:`);
            console.log(`  Documents: ${data.count}`);
            console.log(`  Size: ${data.size}`);
            console.log(`  Storage: ${data.storageSize}`);
            console.log(`  Indexes: ${data.indexes}\n`);
        }
    } catch (error) {
        console.error('Failed to get stats:', error);
    } finally {
        await maintenance.close();
    }
}

showStats();
