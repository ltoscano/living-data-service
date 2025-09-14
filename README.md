# 🔄 Living Data Service

Document management service with user authentication, version control, and secure access management.

## ✨ Features

- **User Authentication**: Secure login system with bcrypt password hashing
- **User Management**: Admin interface for creating, editing, and deleting users
- **Role-Based Access**: Admin-only features with user isolation
- **Password Management**: All users can change their passwords; admins can reset user passwords
- **User Isolation**: Each user sees only their own documents and data
- **Universal File Support**: Upload and manage any file type (PDF, images, documents, etc.)
- **Document Deletion**: Delete documents with confirmation dialog and complete file cleanup
- **Version Management**: Upload new versions and control which version is distributed
- **Public Links**: Permanent URLs that always serve the current selected version (no auth required)
- **Availability Control**: Toggle document availability without changing links
- **Session Management**: Secure session-based authentication with configurable timeouts
- **Modal Dialogs**: Elegant UI feedback replacing JavaScript alerts
- **SQLite Database**: Lightweight data persistence with automatic cleanup
- **Analytics**: User-specific analytics and download tracking
- **RESTful API**: Complete programmatic interface with authentication

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run database migration (if upgrading from older version)
npm run migrate

# Start the server
npm start

# Or in development mode
npm run dev
```

Then open http://localhost:3000 for the web interface.

**Default login credentials:**
- Username: `admin`
- Password: `admin123`

## 📡 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/register` - User registration
- `GET /api/auth/status` - Check authentication status

### Documents (require authentication)
- `POST /api/create-living-pdf` - Create new document (any file type)
- `GET /api/download/:id` - Download document (latest version)
- `POST /api/update-document/:id` - Upload new version (any file type)
- `POST /api/set-current-version/:id` - Set distributed version
- `POST /api/toggle-availability/:id` - Toggle document availability
- `DELETE /api/documents/:id` - Delete document and all versions
- `GET /api/documents` - List user's documents
- `GET /api/analytics` - User analytics
- `GET /api/config` - Server configuration

### User Management (admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/change-password` - Change password (any user)

### Public Access (no authentication)
- `GET /api/public/:token` - Public download link (always current version)

## 🔧 How It Works

1. **Authentication**: Users log in with username/password
2. **Upload**: Authenticated users upload any type of file
3. **Processing**: Server stores file and creates unique access token (special PDF tracking for PDFs)
4. **User Isolation**: Each user sees only their own documents
5. **Public Link**: Permanent URL generated for public distribution (no auth required)
6. **Version Management**: New versions can be uploaded and selected for distribution
7. **Availability Control**: Documents can be temporarily disabled without changing links
8. **Document Management**: Full CRUD operations with confirmation dialogs

## 📱 Compatibility

**✅ Supports all file types:**
- PDF documents (with enhanced tracking features)
- Images (JPG, PNG, GIF, etc.)
- Microsoft Office documents (DOC, DOCX, XLS, XLSX, PPT, PPTX)
- Text files and source code
- Archives and any binary files

**🔗 Universal Distribution:**
- Automatic content-type detection for proper browser handling
- Compatible with all devices and viewers
- Reliable public link distribution
- Secure file serving with proper headers

## 🗄️ Database

The service uses SQLite to store:
- Document metadata
- Version history  
- Download analytics
- Access tracking

## 📊 Analytics

For each document, tracks:
- Total downloads
- Version distribution
- Access patterns
- Monthly statistics

## 🔒 Security

- **User Authentication**: Secure bcrypt password hashing
- **Session Management**: HTTP-only cookies with configurable timeouts
- **User Isolation**: Database-level user separation
- **File Upload Validation**: Strict PDF validation
- **Input Sanitization**: SQL injection protection
- **Rate Limiting**: Configurable request limits
- **Automatic Cleanup**: Old version removal with retention policies

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

### Docker
```bash
npm run docker:build
npm run docker:run
```

## ⚙️ Configuration

Environment variables (see `.env.example`):
- `PORT` - Server port (default: 3000)
- `DB_PATH` - SQLite database path
- `RETENTION_DAYS` - Days to keep old versions (default: 30)
- `CLEANUP_INTERVAL_MINUTES` - Cleanup frequency (default: 5)
- `JWT_SECRET` - Secret key for session signing
- `SUPERUSER_NAME` - Admin username (default: admin)
- `SUPERUSER_PASSWD` - Admin password (default: admin123)

## 📝 TODO

- [x] User authentication system
- [x] User isolation and data separation
- [x] User management interface (admin)
- [x] Password management for all users
- [x] Role-based permissions (admin/user)
- [x] Modal dialogs instead of JavaScript alerts
- [ ] User registration with email verification
- [ ] Password reset functionality via email
- [ ] Rate limiting implementation
- [ ] Email notifications for updates
- [ ] Advanced analytics dashboard
- [ ] Multi-level user roles (admin/manager/user)
- [ ] API webhooks
- [ ] Cloud storage integration
- [ ] Bulk operations
- [ ] User activity logs

## 📄 License

MIT License - see LICENSE file for details.