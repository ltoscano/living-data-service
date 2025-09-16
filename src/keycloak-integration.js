const passport = require('passport');
const { Strategy: OAuth2Strategy } = require('passport-oauth2');
const jwt = require('jsonwebtoken');

class KeycloakAuth {
  constructor(app, db) {
    this.app = app;
    this.db = db;
    this.enabled = process.env.ENABLE_KEYCLOAK === 'true';
    
    if (this.enabled) {
      console.log('🔐 Keycloak integration enabled');
      this.setupPassport();
      this.setupRoutes();
    } else {
      console.log('🔐 Keycloak integration disabled');
    }
  }

  setupPassport() {
    // Configurazione della strategia OAuth2 per Keycloak
    passport.use('keycloak', new OAuth2Strategy({
      authorizationURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
      tokenURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URI,
      scope: 'openid profile email'
      // // Ensure we receive the id_token in params
      // responseType: 'code',
      // grantType: 'authorization_code'
    }, async (accessToken, refreshToken, params, done) => {
      try {
        console.log('🔐 OAuth2 callback - params:', params);
        console.log('🔐 ID Token in params:', !!params?.id_token);
        
        // Ottieni il profilo utente dall'endpoint userinfo
        const userInfoResponse = await fetch(`${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info from Keycloak');
        }
        
        const profile = await userInfoResponse.json();
        
        // Trova o crea l'utente nel database locale
        let user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(profile.preferred_username);
        
        if (!user) {
          // Crea nuovo utente dal profilo Keycloak
          const isAdmin = profile.realm_access?.roles?.includes('admin') || false;
          
          const result = this.db.prepare(`
            INSERT INTO users (username, password, email, created, isAdmin)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
          `).run(
            profile.preferred_username,
            'keycloak_auth',
            profile.email,
            isAdmin ? 1 : 0
          );
          
          user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
          console.log(`👤 Created new user from Keycloak: ${profile.preferred_username}`);
        } else {
          // Aggiorna i dati dell'utente esistente
          console.log(`👤 Updating existing user: ${profile.preferred_username}`);
          console.log(`🔐 Keycloak roles:`, profile.realm_access?.roles);
          console.log(`🔐 Current isAdmin in DB:`, !!user.isAdmin);
          
          const hasAdminRole = profile.realm_access?.roles?.includes('admin') || false;
          // Mantieni isAdmin=true se l'utente era già admin nel DB o è il superuser, altrimenti usa i ruoli Keycloak
          const isSuperuser = profile.preferred_username === process.env.SUPERUSER_NAME;
          const isAdmin = !!user.isAdmin || hasAdminRole || isSuperuser;
          
          console.log(`🔐 Has admin role in Keycloak:`, hasAdminRole);
          console.log(`🔐 Is superuser (${process.env.SUPERUSER_NAME}):`, isSuperuser);
          console.log(`🔐 Final isAdmin value:`, isAdmin);
          
          this.db.prepare(`
            UPDATE users 
            SET email = ?, lastLogin = CURRENT_TIMESTAMP, isAdmin = ?
            WHERE id = ?
          `).run(profile.email, isAdmin ? 1 : 0, user.id);
          
          user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        }

        const keycloakUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: !!user.isAdmin,
          keycloakProfile: profile,
          idToken: params.id_token // Salva l'id_token per il logout
        };

        return done(null, keycloakUser);
      } catch (error) {
        console.error('Error in Keycloak authentication:', error);
        return done(error, null);
      }
    }));

    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
      try {
        const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (user) {
          done(null, {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: !!user.isAdmin
          });
        } else {
          done(null, false);
        }
      } catch (error) {
        done(error, null);
      }
    });

    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  setupRoutes() {
    console.log('🔧 Setting up Keycloak routes');
    
    // Route per iniziare l'autenticazione Keycloak
    this.app.get('/auth/keycloak', (req, res, next) => {
      console.log('🔐 Starting Keycloak authentication');
      passport.authenticate('keycloak')(req, res, next);
    });

    // Callback di ritorno da Keycloak
    this.app.get('/auth/callback', 
      passport.authenticate('keycloak', { 
        failureRedirect: '/login?error=keycloak_failed'
      }),
      (req, res) => {
        // Successo Keycloak - ma NON fare login completo, solo salva i dati Keycloak
        req.session.keycloakUser = {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          isAdmin: req.user.isAdmin
        };
        req.session.keycloakAuthenticated = true;
        req.session.idToken = req.user.idToken; // Salva l'id_token nella sessione
        
        console.log('🔐 Saving Keycloak data to session - idToken:', !!req.user.idToken);
        console.log(`✅ Keycloak authentication successful for: ${req.user.username}`);
        console.log('🔐 Redirecting to local login form for second authentication');
        
        // Reindirizza alla login form locale per la seconda autenticazione
        res.redirect('/?keycloak_done=true');
      }
    );

    // Logout Keycloak
    this.app.get('/auth/keycloak/logout', (req, res) => {
      const username = req.session?.keycloakUser?.username || req.user?.username;
      console.log('🔐 Processing dual logout for user:', username);
      
      const logoutURL = `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`;
      const redirectURI = encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/keycloak/logout/callback`);
      
      // Recupera l'id_token dalla sessione PRIMA di distruggerla
      const idToken = req.session?.idToken;
      console.log('🔐 ID Token available:', !!idToken);
      
      // Costruisci URL di logout con id_token_hint se disponibile
      let keycloakLogoutURL = `${logoutURL}?post_logout_redirect_uri=${redirectURI}`;
      if (idToken) {
        keycloakLogoutURL += `&id_token_hint=${idToken}`;
        console.log('🔐 Including id_token_hint in logout URL');
      } else {
        console.log('⚠️ No id_token available for logout - using logout without hint');
        // Aggiungi client_id come parametro alternativo
        keycloakLogoutURL += `&client_id=${process.env.CLIENT_ID}`;
      }
      
      // Prima fai il logout di Passport
      req.logout((err) => {
        if (err) {
          console.error('Error during Passport logout:', err);
        }
        
        // Poi distruggi tutta la sessione locale (incluso keycloak e local auth)
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
          
          console.log('✅ All sessions destroyed (Keycloak + Local), redirecting to Keycloak logout');
          res.redirect(keycloakLogoutURL);
        });
      });
    });

    // Callback dopo logout da Keycloak
    this.app.get('/auth/keycloak/logout/callback', (req, res) => {
      res.redirect('/?logged_out=true');
    });
  }

