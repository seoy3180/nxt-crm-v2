-- Supabase Auth는 내부적으로 GoTrueAdmin을 사용하므로
-- SQL로 직접 비밀번호를 넣으면 해싱 방식이 맞지 않을 수 있음.
-- 대신 기존 사용자를 삭제하고 Supabase Dashboard에서 재생성하거나,
-- service_role key로 Admin API를 호출해야 함.

-- 기존 사용자 삭제 (profiles는 CASCADE로 자동 삭제)
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users);
DELETE FROM auth.users;
