// config/migration.js
// Run this script ONCE to add createdBy to existing teams and matches

require('dotenv').config();
const mongoose = require('mongoose');
const { Team, Match, User } = require('../models'); // Fixed: Added ../ to go up one directory

const migrateDatabase = async () => {
  try {
    console.log('🚀 Starting database migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get first user (or create a default user)
    let defaultUser = await User.findOne();
    
    if (!defaultUser) {
      console.log('⚠️  No users found. Please create a user first.');
      console.log('   You can either:');
      console.log('   1. Sign up through your application');
      console.log('   2. Or uncomment the code below to create a default user');
      
      // Uncomment this to create a default user
      /*
      defaultUser = await User.create({
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: 'Admin@123'
      });
      console.log('✅ Created default user:', defaultUser.email);
      */
      
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('📋 Using default user:', defaultUser.email);

    // Update all teams without createdBy
    const teamsWithoutOwner = await Team.find({ 
      $or: [
        { createdBy: { $exists: false } },
        { createdBy: null }
      ]
    });

    console.log(`\n📦 Found ${teamsWithoutOwner.length} teams without owner`);

    if (teamsWithoutOwner.length > 0) {
      for (const team of teamsWithoutOwner) {
        team.createdBy = defaultUser._id;
        await team.save();
        console.log(`  ✓ Updated team: ${team.name}`);
      }
      console.log(`✅ Updated ${teamsWithoutOwner.length} teams`);
    }

    // Update all matches without createdBy
    const matchesWithoutOwner = await Match.find({ 
      $or: [
        { createdBy: { $exists: false } },
        { createdBy: null }
      ]
    });

    console.log(`\n🏏 Found ${matchesWithoutOwner.length} matches without owner`);

    if (matchesWithoutOwner.length > 0) {
      for (const match of matchesWithoutOwner) {
        match.createdBy = defaultUser._id;
        await match.save();
        console.log(`  ✓ Updated match: ${match._id}`);
      }
      console.log(`✅ Updated ${matchesWithoutOwner.length} matches`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Teams updated: ${teamsWithoutOwner.length}`);
    console.log(`   - Matches updated: ${matchesWithoutOwner.length}`);
    console.log(`   - Assigned to user: ${defaultUser.email}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run migration
migrateDatabase();