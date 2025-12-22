-- Add expense columns to ride_transactions table
ALTER TABLE ride_transactions 
ADD COLUMN IF NOT EXISTS food_bill NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE ride_transactions 
ADD COLUMN IF NOT EXISTS outstation_bill NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE ride_transactions 
ADD COLUMN IF NOT EXISTS toll_fees NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE ride_transactions 
ADD COLUMN IF NOT EXISTS accommodation_bill NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE ride_transactions 
ADD COLUMN IF NOT EXISTS late_fine NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE ride_transactions 
ADD COLUMN IF NOT EXISTS pickup_location_fare NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE ride_transactions 
ADD COLUMN IF NOT EXISTS accommodation_included BOOLEAN DEFAULT FALSE;
