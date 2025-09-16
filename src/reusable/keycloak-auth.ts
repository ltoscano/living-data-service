import passport from 'passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import session from 'express-session';

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  name: string;
  roles: string[];
  profile: any;
}

export class KeycloakAuth {
  private app: any;

  constructor(app: any) {
    this.app = app;
    this.setupSession();
    this.setupPassport();
    this.setupRoutes();
  }

  setupSession() {
    this.app.use(session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 ore
      }
    }));
  }

  setupPassport() {
    passport.use(new OpenIDConnectStrategy({
      issuer: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}`,
      authorizationURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
      tokenURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      userInfoURL: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      clientID: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
      callbackURL: process.env.REDIRECT_URI!,
      scope: 'openid profile email'
    }, (issuer: any, profile: any, done: any) => {
      const user: KeycloakUser = {
        id: profile.id,
        username: profile.username || profile.preferred_username,
        email: profile.email,
        name: profile.name || `${profile.given_name} ${profile.family_name}`,
        roles: profile.realm_access?.roles || [],
        profile: profile
      };
      return done(null, user);
    }));

    passport.serializeUser((user: any, done: any) => {
      done(null, user);
    });

    passport.deserializeUser((user: any, done: any) => {
      done(null, user);
    });

    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  setupRoutes() {
    this.app.get('/login', passport.authenticate('openidconnect'));

    this.app.get('/auth/callback', 
      passport.authenticate('openidconnect', { 
        successRedirect: '/',
        failureRedirect: '/login?error=1'
      })
    );

    this.app.get('/logout', (req: any, res: any) => {
      const logoutURL = `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`;
      const redirectURI = encodeURIComponent(`${req.protocol}://${req.get('host')}`);
      
      req.logout((err: any) => {
        if (err) {
          console.error('Errore durante logout:', err);
        }
        req.session.destroy((err: any) => {
          if (err) {
            console.error('Errore nella distruzione sessione:', err);
          }
          res.redirect(`${logoutURL}?redirect_uri=${redirectURI}`);
        });
      });
    });

    this.app.get('/auth/user', this.requireAuth, (req: any, res: any) => {
      res.json({
        user: req.user,
        isAuthenticated: req.isAuthenticated()
      });
    });
  }

  requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
  };

  requireRole = (role: string) => {
    return (req: any, res: any, next: any) => {
      if (!req.isAuthenticated()) {
        return res.redirect('/login');
      }
      
      if (!req.user.roles.includes(role)) {
        return res.status(403).json({ 
          error: 'Accesso negato', 
          message: `Ruolo '${role}' richiesto` 
        });
      }
      
      next();
    };
  };

  requireAdmin = (req: any, res: any, next: any) => {
    return this.requireRole('admin')(req, res, next);
  };
}