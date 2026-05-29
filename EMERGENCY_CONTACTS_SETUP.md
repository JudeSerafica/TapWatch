# Emergency Contacts Feature Setup

## Overview
This feature allows admin users to manage barangay officials' contact information that residents can view in their dashboard for emergency situations.

## Database Setup

### 1. Run the SQL Migration
Execute the SQL file in your Supabase SQL Editor:
```bash
database_migration_emergency_contacts.sql
```

This will create:
- `emergency_contacts` table
- Row Level Security policies
- Indexes for performance
- Sample data (3 officials)

### 2. Table Structure
```sql
emergency_contacts (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Features

### Admin Side (`/admin-contacts`)
- ✅ Create new emergency contacts
- ✅ Edit existing contacts
- ✅ Delete contacts
- ✅ Toggle active/inactive status
- ✅ Add official photos
- ✅ Manage contact details (name, position, phone, email)

### User Side (Dashboard)
- ✅ View active emergency contacts
- ✅ Quick call button for each official
- ✅ Email contact option
- ✅ View all contacts in modal
- ✅ See official photos and positions

## Usage

### For Admins:
1. Navigate to **Emergency Contacts** in the admin sidebar
2. Click **"Add Contact"** to create a new official
3. Fill in the required information:
   - Full Name (required)
   - Position (required)
   - Phone Number (required)
   - Email (optional)
   - Photo URL (optional)
   - Active status (checkbox)
4. Click **Save** to add the contact
5. Use **Edit** or **Delete** buttons to manage existing contacts

### For Residents:
1. Go to your **Dashboard**
2. Find the **"Emergency Hotline"** widget
3. See the top 3 emergency contacts
4. Click the green phone icon to call directly
5. Click **"View All"** to see all active contacts
6. In the modal, you can call or email any official

## Security

- **Row Level Security (RLS)** is enabled
- Residents can only **view** active contacts
- Only **admins** can create, update, or delete contacts
- Inactive contacts are hidden from residents

## Components Created

1. **`EmergencyContacts.jsx`** - Admin management page
2. **`EmergencyHotline.jsx`** - User dashboard widget
3. **`AdminSidebar.jsx`** - Updated with Emergency Contacts menu
4. **`App.jsx`** - Added `/admin-contacts` route

## Next Steps

To integrate the Emergency Hotline widget into the user dashboard:

```jsx
import EmergencyHotline from '../components/EmergencyHotline'

// In your Dashboard component:
<EmergencyHotline />
```

## Sample Data

The migration includes 3 sample officials:
- Juan Dela Cruz (Barangay Captain)
- Maria Santos (Barangay Kagawad)
- Pedro Reyes (SK Chairman)

You can modify or delete these after setup.
