
-- Create admin demo user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'admin@central.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Administrador"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT DO NOTHING;

-- Set admin role for this user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
