# 🚀 Living Data Service

**Modern document management made simple.** Deploy in seconds with Docker, upload any file type, and share with secure public links. Features intelligent version control, real-time analytics, and enterprise-grade security.

Perfect for teams, developers, and organizations who need professional document management without the complexity.

## 🌐 Public Links as CDN

**Living Data Service transforms your documents into a personal CDN.** Every uploaded file gets a permanent public link that:

- 🔗 **Always serves the latest version** - Update your file, the link stays the same
- 🚀 **No authentication required** - Share with anyone, anywhere, anytime
- 📱 **Direct file access** - Links work in browsers, apps, embedding, etc.
- 🔄 **Instant updates** - Change the distributed version and all links update automatically
- 🛡️ **Secure and stable** - Links remain active until you disable them

Think of it as your own private file CDN with version control. Perfect for documentation, assets, PDFs, images, or any file you need to share with consistent URLs.

## 🚀 Deployment Options

Choose your deployment method based on your needs:

### 🏠 Option 1: Local Development
Perfect for testing and development on your local machine.

```bash
git clone <your-repo-url>
cd living-data-service
docker-compose up --build -d
```

**Environment Setup (.env file):**
```env
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
SECURE_COOKIES=false
SUPERUSER_NAME=admin
SUPERUSER_PASSWD=admin123
RETENTION_DAYS=30
```

**Access**: http://localhost:3000

---

### 🌐 Option 2: Local + ngrok (Public Access)
Expose your local instance to the internet for testing or sharing.

1. **Start the service locally:**
```bash
docker-compose up --build -d
```

2. **Install and run ngrok:**
```bash
# Install ngrok first: https://ngrok.com/download
ngrok http 3000
```

3. **Update your .env with ngrok URL:**
```env
NODE_ENV=production
PORT=3000
BASE_URL=https://your-random-id.ngrok.io
SECURE_COOKIES=true
SUPERUSER_NAME=admin
SUPERUSER_PASSWD=your-secure-password
RETENTION_DAYS=30
JWT_SECRET=your-generated-secret-key
```

4. **Restart with new config:**
```bash
docker-compose down && docker-compose up -d
```

**Access**: https://your-random-id.ngrok.io

---

### ☁️ Option 3: VPS Deployment
Deploy on any VPS (DigitalOcean, AWS, etc.) with proper domain and SSL.

1. **On your VPS, clone and configure:**
```bash
git clone <your-repo-url>
cd living-data-service
```

2. **Create production .env:**
```env
NODE_ENV=production
PORT=3000
BASE_URL=https://yourdomain.com
SECURE_COOKIES=true
SUPERUSER_NAME=admin
SUPERUSER_PASSWD=your-very-secure-password
RETENTION_DAYS=90
CLEANUP_INTERVAL_MINUTES=60
JWT_SECRET=your-32-character-secret-key
MAX_FILE_SIZE=100MB
MAX_FILES_PER_USER=500
```

3. **Deploy with Docker:**
```bash
docker-compose up --build -d
```

4. **Setup reverse proxy (nginx example):**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Access**: https://yourdomain.com

---

### 💻 Option 4: Host Compilation (No Docker)
Run directly on your host system without containers.

1. **Install dependencies:**
```bash
npm install
```

2. **Create .env file:**
```env
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
DB_PATH=./data/documents.db
SECURE_COOKIES=false
SUPERUSER_NAME=admin
SUPERUSER_PASSWD=admin123
RETENTION_DAYS=30
```

3. **Build frontend:**
```bash
npm run build:frontend
```

4. **Start the service:**
```bash
npm start
```

**Access**: http://localhost:3000

---

## 📋 Environment Variables Reference

### Core Settings
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `BASE_URL` | Full base URL of your service | `http://localhost:3000` | **Yes** |
| `DB_PATH` | Database file location | `./data/documents.db` | No |

### Security & Authentication
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret for session encryption | Auto-generated | **Production** |
| `SECURE_COOKIES` | HTTPS-only cookies | `false` | **HTTPS setups** |
| `SUPERUSER_NAME` | Default admin username | `admin` | No |
| `SUPERUSER_PASSWD` | Default admin password | `admin123` | **Production** |

### File Management
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RETENTION_DAYS` | Days to keep old versions | `30` | No |
| `CLEANUP_INTERVAL_MINUTES` | Cleanup frequency | `5` | No |
| `MAX_FILE_SIZE` | Maximum upload size | `50MB` | No |
| `MAX_FILES_PER_USER` | Files per user limit | `100` | No |

### Quick Setup
After deployment, visit your service URL and:
1. Login with admin credentials  
2. Click **"Add Data"** to upload your first file
3. Share the generated public link with anyone
4. Manage versions, users, and availability from **"Manage"**

## 🎯 What You Get

- ✅ **Universal File Support**: PDFs, images, documents, any file type
- ✅ **Version Management**: Upload new versions, control which one is distributed
- ✅ **Public Sharing**: Permanent links that always serve the current version
- ✅ **User Management**: Multi-user support with admin controls
- ✅ **Secure Access**: Login required for management, public links for sharing
- ✅ **Modern UI**: Clean, responsive interface with elegant modals

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

## 🛠️ Development & API

### Building Frontend Only
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

## 🔧 Important Security Notes

### Production Checklist
- ✅ Change default admin password immediately
- ✅ Use strong `JWT_SECRET` (generate with: `openssl rand -hex 32`)
- ✅ Set `SECURE_COOKIES=true` for HTTPS deployments
- ✅ Configure proper backup strategy for `/data` folder
- ✅ Use reverse proxy (nginx/apache) for SSL termination

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