# 🔄 Living PDF Service

Servizio per creare PDF che si aggiornano automaticamente tramite JavaScript incorporato.

## ✨ Caratteristiche

- **PDF Auto-aggiornanti**: I PDF controllano automaticamente se esistono nuove versioni
- **Compatibilità**: Funziona con JavaScript abilitato, fallback senza JavaScript
- **Database SQLite**: Persistenza dati con database leggero
- **Analytics**: Tracking download, visualizzazioni e aggiornamenti
- **API RESTful**: Interfaccia programmatica completa

## 🚀 Quick Start

```bash
# Installa dipendenze
npm install

# Avvia il server
npm start

# Oppure in modalità development
npm run dev
```

Poi apri http://localhost:3000 per l'interfaccia web.

## 📡 API Endpoints

- `POST /api/create-living-pdf` - Crea nuovo Living PDF
- `GET /api/download/:id` - Scarica PDF (sempre ultima versione)
- `POST /api/update-document/:id` - Aggiorna contenuto
- `GET /api/check-update/:id` - Controlla aggiornamenti (chiamato dal PDF)
- `GET /api/documents` - Lista documenti
- `GET /api/analytics/:id` - Analytics dettagliate

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
```bash
git init
heroku create your-app-name
git add .
git commit -m "Initial commit"
git push heroku main
```

### Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

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
