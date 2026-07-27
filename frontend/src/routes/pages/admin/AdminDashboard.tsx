import { useAuth } from '../../../auth/useAuth';
import AdminLayout from '../../layouts/DashboardLayout';
import { UserScrollList } from '../../../components/admin/UserScrollList';
import { UserSearchPanel } from './components/UserSearchPanel';
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';
import { CourseInsightPanel } from './components/CourseInsightPanel';

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full">
                <div className="h-full">
                    <UserSearchPanel currentAdminUsername={user?.username ?? ''} />
                </div>
                <div className="h-full">
                    <UserScrollList />
                </div>
            </div>

            <div className="w-full mt-6">
                <CourseInsightPanel />
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
