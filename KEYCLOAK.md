nole# Keycloak Integration

This documentation explains how to configure Keycloak integration for Living Data Service.

## Hybrid Architecture

The application supports a **hybrid** authentication approach:

1. **Keycloak Authentication**: For primary user access
2. **Application Accounts**: Local accounts managed by the application (creation, editing, password changes)

## Configuration

### 1. Environment Variables

Update the `.env` file with the following configurations:

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

### 2. Keycloak Setup

1. **Create a new Realm** called `living-data-service`
2. **Create a new Client**:
   - Client ID: `living-data-service-client`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `http://localhost:3000/auth/callback`
   - Web Origins: `http://localhost:3000`

3. **Configure Client Credentials**:
   - Go to the client's "Credentials" tab
   - Copy the "Secret" and use it as `CLIENT_SECRET`

4. **Create Roles** (optional):
   - `admin`: for administrators
   - `user`: for regular users

### 3. Application Startup

```bash
# With Keycloak enabled
ENABLE_KEYCLOAK=true npm start

# With local authentication only
ENABLE_KEYCLOAK=false npm start
```

## Features

### Login Screen

When Keycloak is enabled, users see:

1. **"Sign in with Keycloak" Button**: Redirects to Keycloak for authentication
2. **"Application Account" Form**: Login with local application accounts

### User Management

- **Keycloak Users**: Managed by Keycloak (not modifiable from the app)
- **Application Users**: Managed locally (creation, editing, password changes)

### Logout

- **Keycloak Users**: Complete logout from Keycloak
- **Application Users**: Local logout

## API Endpoints

### Authentication

- `GET /api/auth/status`: Check authentication status
- `GET /auth/keycloak/login`: Start Keycloak login flow
- `GET /auth/keycloak/logout`: Logout from Keycloak
- `GET /auth/callback`: Callback URL for Keycloak

### Auth Status Response

```json
{
  "authenticated": true,
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "name": "User Name", // Keycloak only
    "roles": ["admin"] // Keycloak only
  },
  "authMethod": "keycloak", // or "local"
  "keycloakEnabled": true
}
```

## Security

- Keycloak tokens are managed by Passport.js
- Sessions use `express-session`
- `SESSION_SECRET` must be a secure and random string
- In production, use HTTPS for all connections

## Troubleshooting

### "Client not found" Error
- Verify that `CLIENT_ID` is correct
- Check that the client is enabled in Keycloak

### "Invalid redirect_uri" Error
- Verify that `REDIRECT_URI` is configured correctly in the Keycloak client
- Ensure the URL is identical (including http/https)

### "Unauthorized" Error
- Check that `CLIENT_SECRET` is correct
- Verify that the client's Access Type is "confidential"

## Dependencies

The following NPM dependencies are required for Keycloak:

```json
{
  "passport": "^0.6.0",
  "passport-openidconnect": "^0.1.1",
  "express-session": "^1.17.3"
}
```

Install with:
```bash
npm install passport passport-openidconnect express-session
```