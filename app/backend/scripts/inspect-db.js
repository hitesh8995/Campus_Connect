const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/college_events';

async function inspectDatabase() {
    try {
        console.log(`Connecting to database at ${MONGO_URI}...`);
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully to MongoDB\n');

        const collections = await mongoose.connection.db.collections();

        if (collections.length === 0) {
            console.log('⚠️ No collections found in the database.');
            return;
        }

        console.log(`Found ${collections.length} collections:\n`);

        for (const collection of collections) {
            const name = collection.collectionName;
            const count = await collection.countDocuments();
            console.log(`--- Collection: ${name} (${count} documents) ---`);

            if (count > 0) {
                const sample = await collection.findOne();
                console.log('Sample Document:');
                console.log(JSON.stringify(sample, null, 2));
            } else {
                console.log('(Empty collection)');
            }
            console.log('\n');
        }

    } catch (error) {
        console.error('❌ Error inspecting database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database.');
    }
}

inspectDatabase();
