// server.js - Express + PDF-lib per generare Living PDF
const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Database semplice (in produzione usare PostgreSQL/MongoDB)
const documents = new Map();
const versions = new Map();

app.use(express.json());
app.use(express.static('public'));

// ENDPOINT: Crea Living PDF
app.post('/api/create-living-pdf', upload.single('pdf'), async (req, res) => {
  try {
    const { documentName, updateFrequency = 'manual' } = req.body;
    const originalPDF = req.file;
    
    if (!originalPDF) {
      return res.status(400).json({ error: 'PDF file required' });
    }
    
    // Genera ID univoco per il documento
    const documentId = crypto.randomBytes(16).toString('hex');
    const currentVersion = '1.0';
    
    // Legge il PDF originale
    const pdfBytes = await fs.readFile(originalPDF.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Aggiunge il JavaScript di auto-aggiornamento
    const jsCode = generateUpdateScript(documentId, currentVersion);
    pdfDoc.addJavaScript('autoUpdate', jsCode);
    
    // Aggiunge campo nascosto per tracking
    const form = pdfDoc.getForm();
    const versionField = form.createTextField('__version');
    versionField.setText(currentVersion);
    versionField.setFontSize(0); // invisibile
    
    const docIdField = form.createTextField('__docId');
    docIdField.setText(documentId);
    docIdField.setFontSize(0); // invisibile
    
    // Salva il Living PDF
    const livingPdfBytes = await pdfDoc.save();
    const outputPath = `living-pdfs/${documentId}-v${currentVersion}.pdf`;
    await fs.writeFile(outputPath, livingPdfBytes);
    
    // Salva metadata nel database
    documents.set(documentId, {
      id: documentId,
      name: documentName,
      currentVersion: currentVersion,
      created: new Date(),
      lastUpdate: new Date(),
      updateFrequency: updateFrequency,
      downloads: 0,
      activeViewers: 0,
      filePath: outputPath
    });
    
    // Salva versione originale
    versions.set(`${documentId}-${currentVersion}`, {
      version: currentVersion,
      filePath: outputPath,
      timestamp: new Date()
    });
    
    // Cleanup file temporaneo
    await fs.unlink(originalPDF.path);
    
    res.json({
      success: true,
      documentId: documentId,
      version: currentVersion,
      downloadUrl: `/api/download/${documentId}`
    });
    
  } catch (error) {
    console.error('Error creating living PDF:', error);
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

// ENDPOINT: Download PDF (sempre ultima versione)
app.get('/api/download/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = documents.get(documentId);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Incrementa download counter
    doc.downloads = (doc.downloads || 0) + 1;
    
    const pdfBytes = await fs.readFile(doc.filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}-v${doc.currentVersion}.pdf"`);
    res.send(pdfBytes);
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ error: 'File not found' });
  }
});

// ENDPOINT: Aggiorna contenuto di un documento
app.post('/api/update-document/:documentId', upload.single('pdf'), async (req, res) => {
  try {
    const { documentId } = req.params;
    const newPdfFile = req.file;
    
    const doc = documents.get(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (!newPdfFile) {
      return res.status(400).json({ error: 'New PDF file required' });
    }
    
    // Incrementa versione
    const newVersion = (parseFloat(doc.currentVersion) + 0.1).toFixed(1);
    
    // Crea nuovo Living PDF con la versione aggiornata
    const pdfBytes = await fs.readFile(newPdfFile.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const jsCode = generateUpdateScript(documentId, newVersion);
    pdfDoc.addJavaScript('autoUpdate', jsCode);
    
    // Aggiunge campi di tracking
    const form = pdfDoc.getForm();
    const versionField = form.createTextField('__version');
    versionField.setText(newVersion);
    versionField.setFontSize(0);
    
    const docIdField = form.createTextField('__docId');
    docIdField.setText(documentId);
    docIdField.setFontSize(0);
    
    const livingPdfBytes = await pdfDoc.save();
    const newFilePath = `living-pdfs/${documentId}-v${newVersion}.pdf`;
    await fs.writeFile(newFilePath, livingPdfBytes);
    
    // Aggiorna database
    doc.currentVersion = newVersion;
    doc.lastUpdate = new Date();
    doc.filePath = newFilePath;
    
    versions.set(`${documentId}-${newVersion}`, {
      version: newVersion,
      filePath: newFilePath,
      timestamp: new Date()
    });
    
    // Cleanup
    await fs.unlink(newPdfFile.path);
    
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
app.get('/api/documents', (req, res) => {
  const docList = Array.from(documents.values()).map(doc => ({
    id: doc.id,
    name: doc.name,
    version: doc.currentVersion,
    created: doc.created,
    lastUpdate: doc.lastUpdate,
    downloads: doc.downloads,
    activeViewers: doc.activeViewers,
    updateFrequency: doc.updateFrequency
  }));
  
  res.json(docList);
});

// Genera il codice JavaScript per l'auto-aggiornamento
function generateUpdateScript(documentId, currentVersion) {
  return `
    // Living PDF Auto-Update Script v1.0
    // Generato automaticamente - Non modificare
    
    var documentId = "${documentId}";
    var currentVersion = "${currentVersion}";
    var baseUrl = "https://your-domain.com"; // Sostituire con URL reale
    
    // Funzione principale di controllo aggiornamenti
    function checkForUpdates() {
      try {
        // Costruisce URL per controllo aggiornamenti
        var checkUrl = baseUrl + "/api/check-update/" + documentId + "?currentVersion=" + currentVersion;
        
        // Effettua richiesta HTTP
        var response = Net.HTTP.request({
          cURL: checkUrl,
          cMethod: "GET",
          cHeaders: {
            "Content-Type": "application/json"
          }
        });
        
        if (response) {
          var updateInfo = JSON.parse(response);
          
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
        }
      } catch (error) {
        // Errore silenzioso - il PDF funziona comunque offline
        console.println("Controllo aggiornamenti non riuscito: " + error.message);
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
          
          app.alert("Documento aggiornato alla versione " + newVersion + "!");
          
          // Chiude la versione corrente
          this.closeDoc();
        }
      } catch (error) {
        app.alert("Errore durante l'aggiornamento: " + error.message);
      }
    }
    
    // Esegue controllo all'apertura del documento
    // Con un delay per permettere al documento di caricarsi completamente
    app.setTimeOut("checkForUpdates()", 2000);
    
    // Messaggio discreto di feedback (solo per debug)
    console.println("Living PDF v" + currentVersion + " - Controllo aggiornamenti abilitato");
  `;
}

// Serve React app per tutte le route non-API (catch-all route)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/src/index.html'));
  }
});

// Avvia server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Living PDF Service running on port ${PORT}`);
  
  // Crea cartelle necessarie
  fs.mkdir('living-pdfs', { recursive: true }).catch(() => {});
  fs.mkdir('uploads', { recursive: true }).catch(() => {});
});

module.exports = app;
