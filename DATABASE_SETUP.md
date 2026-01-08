# Local Database Setup Guide

You have three options for setting up PostgreSQL for local development:

## Option 1: Use Render Postgres (Cloud - Easiest) ⭐ Recommended for Quick Start

This is the easiest option and doesn't require installing anything locally.

1. **Sign up at Render**: https://render.com
2. **Create a new PostgreSQL database**:
   - Click "New +" → "PostgreSQL"
   - Name it `coordi-dev`
   - Choose the Free tier
   - Region: Choose closest to you
   - Click "Create Database"
3. **Get the connection string**:
   - Once created, go to your database dashboard
   - Copy the "Internal Database URL" or "External Connection String"
   - It looks like: `postgresql://coordi_user:password@dpg-xxxxx-a/coordi_dev`
4. **Update your `.env` file**:
   - Open `apps/api/.env`
   - Replace `DATABASE_URL` with the connection string you copied
   - Remove the quotes if present
   - Example: `DATABASE_URL=postgresql://coordi_user:password@dpg-xxxxx-a/coordi_dev`

**Pros**: No local installation needed, works immediately  
**Cons**: Requires internet connection, free tier has limitations

---

## Option 2: Install PostgreSQL Locally

### Step 1: Download and Install PostgreSQL

1. **Download PostgreSQL for Windows**:
   - Go to: https://www.postgresql.org/download/windows/
   - Or use the installer: https://www.postgresql.org/download/windows/installer/
   - Download the latest version (15.x or 16.x recommended)

2. **Run the installer**:
   - During installation, remember the password you set for the `postgres` user
   - Default port is 5432 (keep this)
   - Default user is `postgres` (keep this)

3. **Verify installation**:
   - Open PowerShell and run:
   ```powershell
   psql --version
   ```

### Step 2: Create the Database

1. **Open pgAdmin** (installed with PostgreSQL) or use command line:
   
   **Option A: Using pgAdmin** (GUI):
   - Open pgAdmin from Start Menu
   - Connect to your server (use the password you set during installation)
   - Right-click "Databases" → "Create" → "Database"
   - Name: `coordi`
   - Click "Save"

   **Option B: Using Command Line**:
   ```powershell
   # Connect to PostgreSQL (it will ask for password)
   psql -U postgres
   
   # In the PostgreSQL prompt, create the database:
   CREATE DATABASE coordi;
   
   # Exit:
   \q
   ```

### Step 3: Update Your .env File

Open `apps/api/.env` and update:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/coordi"
```

Replace `YOUR_PASSWORD` with the password you set during installation.

**Pros**: Works offline, full control  
**Cons**: Requires installation and setup

---

## Option 3: Use Docker (If you have Docker Desktop)

If you have Docker Desktop installed, this is a quick option:

1. **Start Docker Desktop** (make sure it's running)

2. **Run PostgreSQL container**:
   ```powershell
   docker run --name coordi-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=coordi -p 5432:5432 -d postgres:16
   ```

3. **Update your .env file**:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coordi"
   ```

**To stop the container later**:
```powershell
docker stop coordi-postgres
```

**To start it again**:
```powershell
docker start coordi-postgres
```

**Pros**: Easy to start/stop, isolated  
**Cons**: Requires Docker Desktop installation

---

## After Database Setup: Run Migrations

Once your database is set up and `.env` is configured:

1. **Navigate to API directory**:
   ```powershell
   cd apps/api
   ```

2. **Generate Prisma Client**:
   ```powershell
   npm run prisma:generate
   ```

3. **Run migrations** (creates all tables):
   ```powershell
   npm run prisma:migrate
   ```
   - When prompted for migration name, type: `init`
   - This creates all the database tables

4. **Verify it worked**:
   ```powershell
   npm run prisma:studio
   ```
   - This opens a web interface to view your database
   - You should see empty tables: Organization, User, AgentProfile, etc.

---

## Troubleshooting

### Can't connect to database
- Check that PostgreSQL service is running:
  ```powershell
  Get-Service -Name "*postgres*"
  ```
- Verify your connection string in `.env` is correct
- Make sure no firewall is blocking port 5432

### Password issues
- If you forgot your PostgreSQL password, you can reset it or use Docker option

### Port 5432 already in use
- Another PostgreSQL instance might be running
- Either stop it or change the port in your connection string

### Prisma can't find the database
- Make sure `.env` file is in `apps/api/` directory
- Check that `DATABASE_URL` has no extra quotes or spaces
- Try running `npm run prisma:generate` again

---

## Quick Test

After setup, test the connection:

```powershell
cd apps/api
npm run dev
```

If the server starts without database errors, you're all set! 🎉
