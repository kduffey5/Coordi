# Quick Start - Run These Commands

Copy and paste these commands **one at a time** into PowerShell:

## 1. Go to API directory
```powershell
cd C:\Users\Kevin Duffey\Coordi\apps\api
```

## 2. Install dependencies (if first time)
```powershell
npm install
```

## 3. Generate Prisma Client
```powershell
npm run prisma:generate
```

## 4. Run migrations (creates database tables)
```powershell
npm run prisma:migrate
```
When it asks for a migration name, type: `init`

## 5. Open Prisma Studio to verify (optional but recommended)
```powershell
npm run prisma:studio
```
This opens http://localhost:5555 - you should see all your empty tables!

---

## If npm/node commands don't work:

1. **Close and reopen your PowerShell/terminal**
2. Or install Node.js from: https://nodejs.org/ (then restart terminal)
3. Verify installation: `node --version` and `npm --version`

---

## After migrations succeed:

You can start the development server:
```powershell
npm run dev
```

The API should start on http://localhost:3001 without database errors! 🎉
