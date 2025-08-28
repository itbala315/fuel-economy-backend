# Fuel Economy Backend API

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## API Endpoints

- `GET /api/cars` - Get all cars with filtering and pagination
- `GET /api/cars/:id` - Get single car by ID
- `GET /api/statistics` - Get dataset statistics
- `GET /api/visualizations/mpg-by-year` - Get MPG data by year
- `GET /api/visualizations/mpg-by-cylinders` - Get MPG data by cylinders
- `GET /api/health` - Health check

## Environment Variables

- `PORT` - Server port (default: 5000)

## Deployment

### Deploying to Render

1. Sign up for a free account at [Render](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository or use the manual deploy option
4. Fill in the following settings:
   - Name: `fuel-economy-backend` (or your preferred name)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Select the Free plan
5. Click "Create Web Service"

### Deploying to Fly.io

1. Install the Fly CLI by following instructions at [https://fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)
2. Sign up and log in:
   ```bash
   fly auth signup
   # or if you already have an account
   fly auth login
   ```
3. Initialize your app (run this from your backend directory):
   ```bash
   fly launch
   ```
   - This will guide you through creating a `fly.toml` file
   - Choose a unique app name
   - Select a region close to your users
   - Choose not to set up a PostgreSQL database
   - Choose not to set up a Redis database
   - Deploy now? You can say no and deploy later
   
4. Deploy your application:
   ```bash
   fly deploy
   ```

5. After deployment, get your public URL:
   ```bash
   fly open
   ```

## CORS Configuration for Deployment

When deploying, you'll need to update the CORS configuration to allow requests from your frontend domain:

```javascript
// In server.js
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://your-frontend-domain.vercel.app',
    // Add any other frontend domains here
  ],
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Deploying to GitHub

To deploy this project to your GitHub repository (https://github.com/itbala315):

1. Initialize a Git repository (if not already done):
   ```bash
   git init
   ```

2. Add your GitHub repository as a remote:
   ```bash
   git remote add origin https://github.com/itbala315/fuel-economy-app.git
   ```

3. Add all files to the staging area:
   ```bash
   git add .
   ```

4. Commit your changes:
   ```bash
   git commit -m "Initial commit of fuel economy backend"
   ```

5. Push to GitHub:
   ```bash
   git push -u origin main
   ```
   Note: Use `master` instead of `main` if your default branch is named master.

### Setting up GitHub Actions for CI/CD (Optional)

You can also set up automatic deployment using GitHub Actions. Create a `.github/workflows/deploy.yml` file in your repository with the appropriate deployment steps.
