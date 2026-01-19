# Real-Time Notifications Implementation

## Overview
Implemented a comprehensive real-time notification system using Supabase Realtime WebSockets for live audit log monitoring.

## Features Implemented

### 1. Database Triggers & Audit Logs
- **Migration**: `20260119160000_create_audit_logs.sql`
- **Table**: `audit_logs` with comprehensive tracking
  - Captures: table_name, record_id, action, old_data, new_data, changed_fields
  - User context: user_id, user_email, user_role, ip_address, user_agent
  - Actions tracked: INSERT, UPDATE, DELETE, LOGIN, LOGOUT, AUTH_FAILED, PASSWORD_RESET
- **Triggers**: Automatic logging on users, forms, form_fields, form_submissions tables
- **RLS Policy**: Super Admin and Internal Control roles can view audit logs

### 2. Realtime Subscription
- **Migration**: `20260119170000_enable_realtime_audit_logs.sql`
- Enabled `audit_logs` table for Supabase Realtime publication
- WebSocket connection subscribes to `postgres_changes` INSERT events

### 3. Notification Service (`utils/notificationService.ts`)

#### Interfaces
```typescript
interface Notification {
  id: string;
  type: 'audit' | 'system' | 'alert' | 'info';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  metadata?: any;
  created_at: string;
}
```

#### Custom Hooks

**`useAuditNotifications(onNewLog?)`**
- Subscribes to real-time audit log INSERT events via WebSocket
- Returns `{ isConnected }` status
- Automatically formats and calls callback on new audit events

**`useNotifications()`**
- Manages notification state with localStorage persistence (max 100)
- Provides functions:
  - `addNotification(notification)` - Add new notification with UUID
  - `markAsRead(id)` - Mark single notification as read
  - `markAllAsRead()` - Mark all notifications as read
  - `clearNotification(id)` - Remove single notification
  - `clearAll()` - Clear all notifications
- Returns `{ notifications, unreadCount, ...functions }`

**`formatAuditNotification(auditLog)`**
- Converts raw audit log to user-friendly notification format
- Severity mapping:
  - `critical`: DELETE actions
  - `high`: AUTH_FAILED
  - `medium`: UPDATE actions
  - `low`: INSERT, LOGIN, LOGOUT, PASSWORD_RESET
- Generates contextual titles and messages

### 4. NotificationPanel Component

#### Real-time Updates
- Automatically receives WebSocket notifications
- Shows live connection status indicator
- Displays unread count badge

#### Browser Notifications
- Requests notification permission on mount
- Shows desktop notifications for new events when panel is closed
- Severity-based icons and colors

#### UI Features
- **Filters by severity**: Critical (red), High (orange), Medium (blue), Low (slate)
- **Icons by action type**: error, warning, info, notifications
- **Timestamp formatting**: "Just now", "5m ago", "2h ago"
- **Notification actions**:
  - Mark as read (individual)
  - Clear notification (individual)
  - Mark all as read (bulk)
  - Clear all history (bulk)

#### Notification Structure
```tsx
<Notification>
  <Icon with severity color />
  <Title + Unread indicator />
  <Message with line clamp />
  <Timestamp + Actions />
</Notification>
```

### 5. Header Integration
- Uses `useNotifications()` hook to get real-time unread count
- Displays badge on notification bell icon (shows "9+" for >9)
- Animates badge with zoom-in effect

## Access Control

### Roles with Audit Log Access
1. **Super Admin**: Full access to all audit logs
2. **Internal Control**: Full access to all audit logs (newly added)

### RLS Policy
```sql
CREATE POLICY "Super Admins and Internal Control can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('Super Admin', 'Internal Control')
    )
  );
```

## Testing Real-Time Notifications

### 1. Test Database Changes
```sql
-- Trigger notification by inserting a form
INSERT INTO forms (name, application_type, category_type, status)
VALUES ('Test Form', 'Investment', 'General', 'Draft');

-- Trigger notification by updating a user
UPDATE users SET name = 'Updated Name' WHERE id = 'some-user-id';

-- Trigger notification by deleting a form field
DELETE FROM form_fields WHERE id = 'some-field-id';
```

### 2. Test Authentication Events
```typescript
// These automatically log to audit_logs
await signInWithEmail(email, password); // Logs LOGIN or AUTH_FAILED
await signOut(); // Logs LOGOUT
```

### 3. Verify WebSocket Connection
- Open browser DevTools → Network tab
- Filter by "WS" (WebSocket)
- Look for connection to Supabase Realtime
- Check for "postgres_changes" subscription messages

### 4. Check Browser Notifications
- Grant notification permission when prompted
- Close notification panel
- Trigger a database change
- Desktop notification should appear

## Notification Flow

```
┌─────────────────────────────────────────────────────┐
│ Database Change (INSERT/UPDATE/DELETE)              │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ PostgreSQL Trigger Fires                            │
│ - Captures old/new data as JSONB                    │
│ - Detects changed fields                            │
│ - Logs to audit_logs table                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ Supabase Realtime Publication                       │
│ - Broadcasts INSERT event via WebSocket             │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ useAuditNotifications Hook (Client)                 │
│ - Receives postgres_changes event                   │
│ - Formats audit log to notification                 │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ useNotifications Hook                               │
│ - Adds notification to state                        │
│ - Persists to localStorage                          │
│ - Updates unread count                              │
└─────────────────┬───────────────────────────────────┘
                  │
                  ├───────────────────────────────────┐
                  │                                   │
                  ▼                                   ▼
┌─────────────────────────────┐  ┌──────────────────────────┐
│ NotificationPanel UI         │  │ Browser Notification API │
│ - Shows in side panel        │  │ - Desktop notification   │
│ - Updates in real-time       │  │ (if panel closed)        │
└──────────────────────────────┘  └──────────────────────────┘
```

## Files Modified/Created

### Created
1. `supabase/migrations/20260119160000_create_audit_logs.sql` - Audit log infrastructure
2. `supabase/migrations/20260119170000_enable_realtime_audit_logs.sql` - Enable Realtime
3. `services/auditService.ts` - Audit log API
4. `components/AuditLogsView.tsx` - Audit log UI
5. `utils/notificationService.ts` - Real-time notification management

### Modified
1. `utils/authService.ts` - Integrated auth event logging
2. `components/NotificationPanel.tsx` - Complete rewrite for real-time support
3. `components/Header.tsx` - Use notification hook for unread count
4. `App.tsx` - Removed old notification state and props

## Next Steps (Optional Enhancements)

1. **Toast Notifications**: Add react-hot-toast for transient notifications
2. **Notification Filtering**: Filter by severity or type in NotificationPanel
3. **Sound Alerts**: Play sound for critical notifications
4. **Email Notifications**: Send email for critical audit events
5. **Notification Preferences**: Let users configure which events trigger notifications
6. **Notification History**: Add infinite scroll or pagination for older notifications
7. **Search & Filter**: Search notifications by message content
8. **Notification Groups**: Group similar notifications (e.g., "5 new form submissions")

## Configuration

### LocalStorage Keys
- `nolt_notifications` - Persisted notification array (max 100 items)

### Realtime Channel
- Channel name: `"audit-logs-channel"`
- Schema: `public`
- Table: `audit_logs`
- Event: `INSERT`

### Browser Notification Permissions
- Automatically requests on NotificationPanel mount
- Only shows desktop notifications if permission granted and panel closed
