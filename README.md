# 🚀 Living Data Service

**Modern document management made simple.** Deploy in seconds with Docker, upload any file type, and share with secure public links. Features intelligent version control, real-time analytics, and enterprise-grade security.

Perfect for teams, developers, and organizations who need professional document management without the complexity.

## ⚡ Quick Start with Docker

### 1. Clone and Start
```bash
git clone <your-repo-url>
cd living-data-service
docker-compose up --build -d
```

**Note**: The `--build` flag ensures the frontend is built automatically during container creation.

### 2. Access the Service
- **Web Interface**: http://localhost:3000
- **Default Login**: `admin` / `admin123`

### 3. Start Using
1. Login with admin credentials
2. Click **"Add Data"** to upload your first file
3. Share the generated public link with anyone
4. Manage versions, users, and availability from the **"Manage"** section

## 🎯 What You Get

- ✅ **Universal File Support**: PDFs, images, documents, any file type
- ✅ **Version Management**: Upload new versions, control which one is distributed
- ✅ **Public Sharing**: Permanent links that always serve the current version
- ✅ **User Management**: Multi-user support with admin controls
- ✅ **Secure Access**: Login required for management, public links for sharing
- ✅ **Modern UI**: Clean, responsive interface with elegant modals

## 🔧 Configuration

### Environment Variables
Create a `.env` file or set environment variables in `docker-compose.yml`:

#### Core Settings
```bash
PORT=3000                                    # Server port (default: 3000)
NODE_ENV=development                         # Environment (development/production)
DB_PATH=./data/documents.db                  # Database file path
BASE_URL=http://localhost:3000               # Base URL for the service
```

#### Data Management
```bash
RETENTION_DAYS=30                            # Days to keep old file versions
CLEANUP_INTERVAL_MINUTES=5                   # Cleanup frequency in minutes
MAX_FILE_SIZE=50MB                           # Maximum upload file size
MAX_FILES_PER_USER=100                       # Maximum files per user
```

#### Security
```bash
JWT_SECRET=your-secret-key                   # Secret for session encryption
SUPERUSER_NAME=admin                         # Default admin username
SUPERUSER_PASSWD=admin123                    # Default admin password
SECURE_COOKIES=false                         # Use HTTPS-only cookies (true for production with SSL)
ALLOWED_ORIGINS=http://localhost:3000        # CORS allowed origins (optional)
```

#### Optional Features
```bash
DEMO_MODE=false                              # Enable demo mode (optional)
ENABLE_REGISTRATION=false                    # Allow user self-registration (optional)
```

### Docker Configuration
Edit `docker-compose.yml` environment section to customize:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - SECURE_COOKIES=false    # Set to 'true' for HTTPS deployments
  - SUPERUSER_PASSWD=your-secure-password
```

### Production Setup
For production deployments with HTTPS:
1. Set `SECURE_COOKIES=true` for enhanced security
2. Use a strong `JWT_SECRET` (generate with: `openssl rand -hex 32`)
3. Change default admin credentials
4. Configure proper `ALLOWED_ORIGINS` for CORS

## 📊 How It Works

1. **Upload**: Any file type through the web interface
2. **Generate**: Automatic public link creation
3. **Share**: Give the link to anyone - no login required
4. **Update**: Upload new versions anytime
5. **Control**: Toggle availability, manage users, view analytics

## 🔄 Version Management

- Upload new versions of your documents
- Choose which version to distribute publicly
- Public links always serve the currently selected version
- Full version history with individual download options

## 👥 User Management (Admin Only)

- Create, edit, delete users
- Password management for all users
- Each user sees only their own documents
- Role-based access control

## 🛠️ Development Setup

### Without Docker
```bash
npm install
npm run migrate  # Set up database
npm start        # Start server on port 3000
```

### Building Frontend
```bash
npm run build:frontend  # Build React app
```

## 📡 API Access

The service provides a full REST API:
- `POST /api/create-living-pdf` - Upload document
- `GET /api/documents` - List user documents  
- `GET /api/public/:token` - Public document access
- `DELETE /api/documents/:id` - Delete document
- Full user management endpoints for admin users

## 🔒 Security Features

- Session-based authentication with secure cookies
- Password hashing with bcrypt
- User isolation (each user sees only their documents)
- CSRF protection and input validation
- Configurable retention policies for automatic cleanup

## 📁 File Structure

```
living-data-service/
├── src/
│   ├── server.js           # Express server
│   ├── LivingPDFService.jsx # React frontend
│   └── ...
├── docker-compose.yml      # Easy Docker setup
├── Dockerfile             # Container definition
└── migrate-db.js          # Database setup
```

## 🚀 Production Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Manual Deployment
1. Set production environment variables
2. Build frontend: `npm run build:frontend`
3. Start server: `npm start`
4. Setup reverse proxy (nginx/apache)
5. Configure SSL certificate

## 💡 Tips

- **First Time**: Run the migration script if upgrading: `npm run migrate`
- **Backup**: The `data/` folder contains your database and uploaded files
- **Performance**: Use a reverse proxy for production deployments
- **Security**: Change default admin password after first login

## 🤝 Professional Support

Need custom integrations or enterprise features? 

**Contact [@bematic](https://twitter.com/bematic)** for:
- Keycloak integration
- Custom authentication systems  
- Enterprise configurations
- Professional deployment assistance

---

**Made with ❤️ for simple, effective document management.**