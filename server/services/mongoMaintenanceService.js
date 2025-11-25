const { MongoClient } = require('mongodb');

class MongoMaintenanceService {
    constructor(uri, dbName) {
        this.uri = uri || process.env.MONGODB_URI;
        this.dbName = dbName || process.env.DB_NAME || 'mathgame';
        this.client = null;
        this.db = null;
    }

    async connect() {
        this.client = new MongoClient(this.uri);
        await this.client.connect();
        this.db = this.client.db(this.dbName);
        console.log('Connected to MongoDB Atlas');
    }

    async setupIndexes() {
        console.log('Setting up indexes...');
        
        // Users collection indexes
        await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
        await this.db.collection('users').createIndex({ username: 1 }, { unique: true });
        await this.db.collection('users').createIndex({ createdAt: 1 });
        
        // Sessions collection indexes with TTL
        await this.db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await this.db.collection('sessions').createIndex({ userId: 1 });
        await this.db.collection('sessions').createIndex({ createdAt: 1 });
        
        // Game results indexes
        await this.db.collection('gameResults').createIndex({ userId: 1 });
        await this.db.collection('gameResults').createIndex({ timestamp: -1 });
        await this.db.collection('gameResults').createIndex({ userId: 1, timestamp: -1 });
        
        console.log('Indexes created successfully');
    }

    async setupValidationSchemas() {
        console.log('Setting up validation schemas...');
        
        // Users validation
        await this.db.command({
            collMod: 'users',
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['username', 'email', 'password'],
                    properties: {
                        username: {
                            bsonType: 'string',
                            minLength: 3,
                            maxLength: 30,
                            description: 'Username must be 3-30 characters'
                        },
                        email: {
                            bsonType: 'string',
                            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                            description: 'Must be a valid email'
                        },
                        password: {
                            bsonType: 'string',
                            minLength: 60,
                            maxLength: 60,
                            description: 'Must be bcrypt hashed password'
                        },
                        createdAt: {
                            bsonType: 'date'
                        }
                    }
                }
            },
            validationLevel: 'moderate'
        }).catch(() => console.log('Users collection validation already exists'));
        
        // Game results validation
        await this.db.command({
            collMod: 'gameResults',
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'score', 'questionCount', 'difficulty', 'operationType', 'timestamp'],
                    properties: {
                        score: {
                            bsonType: 'int',
                            minimum: 0,
                            maximum: 100
                        },
                        questionCount: {
                            bsonType: 'int',
                            minimum: 1,
                            maximum: 100
                        },
                        difficulty: {
                            enum: ['easy', 'medium', 'hard'],
                            description: 'Must be easy, medium, or hard'
                        },
                        operationType: {
                            enum: ['addition', 'subtraction', 'multiplication', 'division', 'mixed'],
                            description: 'Must be a valid operation type'
                        },
                        timestamp: {
                            bsonType: 'date'
                        }
                    }
                }
            },
            validationLevel: 'moderate'
        }).catch(() => console.log('GameResults validation already exists'));
        
        console.log('Validation schemas set up successfully');
    }

    async cleanupExpiredSessions() {
        const result = await this.db.collection('sessions').deleteMany({
            expiresAt: { $lt: new Date() }
        });
        return result.deletedCount;
    }

    async cleanupOldAnonymousSessions(daysOld = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const result = await this.db.collection('sessions').deleteMany({
            userId: { $exists: false },
            createdAt: { $lt: cutoffDate }
        });
        return result.deletedCount;
    }

    async cleanupOrphanedGameResults() {
        // Find all user IDs
        const userIds = await this.db.collection('users')
            .find({}, { projection: { _id: 1 } })
            .toArray();
        
        const validUserIds = userIds.map(u => u._id);
        
        // Delete game results where userId is not in the valid list
        const result = await this.db.collection('gameResults').deleteMany({
            userId: { $nin: validUserIds }
        });
        return result.deletedCount;
    }

    async archiveOldGameResults(daysOld = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        // Find old results
        const oldResults = await this.db.collection('gameResults')
            .find({ timestamp: { $lt: cutoffDate } })
            .toArray();
        
        if (oldResults.length > 0) {
            // Move to archive collection
            await this.db.collection('gameResults_archive').insertMany(
                oldResults.map(r => ({ ...r, archivedAt: new Date() }))
            );
            
            // Delete from main collection
            const result = await this.db.collection('gameResults').deleteMany({
                timestamp: { $lt: cutoffDate }
            });
            
            return result.deletedCount;
        }
        
        return 0;
    }

    async getCollectionStats() {
        const collections = ['users', 'sessions', 'gameResults'];
        const stats = {};
        
        for (const collection of collections) {
            const count = await this.db.collection(collection).countDocuments();
            const collStats = await this.db.command({ collStats: collection });
            
            stats[collection] = {
                count,
                size: (collStats.size / 1024 / 1024).toFixed(2) + ' MB',
                avgObjSize: (collStats.avgObjSize / 1024).toFixed(2) + ' KB',
                storageSize: (collStats.storageSize / 1024 / 1024).toFixed(2) + ' MB',
                indexes: collStats.nindexes
            };
        }
        
        return stats;
    }

    async runFullMaintenance() {
        console.log('Starting MongoDB maintenance...\n');
        
        const expiredSessions = await this.cleanupExpiredSessions();
        console.log(`✓ Deleted ${expiredSessions} expired sessions`);
        
        const anonymousSessions = await this.cleanupOldAnonymousSessions();
        console.log(`✓ Deleted ${anonymousSessions} old anonymous sessions`);
        
        const orphanedResults = await this.cleanupOrphanedGameResults();
        console.log(`✓ Deleted ${orphanedResults} orphaned game results`);
        
        const archivedResults = await this.archiveOldGameResults();
        console.log(`✓ Archived ${archivedResults} old game results`);
        
        await this.setupIndexes();
        console.log('✓ Indexes verified/created');
        
        return {
            expiredSessions,
            anonymousSessions,
            orphanedResults,
            archivedResults,
            timestamp: new Date().toISOString()
        };
    }

    async close() {
        if (this.client) {
            await this.client.close();
            console.log('MongoDB connection closed');
        }
    }
}

module.exports = { MongoMaintenanceService };
