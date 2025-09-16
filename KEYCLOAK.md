# Keycloak Integration

Questa documentazione spiega come configurare l'integrazione con Keycloak per Living Data Service.

## Architettura Ibrida

L'applicazione supporta un approccio **ibrido** di autenticazione:

1. **Keycloak Authentication**: Per l'accesso principale dell'utente
2. **Application Accounts**: Account locali gestiti dall'applicazione (creazione, modifica, cambio password)

## Configurazione

### 1. Variabili di Ambiente

Aggiorna il file `.env` con le seguenti configurazioni:

```env
# Keycloak Configuration (optional - if enabled, replaces local auth)
ENABLE_KEYCLOAK=true
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=living-data-service
CLIENT_ID=living-data-service-client
CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=your-session-secret-key-here
```

### 2. Setup Keycloak

1. **Crea un nuovo Realm** chiamato `living-data-service`
2. **Crea un nuovo Client**:
   - Client ID: `living-data-service-client`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `http://localhost:3000/auth/callback`
   - Web Origins: `http://localhost:3000`

3. **Configura Client Credentials**:
   - Vai nella tab "Credentials" del client
   - Copia il "Secret" e usalo come `CLIENT_SECRET`

4. **Crea Ruoli** (opzionale):
   - `admin`: per amministratori
   - `user`: per utenti normali

### 3. Avvio dell'Applicazione

```bash
# Con Keycloak abilitato
ENABLE_KEYCLOAK=true npm start

# Con solo autenticazione locale
ENABLE_KEYCLOAK=false npm start
```

## Funzionalità

### Login Screen

Quando Keycloak è abilitato, l'utente vede:

1. **Pulsante "Sign in with Keycloak"**: Redirect a Keycloak per l'autenticazione
2. **Form "Application Account"**: Login con account applicativi locali

### User Management

- **Keycloak Users**: Gestiti da Keycloak (non modificabili dall'app)
- **Application Users**: Gestiti localmente (creazione, modifica, cambio password)

### Logout

- **Keycloak Users**: Logout completo da Keycloak
- **Application Users**: Logout locale

## Endpoint API

### Autenticazione

- `GET /api/auth/status`: Controlla lo stato di autenticazione
- `GET /auth/keycloak/login`: Inizia il flusso di login Keycloak
- `GET /auth/keycloak/logout`: Logout da Keycloak
- `GET /auth/callback`: Callback URL per Keycloak

### Risposta Auth Status

```json
{
  "authenticated": true,
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "name": "User Name", // solo per Keycloak
    "roles": ["admin"] // solo per Keycloak
  },
  "authMethod": "keycloak", // o "local"
  "keycloakEnabled": true
}
```

## Sicurezza

- I token Keycloak sono gestiti da Passport.js
- Le sessioni utilizzano `express-session`
- Il `SESSION_SECRET` deve essere una stringa sicura e casuale
- In produzione, usa HTTPS per tutti i collegamenti

## Troubleshooting

### Errore "Client not found"
- Verifica che il `CLIENT_ID` sia corretto
- Controlla che il client sia abilitato in Keycloak

### Errore "Invalid redirect_uri"
- Verifica che il `REDIRECT_URI` sia configurato correttamente nel client Keycloak
- Assicurati che l'URL sia identico (incluso http/https)

### Errore "Unauthorized"
- Controlla che il `CLIENT_SECRET` sia corretto
- Verifica che l'Access Type del client sia "confidential"

## Dipendenze

Le seguenti dipendenze NPM sono necessarie per Keycloak:

```json
{
  "passport": "^0.6.0",
  "passport-openidconnect": "^0.1.1",
  "express-session": "^1.17.3"
}
```

Installa con:
```bash
npm install passport passport-openidconnect express-session
```