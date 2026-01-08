# Running Prisma Migrations - Step by Step

Follow these steps to set up your database:

## Prerequisites

Make sure Node.js/npm is available in your terminal. If commands fail:
- **Restart your terminal/PowerShell** after installing Node.js
- Or open a **new** PowerShell window
- Or use **Command Prompt** instead

## Step 1: Navigate to API Directory

```powershell
cd C:\Users\Kevin Duffey\Coordi\apps\api
```

## Step 2: Install Dependencies (if not already done)

```powershell
npm install
```

This will install all required packages including Prisma.

## Step 3: Generate Prisma Client

```powershell
npm run prisma:generate
```

This creates the Prisma Client based on your schema.

**Expected output**: You should see "Generated Prisma Client" message.

## Step 4: Run Database Migrations

```powershell
npm run prisma:migrate
```

When prompted:
- **Migration name**: Type `init` and press Enter
- This creates all your database tables

**Expected output**: 
- "The following migration(s) have been created and applied"
- You should see tables being created

## Step 5: Verify It Worked

### Option A: Open Prisma Studio (Visual Database Browser)

```powershell
npm run prisma:studio
```

This opens a web interface at http://localhost:5555 where you can see all your tables.

### Option B: Test the API

In a new terminal window:
```powershell
cd C:\Users\Kevin Duffey\Coordi\apps\api
npm run dev
```

If the server starts without database errors, you're all set! ✅

## Troubleshooting

### "npm is not recognized"
- Restart your terminal/PowerShell
- Or install Node.js from https://nodejs.org/
- After installing, **restart your terminal**

### "Cannot connect to database"
- Verify your `DATABASE_URL` in `.env` file is correct
- Make sure you copied the full connection string from Render
- Check that the Render database is running (not paused)

### "Migration failed"
- Check your `.env` file has the correct `DATABASE_URL`
- Make sure there are no extra spaces or quotes around the URL
- Verify the database exists in Render

### "Schema validation failed"
- Make sure you're in the `apps/api` directory
- The Prisma schema should be at `apps/api/prisma/schema.prisma`

## Success Indicators

✅ Prisma Client generated without errors
✅ Migration completed with "migration(s) have been created and applied"
✅ Prisma Studio opens and shows empty tables
✅ API server starts without database connection errors
