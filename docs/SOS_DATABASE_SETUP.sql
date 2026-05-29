-- SOS Emergency Alert System - Database Setup
-- Run this SQL in Supabase to add SOS columns to incidents table

-- Add SOS columns to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS is_sos BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20);

-- Create index for faster SOS queries
CREATE INDEX IF NOT EXISTS idx_incidents_is_sos ON incidents(is_sos);
CREATE INDEX IF NOT EXISTS idx_incidents_urgency_level ON incidents(urgency_level);

-- Create composite index for active SOS alerts
CREATE INDEX IF NOT EXISTS idx_incidents_sos_status ON incidents(is_sos, status) 
WHERE is_sos = TRUE AND status = 'pending';

-- Update existing SOS incidents (if any)
-- This is optional - only if you have test data
UPDATE incidents 
SET urgency_level = 'critical' 
WHERE is_sos = TRUE AND urgency_level IS NULL;

-- Create a view for active SOS alerts (optional but recommended)
CREATE OR REPLACE VIEW active_sos_alerts AS
SELECT 
  i.*,
  p.full_name,
  p.phone,
  p.address
FROM incidents i
LEFT JOIN profiles p ON i.user_id = p.id
WHERE i.is_sos = TRUE 
  AND i.status = 'pending'
ORDER BY i.created_at DESC;

-- Grant access to the view
GRANT SELECT ON active_sos_alerts TO authenticated;

-- Create a function to count active SOS alerts
CREATE OR REPLACE FUNCTION count_active_sos_alerts()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM incidents
    WHERE is_sos = TRUE AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION count_active_sos_alerts() TO authenticated;

-- Optional: Create a trigger to log SOS alerts
CREATE TABLE IF NOT EXISTS sos_alert_logs (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  location TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  reporter_name VARCHAR(100),
  reporter_contact VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_time INTERVAL,
  resolved_at TIMESTAMP
);

-- Create index for SOS logs
CREATE INDEX IF NOT EXISTS idx_sos_logs_incident ON sos_alert_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_sos_logs_user ON sos_alert_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_logs_created ON sos_alert_logs(created_at);

-- Enable RLS for SOS logs
ALTER TABLE sos_alert_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all SOS logs
CREATE POLICY "Admins can view SOS logs" ON sos_alert_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Users can view their own SOS logs
CREATE POLICY "Users can view own SOS logs" ON sos_alert_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Create trigger function to auto-log SOS incidents
CREATE OR REPLACE FUNCTION log_sos_incident()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_sos = TRUE THEN
    INSERT INTO sos_alert_logs (
      incident_id,
      user_id,
      location,
      latitude,
      longitude,
      reporter_name,
      reporter_contact
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.location,
      NEW.latitude,
      NEW.longitude,
      NEW.reporter_name,
      NEW.reporter_contact
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_sos_incident ON incidents;
CREATE TRIGGER trigger_log_sos_incident
  AFTER INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION log_sos_incident();

-- Create trigger to update response time when status changes
CREATE OR REPLACE FUNCTION update_sos_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'responding' AND NEW.is_sos = TRUE THEN
    UPDATE sos_alert_logs
    SET response_time = NOW() - created_at
    WHERE incident_id = NEW.id;
  END IF;
  
  IF NEW.status = 'resolved' AND NEW.is_sos = TRUE THEN
    UPDATE sos_alert_logs
    SET resolved_at = NOW()
    WHERE incident_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for response time
DROP TRIGGER IF EXISTS trigger_update_sos_response_time ON incidents;
CREATE TRIGGER trigger_update_sos_response_time
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_sos_response_time();

-- Create a view for SOS statistics
CREATE OR REPLACE VIEW sos_statistics AS
SELECT 
  COUNT(*) as total_sos_alerts,
  COUNT(*) FILTER (WHERE status = 'pending') as active_alerts,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
  AVG(EXTRACT(EPOCH FROM response_time)) as avg_response_time_seconds,
  MAX(created_at) as last_sos_alert
FROM sos_alert_logs;

-- Grant access to statistics view
GRANT SELECT ON sos_statistics TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ SOS Emergency Alert System database setup complete!';
  RAISE NOTICE '📊 Tables created: sos_alert_logs';
  RAISE NOTICE '📈 Views created: active_sos_alerts, sos_statistics';
  RAISE NOTICE '⚡ Triggers created: log_sos_incident, update_sos_response_time';
  RAISE NOTICE '🔒 RLS policies configured';
  RAISE NOTICE '';
  RAISE NOTICE '🚨 Next steps:';
  RAISE NOTICE '1. Test SOS alert from user dashboard';
  RAISE NOTICE '2. Verify admin receives alerts';
  RAISE NOTICE '3. Check sos_alert_logs table for entries';
  RAISE NOTICE '4. Monitor response times';
END $$;
