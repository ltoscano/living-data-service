// server.js - Express + PDF-lib per generare Living PDF
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const Database = require('better-sqlite3');
const KeycloakAuth = require('./keycloak-integration');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configurazione da environment variables
const VERSION = '0.80'; // Version of Living Data Service - easily modifiable
const DB_PATH = process.env.DB_PATH || './data/documents.db';
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS) || 30;
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 5;

// Setup database SQLite
let db;
async function initDatabase() {
  // Crea cartella data se non esiste
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true }).catch(() => {});
  
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Crea tabelle
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastLogin DATETIME,
      isActive BOOLEAN DEFAULT TRUE,
      isAdmin BOOLEAN DEFAULT FALSE
    );
    
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      parentId TEXT,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (parentId) REFERENCES folders (id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      accessToken TEXT UNIQUE NOT NULL,
      currentVersion TEXT NOT NULL,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastUpdate DATETIME DEFAULT CURRENT_TIMESTAMP,
      updateFrequency TEXT DEFAULT 'manual',
      downloads INTEGER DEFAULT 0,
      activeViewers INTEGER DEFAULT 0,
      filePath TEXT NOT NULL,
      available BOOLEAN DEFAULT TRUE,
      folderId TEXT,
      relativePath TEXT,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (folderId) REFERENCES folders (id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      documentId TEXT NOT NULL,
      version TEXT NOT NULL,
      filePath TEXT NOT NULL,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE,
      UNIQUE(documentId, version)
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(userId);
    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parentId);
    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(userId);
    CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folderId);
    CREATE INDEX IF NOT EXISTS idx_documents_token ON documents(accessToken);
    CREATE INDEX IF NOT EXISTS idx_versions_doc ON versions(documentId);
    CREATE INDEX IF NOT EXISTS idx_versions_created ON versions(created);
  `);
  
  console.log('📊 Database SQLite inizializzato:', DB_PATH);
  
  // Migrazione: aggiungi campo isAdmin se non esiste
  try {
    db.exec('ALTER TABLE users ADD COLUMN isAdmin BOOLEAN DEFAULT FALSE');
    console.log('✅ Migrazione: Campo isAdmin aggiunto alla tabella users');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      console.error('❌ Errore migrazione:', error.message);
    }
  }
  
  // Crea superuser se non esiste
  await createSuperUserIfNotExists();
}

// Crea superuser se non esiste
async function createSuperUserIfNotExists() {
  try {
    const superUserName = process.env.SUPERUSER_NAME || 'admin';
    const superUserPass = process.env.SUPERUSER_PASSWD || 'admin123';
    
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(superUserName);
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(superUserPass, 10);
      
      db.prepare(`
        INSERT INTO users (username, password, email, created, isAdmin)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, TRUE)
      `).run(superUserName, hashedPassword, 'admin@livingdata.local');
      
      console.log(`👤 Superuser '${superUserName}' creato con successo`);
    } else {
      // Assicuriamoci che il superuser esistente abbia isAdmin=true
      db.prepare('UPDATE users SET isAdmin = TRUE WHERE username = ?').run(superUserName);
      console.log(`👤 Superuser '${superUserName}' già esistente - aggiornato isAdmin=true`);
    }
  } catch (error) {
    console.error('Errore creazione superuser:', error);
  }
}

// Middleware di autenticazione (supporta sia Keycloak che auth locale)
function requireAuth(req, res, next) {
  const keycloakAuth = req.app.locals.keycloakAuth;
  
  // Se Keycloak è abilitato, richiedi ENTRAMBE le autenticazioni
  if (keycloakAuth && keycloakAuth.enabled) {
    console.log('🔐 RequireAuth Dual Auth check:');
    console.log('  - keycloakAuthenticated:', !!req.session?.keycloakAuthenticated);
    console.log('  - session.userId:', req.session?.userId);
    console.log('  - req.user exists:', !!req.user);
    
    // Verifica che ENTRAMBE le autenticazioni siano completate
    const isKeycloakAuth = req.session && req.session.keycloakAuthenticated;
    const isLocalAuth = req.session && req.session.userId && req.user;
    
    if (isKeycloakAuth && isLocalAuth) {
      console.log('🔐 Dual authentication successful');
      return next();
    }
    
    if (!isKeycloakAuth) {
      console.log('🔐 Keycloak authentication missing');
    }
    if (!isLocalAuth) {
      console.log('🔐 Local authentication missing');
    }
    
    return res.status(401).json({ error: 'Dual authentication required (Keycloak + Local)' });
  }
  
  // Altrimenti usa solo l'autenticazione locale
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Verifica che req.user sia impostato dal middleware getCurrentUser
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'User not found in session' });
  }
  
  next();
}

// Middleware per ottenere l'utente corrente
function getCurrentUser(req, res, next) {
  const keycloakAuth = req.app.locals.keycloakAuth;
  
  // Se Keycloak è abilitato
  if (keycloakAuth && keycloakAuth.enabled) {
    // Prima prova con Passport (req.user già impostato)
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      // req.user è già impostato da Passport
      if (!req.user.id && req.user.userId) {
        req.user.id = req.user.userId;
      }
      req.user.authMethod = 'keycloak';
    } 
    // Fallback: usa la sessione se Passport non ha funzionato
    else if (req.session && req.session.userId) {
      const user = db.prepare('SELECT id, username, email, isAdmin FROM users WHERE id = ?').get(req.session.userId);
      if (user) {
        req.user = {
          ...user,
          authMethod: 'keycloak',
          isAdmin: !!user.isAdmin
        };
      }
    }
  } else if (req.session && req.session.userId) {
    // Autenticazione locale
    const user = db.prepare('SELECT id, username, email, isAdmin FROM users WHERE id = ?').get(req.session.userId);
    if (user) {
      req.user = {
        ...user,
        authMethod: 'local',
        isAdmin: !!user.isAdmin
      };
    }
  }
  next();
}

// Sistema di pulizia automatica
async function cleanupOldVersions() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    // Trova versioni vecchie da eliminare
    const oldVersions = db.prepare(`
      SELECT v.*, d.name as documentName 
      FROM versions v 
      JOIN documents d ON v.documentId = d.id 
      WHERE v.created < ? AND v.version != d.currentVersion
      ORDER BY v.created ASC
    `).all(cutoffDate.toISOString());
    
    let deletedCount = 0;
    
    for (const version of oldVersions) {
      try {
        // Elimina file fisico
        await fs.unlink(version.filePath).catch(() => {});
        
        // Elimina record dal database
        db.prepare('DELETE FROM versions WHERE id = ?').run(version.id);
        
        deletedCount++;
        console.log(`🗑️ Eliminata versione ${version.version} di "${version.documentName}" (${version.created})`);
      } catch (error) {
        console.error(`Errore eliminazione versione ${version.id}:`, error.message);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleanup completato: ${deletedCount} versioni eliminate (retention: ${RETENTION_DAYS} giorni)`);
    }
  } catch (error) {
    console.error('Errore durante cleanup:', error.message);
  }
}

