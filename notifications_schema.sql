-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'alert'
  is_read BOOLEAN DEFAULT false,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Allow system to insert notifications
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Create policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample: Insert notification when incident is created (optional trigger)
CREATE OR REPLACE FUNCTION notify_incident_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify admins
  INSERT INTO notifications (user_id, title, message, type, incident_id)
  SELECT 
    id,
    'New Incident Reported',
    'A new ' || NEW.type || ' incident has been reported at ' || NEW.location,
    'alert',
    NEW.id
  FROM profiles
  WHERE role = 'admin';
  
  -- Notify the reporter (user who submitted)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, incident_id)
    VALUES (
      NEW.user_id,
      'Incident Submitted',
      'Your ' || NEW.type || ' incident report has been submitted successfully. We will respond shortly.',
      'info',
      NEW.id
    );
  END IF;
  
  -- Notify residents in same purok (nearby)
  IF NEW.purok IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, incident_id)
    SELECT 
      id,
      'Incident in Your Area',
      'A ' || NEW.type || ' incident was reported in ' || NEW.purok || '. Stay safe!',
      'warning',
      NEW.id
    FROM profiles
    WHERE purok = NEW.purok 
      AND role = 'resident'
      AND id != NEW.user_id; -- Don't notify the reporter again
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incident_notification_trigger
  AFTER INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION notify_incident_creation();

-- Notify users when incident status changes
CREATE OR REPLACE FUNCTION notify_incident_status_update()
RETURNS TRIGGER AS $$
DECLARE
  status_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Determine message and type based on new status
    CASE NEW.status
      WHEN 'responding' THEN
        status_message := 'Barangay officials are now responding to your ' || NEW.type || ' report. Help is on the way!';
        notification_type := 'update';
      WHEN 'resolved' THEN
        status_message := 'Your ' || NEW.type || ' incident report has been resolved. Thank you for reporting!';
        notification_type := 'success';
      WHEN 'rejected' THEN
        status_message := 'Your ' || NEW.type || ' incident report requires additional information. Please check the details.';
        notification_type := 'warning';
      ELSE
        status_message := 'Your ' || NEW.type || ' incident status is now ' || NEW.status || '.';
        notification_type := 'info';
    END CASE;
    
    -- Notify the reporter
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, incident_id)
      VALUES (
        NEW.user_id,
        '📢 Incident Status Updated',
        status_message,
        notification_type,
        NEW.id
      );
    END IF;
    
    -- If status changed to resolved, notify nearby residents for awareness
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND NEW.purok IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, incident_id)
      SELECT 
        id,
        '✅ Incident Resolved in Your Area',
        'A ' || NEW.type || ' incident in ' || NEW.purok || ' has been resolved by authorities.',
        'success',
        NEW.id
      FROM profiles
      WHERE purok = NEW.purok 
        AND role = 'resident'
        AND id != NEW.user_id
      LIMIT 50; -- Limit to avoid too many notifications
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incident_status_update_trigger ON incidents;
CREATE TRIGGER incident_status_update_trigger
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION notify_incident_status_update();

-- Notify when admin adds a comment/response to incident
CREATE OR REPLACE FUNCTION notify_incident_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if there's a user_id (reporter) for the incident
  IF EXISTS (
    SELECT 1 FROM incidents 
    WHERE id = NEW.incident_id 
    AND user_id IS NOT NULL
  ) THEN
    INSERT INTO notifications (user_id, title, message, type, incident_id)
    SELECT 
      i.user_id,
      '💬 New Response to Your Report',
      'Barangay officials have responded to your incident report. Check the details for more information.',
      'update',
      i.id
    FROM incidents i
    WHERE i.id = NEW.incident_id
    AND i.user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comments (if you have a comments table)
-- Note: This assumes you might add a comments table later
-- DROP TRIGGER IF EXISTS incident_comment_trigger ON comments;
-- CREATE TRIGGER incident_comment_trigger
--   AFTER INSERT ON comments
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_incident_comment();

-- Notify when incident priority changes
CREATE OR REPLACE FUNCTION notify_incident_priority_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if priority field exists and changed
  IF (OLD.priority IS DISTINCT FROM NEW.priority) AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, incident_id)
    VALUES (
      NEW.user_id,
      '⚡ Incident Priority Updated',
      'Your ' || NEW.type || ' incident priority has been changed to ' || COALESCE(NEW.priority, 'normal') || ' by officials.',
      CASE 
        WHEN NEW.priority = 'high' OR NEW.priority = 'urgent' THEN 'alert'
        ELSE 'info'
      END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for priority changes
DROP TRIGGER IF EXISTS incident_priority_trigger ON incidents;
CREATE TRIGGER incident_priority_trigger
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION notify_incident_priority_change();

-- Function to send weekly/daily summary notifications
CREATE OR REPLACE FUNCTION send_area_safety_summary()
RETURNS void AS $$
DECLARE
  purok_record RECORD;
  incident_count INTEGER;
  resolved_count INTEGER;
BEGIN
  -- For each unique purok, send summary to residents
  FOR purok_record IN 
    SELECT DISTINCT purok FROM profiles WHERE purok IS NOT NULL
  LOOP
    -- Count incidents in the last 7 days
    SELECT COUNT(*) INTO incident_count
    FROM incidents
    WHERE purok = purok_record.purok
    AND created_at >= NOW() - INTERVAL '7 days';
    
    -- Count resolved incidents
    SELECT COUNT(*) INTO resolved_count
    FROM incidents
    WHERE purok = purok_record.purok
    AND status = 'resolved'
    AND updated_at >= NOW() - INTERVAL '7 days';
    
    -- Send notification to all residents in this purok
    IF incident_count > 0 THEN
      INSERT INTO notifications (user_id, title, message, type)
      SELECT 
        id,
        '📊 Weekly Safety Report: ' || purok_record.purok,
        incident_count || ' incidents reported this week. ' || resolved_count || ' resolved. Stay vigilant and report suspicious activities.',
        'info'
      FROM profiles
      WHERE purok = purok_record.purok
      AND role = 'resident';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to notify about SOS alerts in area (called from app)
CREATE OR REPLACE FUNCTION notify_sos_nearby_residents(incident_uuid UUID)
RETURNS void AS $$
DECLARE
  incident_record RECORD;
BEGIN
  -- Get incident details
  SELECT * INTO incident_record FROM incidents WHERE id = incident_uuid;
  
  IF incident_record.is_sos = true AND incident_record.purok IS NOT NULL THEN
    -- Notify nearby residents
    INSERT INTO notifications (user_id, title, message, type, incident_id)
    SELECT 
      id,
      '🚨 EMERGENCY ALERT IN YOUR AREA',
      'An emergency SOS has been activated in ' || incident_record.purok || '. Please stay alert and safe. Authorities have been notified.',
      'alert',
      incident_record.id
    FROM profiles
    WHERE purok = incident_record.purok
    AND role = 'resident'
    AND id != incident_record.user_id
    LIMIT 100;
  END IF;
END;
$$ LANGUAGE plpgsql;
