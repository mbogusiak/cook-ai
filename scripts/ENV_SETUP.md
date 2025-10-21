# Environment Setup for Data Loading Scripts

Before running the recipe data loading scripts, you need to configure your Supabase credentials.

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Project Settings** → **API**
4. You'll see two keys:
   - **Project URL** (public-supabase-url)
   - **Service Role secret** (for server-side operations)
   - **anon public** (for client-side operations)

## Step 2: Create `.env` File

Create a `.env` file in the project root directory with the following variables:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key-here
```

### Example:
```env
PUBLIC_SUPABASE_URL=https://abc123defgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANT SECURITY NOTES:**
- **Never** commit `.env` to version control
- **Never** share your `SUPABASE_SERVICE_ROLE_KEY` publicly
- Add `.env` to your `.gitignore` (it usually is by default)
- Service Role Key has full database access - treat it like a password

## Step 3: Verify Configuration (Optional)

You can verify your credentials are loaded correctly by checking the environment:

```bash
# Display (without showing the actual key)
echo $PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY | wc -c  # Should show non-zero length
```

## Step 4: Run the Data Loading Script

Once configured, run either:

### TypeScript/Node.js version:
```bash
npx ts-node scripts/load-recipes.ts
```

### Python version:
```bash
pip install python-supabase python-dotenv
python scripts/load-recipes.py
```

## Troubleshooting

### Environment variables not loading
- Ensure `.env` file is in the project root (same level as `package.json`)
- Run the script from the project root directory
- Try restarting your terminal after creating `.env`

### "SUPABASE_SERVICE_ROLE_KEY not found"
- Copy the key from Supabase dashboard → Project Settings → API → Service role secret
- Paste it in `.env` file
- Make sure there are no extra spaces: `KEY=value` (not `KEY = value`)

### Database connection errors
- Verify `PUBLIC_SUPABASE_URL` is correct
- Check that your Supabase project is active
- Ensure Service Role Key hasn't been revoked

### Permission denied
- Verify you're using `SUPABASE_SERVICE_ROLE_KEY`, not the public anon key
- Service role has full database access needed for data loading

## Alternative: Use Command Line

You can also set environment variables directly in the terminal:

```bash
# macOS/Linux
export PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
npx ts-node scripts/load-recipes.ts

# Windows (PowerShell)
$env:PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"
npx ts-node scripts/load-recipes.ts
```

## For Production Use

In production environments:
- Use a secrets management system (AWS Secrets Manager, Vault, etc.)
- Never store secrets in environment variables directly
- Rotate keys regularly
- Use different API keys for different environments (dev/staging/prod)