// Avvia cleanup schedulato
function startCleanupScheduler() {
  const intervalMs = CLEANUP_INTERVAL * 60 * 1000; // Converti minuti in millisecondi
  
  console.log(`⏰ Cleanup scheduler avviato: ogni ${CLEANUP_INTERVAL} minuti (retention: ${RETENTION_DAYS} giorni)`);
  
  // Esegui subito il primo cleanup
  setTimeout(cleanupOldVersions, 10000); // Aspetta 10 secondi dopo l'avvio
  
  // Poi esegui ogni CLEANUP_INTERVAL minuti
  setInterval(cleanupOldVersions, intervalMs);
}

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.SECURE_COOKIES === 'true', // Use HTTPS only if explicitly enabled
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware per ottenere l'utente corrente (deve essere dopo session ma prima delle route API)
app.use(getCurrentUser);

app.use(express.json());

// ENDPOINT: Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Trova utente
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND isActive = 1').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verifica password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Aggiorna ultimo login
    db.prepare('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    // Crea sessione
    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: !!user.isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ENDPOINT: Get auth configuration
app.get('/api/auth/config', (req, res) => {
  const keycloakAuth = req.app.locals.keycloakAuth;
  res.json({
    keycloakEnabled: !!(keycloakAuth && keycloakAuth.enabled),
    keycloakLogoutUrl: keycloakAuth?.enabled ? '/auth/keycloak/logout' : null
  });
});

// ENDPOINT: Check auth status
app.get('/api/auth/status', (req, res) => {
  const keycloakAuth = req.app.locals.keycloakAuth;
  
  // Se Keycloak è abilitato, verifica doppia autenticazione
  if (keycloakAuth && keycloakAuth.enabled) {
    console.log('🔐 Auth Status Check:');
    console.log('  - keycloakAuthenticated:', !!req.session?.keycloakAuthenticated);
    console.log('  - session.userId:', req.session?.userId);
    console.log('  - keycloakUser:', !!req.session?.keycloakUser);
    
    const isKeycloakAuth = req.session && req.session.keycloakAuthenticated;
    const isLocalAuth = req.session && req.session.userId;
    
    // Se entrambe le autenticazioni sono completate
    if (isKeycloakAuth && isLocalAuth) {
      const user = db.prepare('SELECT id, username, email, isAdmin FROM users WHERE id = ?').get(req.session.userId);
      if (user) {
        console.log('🔐 Returning authenticated response with keycloak method');
        res.json({ 
          authenticated: true, 
          user: {
            ...user,
            isAdmin: !!user.isAdmin,
            authMethod: 'keycloak'
          },
          keycloakUser: req.session.keycloakUser,
          keycloakAuthenticated: true
        });
        return;
      }
    }
    
    // Stato parziale dell'autenticazione
    console.log('🔐 Returning partial authentication state');
    res.json({ 
      authenticated: false, 
      authMethod: 'keycloak',
      keycloakAuthenticated: !!isKeycloakAuth,
      localAuthenticated: !!isLocalAuth,
      keycloakUser: req.session.keycloakUser || null
    });
  } else {
    // Autenticazione locale semplice
    if (req.session && req.session.userId) {
      const user = db.prepare('SELECT id, username, email, isAdmin FROM users WHERE id = ?').get(req.session.userId);
      res.json({ 
        authenticated: true, 
        user: {
          ...user,
          isAdmin: !!user.isAdmin,
          authMethod: 'local'
        }
      });
    } else {
      res.json({ authenticated: false, authMethod: 'local' });
    }
  }
});


// ENDPOINT: Register (solo per demo, in produzione dovrebbe essere protetto)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Verifica se utente esiste
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crea utente
    const result = db.prepare(`
      INSERT INTO users (username, password, email, created)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(username, hashedPassword, email || null);
    
    res.json({
      success: true,
      message: 'User created successfully',
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(express.static('public'));

// ENDPOINT: Health check for Docker
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Living Data Service'
  });
});

// ENDPOINT: Crea Living Document  
app.post('/api/create-living-pdf', requireAuth, upload.single('pdf'), async (req, res) => {
  try {
    const { documentName, updateFrequency = 'manual' } = req.body;
    const originalFile = req.file;
    
    if (!originalFile) {
      return res.status(400).json({ error: 'File required' });
    }
    
    // Genera ID univoco per il documento e token per accesso pubblico
    const documentId = crypto.randomBytes(16).toString('hex');
    const accessToken = crypto.randomBytes(24).toString('hex'); // Token per link pubblico
    const currentVersion = '1.0';
    
    // Ottieni l'estensione del file originale
    const fileExtension = path.extname(originalFile.originalname) || '';
    const outputPath = `living-pdfs/${documentId}-v${currentVersion}${fileExtension}`;
    
    // Per i file PDF, applica le modifiche di tracking
    if (originalFile.mimetype === 'application/pdf') {
      try {
        // Legge il PDF originale
        const pdfBytes = await fs.readFile(originalFile.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Aggiunge campo nascosto per tracking
        const form = pdfDoc.getForm();
        const versionField = form.createTextField('__version');
        versionField.setText(currentVersion);
        
        const docIdField = form.createTextField('__docId');
        docIdField.setText(documentId);
        
        // Salva il Living PDF
        const livingPdfBytes = await pdfDoc.save();
        await fs.writeFile(outputPath, livingPdfBytes);
      } catch (error) {
        // Se il PDF è corrotto o non può essere modificato, copialo semplicemente
        console.warn('Could not modify PDF, copying original:', error.message);
        const originalBytes = await fs.readFile(originalFile.path);
        await fs.writeFile(outputPath, originalBytes);
      }
    } else {
      // Per tutti gli altri tipi di file, copialo semplicemente
      const originalBytes = await fs.readFile(originalFile.path);
      await fs.writeFile(outputPath, originalBytes);
    }
    
    // Salva documento nel database
    db.prepare(`
      INSERT INTO documents (id, userId, name, accessToken, currentVersion, filePath, updateFrequency, created, lastUpdate)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(documentId, req.user.id, documentName, accessToken, currentVersion, outputPath, updateFrequency);
    
    // Salva versione
    db.prepare(`
      INSERT INTO versions (documentId, version, filePath, created)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(documentId, currentVersion, outputPath);
    
    // Cleanup file temporaneo
    await fs.unlink(originalFile.path);
    
    res.json({
      success: true,
      documentId: documentId,
      version: currentVersion,
      downloadUrl: `/api/download/${documentId}`,
      publicUrl: `/public/${accessToken}`, // Link pubblico sempre aggiornato
      accessToken: accessToken
    });
    
  } catch (error) {
    console.error('Error creating living PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Crea Folder con file
app.post('/api/create-folder', requireAuth, upload.array('files'), async (req, res) => {
  try {
    const { folderName, filePaths } = req.body;
    const files = req.files;
    
    if (!folderName || !files || files.length === 0) {
      return res.status(400).json({ error: 'Folder name and files required' });
    }
    
    // Genera ID univoco per la folder principale
    const rootFolderId = crypto.randomBytes(16).toString('hex');
    
    // Salva folder principale nel database
    db.prepare(`
      INSERT INTO folders (id, userId, name, created)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(rootFolderId, req.user.id, folderName);
    
    // Mappa per tenere traccia delle folder create (path -> folderId)
    const folderMap = new Map();
    folderMap.set('', rootFolderId); // Root folder
    
    // Funzione per creare folder se non esiste
    function ensureFolderExists(folderPath, parentId = rootFolderId) {
      if (folderMap.has(folderPath)) {
        return folderMap.get(folderPath);
      }
      
      const folderName = path.basename(folderPath);
      const folderId = crypto.randomBytes(16).toString('hex');
      
      db.prepare(`
        INSERT INTO folders (id, userId, name, parentId, created)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(folderId, req.user.id, folderName, parentId);
      
      folderMap.set(folderPath, folderId);
      return folderId;
    }
    
    // Elabora tutti i file
    const createdDocuments = [];
    const filePathsArray = Array.isArray(filePaths) ? filePaths : [filePaths];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = filePathsArray[i] || file.originalname;
      
      try {
        // Estrae directory e file name dal percorso relativo
        const fileDirPath = path.dirname(relativePath);
        const fileName = path.basename(relativePath);
        
        // Crea tutte le folder necessarie nel percorso
        let currentFolderId = rootFolderId;
        
        if (fileDirPath && fileDirPath !== '.' && fileDirPath !== folderName) {
          // Rimuove il nome della folder principale dal percorso se presente
          const cleanPath = fileDirPath.startsWith(folderName + '/') 
            ? fileDirPath.substring(folderName.length + 1)
            : fileDirPath;
            
          if (cleanPath) {
            const pathParts = cleanPath.split('/').filter(part => part && part !== '.');
            let currentPath = '';
            
            for (const part of pathParts) {
              const parentPath = currentPath;
              currentPath = currentPath ? `${currentPath}/${part}` : part;
              
              const parentFolderId = parentPath ? folderMap.get(parentPath) || rootFolderId : rootFolderId;
              currentFolderId = ensureFolderExists(currentPath, parentFolderId);
            }
          }
        }
        
        // Genera ID univoco per ogni documento
        const documentId = crypto.randomBytes(16).toString('hex');
        const accessToken = crypto.randomBytes(24).toString('hex');
        const currentVersion = '1.0';
        
        const fileExtension = path.extname(fileName);
        const outputPath = `living-pdfs/${documentId}-v${currentVersion}${fileExtension}`;
        
        // Gestisce diversi tipi di file
        if (file.mimetype === 'application/pdf') {
          try {
            const pdfBytes = await fs.readFile(file.path);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            const form = pdfDoc.getForm();
            const versionField = form.createTextField('__version');
            versionField.setText(currentVersion);
            
            const docIdField = form.createTextField('__docId');
            docIdField.setText(documentId);
            
            const livingPdfBytes = await pdfDoc.save();
            await fs.writeFile(outputPath, livingPdfBytes);
          } catch (error) {
            console.warn('Could not modify PDF, copying original:', error.message);
            const originalBytes = await fs.readFile(file.path);
            await fs.writeFile(outputPath, originalBytes);
          }
        } else {
          const originalBytes = await fs.readFile(file.path);
          await fs.writeFile(outputPath, originalBytes);
        }
        
        // Salva documento nel database con la folder corretta
        db.prepare(`
          INSERT INTO documents (id, userId, name, accessToken, currentVersion, filePath, folderId, relativePath, created, lastUpdate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(documentId, req.user.id, fileName, accessToken, currentVersion, outputPath, currentFolderId, relativePath);
        
        // Salva versione
        db.prepare(`
          INSERT INTO versions (documentId, version, filePath, created)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(documentId, currentVersion, outputPath);
        
        createdDocuments.push({
          documentId,
          fileName,
          relativePath,
          folderId: currentFolderId,
          publicUrl: `/public/${accessToken}`
        });
        
        // Cleanup file temporaneo
        await fs.unlink(file.path);
        
      } catch (error) {
        console.error(`Error processing file ${relativePath}:`, error);
      }
    }
    
    res.json({
      success: true,
      folderId: rootFolderId,
      folderName: folderName,
      foldersCreated: folderMap.size,
      documentsCreated: createdDocuments.length,
      documents: createdDocuments
    });
    
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Controlla aggiornamenti (chiamato dal JavaScript nel PDF)
app.get('/api/check-update/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { currentVersion } = req.query;
    
    const doc = documents.get(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Incrementa counter visualizzazioni
    doc.activeViewers = (doc.activeViewers || 0) + 1;
    
    // Controlla se c'è una versione più recente
    const hasUpdate = parseFloat(doc.currentVersion) > parseFloat(currentVersion || '1.0');
    
    if (hasUpdate) {
      res.json({
        hasUpdate: true,
        version: doc.currentVersion,
        downloadUrl: `/api/download/${documentId}`,
        updateMessage: `Nuova versione ${doc.currentVersion} disponibile!`
      });
    } else {
      res.json({
        hasUpdate: false,
        version: doc.currentVersion
      });
    }
    
  } catch (error) {
    console.error('Error checking update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Handle /public without token - show helpful error page
app.get('/public', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  return res.status(400).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invalid Public Link</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #e67e22; margin-bottom: 20px; }
        p { color: #666; line-height: 1.6; margin-bottom: 15px; }
        .icon { font-size: 64px; margin-bottom: 20px; }
        .example { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e67e22; }
        .example code { font-family: monospace; color: #d73502; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🔗❓</div>
        <h1>Incomplete Public Link</h1>
        <p>You've accessed the public documents area, but you're missing the document identifier.</p>
        <p>Public document links should look like this:</p>
        <div class="example">
          <code>${req.protocol}://${req.get('host')}/public/[document-token]</code>
        </div>
        <p>Please check the complete link provided to you, or contact the person who shared the document for the correct URL.</p>
      </div>
    </body>
    </html>
  `);
});

// ENDPOINT: Handle /public/ (with trailing slash) without token
app.get('/public/', (req, res) => {
  res.redirect('/public');
});

// ENDPOINT: Download pubblico tramite token (sempre ultima versione)
app.get('/public/:accessToken', async (req, res) => {
  try {
    const { accessToken } = req.params;
    
    // Trova documento tramite accessToken
    const targetDoc = db.prepare('SELECT * FROM documents WHERE accessToken = ?').get(accessToken);
    
    if (!targetDoc) {
      // Header per evitare caching delle pagine di errore
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📄❌</div>
            <h1>Document Not Found</h1>
            <p>The document you're looking for doesn't exist or the link is invalid.</p>
            <p>Please contact the person who provided this link for an updated version.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Check if document is available
    if (!targetDoc.available) {
      // Header per evitare caching delle pagine di errore (unavailable)
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(410).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document Unavailable</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #f39c12; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📄⏸️</div>
            <h1>Document Temporarily Unavailable</h1>
            <p>This document is currently not available for download.</p>
            <p>Please contact the person who provided this link for updates or an alternative version.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Incrementa download counter
    db.prepare('UPDATE documents SET downloads = downloads + 1 WHERE id = ?').run(targetDoc.id);
    
    const fileBytes = await fs.readFile(targetDoc.filePath);
    const fileExtension = path.extname(targetDoc.filePath);
    
    // Determina il content type in base all'estensione
    let contentType = 'application/octet-stream'; // Default
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.txt') {
      contentType = 'text/plain';
    } else if (fileExtension === '.doc') {
      contentType = 'application/msword';
    } else if (fileExtension === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    
    // Header per gestione cache intelligente per documenti disponibili
    // ETag basato su ID documento, versione e stato di disponibilità
    const etag = `"${targetDoc.id}-${targetDoc.currentVersion}-${targetDoc.available ? 'available' : 'unavailable'}-${targetDoc.lastUpdate}"`;
    res.setHeader('ETag', etag);
    
    // Cache per 1 minuto ma richiedi validazione
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    res.setHeader('Last-Modified', new Date(targetDoc.lastUpdate).toUTCString());
    
    // Controlla If-None-Match per supportare ETag
    const clientETag = req.headers['if-none-match'];
    if (clientETag && clientETag === etag) {
      return res.status(304).end(); // Not Modified
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${targetDoc.name}-v${targetDoc.currentVersion}${fileExtension}"`);
    res.send(fileBytes);
    
  } catch (error) {
    console.error('Error downloading PDF via public link:', error);
    res.status(500).json({ error: 'File not found' });
  }
});

// ENDPOINT: Download Document (sempre ultima versione)
app.get('/api/download/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND userId = ?').get(documentId, req.user.id);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Incrementa download counter
    db.prepare('UPDATE documents SET downloads = downloads + 1 WHERE id = ?').run(documentId);
    
    const fileBytes = await fs.readFile(doc.filePath);
    const fileExtension = path.extname(doc.filePath);
    
    // Determina il content type in base all'estensione
    let contentType = 'application/octet-stream'; // Default
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.txt') {
      contentType = 'text/plain';
    } else if (fileExtension === '.doc') {
      contentType = 'application/msword';
    } else if (fileExtension === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}-v${doc.currentVersion}${fileExtension}"`);
    res.send(fileBytes);
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ error: 'File not found' });
  }
});

// ENDPOINT: Aggiorna contenuto di un documento
app.post('/api/update-document/:documentId', requireAuth, upload.single('pdf'), async (req, res) => {
  try {
    const { documentId } = req.params;
    const newFile = req.file;
    
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND userId = ?').get(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (!newFile) {
      return res.status(400).json({ error: 'New file required' });
    }
    
    // Incrementa versione
    const newVersion = (parseFloat(doc.currentVersion) + 0.1).toFixed(1);
    
    // Ottieni l'estensione del nuovo file
    const fileExtension = path.extname(newFile.originalname) || '';
    const newFilePath = `living-pdfs/${documentId}-v${newVersion}${fileExtension}`;
    
    // Per i file PDF, applica le modifiche di tracking
    if (newFile.mimetype === 'application/pdf') {
      try {
        // Crea nuovo Living PDF con la versione aggiornata
        const pdfBytes = await fs.readFile(newFile.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Aggiunge campi di tracking
        const form = pdfDoc.getForm();
        const versionField = form.createTextField('__version');
        versionField.setText(newVersion);
        
        const docIdField = form.createTextField('__docId');
        docIdField.setText(documentId);
        
        const livingPdfBytes = await pdfDoc.save();
        await fs.writeFile(newFilePath, livingPdfBytes);
      } catch (error) {
        // Se il PDF è corrotto o non può essere modificato, copialo semplicemente
        console.warn('Could not modify PDF, copying original:', error.message);
        const originalBytes = await fs.readFile(newFile.path);
        await fs.writeFile(newFilePath, originalBytes);
      }
    } else {
      // Per tutti gli altri tipi di file, copialo semplicemente
      const originalBytes = await fs.readFile(newFile.path);
      await fs.writeFile(newFilePath, originalBytes);
    }
    
    // Aggiorna documento
    db.prepare(`
      UPDATE documents 
      SET currentVersion = ?, filePath = ?, lastUpdate = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(newVersion, newFilePath, documentId);
    
    // Salva nuova versione
    db.prepare(`
      INSERT INTO versions (documentId, version, filePath, created)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(documentId, newVersion, newFilePath);
    
    // Cleanup
    await fs.unlink(newFile.path);
    
    res.json({
      success: true,
      documentId: documentId,
      version: newVersion,
      downloadUrl: `/api/download/${documentId}`
    });
    
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Lista documenti dell'utente
app.get('/api/documents', requireAuth, (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, 
             GROUP_CONCAT(v.version ORDER BY v.created) as allVersions
      FROM documents d
      LEFT JOIN versions v ON d.id = v.documentId
      WHERE d.userId = ?
      GROUP BY d.id
      ORDER BY d.lastUpdate DESC
    `).all(req.user.id);
    
    const docList = docs.map(doc => ({
      id: doc.id,
      name: doc.name,
      version: doc.currentVersion,
      created: doc.created,
      lastUpdate: doc.lastUpdate,
      downloads: doc.downloads,
      activeViewers: doc.activeViewers,
      updateFrequency: doc.updateFrequency,
      accessToken: doc.accessToken,
      publicUrl: `/public/${doc.accessToken}`,
      versions: doc.allVersions ? doc.allVersions.split(',') : [doc.currentVersion],
      available: !!doc.available
    }));
    
    res.json(docList);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Analytics globali
app.get('/api/analytics', requireAuth, (req, res) => {
  try {
    // Statistiche generali per l'utente corrente
    const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents WHERE userId = ?').get(req.user.id).count;
    const totalDownloads = db.prepare('SELECT SUM(downloads) as total FROM documents WHERE userId = ?').get(req.user.id).total || 0;
    const totalVersions = db.prepare(`
      SELECT COUNT(*) as count FROM versions v 
      JOIN documents d ON v.documentId = d.id 
      WHERE d.userId = ?
    `).get(req.user.id).count;
    
    // Documenti più scaricati dell'utente corrente
    const topDocuments = db.prepare(`
      SELECT name, downloads, currentVersion, created 
      FROM documents 
      WHERE userId = ?
      ORDER BY downloads DESC 
      LIMIT 10
    `).all(req.user.id);
    
    // Statistiche per mese dell'utente corrente
    const monthlyStats = db.prepare(`
      SELECT 
        strftime('%Y-%m', created) as month,
        COUNT(*) as documents,
        SUM(downloads) as downloads
      FROM documents 
      WHERE userId = ?
      GROUP BY strftime('%Y-%m', created)
      ORDER BY month DESC 
      LIMIT 12
    `).all(req.user.id);
    
    // Versioni per documento dell'utente corrente
    const documentVersions = db.prepare(`
      SELECT 
        d.name,
        d.currentVersion,
        COUNT(v.id) as totalVersions,
        MAX(v.created) as lastVersionDate
      FROM documents d
      LEFT JOIN versions v ON d.id = v.documentId
      WHERE d.userId = ?
      GROUP BY d.id
      ORDER BY totalVersions DESC
    `).all(req.user.id);
    
    res.json({
      summary: {
        totalDocuments,
        totalDownloads,
        totalVersions,
        averageVersionsPerDoc: totalDocuments > 0 ? (totalVersions / totalDocuments).toFixed(1) : 0
      },
      topDocuments,
      monthlyStats,
      documentVersions
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Cambia versione distribuita di un documento
app.post('/api/set-current-version/:documentId', requireAuth, (req, res) => {
  try {
    const { documentId } = req.params;
    const { version } = req.body;
    
    // Verifica che il documento esista e appartenga all'utente
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND userId = ?').get(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Verifica che la versione esista
    const versionExists = db.prepare(`
      SELECT * FROM versions WHERE documentId = ? AND version = ?
    `).get(documentId, version);
    
    if (!versionExists) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    // Aggiorna la versione corrente e il path del file
    db.prepare(`
      UPDATE documents 
      SET currentVersion = ?, filePath = ?, lastUpdate = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(version, versionExists.filePath, documentId);
    
    res.json({ 
      success: true, 
      documentId, 
      newCurrentVersion: version,
      message: `Version ${version} is now the distributed version`
    });
  } catch (error) {
    console.error('Error setting current version:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Toggle document availability
app.post('/api/toggle-availability/:documentId', requireAuth, (req, res) => {
  try {
    const { documentId } = req.params;
    const { available } = req.body;
    
    // Verifica che il documento esista e appartenga all'utente
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND userId = ?').get(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Aggiorna disponibilità
    db.prepare(`
      UPDATE documents 
      SET available = ?, lastUpdate = CURRENT_TIMESTAMP 
      WHERE id = ? AND userId = ?
    `).run(available ? 1 : 0, documentId, req.user.id);
    
    res.json({ 
      success: true, 
      documentId, 
      available: !!available,
      message: `Document is now ${available ? 'available' : 'unavailable'}`
    });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Get server configuration
app.get('/api/config', requireAuth, (req, res) => {
  try {
    res.json({
      version: VERSION,
      retentionDays: RETENTION_DAYS,
      cleanupInterval: CLEANUP_INTERVAL,
      maxFileSize: process.env.MAX_FILE_SIZE || '50MB',
      maxFilesPerUser: process.env.MAX_FILES_PER_USER || 100
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Get auth configuration (pubblico)
app.get('/api/auth/config', (req, res) => {
  res.json({
    keycloakEnabled: process.env.ENABLE_KEYCLOAK === 'true',
    keycloakLoginUrl: process.env.ENABLE_KEYCLOAK === 'true' ? '/auth/keycloak' : null,
    keycloakLogoutUrl: process.env.ENABLE_KEYCLOAK === 'true' ? '/auth/keycloak/logout' : null
  });
});

// ENDPOINT: Get users (admin only)
app.get('/api/users', requireAuth, (req, res) => {
  try {
    // Controlla se l'utente corrente è admin
    const currentUser = db.prepare('SELECT isAdmin FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = db.prepare(`
      SELECT id, username, email, created, lastLogin, isActive, isAdmin 
      FROM users 
      ORDER BY created DESC
    `).all();

    // Trasforma isAdmin e isActive in booleani
    const formattedUsers = users.map(user => ({
      ...user,
      isAdmin: !!user.isAdmin,
      isActive: !!user.isActive
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Create user (admin only)
app.post('/api/users', requireAuth, async (req, res) => {
  try {
    // Controlla se l'utente corrente è admin
    const currentUser = db.prepare('SELECT isAdmin FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (username, password, email, created)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(username, hashedPassword, email || null);

    res.json({
      success: true,
      message: 'User created successfully',
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Update user (admin only)
app.put('/api/users/:userId', requireAuth, async (req, res) => {
  try {
    // Controlla se l'utente corrente è admin
    const currentUser = db.prepare('SELECT isAdmin FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { username, password, email, isAdmin } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is taken by another user
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Proteggi il superuser dalla modifica dello status admin
    const isSuperuser = user.username === process.env.SUPERUSER_NAME;
    if (isSuperuser && isAdmin === false) {
      return res.status(403).json({ error: 'Cannot remove admin status from superuser' });
    }

    // Update user
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare(`
        UPDATE users 
        SET username = ?, password = ?, email = ?, isAdmin = ? 
        WHERE id = ?
      `).run(username, hashedPassword, email || null, isAdmin ? 1 : 0, userId);
    } else {
      db.prepare(`
        UPDATE users 
        SET username = ?, email = ?, isAdmin = ? 
        WHERE id = ?
      `).run(username, email || null, isAdmin ? 1 : 0, userId);
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Toggle admin status
app.patch('/api/users/:userId/admin', requireAuth, (req, res) => {
  try {
    // Controlla se l'utente corrente è admin
    const currentUser = db.prepare('SELECT isAdmin FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { isAdmin } = req.body;

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Proteggi il superuser dalla modifica dello status admin
    const isSuperuser = user.username === process.env.SUPERUSER_NAME;
    if (isSuperuser && isAdmin === false) {
      return res.status(403).json({ error: 'Cannot remove admin status from superuser' });
    }

    // Update admin status
    db.prepare('UPDATE users SET isAdmin = ? WHERE id = ?').run(isAdmin ? 1 : 0, userId);

    res.json({
      success: true,
      message: `User ${isAdmin ? 'promoted to' : 'removed from'} admin successfully`
    });
  } catch (error) {
    console.error('Error updating user admin status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Delete user (admin only)
app.delete('/api/users/:userId', requireAuth, (req, res) => {
  try {
    // Controlla se l'utente corrente è admin
    const currentUser = db.prepare('SELECT isAdmin FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }

    // Delete user (documents will be cascade deleted)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Change password
app.post('/api/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }

    // Get current user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Delete document
app.delete('/api/documents/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Verifica che il documento esista e appartenga all'utente
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND userId = ?').get(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Ottieni tutte le versioni del documento per eliminare i file
    const versions = db.prepare('SELECT filePath FROM versions WHERE documentId = ?').all(documentId);
    
    // Elimina tutti i file fisici delle versioni
    for (const version of versions) {
      try {
        await fs.unlink(version.filePath).catch(() => {}); // Ignora errori se file non esiste
      } catch (error) {
        console.warn(`Could not delete file ${version.filePath}:`, error.message);
      }
    }
    
    // Elimina il file corrente del documento
    try {
      await fs.unlink(doc.filePath).catch(() => {});
    } catch (error) {
      console.warn(`Could not delete current file ${doc.filePath}:`, error.message);
    }
    
    // Elimina le versioni dal database (cascade delete dovrebbe gestire questo)
    db.prepare('DELETE FROM versions WHERE documentId = ?').run(documentId);
    
    // Elimina il documento dal database
    db.prepare('DELETE FROM documents WHERE id = ? AND userId = ?').run(documentId, req.user.id);
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Download versione specifica di un documento
app.get('/api/download/:documentId/version/:version', requireAuth, async (req, res) => {
  try {
    const { documentId, version } = req.params;
    
    // Trova versione specifica per l'utente corrente
    const versionData = db.prepare(`
      SELECT v.*, d.name 
      FROM versions v 
      JOIN documents d ON v.documentId = d.id 
      WHERE v.documentId = ? AND v.version = ? AND d.userId = ?
    `).get(documentId, version, req.user.id);
    
    if (!versionData) {
      return res.status(404).json({ error: 'Document or version not found' });
    }
    
    const fileBytes = await fs.readFile(versionData.filePath);
    const fileExtension = path.extname(versionData.filePath);
    
    // Determina il content type in base all'estensione
    let contentType = 'application/octet-stream'; // Default
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.txt') {
      contentType = 'text/plain';
    } else if (fileExtension === '.doc') {
      contentType = 'application/msword';
    } else if (fileExtension === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${versionData.name}-v${version}${fileExtension}"`);
    res.send(fileBytes);
    
  } catch (error) {
    console.error('Error downloading specific version:', error);
    res.status(500).json({ error: 'File not found' });
  }
});

// Genera il codice JavaScript per l'auto-aggiornamento
function generateUpdateScript(documentId, currentVersion, updateFrequency = 'manual') {
  // Calcola l'intervallo in millisecondi
  const intervals = {
    'manual': 0, // Nessun controllo automatico
    'daily': 24 * 60 * 60 * 1000, // 1 giorno
    'weekly': 7 * 24 * 60 * 60 * 1000, // 1 settimana  
    'monthly': 30 * 24 * 60 * 60 * 1000 // 1 mese
  };
  
  const checkInterval = intervals[updateFrequency] || 0;
  
  return `
    // Living PDF Auto-Update Script v2.0
    // Generato automaticamente - Non modificare
    
    var documentId = "${documentId}";
    var currentVersion = "${currentVersion}";
    var updateFrequency = "${updateFrequency}";
    var checkInterval = ${checkInterval};
    var baseUrl = "${process.env.BASE_URL || 'http://localhost:3000'}"; // Base URL configurabile
    
    // Funzione principale di controllo aggiornamenti
    function checkForUpdates() {
      try {
        console.println("=== LIVING PDF DEBUG ===");
        console.println("Document ID: " + documentId);
        console.println("Current Version: " + currentVersion);
        console.println("Update Frequency: " + updateFrequency);
        console.println("Base URL: " + baseUrl);
        
        // Verifica se Net.HTTP è disponibile
        if (typeof Net === 'undefined' || typeof Net.HTTP === 'undefined') {
          console.println("ERRORE: Net.HTTP non disponibile in questo PDF viewer");
          app.alert("Questo PDF viewer non supporta gli aggiornamenti automatici.\\n\\nScarica manualmente dal server: " + baseUrl + "/api/download/" + documentId);
          return;
        }
        
        // Test di sicurezza prima di procedere
        try {
          // Prova a creare un oggetto HTTP per verificare i permessi
          var testRequest = Net.HTTP;
          if (!testRequest) {
            throw new Error("Net.HTTP bloccato dalle impostazioni di sicurezza");
          }
        } catch (securityError) {
          console.println("ERRORE SICUREZZA: " + securityError.message);
          app.alert("Aggiornamenti bloccati dalla sicurezza di Adobe.\\n\\n" +
                   "Per abilitare:\\n" +
                   "1. Edit > Preferences > Security (Enhanced)\\n" +
                   "2. Disabilita 'Enable Enhanced Security'\\n" +
                   "3. Riavvia Adobe\\n\\n" +
                   "Oppure scarica manualmente: " + baseUrl + "/api/download/" + documentId);
          return;
        }
        
        // Costruisce URL per controllo aggiornamenti
        var checkUrl = baseUrl + "/api/check-update/" + documentId + "?currentVersion=" + currentVersion;
        console.println("URL controllo: " + checkUrl);
        
        // Effettua richiesta HTTP
        console.println("Tentativo richiesta HTTP...");
        var response = Net.HTTP.request({
          cURL: checkUrl,
          cMethod: "GET",
          cHeaders: {
            "Content-Type": "application/json"
          }
        });
        
        console.println("Risposta ricevuta: " + (response ? "SI" : "NO"));
        
        if (response) {
          console.println("Risposta JSON: " + response);
          var updateInfo = JSON.parse(response);
          console.println("Update disponibile: " + updateInfo.hasUpdate);
          console.println("Nuova versione: " + updateInfo.version);
          
          if (updateInfo.hasUpdate) {
            // Chiede all'utente se vuole aggiornare
            var userChoice = app.alert({
              cMsg: updateInfo.updateMessage + "\\n\\nVuoi scaricare la versione più recente?",
              cTitle: "Aggiornamento disponibile",
              nIcon: 2, // Icona domanda
              nType: 2, // Pulsanti Yes/No
              cLabel: "Aggiorna"
            });
            
            if (userChoice === 4) { // Se utente clicca "Yes"
              downloadUpdate(updateInfo.downloadUrl, updateInfo.version);
            }
          }
        } else {
          console.println("ERRORE: Nessuna risposta dal server");
          app.alert("Cannot check for updates.\\nServer unreachable: " + baseUrl);
        }
      } catch (error) {
        console.println("ERRORE Controllo aggiornamenti: " + error.message);
        app.alert("Update check error: " + error.message);
      }
    }
    
    // Scarica e applica aggiornamento
    function downloadUpdate(downloadUrl, newVersion) {
      try {
        app.alert("Download in corso...", 3);
        
        var newPdfData = Net.HTTP.request({
          cURL: downloadUrl,
          cMethod: "GET"
        });
        
        if (newPdfData) {
          // Salva PDF aggiornato
          var tempPath = "/tmp/updated_document.pdf";
          util.streamFromString(newPdfData).saveAs(tempPath);
          
          // Apre la nuova versione
          app.openDoc(tempPath);
          
          app.alert("Document updated to version " + newVersion + "!");
          
          // Chiude la versione corrente
          this.closeDoc();
        }
      } catch (error) {
        app.alert("Error during update: " + error.message);
      }
    }
    
    // Funzione per gestire controlli automatici periodici
    function setupAutomaticChecks() {
      if (checkInterval > 0) {
        try {
          // Carica il timestamp dell'ultimo controllo
          var lastCheckKey = "living_pdf_last_check_" + documentId;
          var lastCheck = global[lastCheckKey] || 0;
          var now = new Date().getTime();
          
          // Controlla se è passato abbastanza tempo
          if (now - lastCheck >= checkInterval) {
            checkForUpdates();
            global[lastCheckKey] = now;
          }
          
          // Imposta il prossimo controllo automatico
          var nextCheckDelay = checkInterval - (now - lastCheck);
          if (nextCheckDelay > 0) {
            app.setTimeOut("setupAutomaticChecks()", nextCheckDelay);
          } else {
            app.setTimeOut("setupAutomaticChecks()", checkInterval);
          }
          
          console.println("Prossimo controllo automatico in: " + Math.round(nextCheckDelay / 1000 / 60) + " minuti");
        } catch (error) {
          console.println("Errore setup controlli automatici: " + error.message);
        }
      }
    }
    
    // Test immediato che JavaScript funziona
    app.alert("Living PDF caricato!\\nDocument ID: " + documentId + "\\nVersione: " + currentVersion);
    
    // Esegue controllo all'apertura del documento
    app.setTimeOut("checkForUpdates()", 2000);
    
    // Avvia controlli automatici se configurati
    if (checkInterval > 0) {
      app.setTimeOut("setupAutomaticChecks()", 5000);
      console.println("Living PDF v" + currentVersion + " - Controlli automatici ogni " + updateFrequency);
    } else {
      console.println("Living PDF v" + currentVersion + " - Solo controlli manuali");
    }
  `;
}

// ENDPOINT: Ottieni albero delle folder
app.get('/api/folders/tree', requireAuth, (req, res) => {
  try {
    // Funzione ricorsiva per costruire l'albero
    function buildFolderTree(parentId = null) {
      const folders = db.prepare(`
        SELECT * FROM folders 
        WHERE userId = ? AND ${parentId ? 'parentId = ?' : 'parentId IS NULL'}
        ORDER BY name
      `).all(parentId ? [req.user.id, parentId] : [req.user.id]);
      
      const documents = db.prepare(`
        SELECT d.*, 
               (SELECT GROUP_CONCAT(v.version ORDER BY v.created DESC) FROM versions v WHERE v.documentId = d.id) as versions
        FROM documents d 
        WHERE d.userId = ? AND ${parentId ? 'd.folderId = ?' : 'd.folderId IS NULL'}
        ORDER BY d.name
      `).all(parentId ? [req.user.id, parentId] : [req.user.id]);
      
      const result = [];
      
      // Aggiungi folder
      for (const folder of folders) {
        const children = buildFolderTree(folder.id);
        result.push({
          id: folder.id,
          type: 'folder',
          name: folder.name,
          created: folder.created,
          children: children
        });
      }
      
      // Aggiungi documenti
      for (const doc of documents) {
        const versions = doc.versions ? doc.versions.split(',') : [doc.currentVersion];
        result.push({
          id: doc.id,
          type: 'file',
          name: doc.name,
          version: doc.currentVersion,
          versions: versions,
          created: doc.created,
          lastUpdate: doc.lastUpdate,
          downloads: doc.downloads,
          available: doc.available,
          status: 'active',
          publicUrl: `/public/${doc.accessToken}`,
          relativePath: doc.relativePath
        });
      }
      
      return result;
    }
    
    const tree = buildFolderTree();
    res.json(tree);
    
  } catch (error) {
    console.error('Error getting folder tree:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ENDPOINT: Elimina folder
app.delete('/api/folders/:folderId', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // Verifica che la folder esista e appartenga all'utente
    const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND userId = ?').get(folderId, req.user.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Funzione ricorsiva per eliminare folder e contenuti
    async function deleteFolderRecursive(folderId) {
      // Ottieni sottofolder
      const subfolders = db.prepare('SELECT id FROM folders WHERE parentId = ?').all(folderId);
      
      // Elimina ricorsivamente le sottofolder
      for (const subfolder of subfolders) {
        await deleteFolderRecursive(subfolder.id);
      }
      
      // Ottieni documenti nella folder
      const documents = db.prepare('SELECT * FROM documents WHERE folderId = ?').all(folderId);
      
      // Elimina documenti e i loro file
      for (const doc of documents) {
        // Elimina file fisici di tutte le versioni
        const versions = db.prepare('SELECT filePath FROM versions WHERE documentId = ?').all(doc.id);
        for (const version of versions) {
          try {
            await fs.unlink(version.filePath).catch(() => {});
          } catch (error) {
            console.warn(`Could not delete file ${version.filePath}:`, error.message);
          }
        }
        
        // Elimina file corrente
        try {
          await fs.unlink(doc.filePath).catch(() => {});
        } catch (error) {
          console.warn(`Could not delete current file ${doc.filePath}:`, error.message);
        }
        
        // Elimina da database
        db.prepare('DELETE FROM versions WHERE documentId = ?').run(doc.id);
        db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
      }
      
      // Elimina la folder dal database
      db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
    }
    
    await deleteFolderRecursive(folderId);
    
    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Avvia server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Inizializza database
    await initDatabase();
    
    // Inizializza Keycloak se abilitato
    if (process.env.ENABLE_KEYCLOAK === 'true') {
      const keycloakAuth = new KeycloakAuth(app, db);
      app.locals.keycloakAuth = keycloakAuth;
    }
    
    // getCurrentUser middleware è già registrato globalmente
    
    // Handle unmatched API routes before the catch-all
    app.all('/api/*', (req, res) => {
      res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
      });
    });

    // Handle unmatched auth routes
    app.all('/auth/*', (req, res) => {
      res.status(404).json({ 
        error: 'Auth endpoint not found',
        path: req.path,
        method: req.method
      });
    });

    // Handle unmatched assets routes
    app.all('/assets/*', (req, res) => {
      res.status(404).send('Asset not found');
    });

    // Serve React app per tutte le route non-API (catch-all route)
    app.get('*', (req, res) => {
      const keycloakAuth = req.app.locals.keycloakAuth;
      
      // Escludi le route di autenticazione, assets dal redirect automatico
      if (req.path.startsWith('/auth/') || 
          req.path.startsWith('/assets/') ||
          req.path.startsWith('/health') ||
          req.path.includes('.')) {
        return res.sendFile(path.join(__dirname, '../public/src/index.html'));
      }
      
      // Se Keycloak è abilitato e l'utente non è autenticato, reindirizza
      if (keycloakAuth && keycloakAuth.enabled) {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
          console.log(`🔐 Auto-redirecting unauthenticated user from ${req.originalUrl} to Keycloak`);
          req.session.returnTo = req.originalUrl;
          return res.redirect('/auth/keycloak');
        }
      }
      
      res.sendFile(path.join(__dirname, '../public/src/index.html'));
    });
    
    // Avvia cleanup scheduler
    startCleanupScheduler();
    
    // Crea cartelle necessarie
    await fs.mkdir('living-pdfs', { recursive: true }).catch(() => {});
    await fs.mkdir('uploads', { recursive: true }).catch(() => {});
    
    app.listen(PORT, () => {
      console.log(`🚀 Living PDF Service running on port ${PORT}`);
      console.log(`📊 Database: ${DB_PATH}`);
      console.log(`🧹 Retention: ${RETENTION_DAYS} giorni`);
    });
  } catch (error) {
    console.error('Errore avvio server:', error);
    process.exit(1);
  }
}

// Gestione graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Chiusura server...');
  if (db) {
    db.close();
    console.log('📁 Database SQLite chiuso correttamente');
  }
  process.exit(0);
});

startServer();

module.exports = app;
