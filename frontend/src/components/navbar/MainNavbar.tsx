import { useState } from 'react'; // Eliminamos React (no se usa) y useEffect (ya no es necesario)
import { Navbar, NavbarUser } from './index';

type User = {
    username: string;
    photo?: string;
    isLoggedIn: boolean;
} | null;

const MainNavbar = () => {
    // Inicializamos el estado directamente (Lazy Initializer)
    // Esto solo se ejecuta UNA VEZ al cargar la web.
    const [user, setUser] = useState<User>(() => {
        const saved = localStorage.getItem("user");
        if (saved) {
            try {
                const data = JSON.parse(saved);
                return {
                    username: data.username,
                    ...(data.photo ? { photo: data.photo } : {}),
                    isLoggedIn: true
                };
            } catch {
                return null;
            }
        }
        return null;
    });

    // Esta función es la que "despierta" el cambio de Navbar tras el login
    const handleLogin = (userData: { username: string; photo?: string }) => {
        const newUser = { ...userData, isLoggedIn: true };
        localStorage.setItem("user", JSON.stringify(newUser));
        setUser(newUser); // Al actualizar el estado, React re-renderiza y cambia el Navbar
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
    };

    return (
        <>
            {user?.isLoggedIn ? (
                <NavbarUser
                    username={user.username}
                    userPhoto={user.photo}
                    onLogout={handleLogout}
                />
            ) : (
                <Navbar onLoginSuccess={handleLogin} />
            )}
        </>
    );
};

export default MainNavbar;

