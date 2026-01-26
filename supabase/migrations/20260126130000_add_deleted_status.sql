-- Add 'Deleted' to the allowed status values for users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
ADD CONSTRAINT users_status_check CHECK (
        status IN ('Active', 'Pending', 'Suspended', 'Deleted')
    );
-- Also check admin_users view works correctly (it filters for Active usually, but good to know)
-- The view definition doesn't need changing as it filters explicitly.