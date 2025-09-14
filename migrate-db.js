#!/usr/bin/env node

require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || './data/documents.db';

async function migrateDatabase() {
  console.log('🔄 Starting database migration...');
  
  const db = new Database(DB_PATH);
  
  try {
    // Check if we need to migrate
    const tableInfo = db.pragma("table_info('documents')");
    const hasUserId = tableInfo.some(column => column.name === 'userId');
    const hasAvailable = tableInfo.some(column => column.name === 'available');
    
    if (hasUserId && hasAvailable) {
      console.log('✅ Database already migrated');
      process.exit(0);
    }
    
    console.log('📊 Migrating database schema...');
    
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        created DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastLogin DATETIME,
        isActive BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Create or get superuser
    const superUserName = process.env.SUPERUSER_NAME || 'admin';
    const superUserPass = process.env.SUPERUSER_PASSWD || 'admin123';
    
    let adminUserId;
    const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(superUserName);
    
    if (existingAdmin) {
      adminUserId = existingAdmin.id;
      console.log(`👤 Found existing superuser '${superUserName}' with ID ${adminUserId}`);
    } else {
      const hashedPassword = await bcrypt.hash(superUserPass, 10);
      const result = db.prepare(`
        INSERT INTO users (username, password, email, created)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(superUserName, hashedPassword, 'admin@livingdata.local');
      
      adminUserId = result.lastInsertRowid;
      console.log(`👤 Created superuser '${superUserName}' with ID ${adminUserId}`);
    }
    
    // Check if documents table exists and has data
    const documentsCount = db.prepare("SELECT COUNT(*) as count FROM documents").get().count;
    
    if (documentsCount > 0) {
      console.log(`📄 Found ${documentsCount} existing documents, assigning to admin user...`);
      
      // Add userId column if it doesn't exist
      if (!hasUserId) {
        db.exec('ALTER TABLE documents ADD COLUMN userId INTEGER');
      }
      
      // Add available column if it doesn't exist  
      if (!hasAvailable) {
        db.exec('ALTER TABLE documents ADD COLUMN available BOOLEAN DEFAULT TRUE');
      }
      
      // Assign all existing documents to admin user
      db.prepare('UPDATE documents SET userId = ?').run(adminUserId);
      
      // Set all existing documents as available
      db.prepare('UPDATE documents SET available = 1 WHERE available IS NULL').run();
      
      console.log('✅ All existing documents assigned to admin user and set as available');
    } else {
      // Add userId column if it doesn't exist
      if (!hasUserId) {
        db.exec('ALTER TABLE documents ADD COLUMN userId INTEGER');
      }
      
      // Add available column if it doesn't exist
      if (!hasAvailable) {
        db.exec('ALTER TABLE documents ADD COLUMN available BOOLEAN DEFAULT TRUE');
      }
      
      console.log('✅ Added userId and available columns to empty documents table');
    }
    
    // Add indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(userId)');
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('✅ Database migration completed successfully!');
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Username: ${superUserName}`);
    console.log(`   Password: ${superUserPass}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    db.exec('ROLLBACK');
    process.exit(1);
  } finally {
    db.close();
  }
}

migrateDatabase();