-- Crea el administrador inicial para la demostracion del TFG.
-- Credenciales documentadas: COLE / admin123.
-- La contrasena se almacena como hash BCrypt, no como texto plano.
-- Esta credencial es solo para evaluacion local y no debe reutilizarse en produccion.

\set admin_password_hash '$2a$10$Cr9MXKdsK1FL/yhsBxbO.ejyNi.I49dvKul62a6EVGJXcjvJ2ne7C'

INSERT INTO public.users (
    password,
    role,
    username,
    email,
    enabled,
    failed_login_attempts
)
VALUES (
    :'admin_password_hash',
    'ADMIN',
    'COLE',
    NULL,
    true,
    0
)
ON CONFLICT DO NOTHING;

SELECT user_id, username, role, enabled
FROM public.users
WHERE username = 'COLE';