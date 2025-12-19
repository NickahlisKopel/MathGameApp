const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class MaintenanceService {
    constructor(dbPath) {
        // Try multiple possible locations
        const possiblePaths = [
            dbPath,
            path.join(__dirname, '..', 'database.sqlite'),
            path.join(__dirname, '..', 'services', 'database.sqlite'),
            path.join(__dirname, '..', '..', 'database.sqlite'),
        ].filter(Boolean);

        let foundPath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                foundPath = p;
                break;
            }
        }

        if (!foundPath) {
            console.error('Database file not found. Searched in:');
            possiblePaths.forEach(p => console.error(`  - ${p}`));
            throw new Error('Database file not found');
        }

        console.log(`Using database: ${foundPath}\n`);
        this.db = new Database(foundPath);
    }

    cleanupExpiredSessions() {
        const stmt = this.db.prepare(`
            DELETE FROM sessions
            WHERE expiresAt < datetime('now')
        `);
        const result = stmt.run();
        return result.changes;
    }

    cleanupAnonymousSessions(daysOld = 7) {
        const stmt = this.db.prepare(`
            DELETE FROM sessions
            WHERE userId IS NULL
            AND createdAt < datetime('now', '-${daysOld} days')
        `);
        const result = stmt.run();
        return result.changes;
    }

    cleanupOrphanedGameResults() {
        const stmt = this.db.prepare(`
            DELETE FROM gameResults
            WHERE userId NOT IN (SELECT id FROM users)
        `);
        const result = stmt.run();
        return result.changes;
    }

    vacuumDatabase() {
        this.db.exec('VACUUM');
    }

    analyzeDatabase() {
        this.db.exec('ANALYZE');
    }

    getDatabaseStats() {
        const pageCount = this.db.prepare('PRAGMA page_count').get();
        const pageSize = this.db.prepare('PRAGMA page_size').get();
        const freeListCount = this.db.prepare('PRAGMA freelist_count').get();

        const totalSize = pageCount.page_count * pageSize.page_size;
        const freeSize = freeListCount.freelist_count * pageSize.page_size;

        return {
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            freeSizeMB: (freeSize / 1024 / 1024).toFixed(2),
            usedSizeMB: ((totalSize - freeSize) / 1024 / 1024).toFixed(2)
        };
    }

    getTableCounts() {
        const tables = ['users', 'sessions', 'gameResults'];
        const counts = {};

        for (const table of tables) {
            const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
            counts[table] = result.count;
        }

        return counts;
    }

    runMaintenance() {
        console.log('Starting database maintenance...');

        const expiredSessionsDeleted = this.cleanupExpiredSessions();
        console.log(`Deleted ${expiredSessionsDeleted} expired sessions`);

        const anonymousSessionsDeleted = this.cleanupAnonymousSessions();
        console.log(`Deleted ${anonymousSessionsDeleted} old anonymous sessions`);

        const orphanedDataDeleted = this.cleanupOrphanedGameResults();
        console.log(`Deleted ${orphanedDataDeleted} orphaned game results`);

        console.log('Analyzing database...');
        this.analyzeDatabase();

        console.log('Running VACUUM...');
        this.vacuumDatabase();

        console.log('Maintenance complete!');
        
        return {
            expiredSessionsDeleted,
            anonymousSessionsDeleted,
            orphanedDataDeleted,
            vacuumPerformed: true,
            timestamp: new Date().toISOString()
        };
    }

    close() {
        this.db.close();
    }
}

async function runMaintenance() {
    // Accept database path from command line
    const dbPath = process.argv[2];
    const maintenance = new MaintenanceService(dbPath);

    try {
        console.log('=== Database Maintenance Started ===\n');

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

        const stats = maintenance.runMaintenance();

        console.log('\n--- Cleanup Results ---');
        console.log(`  Expired sessions deleted: ${stats.expiredSessionsDeleted}`);
        console.log(`  Anonymous sessions deleted: ${stats.anonymousSessionsDeleted}`);
        console.log(`  Orphaned data deleted: ${stats.orphanedDataDeleted}`);
        console.log(`  VACUUM performed: ${stats.vacuumPerformed}`);

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

if (require.main === module) {
    runMaintenance();
}

module.exports = { MaintenanceService, runMaintenance };
