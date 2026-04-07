SELECT id, email, email_confirmed_at, encrypted_password IS NOT NULL as has_password FROM auth.users ORDER BY created_at;
