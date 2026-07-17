# Order Tracker - Next.js Edition

A full-stack order tracking application with user authentication, built with **Next.js 14**, **PostgreSQL**, and **NextAuth.js**.

## Features

✅ **User Authentication**
- Email/password signup and signin
- Google OAuth integration
- Secure session management

✅ **Order Management**
- Create, read, update, and delete orders
- Track sub-products and return deadlines
- Automatic return status calculation

✅ **Dashboard**
- Real-time order statistics
- Urgent and expired return alerts
- User-friendly order cards

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js with Google OAuth & Credentials
- **Styling**: CSS-in-JS (inline styles)

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (local or cloud)
- Google OAuth credentials (for Google login)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tracker_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"

# Google OAuth (get from https://console.cloud.google.com/)
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"
```

### 3. Setup Database

Push the schema to your database:

```bash
npm run db:push
```

### 4. Migrate Old Data (Optional)

If you have existing data from the Flask version:

```bash
npm run db:migrate
```

This will:
- Read data from `backend/data.json`
- Create a default user account
- Populate orders and sub-products

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Default Test Account (After Migration)

- **Email**: migrated@example.com
- **Password**: Password123!

## API Routes

### Auth
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/[id]` - Get specific order
- `PUT /api/orders/[id]` - Update order
- `DELETE /api/orders/[id]` - Delete order

## Database Schema

### User
- id, name, email, password, image, createdAt, updatedAt
- Relations: orders, accounts, sessions

### Order
- id, userId, orderID, platform, status, amount, deliveryDate
- Relations: subProducts

### SubProduct
- id, orderId, productName, returnDeadline, delivery, policyDays, returned
- Computed: _returnStatus

## Development

### Database Studio

View and manage data with Prisma Studio:

```bash
npm run db:studio
```

### Database Migrations

Create a new migration after schema changes:

```bash
npx prisma migrate dev --name migration_name
```

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables for Production

Update `.env.local` with production values:
- Real database URL
- Real `NEXTAUTH_SECRET` (use a secure random string)
- Real Google OAuth credentials
- Set `NEXTAUTH_URL` to your production domain

### Database

For production, use a managed PostgreSQL service like:
- Railway
- Heroku Postgres
- AWS RDS
- Digital Ocean

## Troubleshooting

### Port Already in Use
If port 3000 is in use, run:
```bash
npm run dev -- -p 3001
```

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check firewall settings

### Google OAuth Issues
- Verify `GOOGLE_ID` and `GOOGLE_SECRET`
- Add `http://localhost:3000` to authorized origins in Google Console

## Future Enhancements

- Mobile app (React Native)
- Email notifications
- Advanced order filters
- Analytics dashboard
- Multi-currency support
- Batch order import

## License

MIT
