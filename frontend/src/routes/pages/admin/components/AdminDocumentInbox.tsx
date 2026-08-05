import { useEffect, useRef, useState } from 'react';
import { Inbox, Download, Loader2, AlertCircle, FileText, Send, Users, FolderOpen } from 'lucide-react';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import {
    downloadDocumentSecure,
    getAdminDocumentCourses,
    getAdminDocumentRecipients,
    getSentDocuments,
    getUserDocuments,
    markDocumentAsRead,
    type DocumentMetadata,
    type AdminDocumentCourseOption,
    type AdminDocumentRecipient,
    uploadAdminDocumentToCourse,
    uploadStudentDocument,
} from '../../../../services/documentService';
import { emitNotificationsRefresh } from '../../../../components/ui/globalNotificationBell/useNotifications';

interface AdminDocumentInboxProps {
    autoFocusUnread?: boolean;
}

export const AdminDocumentInbox = ({ autoFocusUnread = false }: AdminDocumentInboxProps) => {
    const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
    const [sentDocuments, setSentDocuments] = useState<DocumentMetadata[]>([]);
    const [recipients, setRecipients] = useState<AdminDocumentRecipient[]>([]);
    const [courses, setCourses] = useState<AdminDocumentCourseOption[]>([]);
    const [selectedRecipientId, setSelectedRecipientId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [sentRecipientFilter, setSentRecipientFilter] = useState('');
    const [sentCourseFilter, setSentCourseFilter] = useState('');
    const [selectedRecipientFile, setSelectedRecipientFile] = useState<File | null>(null);
    const [selectedCourseFile, setSelectedCourseFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [sendingTarget, setSendingTarget] = useState<'user' | 'course' | null>(null);
    const [highlightedDocumentId, setHighlightedDocumentId] = useState<number | null>(null);
    const loadedRef = useRef(false);
    const highlightTimeoutRef = useRef<number | null>(null);
    const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const recipientFileInputRef = useRef<HTMLInputElement | null>(null);
    const courseFileInputRef = useRef<HTMLInputElement | null>(null);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const [receivedData, sentData] = await Promise.all([
                getUserDocuments(),
                getSentDocuments(),
            ]);
            setDocuments(Array.isArray(receivedData) ? receivedData : []);
            setSentDocuments(Array.isArray(sentData) ? sentData : []);
        } catch {
            setDocuments([]);
            setSentDocuments([]);
            setError('No se pudo cargar la bandeja de documentos del administrador.');
        } finally {
            setLoading(false);
        }
    };

    const loadComposerData = async () => {
        try {
            const [recipientData, courseData] = await Promise.all([
                getAdminDocumentRecipients(),
                getAdminDocumentCourses(),
            ]);

            setRecipients(
                recipientData.filter((user) => user.enabled)
            );
            setCourses(courseData);
        } catch {
            setError('No se pudo preparar el formulario de envío de documentos del administrador.');
        }
    };

    useEffect(() => {
        if (loadedRef.current) {
            return;
        }
        loadedRef.current = true;
        void Promise.all([loadDocuments(), loadComposerData()]);
    }, []);

    useEffect(() => {
        if (!autoFocusUnread || loading || documents.length === 0) {
            return;
        }

        const firstUnread = documents.find((doc) => !doc.isRead);
        if (!firstUnread) {
            return;
        }

        setHighlightedDocumentId(firstUnread.documentid);
        rowRefs.current[firstUnread.documentid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (highlightTimeoutRef.current) {
            window.clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightedDocumentId((prev) => (prev === firstUnread.documentid ? null : prev));
        }, 2600);
    }, [autoFocusUnread, documents, loading]);

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    const handleDownload = async (doc: DocumentMetadata) => {
        if (downloadingId !== null) {
            return;
        }

        try {
            setDownloadingId(doc.documentid);
            setError('');
            await downloadDocumentSecure(doc.documentid, doc.originalname);

            if (!doc.isRead) {
                await markDocumentAsRead(doc.documentid);
                setDocuments((prev) => prev.map((item) =>
                    item.documentid === doc.documentid ? { ...item, isRead: true } : item
                ));
                emitNotificationsRefresh();
            }
        } catch {
            setError('No se pudo descargar o marcar el documento como leído.');
        } finally {
            setDownloadingId(null);
        }
    };

    const resetRecipientForm = () => {
        setSelectedRecipientId('');
        setSelectedRecipientFile(null);
        if (recipientFileInputRef.current) {
            recipientFileInputRef.current.value = '';
        }
    };

    const resetCourseForm = () => {
        setSelectedCourseId('');
        setSelectedCourseFile(null);
        if (courseFileInputRef.current) {
            courseFileInputRef.current.value = '';
        }
    };

    const handleSendToUser = async () => {
        if (!selectedRecipientId || !selectedRecipientFile) {
            setError('Selecciona un destinatario individual y un archivo válido antes de enviar.');
            setSuccessMessage('');
            return;
        }

        try {
            setSendingTarget('user');
            setError('');
            setSuccessMessage('');
            const response = await uploadStudentDocument(selectedRecipientFile, Number(selectedRecipientId));
            setSuccessMessage(response.message);
            resetRecipientForm();
            await loadDocuments();
        } catch {
            setError('No se pudo completar el envío individual del documento.');
            setSuccessMessage('');
        } finally {
            setSendingTarget(null);
        }
    };

    const handleSendToCourse = async () => {
        if (!selectedCourseId || !selectedCourseFile) {
            setError('Selecciona una asignatura y un archivo válido antes de lanzar el envío colectivo.');
            setSuccessMessage('');
            return;
        }

        try {
            setSendingTarget('course');
            setError('');
            setSuccessMessage('');
            const response = await uploadAdminDocumentToCourse(selectedCourseFile, Number(selectedCourseId));
            setSuccessMessage(response.message);
            resetCourseForm();
            await loadDocuments();
        } catch {
            setError('No se pudo completar el envío colectivo al grupo de alumnos del curso.');
            setSuccessMessage('');
        } finally {
            setSendingTarget(null);
        }
    };

    const filteredSentDocuments = sentDocuments.filter((doc) => {
        const matchesRecipient = !sentRecipientFilter || String(doc.receiver.userId) === sentRecipientFilter;
        const matchesCourse = !sentCourseFilter || String(doc.course?.courseId ?? '') === sentCourseFilter;
        return matchesRecipient && matchesCourse;
    });
    const totalDocuments = documents.length + sentDocuments.length;

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-6 w-full h-full">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Inbox size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Bandeja de Documentos</h3>
                        <p className="text-xs text-slate-500">Gestión de documentos recibidos y enviados por la cuenta administradora</p>
                    </div>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalDocuments}
                </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
                        <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                            <Send size={16} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-800">Envío individual</h4>
                            <p className="text-[11px] text-slate-500">Selecciona un usuario concreto y transmite un documento dirigido.</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                            Directo
                        </span>
                    </div>

                    <select
                        aria-label="Seleccionar usuario destinatario"
                        value={selectedRecipientId}
                        onChange={(e) => setSelectedRecipientId(e.target.value)}
                        disabled={sendingTarget !== null}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="">Selecciona usuario destinatario</option>
                        {recipients.map((recipient) => (
                            <option key={recipient.userId} value={recipient.userId}>
                                {recipient.username} ({recipient.role})
                            </option>
                        ))}
                    </select>

                    <input
                        ref={recipientFileInputRef}
                        aria-label="Archivo para envío individual"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        disabled={sendingTarget !== null}
                        onChange={(e) => setSelectedRecipientFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-200"
                    />

                    <GenericButton
                        type="button"
                        onClick={() => void handleSendToUser()}
                        disabled={sendingTarget !== null}
                        variant="primary"
                        label={sendingTarget === 'user' ? 'Enviando...' : 'Enviar a usuario'}
                        icon={sendingTarget === 'user' ? <Loader2 size={14} className="animate-spin" /> : undefined}
                        className="w-full justify-center py-2.5! text-xs! font-bold! rounded-xl! bg-blue-600! hover:bg-blue-700! shadow-sm!"
                    />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
                        <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                            <Users size={16} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-800">Envío colectivo por curso</h4>
                            <p className="text-[11px] text-slate-500">Selecciona la asignatura y el documento se remitirá al grupo de alumnos activo.</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                            Grupo
                        </span>
                    </div>

                    <select
                        aria-label="Seleccionar curso destinatario"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        disabled={sendingTarget !== null}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="">Selecciona curso destinatario</option>
                        {courses.map((course) => (
                            <option key={course.courseId} value={course.courseId}>
                                {course.title} ({course.category})
                            </option>
                        ))}
                    </select>

                    <input
                        ref={courseFileInputRef}
                        aria-label="Archivo para envío colectivo"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        disabled={sendingTarget !== null}
                        onChange={(e) => setSelectedCourseFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-indigo-700 hover:file:bg-indigo-200"
                    />

                    <GenericButton
                        type="button"
                        onClick={() => void handleSendToCourse()}
                        disabled={sendingTarget !== null}
                        variant="primary"
                        label={sendingTarget === 'course' ? 'Enviando...' : 'Enviar a curso'}
                        icon={sendingTarget === 'course' ? <Loader2 size={14} className="animate-spin" /> : undefined}
                        className="w-full justify-center py-2.5! text-xs! font-bold! rounded-xl! bg-indigo-600! hover:bg-indigo-700! shadow-sm!"
                    />
                </div>
            </div>

            {error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg">
                    <p>{successMessage}</p>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                            <FolderOpen size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Recepción de Documentos</h4>
                            <p className="text-[11px] text-slate-500">
                                Consulta y descarga de documentos recibidos por la cuenta administradora.
                            </p>
                        </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                        {documents.length} recibidos
                    </span>
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {loading ? (
                        <div className="py-10 flex flex-col items-center text-slate-400">
                            <Loader2 className="animate-spin mb-2" size={20} />
                            <p className="text-xs font-semibold">Sincronizando documentos...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                            <p className="text-xs font-semibold">No hay documentos pendientes en la bandeja.</p>
                        </div>
                    ) : (
                        documents.map((doc) => (
                            <div
                                key={doc.documentid}
                                ref={(node) => {
                                    rowRefs.current[doc.documentid] = node;
                                }}
                                data-testid={`admin-doc-row-${doc.documentid}`}
                                className={`rounded-lg border p-3 flex items-center justify-between gap-3 transition-colors ${highlightedDocumentId === doc.documentid
                                    ? 'border-amber-300 bg-amber-50/60'
                                    : 'border-slate-100 bg-white'
                                    }`}
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{doc.originalname}</p>
                                    <p className="text-[11px] text-slate-500 truncate">De: {doc.sender.username}</p>
                                </div>

                                <GenericButton
                                    type="button"
                                    variant="text"
                                    ariaLabel={`Descargar documento ${doc.documentid}`}
                                    onClick={() => void handleDownload(doc)}
                                    icon={downloadingId === doc.documentid ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    className="p-2! text-blue-600! hover:bg-blue-50! rounded-lg!"
                                />

                                {!doc.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-red-500" title="No leído" />
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
                    <FileText size={12} />
                    Al descargar un documento no leído se marca como leído automáticamente.
                </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                            <Inbox size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Envíos realizados</h4>
                            <p className="text-[11px] text-slate-500">
                                Consulta los documentos enviados y filtra por destinatario o por curso.
                            </p>
                        </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
                        {filteredSentDocuments.length} visibles
                    </span>
                </div>

                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white/70 p-3">
                    <select
                        aria-label="Filtrar enviados por destinatario"
                        value={sentRecipientFilter}
                        onChange={(e) => setSentRecipientFilter(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                        <option value="">Todos los destinatarios</option>
                        {recipients.map((recipient) => (
                            <option key={recipient.userId} value={recipient.userId}>
                                {recipient.username}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Filtrar enviados por curso"
                        value={sentCourseFilter}
                        onChange={(e) => setSentCourseFilter(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                        <option value="">Todos los cursos</option>
                        {courses.map((course) => (
                            <option key={course.courseId} value={course.courseId}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {loading ? (
                        <div className="py-10 flex flex-col items-center text-slate-400">
                            <Loader2 className="animate-spin mb-2" size={20} />
                            <p className="text-xs font-semibold">Sincronizando envíos...</p>
                        </div>
                    ) : filteredSentDocuments.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                            <p className="text-xs font-semibold">No hay documentos enviados registrados todavía.</p>
                        </div>
                    ) : (
                        filteredSentDocuments.map((doc) => (
                            <div
                                key={doc.documentid}
                                className="rounded-lg border border-slate-100 bg-white p-3 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{doc.originalname}</p>
                                    <p className="text-[11px] text-slate-500 truncate">Para: {doc.receiver.username}</p>
                                </div>

                                <GenericButton
                                    type="button"
                                    variant="text"
                                    ariaLabel={`Descargar documento ${doc.documentid}`}
                                    onClick={() => void handleDownload(doc)}
                                    icon={downloadingId === doc.documentid ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    className="p-2! text-indigo-600! hover:bg-indigo-50! rounded-lg!"
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
                    <FileText size={12} />
                    Los documentos enviados permanecen disponibles para consulta y descarga del administrador.
                </div>
            </div>
        </div>
    );
};

export default AdminDocumentInbox;
