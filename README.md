# VELoop Money Tracker — Brand-based finance workspace

Private MERN application for multi-brand financial records. React + Vite + Tailwind CSS v4, Express, MongoDB/Mongoose, JWT authentication, and Recharts.

## Included

- Exactly two pre-created admin accounts; no public signup or account creation.
- Admin One is Founder & CEO and can create/edit brand accounts. Admin Two is the finance admin.
- Pre-seeded brand accounts: **VELoop Rewards & Engagement**, **VELoop Internships**, and **Formia**. Founder can create additional brands.
- Separate brand ledgers: each transaction is tied to one brand, with brand-specific dashboard, transaction history, date/time, notes, counterparty, category, status, creator and editor attribution.
- Super Account overview consolidates all brands, all-time credits/debits, available balance, today's movement, pending amounts, daily 30-day chart, per-brand statistics, and latest transactions.
- Credit green, debit red, pending amber; search, filters (today, 7 days, 1/3/6/12 months, all time), pagination, CSV export.
- Notification center in the navbar for transaction creation/update, brand creation, and deletion requests.
- **Two-admin deletion approval:** deletion requests never delete immediately. The other admin must review the request and authenticate with their own password. A requester cannot approve their own request. Approved brand deletion archives the brand and deletes its transaction records.
- Responsive light UI, skeleton/loading states, form validation, toast feedback.
- Password hashing (bcrypt), JWT sessions, Helmet and login rate limiting.

## Requirements

- Node.js 20+ recommended
- MongoDB local instance or MongoDB Atlas

## Setup

1. Extract the ZIP and open the project folder in a terminal.
2. Install dependencies from the project root:
   ```bash
   npm install
   ```
3. Copy `server/.env.example` to `server/.env`. Configure MongoDB, a long random `JWT_SECRET`, and unique strong passwords for both admins. **Replace the example credentials before first launch.**
4. Start MongoDB or configure your Atlas URI and network access.
5. Run the app:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5173`; API runs on `http://localhost:5000`.

On first startup, the two configured admin accounts and three default brands are seeded. Existing admin passwords are not reset by seeding. The first admin is assigned the `founder` role. There is no signup endpoint or public user-creation UI.

## Environment

Set `CLIENT_URL` to the exact frontend origin(s), comma-separated if needed. For deployed frontend builds, set `client/.env` to `API_URL=https://your-api-domain.example/api`. Never commit `.env` files.

## Accounting rules

- **Available balance** = completed credits − completed debits.
- All-time credit/debit totals include pending entries to show all recorded movements; pending subtotals are separately visible.
- Pending records do not change available balance until marked completed.
- The daily chart groups records by transaction date and shows all statuses as recorded activity.
- This is an internal cash-movement tracker, not double-entry accounting or a bank feed.

## Security notes

- Use HTTPS, strong unique passwords and a high-entropy JWT secret.
- The dual-password deletion flow is a second-admin approval workflow, not a substitute for database backups or immutable audit retention.
- Approved brand deletion archives the brand and permanently deletes its transactions. Back up MongoDB and export financial data securely.
