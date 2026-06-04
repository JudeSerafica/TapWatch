# TapWatch Notification System Guide

## Overview
Comprehensive notification system that keeps residents informed about incident updates and safety information in their area.

---

## 🔔 Notification Types

### For Residents:

1. **Incident Submission Confirmation**
   - **When**: After submitting a new incident report
   - **Type**: `info` (Blue)
   - **Message**: "Your {type} incident report has been submitted successfully. We will respond shortly."

2. **Status Update Notifications**
   - **When**: Admin changes incident status
   - **Types**:
     - `update` (Blue): Status changed to "Responding"
     - `success` (Green): Status changed to "Resolved"
     - `warning` (Yellow): Status requires attention
   - **Messages**:
     - Responding: "Barangay officials are now responding to your {type} report. Help is on the way!"
     - Resolved: "Your {type} incident report has been resolved. Thank you for reporting!"

3. **Area Safety Alerts**
   - **When**: New incident in your purok
   - **Type**: `warning` (Yellow)
   - **Message**: "A {type} incident was reported in {purok}. Stay safe!"

4. **SOS Emergency Alerts**
   - **When**: SOS activated in your area
   - **Type**: `alert` (Red)
   - **Message**: "🚨 EMERGENCY ALERT IN YOUR AREA - An emergency SOS has been activated in {purok}. Please stay alert and safe."

5. **Incident Resolution Notifications**
   - **When**: Incident in your area is resolved
   - **Type**: `success` (Green)
   - **Message**: "✅ A {type} incident in {purok} has been resolved by authorities."

6. **Priority Changes**
   - **When**: Admin changes incident priority
   - **Type**: `alert` (if high/urgent) or `info` (normal)
   - **Message**: "⚡ Your {type} incident priority has been changed to {priority} by officials."

7. **Admin Responses**
   - **When**: Admin adds comment/response to report
   - **Type**: `update` (Blue)
   - **Message**: "💬 Barangay officials have responded to your incident report. Check the details for more information."

### For Admins:

1. **New Incident Reports**
   - **When**: Any resident submits a new report
   - **Type**: `alert` (Red)
   - **Message**: "New Incident Reported - A new {type} incident has been reported at {location}"

2. **SOS Emergency Alerts**
   - **When**: Any SOS button is pressed
   - **Type**: `alert` (Red)
   - **Message**: "🚨 EMERGENCY SOS ALERT from {name}. Immediate assistance needed!"

---

## 🎨 Notification UI Features

### Badge Counter
- Red badge on notification bell icon
- Shows count of unread notifications
- Updates in real-time
- Displays "99+" for counts over 99

### Notification Panel (Dropdown)
- White theme, clean design
- Two tabs: "All" and "Unread"
- Sections: "New" (< 24 hours) and "Earlier"
- Click to mark as read and navigate to incident
- "Mark all as read" button
- Icon-based notification types:
  - 🚨 Alert (Red circle icon)
  - ✅ Success (Green check icon)
  - ⚠️ Warning (Amber triangle icon)
  - ℹ️ Update (Blue info icon)

### Time Stamps
- "Just now" - < 1 minute
- "5m" - minutes ago
- "3h" - hours ago
- "2d" - days ago
- Full date if > 7 days

---

## 🔧 Database Triggers (Automatic)

### Already Implemented:

1. **`incident_notification_trigger`**
   - Fires on: New incident creation
   - Notifies: Admins, reporter, nearby residents

2. **`incident_status_update_trigger`**
   - Fires on: Status change
   - Notifies: Reporter, nearby residents (if resolved)

3. **`incident_priority_trigger`**
   - Fires on: Priority change
   - Notifies: Reporter

### Manual Functions (Call from app):

1. **`notify_sos_nearby_residents(incident_uuid)`**
   - Call when SOS is activated
   - Notifies all residents in same purok

2. **`send_area_safety_summary()`**
   - Weekly safety report
   - Can be scheduled or called manually
   - Sends summary to all residents per purok

---

