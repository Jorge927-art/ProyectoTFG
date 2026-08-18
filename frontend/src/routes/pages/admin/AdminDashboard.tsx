import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import AdminLayout from '../../layouts/DashboardLayout';
import { UserScrollList } from '../../../components/admin/UserScrollList';
import { UserSearchPanel } from './components/UserSearchPanel';
import GenericHeader from '../../../components/ui/genericHeader/GenericHeader';
import { CourseInsightPanel } from './components/CourseInsightPanel';
import { AdminDocumentInbox } from './components/AdminDocumentInbox';
import { GlobalStatisticsPanel } from './components/GlobalStatisticsPanel';
import { AdminCourseProfessorReassignmentPanel } from './components/AdminCourseProfessorReassignmentPanel';
import { AdminCourseCatalogPanel } from './components/AdminCourseCatalogPanel';
import { AdminStudentPreferencesPanel } from './components/AdminStudentPreferencesPanel';
import { useLocation } from 'react-router-dom';

const AdminDashboard = () => {
    const { user } = useAuth();
    const location = useLocation();
    const documentsPanelRef = useRef<HTMLDivElement | null>(null);
    const shouldFocusDocuments = new URLSearchParams(location.search).get('focus') === 'documents';
    const [hasDeferredReveal, setHasDeferredReveal] = useState<boolean>(false);
    const deferHeavySections = shouldFocusDocuments && !hasDeferredReveal;

    useEffect(() => {
        if (!shouldFocusDocuments) {
            return;
        }

        documentsPanelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });

        const timerId = window.setTimeout(() => {
            setHasDeferredReveal(true);
        }, 250);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [shouldFocusDocuments]);

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

            {!deferHeavySections && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8 2xl:gap-10 items-stretch w-full">
                    <div className="h-full">
                        <UserSearchPanel currentAdminUsername={user?.username ?? ''} />
                    </div>
                    <div className="h-full">
                        <UserScrollList />
                    </div>
                </div>
            )}

            {!deferHeavySections && (
                <div className="w-full mt-6">
                    <AdminStudentPreferencesPanel />
                </div>
            )}

            {!deferHeavySections && (
                <div className="w-full mt-6">
                    <AdminCourseCatalogPanel />
                </div>
            )}

            {!deferHeavySections && (
                <div className="w-full mt-6">
                    <AdminCourseProfessorReassignmentPanel />
                </div>
            )}

            <div ref={documentsPanelRef} id="admin-documents-panel" className="w-full mt-6">
                <AdminDocumentInbox autoFocusUnread={shouldFocusDocuments} />
            </div>

            {!deferHeavySections && (
                <>
                    <div data-testid="admin-analytics-grid" className="grid grid-cols-1 2xl:grid-cols-2 gap-6 items-stretch w-full mt-6">
                        <div className="h-full">
                            <CourseInsightPanel />
                        </div>

                        <div className="h-full">
                            <GlobalStatisticsPanel />
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
};

export default AdminDashboard;
