-- Create emergency_contacts table for barangay officials
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active ON emergency_contacts(is_active);

-- Enable Row Level Security
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active contacts
CREATE POLICY "Anyone can view active emergency contacts"
  ON emergency_contacts
  FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can insert/update/delete contacts
CREATE POLICY "Admins can manage emergency contacts"
  ON emergency_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_emergency_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_contacts_updated_at();

-- Insert sample data (optional)
INSERT INTO emergency_contacts (name, position, phone, email, is_active) VALUES
('Juan Dela Cruz', 'Barangay Captain', '09171234567', 'captain@barangay.gov.ph', true),
('Maria Santos', 'Barangay Kagawad', '09181234567', 'kagawad1@barangay.gov.ph', true),
('Pedro Reyes', 'SK Chairman', '09191234567', 'sk@barangay.gov.ph', true);