## 💻 How to Use Notifications

### For Users (Frontend):

1. **Click notification bell** - Opens dropdown panel
2. **Click notification item** - Marks as read, navigates to incident
3. **Click "Mark all as read"** - Marks all as read instantly
4. **Filter by tab** - View all or only unread

### For Developers:

#### Send Manual Notification:
```javascript
import { createNotification } from './lib/notificationService'

// Single user
await createNotification({
  userId: 'user-uuid',
  title: 'Notification Title',
  message: 'Your message here',
  type: 'info', // 'info', 'success', 'warning', 'alert', 'update'
  incidentId: 'incident-uuid' // optional
})
```

#### Notify All Admins:
```javascript
import { notifyAllAdmins } from './lib/notificationService'

await notifyAllAdmins({
  title: '🚨 Emergency Alert',
  message: 'Emergency situation detected',
  type: 'alert',
  incidentId: 'incident-uuid'
})
```

#### Broadcast to All Users:
```javascript
import { broadcastNotification } from './lib/notificationService'

await broadcastNotification({
  title: 'System Announcement',
  message: 'Scheduled maintenance tonight',
  type: 'info'
})
```

---

## 📊 Notification Flow Examples

### Example 1: Resident Reports Crime
```
1. Resident submits crime report
   ↓
2. Trigger: incident_notification_trigger
   ↓
3. Notifications sent to:
   - All admins: "New crime incident reported"
   - Reporter: "Your report was submitted"
   - Nearby residents: "Crime reported in your area"
```

### Example 2: Admin Responds to Report
```
1. Admin changes status to "responding"
   ↓
2. Trigger: incident_status_update_trigger
   ↓
3. Notification sent to reporter:
   "Barangay officials are now responding"
```

### Example 3: SOS Button Pressed
```
1. User presses SOS button
   ↓
2. Manual call: notifyAllAdmins()
   ↓
3. Manual call: notify_sos_nearby_residents()
   ↓
4. Notifications sent to:
   - All admins: "EMERGENCY SOS ALERT"
   - Nearby residents: "EMERGENCY IN YOUR AREA"
```

### Example 4: Incident Resolved
```
1. Admin marks incident as resolved
   ↓
2. Trigger: incident_status_update_trigger
   ↓
3. Notifications sent to:
   - Reporter: "Your incident has been resolved"
   - Nearby residents: "Incident in your area resolved"
```

---

## 🎯 Current Status

### ✅ Implemented:
- Notification database table with proper indexes
- Row Level Security policies
- Database triggers for automatic notifications
- Real-time notification updates
- NotificationButton component with badge counter
- NotificationCenter dropdown panel
- Click to navigate to incident details
- Mark as read functionality
- Filter by read/unread
- Optimistic UI updates
- Icon-based notification types
- Time ago formatting

### 🔄 Optional Enhancements:
- Push notifications (browser/mobile)
- Email notifications
- SMS notifications for emergencies
- Notification preferences/settings
- Custom notification sounds
- Desktop notifications
- Notification history export

---

## 🛠️ Testing Notifications

### Test Scenario 1: Create Incident
1. Login as resident
2. Submit a new incident report
3. Check notification bell - should show confirmation
4. Login as admin in another tab
5. Check notification - should see new report alert

### Test Scenario 2: Status Change
1. Login as admin
2. Change incident status to "responding"
3. Login as the reporter (resident)
4. Check notifications - should see status update

### Test Scenario 3: SOS Alert
1. Login as resident
2. Press SOS panic button
3. Login as admin - should see emergency alert
4. Login as another resident in same purok
5. Check notifications - should see area alert

---

## 📝 Notes

- All notifications are automatically created via database triggers
- No manual intervention needed for most notifications
- Real-time updates via Supabase subscriptions
- Optimistic UI for instant feedback
- Proper error handling and rollback
- Notifications linked to incidents for easy navigation
- Badge counter updates immediately on click
- Clean, Facebook-style white theme interface

---

Last Updated: June 4, 2026
