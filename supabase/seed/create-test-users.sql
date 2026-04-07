-- 테스트 사용자 4명 생성
DO $$
DECLARE
  admin_id UUID;
  clevel_id UUID;
  lead_msp_id UUID;
  staff_edu_id UUID;
  msp_team_id UUID;
  edu_team_id UUID;
BEGIN
  SELECT id INTO msp_team_id FROM teams WHERE type = 'msp';
  SELECT id INTO edu_team_id FROM teams WHERE type = 'education';

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'admin@nxtcloud.kr', crypt('12345678aA', gen_salt('bf')), now(), '{"name":"관리자"}'::jsonb, 'authenticated', 'authenticated', now(), now())
  RETURNING id INTO admin_id;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'clevel@nxtcloud.kr', crypt('12345678aA', gen_salt('bf')), now(), '{"name":"진성대표"}'::jsonb, 'authenticated', 'authenticated', now(), now())
  RETURNING id INTO clevel_id;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'lead.msp@nxtcloud.kr', crypt('12345678aA', gen_salt('bf')), now(), '{"name":"MSP팀장"}'::jsonb, 'authenticated', 'authenticated', now(), now())
  RETURNING id INTO lead_msp_id;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'karin.kim@nxtcloud.kr', crypt('12345678aA', gen_salt('bf')), now(), '{"name":"김서윤"}'::jsonb, 'authenticated', 'authenticated', now(), now())
  RETURNING id INTO staff_edu_id;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), admin_id, admin_id, 'email', jsonb_build_object('sub', admin_id, 'email', 'admin@nxtcloud.kr'), now(), now(), now()),
    (gen_random_uuid(), clevel_id, clevel_id, 'email', jsonb_build_object('sub', clevel_id, 'email', 'clevel@nxtcloud.kr'), now(), now(), now()),
    (gen_random_uuid(), lead_msp_id, lead_msp_id, 'email', jsonb_build_object('sub', lead_msp_id, 'email', 'lead.msp@nxtcloud.kr'), now(), now(), now()),
    (gen_random_uuid(), staff_edu_id, staff_edu_id, 'email', jsonb_build_object('sub', staff_edu_id, 'email', 'karin.kim@nxtcloud.kr'), now(), now(), now());

  UPDATE profiles SET role = 'admin', name = '관리자', position = 'Admin' WHERE id = admin_id;
  UPDATE profiles SET role = 'c_level', name = '진성대표', position = 'CEO' WHERE id = clevel_id;
  UPDATE profiles SET role = 'team_lead', name = 'MSP팀장', position = 'Team Lead', team_id = msp_team_id WHERE id = lead_msp_id;
  UPDATE profiles SET role = 'staff', name = '김서윤', position = 'Technical Trainer', team_id = edu_team_id WHERE id = staff_edu_id;
END;
$$;
