# RoomService Control Panel

A simple web interface for managing RoomService SaaS tenants.

## 🎯 Features

- **Tenant Management**: Create, edit, delete tenants
- **API Key Generation**: Automatic secure API keys
- **Stats Dashboard**: Real-time usage statistics
- **Health Monitoring**: Service health status
- **Simple Deployment**: One command to deploy to GitHub Pages

## 🏗️ Architecture

```
Static SPA (no backend):
├── HTML5 + Bootstrap 5.3
├── Vanilla JavaScript
├── Connects to existing room-service-proxy Admin API
└── Hosts on GitHub Pages, Railway Static, Netlify, or Vercel
```

## 📁 Structure

```
room-service-control/
├── index.html          # Main dashboard
├── css/
│   └── custom.css      # Custom Bootstrap styling
├── js/
│   └── app.js          # Frontend JavaScript
└── README.md           # Documentation
```

## 🚀 Quick Start

### Local Development:
```bash
# Option 1: Python
python -m http.server 8000
# Visit http://localhost:8000

# Option 2: Node.js
npx -y http-server -p 8000
# Visit http://localhost:8000
```

### GitHub Pages Deployment:
```bash
# Initialize git repo
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin <your-repo-url>
git push -u origin main

# Enable GitHub Pages in repo settings
# Settings > Pages > Source: main branch
```

### Railway Static Deployment:
```bash
# Install Railway CLI
npm install -g railway

# Login and deploy
railway login
railway new --name roomservice-control
railway up

# Railway will detect static files automatically
```

### Netlify Deployment:
```bash
# Drag and drop the folder to netlify.com
# Or use Netlify CLI:
npm install -g netlify-cli
netlify deploy --prod
```

## 🔧 Configuration

On first load, the app will prompt for:
1. **API Base URL**: Your room-service-proxy URL (e.g., `https://roomservice-proxy.up.railway.app`)
2. **Admin API Key**: Your admin API key from Railway environment variables

These are stored in browser localStorage, so you only need to enter them once.

## 🎨 Features

### Dashboard
- Total tenants count
- Active vs suspended tenants
- Total requests served
- Real-time updates (every 30 seconds)

### Tenant Management
- **Create**: Add new tenants with name, email, and plan
- **Edit**: Update tenant details and status
- **Delete**: Remove tenants (with confirmation)
- **API Keys**: View and copy tenant API keys

### Plans
- **Free**: $0/month
- **Pro**: $49/month
- **Enterprise**: Custom pricing

### Logs Viewer
- Real-time request logs
- Tenant, method, status tracking
- Response time monitoring

## 🔐 Security

- Admin API key authentication
- API keys stored in browser localStorage
- HTTPS only (GitHub Pages provides SSL)
- No backend required - static files only

## 📊 API Integration

The control panel connects to your existing `room-service-proxy` Admin API:

```
GET  /api/tenants           - List all tenants
POST /api/tenants           - Create new tenant
GET  /api/tenants/:id       - Get specific tenant
PUT  /api/tenants/:id       - Update tenant
DELETE /api/tenants/:id     - Delete tenant
POST /api/tenants/:id/regenerate-api-key - Regenerate API key
GET  /api/stats             - Get statistics
GET  /api/logs              - Get request logs
```

## 🎯 Why This is Better

**Before**: curl commands for everything
```bash
curl -X POST https://proxy.up.railway.app/api/tenants \
  -H "Authorization: Bearer key" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**After**: Clean web interface
```
Click "Create Tenant" button in browser
```

Much better for users! 🎉

## 🛠️ Development

### File Structure
- `index.html` - Main HTML structure with Bootstrap modals
- `css/custom.css` - Custom styling for stats cards, tables, badges
- `js/app.js` - All application logic (API calls, UI rendering, event handling)

### Key Functions
- `api.request()` - Generic API caller with authentication
- `ui.renderTenants()` - Render tenant table
- `ui.updateStats()` - Update dashboard statistics
- `app.init()` - Initialize application and load data

### Adding New Features
1. Add API endpoint to `api` object in `js/app.js`
2. Create UI function in `ui` object
3. Add event listener in `DOMContentLoaded`
4. Update HTML if needed

## 🚀 Deployment Options

| Platform      | Cost   | SSL  | Custom Domain | Speed |
|--------------|--------|------|---------------|-------|
| GitHub Pages | Free   | ✅   | ✅            | Fast  |
| Railway      | $5/mo  | ✅   | ✅            | Fast  |
| Netlify      | Free   | ✅   | ✅            | Fast  |
| Vercel       | Free   | ✅   | ✅            | Fast  |

**Recommended**: GitHub Pages (free and easy)

## 📝 Notes

- This is a **static SPA** - no backend required
- All data comes from your existing `room-service-proxy` Admin API
- Perfect for solo devs - simple, cheap, and effective
- Bootstrap 5.3 for responsive design
- Vanilla JavaScript - no build step needed

## 🎉 Complete!

Your RoomService control panel is ready to deploy. Choose your hosting platform and follow the quick start guide above.
