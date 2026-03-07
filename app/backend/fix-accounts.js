require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixAccounts() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college_events');
        console.log('Connected to MongoDB');

        // Fix all student/faculty accounts that have unverified emails
        const result = await User.updateMany(
            { role: { $in: ['student', 'faculty'] }, emailVerified: false },
            { $set: { emailVerified: true } }
        );
        console.log(`Updated ${result.modifiedCount} accounts to emailVerified: true`);

        // Show all users
        const users = await User.find({}, 'name email role emailVerified approvalStatus').lean();
        console.log('\nAll users:');
        users.forEach(u => {
            console.log(`  ${u.name} - ${u.email} - ${u.role} - verified:${u.emailVerified} - ${u.approvalStatus}`);
        });

        await mongoose.disconnect();
        console.log('\nDone!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixAccounts();