  // Middleware per richiedere autenticazione Keycloak
  requireAuth = (req, res, next) => {
    if (!this.enabled) {
      return next(); // Se Keycloak è disabilitato, passa al prossimo middleware
    }

    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    
    // Salva l'URL di destinazione per il redirect post-login
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/keycloak');
  };

  // Middleware per redirect automatico se Keycloak è abilitato
  autoRedirectAuth = (req, res, next) => {
    if (!this.enabled) {
      return next();
    }

    // Escludi le route di autenticazione e pubbliche dal redirect automatico
    if (req.path.startsWith('/auth/') || req.path.startsWith('/api/') || req.path.startsWith('/health') || req.path.startsWith('/public/')) {
      return next();
    }

    // Escludi anche se c'è il parametro logged_out nella query string
    if (req.query.logged_out === 'true') {
      return next();
    }

    // Se Keycloak è già autenticato ma il login locale non è completato, mostra la login form
    if (req.session.keycloakAuthenticated && !req.session.userId) {
      console.log('🔐 Keycloak authenticated, showing local login form');
      return next();
    }

    // Se né Keycloak né login locale sono autenticati, reindirizza a Keycloak
    if (!req.session.keycloakAuthenticated && !req.session.userId) {
      console.log('🔐 No authentication, redirecting to Keycloak');
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/keycloak');
    }

    next();
  };

  // Middleware per controllare i ruoli Keycloak
  requireRole = (role) => {
    return (req, res, next) => {
      if (!this.enabled) {
        return next();
      }

      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.redirect('/auth/keycloak');
      }
      
      if (!req.user.keycloakProfile?.realm_access?.roles?.includes(role)) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: `Role '${role}' required` 
        });
      }
      
      next();
    };
  };

  // Middleware per richiedere ruolo admin
  requireAdmin = (req, res, next) => {
    return this.requireRole('admin')(req, res, next);
  };
}

module.exports = KeycloakAuth;