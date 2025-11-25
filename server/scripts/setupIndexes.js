require('dotenv').config();
const { MongoMaintenanceService } = require('../services/mongoMaintenanceService');

async function setup() {
    const maintenance = new MongoMaintenanceService();
    
    try {
        await maintenance.connect();
        console.log('Setting up indexes and validation schemas...\n');
        
        await maintenance.setupIndexes();
        await maintenance.setupValidationSchemas();
        
        console.log('\n✓ Setup complete!');
        console.log('Your database now has:');
        console.log('  - Optimized indexes for queries');
        console.log('  - TTL index for automatic session cleanup');
        console.log('  - Data validation schemas');
        
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    } finally {
        await maintenance.close();
    }
}

setup();
