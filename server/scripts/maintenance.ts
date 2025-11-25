import { MaintenanceService } from '../services/maintenanceService';

async function runMaintenance() {
    const maintenance = new MaintenanceService();

    try {
        console.log('=== Database Maintenance Started ===\n');

        // Show current stats
        console.log('Current Database Stats:');
        const beforeStats = maintenance.getDatabaseStats();
        console.log(`  Total Size: ${beforeStats.totalSizeMB} MB`);
        console.log(`  Used Size: ${beforeStats.usedSizeMB} MB`);
        console.log(`  Free Size: ${beforeStats.freeSizeMB} MB`);

        const tableCounts = maintenance.getTableCounts();
        console.log('\nTable Row Counts:');
        Object.entries(tableCounts).forEach(([table, count]) => {
            console.log(`  ${table}: ${count}`);
        });

        console.log('\n--- Running Cleanup ---\n');

        // Run maintenance
        const stats = maintenance.runMaintenance();

        console.log('\n--- Cleanup Results ---');
        console.log(`  Expired sessions deleted: ${stats.expiredSessionsDeleted}`);
        console.log(`  Anonymous sessions deleted: ${stats.anonymousSessionsDeleted}`);
        console.log(`  Orphaned data deleted: ${stats.orphanedDataDeleted}`);
        console.log(`  VACUUM performed: ${stats.vacuumPerformed}`);

        // Show after stats
        console.log('\nDatabase Stats After Maintenance:');
        const afterStats = maintenance.getDatabaseStats();
        console.log(`  Total Size: ${afterStats.totalSizeMB} MB`);
        console.log(`  Used Size: ${afterStats.usedSizeMB} MB`);
        console.log(`  Free Size: ${afterStats.freeSizeMB} MB`);

        const spaceSaved = parseFloat(beforeStats.totalSizeMB) - parseFloat(afterStats.totalSizeMB);
        if (spaceSaved > 0) {
            console.log(`  Space saved: ${spaceSaved.toFixed(2)} MB`);
        }

        console.log('\n=== Database Maintenance Completed ===');
    } catch (error) {
        console.error('Maintenance failed:', error);
        process.exit(1);
    } finally {
        maintenance.close();
    }
}

// Run if called directly
if (require.main === module) {
    runMaintenance();
}

export { runMaintenance };
