import Database from 'better-sqlite3';
import path from 'path';

interface MaintenanceStats {
    expiredSessionsDeleted: number;
    anonymousSessionsDeleted: number;
    orphanedDataDeleted: number;
    vacuumPerformed: boolean;
    timestamp: string;
}

export class MaintenanceService {
    private db: Database.Database;

    constructor(dbPath?: string) {
        const defaultPath = path.join(__dirname, '..', 'database.sqlite');
        this.db = new Database(dbPath || defaultPath);
    }

    /**
     * Delete expired sessions
     */
    cleanupExpiredSessions(): number {
        const stmt = this.db.prepare(`
            DELETE FROM sessions
            WHERE expiresAt < datetime('now')
        `);
        const result = stmt.run();
        return result.changes;
    }

    /**
     * Delete old anonymous sessions (older than 7 days)
     */
    cleanupAnonymousSessions(daysOld: number = 7): number {
        const stmt = this.db.prepare(`
            DELETE FROM sessions
            WHERE userId IS NULL
            AND createdAt < datetime('now', '-${daysOld} days')
        `);
        const result = stmt.run();
        return result.changes;
    }

    /**
     * Clean up orphaned game results (users that no longer exist)
     */
    cleanupOrphanedGameResults(): number {
        const stmt = this.db.prepare(`
            DELETE FROM gameResults
            WHERE userId NOT IN (SELECT id FROM users)
        `);
        const result = stmt.run();
        return result.changes;
    }

    /**
     * Optimize database with VACUUM
     */
    vacuumDatabase(): void {
        this.db.exec('VACUUM');
    }

    /**
     * Analyze database for query optimization
     */
    analyzeDatabase(): void {
        this.db.exec('ANALYZE');
    }

    /**
     * Get database size statistics
     */
    getDatabaseStats() {
        const pageCount = this.db.prepare('PRAGMA page_count').get() as { page_count: number };
        const pageSize = this.db.prepare('PRAGMA page_size').get() as { page_size: number };
        const freeListCount = this.db.prepare('PRAGMA freelist_count').get() as { freelist_count: number };

        const totalSize = pageCount.page_count * pageSize.page_size;
        const freeSize = freeListCount.freelist_count * pageSize.page_size;

        return {
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            freeSizeMB: (freeSize / 1024 / 1024).toFixed(2),
            usedSizeMB: ((totalSize - freeSize) / 1024 / 1024).toFixed(2)
        };
    }

    /**
     * Get table row counts
     */
    getTableCounts() {
        const tables = ['users', 'sessions', 'gameResults'];
        const counts: Record<string, number> = {};

        for (const table of tables) {
            const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
            counts[table] = result.count;
        }

        return counts;
    }

    /**
     * Run full maintenance routine
     */
    runMaintenance(): MaintenanceStats {
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

        const stats: MaintenanceStats = {
            expiredSessionsDeleted,
            anonymousSessionsDeleted,
            orphanedDataDeleted,
            vacuumPerformed: true,
            timestamp: new Date().toISOString()
        };

        console.log('Maintenance complete!');
        return stats;
    }

    close(): void {
        this.db.close();
    }
}
