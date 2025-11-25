require('dotenv').config();
const { MongoMaintenanceService } = require('../services/mongoMaintenanceService');

async function runMaintenance() {
    const maintenance = new MongoMaintenanceService();
    
    try {
        await maintenance.connect();
        
        console.log('=== MongoDB Maintenance Started ===\n');
        
        // Show current stats
        console.log('Current Database Stats:');
        const beforeStats = await maintenance.getCollectionStats();
        for (const [collection, stats] of Object.entries(beforeStats)) {
            console.log(`\n${collection}:`);
            console.log(`  Documents: ${stats.count}`);
            console.log(`  Size: ${stats.size}`);
            console.log(`  Avg Document Size: ${stats.avgObjSize}`);
            console.log(`  Storage Size: ${stats.storageSize}`);
            console.log(`  Indexes: ${stats.indexes}`);
        }
        
        console.log('\n--- Running Cleanup ---\n');
        
        const results = await maintenance.runFullMaintenance();
        
        console.log('\n--- Cleanup Results ---');
        console.log(`Expired sessions: ${results.expiredSessions}`);
        console.log(`Anonymous sessions: ${results.anonymousSessions}`);
        console.log(`Orphaned results: ${results.orphanedResults}`);
        console.log(`Archived results: ${results.archivedResults}`);
        
        // Show after stats
        console.log('\n--- Database Stats After Maintenance ---');
        const afterStats = await maintenance.getCollectionStats();
        for (const [collection, stats] of Object.entries(afterStats)) {
            console.log(`\n${collection}:`);
            console.log(`  Documents: ${stats.count}`);
            console.log(`  Size: ${stats.size}`);
        }
        
        console.log('\n=== MongoDB Maintenance Completed ===');
        
    } catch (error) {
        console.error('Maintenance failed:', error);
        process.exit(1);
    } finally {
        await maintenance.close();
    }
}

if (require.main === module) {
    runMaintenance();
}

module.exports = { runMaintenance };
