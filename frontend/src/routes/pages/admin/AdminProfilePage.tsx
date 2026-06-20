import AdminLayout from '../../layouts/AdminLayout'; // <-- Asegura que el archivo AdminLayout exista en tus layouts
import ProfileSettings from '../../../components/ui/profileSettings/ProfileSettings';

export default function AdminProfilePage() {
    return (
        <AdminLayout>
            <ProfileSettings />
        </AdminLayout>
    );
}
