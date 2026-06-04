# Notification System - Usage Examples

## Paano Magkakalaman ang Notifications (For Users & Admins)

### 🔔 AUTOMATIC NOTIFICATIONS (Already working! ✅)

#### Para sa **RESIDENTS (Regular Users)**:
1. ✅ **Incident Submitted** - Confirmation notification kapag nag-submit ka ng incident
2. ✅ **Incident Status Updated** - Notification kapag nag-update ang status ng iyong incident
   - "pending" → "responding" → "resolved"
3. ✅ **Incident in Your Area** - Alert kapag may incident sa iyong purok/area
   - Only sa residents na same purok as the incident

#### Para sa **ADMINS (Officials)**:
1. ✅ **New Incident Reported** - Alert kapag may bagong incident report
2. ✅ **SOS Emergency Alert** - Urgent notification kapag may nag-activate ng SOS button

### 📍 Example Scenarios:

#### Scenario 1: Resident reports Crime incident
```
Reporter (John) → Gets: "Incident Submitted" ✅
Admins → Get: "New Crime incident reported..." 🚨
Other residents in same purok → Get: "Incident in Your Area" ⚠️
```

#### Scenario 2: Admin updates incident status
```
Admin marks as "Responding"
  ↓
Reporter gets: "Your incident is now responding" 🔵

Admin marks as "Resolved"  
  ↓
Reporter gets: "Your incident is now resolved" ✅
```

#### Scenario 3: SOS Button pressed
```
User presses SOS
  ↓
ALL Admins get: "🚨 EMERGENCY SOS ALERT" 🚨
```

## Current Integration (Already Working!)

### ✅ Pages with Notification Button:

**Resident Pages:**
- Dashboard
- Report Incident
- Incident Map
- My Profile

**Admin Pages:**
- Officials Dashboard
- All Reports
- Admin Map
- Analytics
- Heat Map Analytics
- Emergency Contacts

---

## VIA CODE (Using notificationService.js)

#### Example 1: Notify specific user
```javascript
import { createNotification } from '../lib/notificationService'

// Send notification to one user
await createNotification({
  userId: 'user-uuid-here',
  title: 'Incident Updated',
  message: 'Your reported incident has been resolved.',
  type: 'success',
  incidentId: 'incident-uuid-here'
})
```

#### Example 2: Notify all admins (Already integrated! ✅)
```javascript
import { notifyAllAdmins } from '../lib/notificationService'

// Automatically sends to ALL admins
await notifyAllAdmins({
  title: 'New Crime Incident',
  message: 'A crime incident was reported at Purok 5',
  type: 'alert',
  incidentId: 'incident-id-here'
})
```

#### Example 3: Broadcast to all users
```javascript
import { broadcastNotification } from '../lib/notificationService'

// Send to ALL users (residents + admins)
await broadcastNotification({
  title: 'Community Alert',
  message: 'Heavy rain expected. Stay safe!',
  type: 'warning'
})
```

#### Example 4: Notify specific users
```javascript
import { createBulkNotifications } from '../lib/notificationService'

// Send to multiple specific users
await createBulkNotifications({
  userIds: ['user-1-id', 'user-2-id', 'user-3-id'],
  title: 'Purok 5 Alert',
  message: 'Scheduled maintenance tomorrow',
  type: 'info'
})
```

## Notification Types
- `'info'` - Blue (general information)
- `'success'` - Green (positive updates)
- `'warning'` - Yellow/Orange (caution)
- `'alert'` - Red (urgent/emergency)

## Current Integration (Already Working!)

### ✅ Report Incident Page
- Kapag nag-submit ng incident → Lahat ng ADMIN ay makakakuha ng notification

### ✅ SOS Button
- Kapag nag-activate ng SOS → Emergency alert sa lahat ng ADMIN

## Manual Testing via Supabase

Pwede mo rin manually mag-insert sa Supabase SQL Editor:

```sql
-- Test: Send notification to current user
INSERT INTO notifications (user_id, title, message, type, is_read)
VALUES (
  'your-user-id-here',
  'Test Notification',
  'This is a test notification',
  'info',
  false
);

-- Test: Send to all admins
INSERT INTO notifications (user_id, title, message, type, is_read)
SELECT 
  id,
  'Admin Test',
  'This is a test notification for admins',
  'alert',
  false
FROM profiles
WHERE role = 'admin';
```

## Where to Add More Notifications

### AdminDashboard.jsx
```javascript
import { createNotification } from '../lib/notificationService'

// When admin updates incident status
const handleStatusUpdate = async (incidentId, newStatus) => {
  // ... update logic ...
  
  // Notify the reporter
  await createNotification({
    userId: incident.user_id,
    title: 'Incident Status Updated',
    message: `Your incident has been marked as ${newStatus}`,
    type: 'info',
    incidentId: incidentId
  })
}
```

### Dashboard.jsx (for residents)
```javascript
// When incident near user's purok
if (incident.purok === profile.purok) {
  await createNotification({
    userId: profile.id,
    title: 'Incident Near You',
    message: `${incident.type} reported in your purok`,
    type: 'warning',
    incidentId: incident.id
  })
}
```

## Helper Functions Available

1. `createNotification()` - Single user
2. `createBulkNotifications()` - Multiple users
3. `notifyAllAdmins()` - All admins
4. `broadcastNotification()` - All users
5. `markAsRead()` - Mark one as read
6. `markAllAsRead()` - Mark all as read
7. `getUserNotifications()` - Fetch user's notifications
8. `deleteNotification()` - Delete notification
