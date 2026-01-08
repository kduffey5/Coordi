# Coordi - AI Voice Receptionist Platform

Coordi is a cloud-based AI voice receptionist platform tailored for small service businesses. It answers inbound phone calls 24/7, converses with callers naturally, captures lead information, books appointments, and follows up via SMS.

## Tech Stack

- **Backend**: Node.js + Fastify (TypeScript)
- **Frontend**: Next.js 13 + Tailwind CSS
- **Database**: PostgreSQL (Render Postgres) with Prisma ORM
- **AI**: OpenAI GPT-4 Realtime API
- **Telephony**: Twilio Media Streams
- **Hosting**: Render (monorepo deployment)

## Project Structure

```
coordi/
├── apps/
│   ├── api/          # Backend (Fastify + Node)
│   └── web/          # Frontend (Next.js)
├── packages/
│   └── shared/       # Shared types and schemas
├── prisma/           # Prisma schema
└── package.json      # Root workspace config
```

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database (local or remote)
- OpenAI API key
- Twilio account with phone number

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:

Create `apps/api/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/coordi"
OPENAI_API_KEY="your-openai-api-key"
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_NUMBER="+1234567890"
JWT_SECRET="your-jwt-secret-key"
NODE_ENV="development"
PORT=3001
```

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

3. Set up the database:
```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

4. Start development servers:

**Option A: From root (starts both):**
```bash
npm run dev
```

**Option B: Start separately:**

Terminal 1 - API:
```powershell
cd apps/api
.\RUN.ps1 dev
```

Terminal 2 - Frontend:
```bash
cd apps/web
npm run dev
```

This starts:
- Backend API on http://localhost:3001
- Frontend on http://localhost:3000

**Note for Windows PowerShell**: If `npm` is not recognized, use the `RUN.ps1` script in `apps/api/` which automatically fixes PATH, or restart your terminal after installing Node.js.

### Testing Twilio Integration Locally

1. Install ngrok:
```bash
npm install -g ngrok
```

2. Start ngrok tunnel:
```bash
ngrok http 3001
```

3. Update Twilio webhook URL in Twilio Console to your ngrok URL:
   - Voice webhook: `https://your-ngrok-url.ngrok.io/twilio/voice`

## Deployment to Render

See `render.yaml` for service definitions. Configure environment variables in Render dashboard for each service.

## License

Private - All Rights Reserved


