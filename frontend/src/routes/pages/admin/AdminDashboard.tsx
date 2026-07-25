import { useAuth } from '../../../auth/useAuth';
import AdminLayout from '../../layouts/DashboardLayout';
import { UserScrollList } from '../../../components/admin/UserScrollList';
import { UserSearchPanel } from './components/UserSearchPanel';
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';

const AdminDashboard = () => {
    const { user } = useAuth();

    return (
        <AdminLayout>
            <GenericHeader
                title="Panel de Administración"
                titleSize="text-2xl font-bold tracking-tight"
                titleColor="text-slate-800"
                textPadding="p-0"
                containerClass="border-b border-slate-100 pb-4 mb-6"
                align="left"
                description={
                    <p className="text-sm font-medium text-slate-900 mt-1.5">
                        Consola del sistema: monitorización de persistencia y gestión de accesos corporativos.
                    </p>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
                <UserSearchPanel currentAdminUsername={user?.username ?? ''} />

                <div className="w-full">
                    <UserScrollList />
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
