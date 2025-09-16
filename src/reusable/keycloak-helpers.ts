import { cookies } from 'next/headers';

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  name: string;
  roles: string[];
}

export async function getKeycloakUser(): Promise<KeycloakUser | null> {
  try {
    const cookieStore = await cookies();
    
    const isAuthenticated = cookieStore.has('keycloak_authenticated');
    if (!isAuthenticated) {
      return null;
    }

    const userCookie = cookieStore.get('keycloak_user');
    if (!userCookie) {
      return null;
    }

    return JSON.parse(userCookie.value);
  } catch (error) {
    console.error('Error getting Keycloak user:', error);
    return null;
  }
}

export async function isKeycloakAuthenticated(): Promise<boolean> {
  const user = await getKeycloakUser();
  return user !== null;
}

export async function requireKeycloakAuth(): Promise<KeycloakUser> {
  const user = await getKeycloakUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function hasKeycloakRole(role: string): Promise<boolean> {
  const user = await getKeycloakUser();
  if (!user) return false;
  
  return user.roles.includes(role);
}

export async function requireKeycloakRole(role: string): Promise<KeycloakUser> {
  const user = await requireKeycloakAuth();
  
  if (!user.roles.includes(role)) {
    throw new Error(`Role '${role}' required`);
  }
  
  return user;
}

export async function requireKeycloakAdmin(): Promise<KeycloakUser> {
  return requireKeycloakRole('admin');
}

// Funzione per rinnovare i token (se necessario)
export async function refreshKeycloakTokens(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get('keycloak_tokens');
    
    if (!tokensCookie) {
      return false;
    }

    const tokens = JSON.parse(tokensCookie.value);
    
    // Controlla se il token è scaduto
    if (Date.now() > tokens.expires_at) {
      // Prova a rinnovare con il refresh token
      if (tokens.refresh_token) {
        const response = await fetch(
          `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: process.env.CLIENT_ID!,
              client_secret: process.env.CLIENT_SECRET!,
              refresh_token: tokens.refresh_token,
            }),
          }
        );

        if (response.ok) {
          const newTokens = await response.json();
          
          // Aggiorna i cookie con i nuovi token
          cookieStore.set('keycloak_tokens', JSON.stringify({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || tokens.refresh_token,
            expires_at: Date.now() + (newTokens.expires_in * 1000),
          }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: newTokens.expires_in,
            path: '/',
          });

          return true;
        }
      }
      
      // Se non riesce a rinnovare, rimuovi l'autenticazione
      cookieStore.delete('keycloak_authenticated');
      cookieStore.delete('keycloak_user');
      cookieStore.delete('keycloak_tokens');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return false;
  }
}