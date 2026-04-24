import { useAuth } from '@/auth';
import { Navbar, NavbarUser } from './index';

const MainNavbar = () => {
    const { user, isAuthenticated, logout } = useAuth();

    return (
        <>
            {isAuthenticated && user ? (
                <NavbarUser
                    username={user.username}
                    userPhoto={user.photo}
                    onLogout={logout}
                />
            ) : (
                <Navbar />
            )}
        </>
    );
};

export default MainNavbar;

