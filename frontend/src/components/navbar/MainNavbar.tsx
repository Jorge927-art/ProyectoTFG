import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Navbar, NavbarUser } from './index';


const MainNavbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate(); // 1. Instanciamos el navegador nativo

    // 2. Creamos la función que dispara la redirección
    const handleProfileRedirect = () => {
        if (user?.role?.toUpperCase().trim() === 'STUDENT') {
            navigate('/student/profile');
        }
    };

    return (
        <>
            {isAuthenticated && user ? (
                <NavbarUser
                    username={user.username}
                    userPhoto={user.photo}
                    onLogout={logout}
                    onProfileClick={handleProfileRedirect} // 3. ¡INYECTAMOS LA PROPIEDAD AQUÍ!
                />
            ) : (
                <Navbar />
            )}
        </>
    );
};

export default MainNavbar;
