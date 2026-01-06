# Supabase Setup Guide

This directory contains the database schema and seed data for the Disaster Relief Stablecoin System.

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Note your project URL and anon/service keys

## Setup Instructions

### 1. Run Migrations

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste and run in the SQL Editor

### 2. Seed Test Data (Optional)

For development and testing:

1. In SQL Editor, copy contents of `seed.sql`
2. Run to populate sample campaigns, merchants, and transactions

### 3. Configure Authentication

#### Enable Google OAuth:

1. Go to **Authentication** > **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Add authorized redirect URLs:
   - `http://localhost:5173/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

#### Configure Auth Settings:

1. Go to **Authentication** > **Settings**
2. Site URL: `http://localhost:5173` (or your production URL)
3. Redirect URLs: Add your allowed redirect URLs

### 4. Environment Variables

Create these environment variables in your frontend:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For the backend:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key  # For admin operations
SUPABASE_JWT_SECRET=your-jwt-secret    # For token verification
```

### 5. Row Level Security (RLS)

The migration automatically enables RLS on all tables with appropriate policies:

- **profiles**: Users can only view/update their own profile
- **campaigns**: Anyone can view active campaigns, admins can manage
- **beneficiaries**: Users see own record, admins can manage
- **transactions**: Public can view confirmed transactions (transparency)
- **fraud_alerts**: Only admins and auditors can view

### 6. Realtime Subscriptions

Enable realtime for transparency updates:

1. Go to **Database** > **Replication**
2. Enable replication for:
   - `transactions`
   - `campaigns`
   - `fraud_alerts`

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles extending Supabase auth |
| `wallets` | Linked Ethereum wallet addresses |
| `campaigns` | Relief campaigns |
| `beneficiaries` | Registered aid recipients |
| `merchants` | Verified vendors |
| `fund_allocations` | Fund distribution records |
| `transactions` | All financial transactions |
| `donations` | Donor contributions |
| `fraud_alerts` | ML-detected suspicious activity |
| `audit_events` | System audit trail |

### Views

| View | Description |
|------|-------------|
| `transparency_stats` | Aggregated stats for public dashboard |

## Backup and Recovery

Use Supabase's built-in backup features:

1. **Point-in-time Recovery**: Available on Pro plan
2. **Manual Backups**: Export via SQL Editor
3. **pg_dump**: Connect directly for full backup

## Security Considerations

1. Never expose the `service_role` key in client code
2. Use the `anon` key for client-side operations
3. All sensitive operations should go through your backend
4. Enable SSL for all connections
5. Review RLS policies regularly

## Monitoring

1. Enable **Database** > **Reports** for query insights
2. Set up alerts in **Settings** > **Project Settings** > **Alerts**
3. Monitor auth events in **Authentication** > **Users**
