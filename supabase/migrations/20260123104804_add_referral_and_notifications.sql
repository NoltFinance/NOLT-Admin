-- Add referral_code to form_submissions if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'form_submissions' and column_name = 'referral_code') then
        alter table form_submissions add column referral_code text;
    end if;
end $$;

-- Add notification_preferences to users if it doesn't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'notification_preferences') then
        alter table users add column notification_preferences jsonb default '{}'::jsonb;
    end if;
end $$;
