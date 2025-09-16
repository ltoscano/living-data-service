const passport = require('passport');
const OpenIDConnectStrategy = require('passport-openidconnect').Strategy;

class KeycloakAuth {
  constructor(app) {
    this.app = app;
    this.enabled = process.env.ENABLE_KEYCLOAK === 'true';
    
    if (this.enabled) {
      this.setupPassport();
      this.setupRoutes();
    }
  }

  setupPassport() {
    passport.use(new OpenIDConnectStrategy({
      issuer: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}`,
      authorizationURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
      tokenURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      userInfoURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URI,
      scope: 'openid profile email'
    }, (issuer, profile, done) => {
      const user = {
        id: profile.id,
        username: profile.username || profile.preferred_username,
        email: profile.email,
        name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
        roles: profile.realm_access?.roles || [],
        profile: profile
      };
      return done(null, user);
    }));

    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user);
    });

    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  setupRoutes() {
    // Keycloak login
    this.app.get('/auth/keycloak/login', passport.authenticate('openidconnect'));

    // Keycloak callback
    this.app.get('/auth/callback', 
      passport.authenticate('openidconnect', { 
        successRedirect: '/',
        failureRedirect: '/login?error=keycloak_failed'
      })
    );

    // Keycloak logout
    this.app.get('/auth/keycloak/logout', (req, res) => {
      const logoutURL = `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`;
      const redirectURI = encodeURIComponent(`${req.protocol}://${req.get('host')}`);
      
      req.logout((err) => {
        if (err) {
          console.error('Errore durante logout Keycloak:', err);
        }
        req.session.destroy((err) => {
          if (err) {
            console.error('Errore nella distruzione sessione:', err);
          }
          res.redirect(`${logoutURL}?redirect_uri=${redirectURI}`);
        });
      });
    });

    // Get current user (modificato per supportare sia Keycloak che auth locale)
    this.app.get('/api/auth/user', (req, res) => {
      if (this.enabled && req.isAuthenticated()) {
        // Utente autenticato via Keycloak
        return res.json({
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            name: req.user.name,
            roles: req.user.roles
          },
          isAuthenticated: true,
          authMethod: 'keycloak'
        });
      }
      
      // Fallback al sistema di autenticazione locale esistente
      if (req.session.userId) {
        try {
          const db = req.app.locals.db;
          const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.session.userId);
          if (user) {
            return res.json({
              user: {
                id: user.id,
                username: user.username,
                email: user.email
              },
              isAuthenticated: true,
              authMethod: 'local'
            });
          }
        } catch (error) {
          console.error('Errore nel recupero utente locale:', error);
        }
      }
      
      res.json({ isAuthenticated: false, authMethod: null });
    });
  }

  // Middleware per richiedere autenticazione (supporta approccio ibrido)
  requireAuth = (req, res, next) => {
    if (this.enabled) {
      // Se Keycloak è abilitato, controlla prima Keycloak poi locale
      if (req.isAuthenticated()) {
        return next();
      }
      
      // Fallback: controlla se c'è una sessione locale (per account applicativi)
      if (req.session.userId) {
        return next();
      }
      
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/keycloak/login');
    } else {
      // Sistema di autenticazione locale esistente
      if (req.session.userId) {
        return next();
      }
      
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/login'
      });
    }
  };

  // Middleware per richiedere ruolo specifico (solo per Keycloak)
  requireRole = (role) => {
    return (req, res, next) => {
      if (!this.enabled) {
        // Se Keycloak non è abilitato, controlla se è admin locale
        if (role === 'admin' && req.session.userId) {
          const db = req.app.locals.db;
          const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
          if (user && user.username === 'admin') {
            return next();
          }
        }
        return next(); // Per ora permetti tutto se non è Keycloak
      }
      
      if (!req.isAuthenticated()) {
        return res.redirect('/auth/keycloak/login');
      }
      
      if (!req.user.roles.includes(role)) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: `Role '${role}' required` 
        });
      }
      
      next();
    };
  };

  // Middleware per richiedere admin
  requireAdmin = (req, res, next) => {
    return this.requireRole('admin')(req, res, next);
  };

  // Utility per verificare se Keycloak è abilitato
  isEnabled() {
    return this.enabled;
  }
}

module.exports = KeycloakAuth;