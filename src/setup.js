// setup.js - Script di inizializzazione del progetto
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 Inizializzazione Living PDF Service...\n');

async function setupProject() {
  try {
    // Crea struttura cartelle
    const folders = [
      'living-pdfs',
      'uploads', 
      'public',
      'public/css',
      'public/js'
    ];
    
    console.log('📁 Creazione cartelle...');
    for (const folder of folders) {
      await fs.mkdir(folder, { recursive: true });
      console.log(`   ✅ ${folder}/`);
    }
    
    // Crea file HTML di esempio per il frontend
    const indexHTML = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Living PDF Service</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .upload-area { border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; }
        .upload-area:hover { border-color: #007bff; background: #f8f9fa; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; }
        .document-list { margin-top: 30px; }
        .document-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🔄 Living PDF Service</h1>
    <p>Crea PDF che si aggiornano automaticamente</p>
    
    <div class="upload-area" onclick="document.getElementById('pdfFile').click()">
        <h3>📄 Carica un PDF</h3>
        <p>Clicca qui per selezionare un file PDF da rendere "vivente"</p>
        <input type="file" id="pdfFile" accept=".pdf" style="display: none;">
    </div>
    
    <div>
        <label>Nome documento:</label><br>
        <input type="text" id="docName" placeholder="Es: Listino Prezzi 2025" style="width: 100%; padding: 8px; margin: 5px 0;">
    </div>
    
    <button onclick="uploadPDF()">Crea Living PDF</button>
    
    <div class="document-list">
        <h2>📋 Documenti Creati</h2>
        <div id="documentsList"></div>
    </div>
    
    <script>
        // JavaScript semplice per interfaccia
        async function uploadPDF() {
            const fileInput = document.getElementById('pdfFile');
            const docName = document.getElementById('docName').value;
            
            if (!fileInput.files[0] || !docName) {
                alert('Seleziona un file PDF e inserisci un nome');
                return;
            }
            
            const formData = new FormData();
            formData.append('pdf', fileInput.files[0]);
            formData.append('documentName', docName);
            
            try {
                const response = await fetch('/api/create-living-pdf', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ Living PDF creato con successo!');
                    loadDocuments();
                    document.getElementById('docName').value = '';
                    fileInput.value = '';
                } else {
                    alert('❌ Errore: ' + result.error);
                }
            } catch (error) {
                alert('❌ Errore di rete: ' + error.message);
            }
        }
        
        async function loadDocuments() {
            try {
                const response = await fetch('/api/documents');
                const docs = await response.json();
                
                const list = document.getElementById('documentsList');
                list.innerHTML = docs.map(doc => \`
                    <div class="document-item">
                        <h4>\${doc.name}</h4>
                        <p>Versione: \${doc.version} | Download: \${doc.downloads} | Creato: \${doc.created}</p>
                        <a href="/api/download/\${doc.id}" target="_blank">📥 Scarica PDF</a>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Errore caricamento documenti:', error);
            }
        }
        
        // Carica documenti all'avvio
        loadDocuments();
    </script>
</body>
</html>`;

    await fs.writeFile('public/index.html', indexHTML);
    console.log('   ✅ public/index.html');
    
    // Crea file .env di esempio
    const envExample = `# Configurazione Living PDF Service
PORT=3000
NODE_ENV=development

# Database (SQLite usa file locale)
DB_PATH=./living-pdf.db

# URL base per PDF JavaScript (cambia in produzione)
BASE_URL=http://localhost:3000

# Opzionale: limiti file
MAX_FILE_SIZE=50MB
MAX_FILES_PER_USER=100`;

    await fs.writeFile('.env.example', envExample);
    console.log('   ✅ .env.example');
    
    // Crea README
    const readme = `# 🔄 Living PDF Service

Servizio per creare PDF che si aggiornano automaticamente tramite JavaScript incorporato.

## ✨ Caratteristiche

- **PDF Auto-aggiornanti**: I PDF controllano automaticamente se esistono nuove versioni
- **Compatibilità**: Funziona con JavaScript abilitato, fallback senza JavaScript
- **Database SQLite**: Persistenza dati con database leggero
- **Analytics**: Tracking download, visualizzazioni e aggiornamenti
- **API RESTful**: Interfaccia programmatica completa

## 🚀 Quick Start

\`\`\`bash
# Installa dipendenze
npm install

# Avvia il server
npm start

# Oppure in modalità development
npm run dev
\`\`\`

Poi apri http://localhost:3000 per l'interfaccia web.

## 📡 API Endpoints

- \`POST /api/create-living-pdf\` - Crea nuovo Living PDF
- \`GET /api/download/:id\` - Scarica PDF (sempre ultima versione)
- \`POST /api/update-document/:id\` - Aggiorna contenuto
- \`GET /api/check-update/:id\` - Controlla aggiornamenti (chiamato dal PDF)
- \`GET /api/documents\` - Lista documenti
- \`GET /api/analytics/:id\` - Analytics dettagliate

## 🔧 Come Funziona

1. **Upload**: L'utente carica un PDF normale
2. **Processing**: Il server inietta JavaScript invisibile nel PDF
3. **Living PDF**: Il PDF risultante controlla aggiornamenti all'apertura
4. **Auto-update**: Scarica automaticamente nuove versioni quando disponibili

## 📱 Compatibilità

**✅ Funziona con JavaScript:**
- Adobe Acrobat Reader
- Foxit Reader  
- Altri viewer avanzati

**⚠️ Limitato senza JavaScript:**
- Anteprima Mac
- Browser integrati
- Viewer mobile

## 🗄️ Database

Il servizio usa SQLite per memorizzare:
- Metadati documenti
- Storico versioni  
- Analytics accessi
- Tracking eventi

## 📊 Analytics

Per ogni documento vengono tracciati:
- Download totali
- Controlli aggiornamento
- Visualizzatori attivi
- Storico versioni

## 🔒 Sicurezza

- File upload validati
- Sanitizzazione input
- Rate limiting (implementabile)
- Gestione errori robusta

## 🚀 Deploy

### Heroku
\`\`\`bash
git init
heroku create your-app-name
git add .
git commit -m "Initial commit"
git push heroku main
\`\`\`

### Railway
\`\`\`bash
npm install -g @railway/cli
railway login
railway init
railway up
\`\`\`

## 📝 TODO

- [ ] Autenticazione utenti
- [ ] Rate limiting  
- [ ] Notifiche email aggiornamenti
- [ ] Dashboard analytics avanzate
- [ ] White-label customization
- [ ] API webhooks
- [ ] Integrazione cloud storage

## 📄 Licenza

MIT License - vedi LICENSE file per dettagli.
`;

    await fs.writeFile('README.md', readme);
    console.log('   ✅ README.md');
    
    // Crea .gitignore
    const gitignore = `# Dependencies
node_modules/

# Database
*.db
*.sqlite
*.sqlite3

# Uploads e file generati
uploads/
living-pdfs/

# Environment
.env

# Logs
*.log
logs/

# Runtime
.DS_Store
Thumbs.db`;

    await fs.writeFile('.gitignore', gitignore);
    console.log('   ✅ .gitignore');
    
    console.log('\n🎉 Setup completato con successo!');
    console.log('\n📋 Prossimi passi:');
    console.log('   1. npm install');
    console.log('   2. npm start');
    console.log('   3. Apri http://localhost:3000');
    console.log('\n💡 Per development: npm run dev (richiede nodemon)');
    
  } catch (error) {
    console.error('❌ Errore durante il setup:', error);
    process.exit(1);
  }
}

setupProject();
