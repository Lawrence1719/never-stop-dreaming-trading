# Authentication Documentation

This document describes the authentication system implemented using Supabase for the Never Stop Dreaming Trading application.

## Overview

The application uses Supabase for backend authentication, which provides:
- User registration and login
- Session management
- Row Level Security (RLS) for data protection
- Automatic profile creation on user signup

## Database Schema

### Profiles Table

The `profiles` table stores user profile information and is linked to Supabase's `auth.users` table.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table Structure

- **id**: UUID that references `auth.users(id)`. This is the primary key and automatically links to the authenticated user.
- **name**: User's full name (required)
- **phone**: User's phone number (optional)
- **role**: User role, either 'admin' or 'customer' (defaults to 'customer')
- **created_at**: Timestamp of when the profile was created

### Row Level Security (RLS)

RLS is enabled on the `profiles` table to ensure users can only access their own data:

1. **SELECT Policy**: Users can only view their own profile
2. **UPDATE Policy**: Users can only update their own profile
3. **INSERT Policy**: Users can only insert their own profile (enforced via trigger)

### Automatic Profile Creation

A database trigger automatically creates a profile when a new user signs up:

- **Function**: `handle_new_user()` - Creates a profile entry when a new user is added to `auth.users`
- **Trigger**: `on_auth_user_created` - Executes the function after user creation

The trigger extracts user metadata (name, phone, role) from the signup data and creates the corresponding profile.

## Setup Instructions

### 1. Install Dependencies

The Supabase client library is already installed:

```bash
npm install @supabase/supabase-js
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under API.

### 3. Run Database Migrations

Execute the SQL migration files to create the necessary tables and set up RLS policies:

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migrations in order:
   - `supabase/migrations/001_create_profiles_table.sql` - Creates profiles table
   - `supabase/migrations/002_create_notifications_table.sql` - Creates notifications table

Alternatively, if you're using Supabase CLI:

```bash
supabase db push
```

**Note:** Make sure to run migrations in order (001, then 002).

## API Reference

### Auth Context

The authentication context (`lib/context/auth-context.tsx`) provides the following methods:

#### `login(email: string, password: string): Promise<{ error: Error | null }>`

Authenticates a user with email and password.

**Example:**
```typescript
const { login } = useAuth();
const { error } = await login('user@example.com', 'password123');
if (error) {
  console.error('Login failed:', error.message);
}
```

#### `register(name: string, email: string, phone: string, password: string): Promise<{ error: Error | null }>`

Registers a new user and automatically creates a profile.

**Example:**
```typescript
const { register } = useAuth();
const { error } = await register(
  'John Doe',
  'john@example.com',
  '+1234567890',
  'password123'
);
if (error) {
  console.error('Registration failed:', error.message);
}
```

#### `logout(): Promise<void>`

Signs out the current user and clears the session.

**Example:**
```typescript
const { logout } = useAuth();
await logout();
```

#### `updateProfile(name: string, phone: string): Promise<{ error: Error | null }>`

Updates the current user's profile information.

**Example:**
```typescript
const { updateProfile } = useAuth();
const { error } = await updateProfile('Jane Doe', '+0987654321');
if (error) {
  console.error('Update failed:', error.message);
}
```

### Supabase Client

#### Client-side Client

Located at `lib/supabase/client.ts`, this is used in client components:

```typescript
import { supabase } from '@/lib/supabase/client';

// Example: Query profiles table
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);
```

#### Server-side Client

Located at `lib/supabase/server.ts`, this is used in server components and API routes:

```typescript
import { createServerClient } from '@/lib/supabase/server';

const supabase = await createServerClient();
```

## Usage in Components

### Using the Auth Context

```typescript
'use client';

import { useAuth } from '@/lib/context/auth-context';

export default function MyComponent() {
  const { user, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <button onClick={() => login('email', 'password')}>Login</button>;
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Security Features

1. **Row Level Security (RLS)**: Ensures users can only access their own profile data
2. **Session Management**: Automatic token refresh and session persistence
3. **Password Hashing**: Handled automatically by Supabase Auth
4. **CORS Protection**: Configured through Supabase project settings

## Error Handling

All authentication methods return an error object that should be checked:

```typescript
const { error } = await login(email, password);
if (error) {
  // Handle error
  switch (error.message) {
    case 'Invalid login credentials':
      // Show incorrect credentials message
      break;
    default:
      // Show generic error
  }
}
```

## Common Issues

### Profile Not Created on Signup

If a profile is not automatically created:
1. Verify the trigger is installed: Check `supabase/migrations/001_create_profiles_table.sql`
2. Check Supabase logs for trigger execution errors
3. Ensure user metadata includes `name` field during signup

### RLS Policy Errors

If you encounter permission errors:
1. Verify RLS is enabled: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
2. Check that policies are correctly created
3. Ensure the user is authenticated: `auth.uid()` should return a valid UUID

### Environment Variables Not Working

1. Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
2. Restart the development server after adding environment variables
3. Verify the `.env.local` file is in the project root

## Notifications System

The application includes a notification system for admin users. Notifications are stored in the `notifications` table and can be:

- **Viewed in real-time** - Notifications appear automatically when created
- **Marked as read** - Click on a notification to mark it as read
- **Filtered by type** - Different notification types (order, stock, system, etc.)
- **Linked to actions** - Notifications can include links to relevant pages

### Notification Types

- `info` - General information
- `success` - Success messages
- `warning` - Warning alerts
- `error` - Error notifications
- `order` - Order-related notifications
- `stock` - Stock/inventory alerts
- `system` - System notifications

### Creating Notifications

To create a notification programmatically:

```typescript
import { supabase } from '@/lib/supabase/client';

// Create a notification for a specific user
const { error } = await supabase
  .from('notifications')
  .insert({
    user_id: userId,
    title: 'New Order',
    message: 'Order #1234 has been placed',
    type: 'order',
    link: '/admin/orders/1234',
  });

// Create a notification for all admins
// (You would need to query for all admin users first)
```

## Migration Files

The migration files are located at:
- `supabase/migrations/001_create_profiles_table.sql` - Profiles table
- `supabase/migrations/002_create_notifications_table.sql` - Notifications table

These files contain:
- Table creation
- RLS policies
- Automatic profile creation trigger
- Indexes for performance

## Email Confirmation

By default, Supabase requires users to confirm their email address before they can log in. The application includes built-in handling for this:

### Resend Confirmation Email

If a user tries to log in with an unconfirmed email, they will see:
- An error message explaining they need to confirm their email
- A "Resend Confirmation Email" button to request a new confirmation link

The `resendConfirmationEmail` function in the auth context handles this:

```typescript
const { resendConfirmationEmail } = useAuth();
const { error } = await resendConfirmationEmail('user@example.com');
```

### Disabling Email Confirmation (Development)

For development/testing, you can disable email confirmation:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, toggle off **"Enable email confirmations"**
4. Save changes

**Note:** This should only be disabled in development. Production applications should require email confirmation for security.

## Next Steps

1. Configure email templates in Supabase dashboard (optional)
2. Implement password reset functionality
3. Add OAuth providers (Google, GitHub, etc.) if needed
4. Set up admin role management
5. Add profile image upload functionality

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

