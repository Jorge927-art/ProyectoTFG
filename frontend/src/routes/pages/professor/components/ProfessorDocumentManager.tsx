import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Download, Loader2, AlertCircle, FileUp, Inbox, Send, UserCheck } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import type { TaughtCourse } from '../../../../services/userDomains';
import {
    ACADEMIC_DOCUMENT_ACCEPT,
    ACADEMIC_DOCUMENT_ALLOWED_LABEL,
    ACADEMIC_DOCUMENT_MAX_SIZE_BYTES,
    buildAcademicDocumentSizeErrorMessage,
} from '../../../../services/academicDocumentUploadConfig';
import {
    downloadDocumentSecure,
    getProfessorRecipientsByCourse,
    hideAllReceivedGeneralDocuments,
    getUserDocuments,
    getSentDocumentsByCourse,
    markDocumentAsRead,
    uploadProfessorDocument,
    type DocumentMetadata,
    type UserDirectoryDTO,
} from '../../../../services/documentService';
import { emitNotificationsRefresh } from '../../../../components/ui/globalNotificationBell/useNotifications';

interface ProfessorDocumentManagerProps {
    availableCourses: TaughtCourse[];
    autoFocusDocuments?: boolean;
    focusDocumentId?: number | null;
    className?: string;
}

export const ProfessorDocumentManager = ({
    availableCourses,
    autoFocusDocuments = false,
    focusDocumentId = null,
    className = '',
}: ProfessorDocumentManagerProps) => {
    const filterGeneralDocuments = (documents: DocumentMetadata[]) => (
        documents.filter((document) => !document.course || typeof document.course.courseId !== 'number')
    );

    const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [selectedReceiverId, setSelectedReceiverId] = useState<number | ''>('');
    const [recipients, setRecipients] = useState<UserDirectoryDTO[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [documentError, setDocumentError] = useState('');
    const [documentList, setDocumentList] = useState<DocumentMetadata[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [highlightedDocumentId, setHighlightedDocumentId] = useState<number | null>(null);
    const [clearingReceivedTray, setClearingReceivedTray] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const highlightTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (availableCourses.length === 0) {
            setSelectedCourseId(null);
            return;
        }

        setSelectedCourseId((current) => {
            if (current && availableCourses.some((course) => course.id === current)) {
                return current;
            }
            return availableCourses[0].id;
        });
    }, [availableCourses]);

    useEffect(() => {
        if (!selectedCourseId) {
            setRecipients([]);
            setSelectedReceiverId('');
            return;
        }

        let cancelled = false;

        const loadRecipients = async () => {
            setLoadingRecipients(true);
            try {
                const data = await getProfessorRecipientsByCourse(selectedCourseId);
                if (!cancelled) {
                    setRecipients(data);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Error cargando destinatarios académicos del profesor:', error);
                    setRecipients([]);
                    setDocumentError('No se pudo cargar el directorio de destinatarios para esta asignatura.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingRecipients(false);
                }
            }
        };

        loadRecipients();

        return () => {
            cancelled = true;
        };
    }, [selectedCourseId]);

    useEffect(() => {
        if (activeTab === 'SENT' && !selectedCourseId) {
            setDocumentList([]);
            return;
        }

        let cancelled = false;

        const loadDocuments = async () => {
            setLoadingDocuments(true);
            setDocumentError('');
            try {
                const docs = activeTab === 'RECEIVED'
                    ? filterGeneralDocuments(await getUserDocuments())
                    : await getSentDocumentsByCourse(selectedCourseId as number);

                if (!cancelled) {
                    setDocumentList(docs);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Error sincronizando documentos del profesor por asignatura:', error);
                    setDocumentList([]);
                    setDocumentError('No se pudieron sincronizar los documentos para la asignatura seleccionada.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingDocuments(false);
                }
            }
        };

        loadDocuments();

        return () => {
            cancelled = true;
        };
    }, [activeTab, selectedCourseId]);

    useEffect(() => {
        if (!autoFocusDocuments || activeTab !== 'RECEIVED' || loadingDocuments || documentList.length === 0) {
            return;
        }

        const targetDocument =
            (focusDocumentId ? documentList.find((doc) => doc.documentid === focusDocumentId) : undefined)
            ?? documentList.find((doc) => !doc.isRead)
            ?? documentList[0];

        if (!targetDocument) {
            return;
        }

        setHighlightedDocumentId(targetDocument.documentid);
        rowRefs.current[targetDocument.documentid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (highlightTimeoutRef.current) {
            window.clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = window.setTimeout(() => {
            setHighlightedDocumentId((prev) => (prev === targetDocument.documentid ? null : prev));
        }, 2600);
    }, [activeTab, autoFocusDocuments, documentList, focusDocumentId, loadingDocuments]);

    useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    const resetUploadState = () => {
        setSelectedFile(null);
        setSelectedReceiverId('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];

        if (file.size > ACADEMIC_DOCUMENT_MAX_SIZE_BYTES) {
            setDocumentError(buildAcademicDocumentSizeErrorMessage());
            return;
        }

        setSelectedFile(file);
        setDocumentError('');
    };

    const handleManualUpload = async () => {
        if (!selectedCourseId) {
            setDocumentError('Selecciona primero una asignatura del profesor.');
            return;
        }

        if (!selectedReceiverId) {
            setDocumentError('Selecciona un destinatario válido antes de enviar el documento.');
            return;
        }

        if (!selectedFile) {
            setDocumentError('Selecciona un archivo válido antes de enviar.');
            return;
        }

        try {
            setIsUploading(true);
            setDocumentError('');
            await uploadProfessorDocument(selectedFile, selectedCourseId, Number(selectedReceiverId), 'DOCUMENTO');
            resetUploadState();

            const updated = await getSentDocumentsByCourse(selectedCourseId);
            setDocumentList(updated);
        } catch (error) {
            console.error('Error al transmitir documento académico desde profesor:', error);
            const backendError = error as {
                response?: {
                    data?: {
                        error?: string;
                        message?: string;
                        detalles?: string;
                    };
                };
            };
            setDocumentError(
                backendError.response?.data?.error
                || backendError.response?.data?.message
                || backendError.response?.data?.detalles
                || 'No se pudo enviar el documento académico. Inténtalo de nuevo.'
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (documentId: number, originalName: string, isRead: boolean) => {
        if (downloadingId !== null) {
            return;
        }

        try {
            setDownloadingId(documentId);
            setDocumentError('');
            await downloadDocumentSecure(documentId, originalName);

            if (activeTab === 'RECEIVED' && !isRead) {
                await markDocumentAsRead(documentId);
                emitNotificationsRefresh();
                setDocumentList((previous) => previous.map((doc) =>
                    doc.documentid === documentId ? { ...doc, isRead: true } : doc
                ));
            }
        } catch (error) {
            console.error('Error al descargar documento académico del profesor:', error);
            setDocumentError('No se pudo completar la descarga segura del documento.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleClearReceivedTray = async () => {
        const confirmed = window.confirm(
            '¿Deseas limpiar la bandeja de entrada?\n\nEsta acción oculta los documentos para tu usuario y no elimina datos en base de datos.'
        );

        if (!confirmed) {
            return;
        }

        try {
            setClearingReceivedTray(true);
            setDocumentError('');
            await hideAllReceivedGeneralDocuments();
            emitNotificationsRefresh();
            const docs = filterGeneralDocuments(await getUserDocuments());
            setDocumentList(docs);
            setHighlightedDocumentId(null);
        } catch {
            setDocumentError('No se pudo limpiar la bandeja de entrada.');
        } finally {
            setClearingReceivedTray(false);
        }
    };

    return (
        <GenericCard className={`flex flex-col h-118 ${className}`.trim()}>
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileUp size={18} className="text-blue-600" />
                    <span>Gestión de Documentos Académicos</span>
                </h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {documentList.length}
                </span>
            </div>

            <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 mb-3 shrink-0">
                <label htmlFor="professor-doc-course-selector" className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    Asignatura activa para documentos
                </label>
                <select
                    id="professor-doc-course-selector"
                    value={selectedCourseId ?? ''}
                    onChange={(event) => {
                        const value = Number(event.target.value);
                        setSelectedCourseId(Number.isFinite(value) && value > 0 ? value : null);
                        setSelectedReceiverId('');
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                    }}
                    className="mt-1.5 w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400 transition-colors"
                >
                    {availableCourses.length === 0 && <option value="">Sin asignaturas asignadas</option>}
                    {availableCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-3 shrink-0">
                <GenericButton
                    type="button"
                    onClick={() => setActiveTab('RECEIVED')}
                    variant="white"
                    icon={<Inbox size={14} />}
                    label="Recibidos"
                    className={`flex-1 justify-center gap-2 py-1.5! text-xs! font-bold! rounded-lg! transition-all! cursor-pointer ${activeTab === 'RECEIVED'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                />
                <GenericButton
                    type="button"
                    onClick={() => setActiveTab('SENT')}
                    variant="white"
                    icon={<Send size={14} />}
                    label="Enviados"
                    className={`flex-1 justify-center gap-2 py-1.5! text-xs! font-bold! rounded-lg! transition-all! cursor-pointer ${activeTab === 'SENT'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                />
            </div>

            {activeTab === 'RECEIVED' && (
                <div className="mb-3 shrink-0">
                    <GenericButton
                        type="button"
                        variant="text"
                        onClick={() => void handleClearReceivedTray()}
                        disabled={loadingDocuments || documentList.length === 0 || clearingReceivedTray}
                        icon={clearingReceivedTray ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        label={clearingReceivedTray ? 'Limpiando...' : 'Limpiar bandeja de entrada'}
                        className="text-xs! font-bold! text-slate-600!"
                    />
                </div>
            )}

            {documentError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 shrink-0">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="truncate">{documentError}</p>
                </div>
            )}

            <div className="flex-1 flex flex-col space-y-3 min-h-0">
                {activeTab === 'SENT' && (
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2.5 shrink-0">
                        <div className="flex items-center gap-2">
                            <UserCheck size={14} className="text-slate-400 shrink-0" />
                            <select
                                value={selectedReceiverId}
                                aria-label="Seleccionar destinatario académico"
                                onChange={(event) => {
                                    setSelectedReceiverId(event.target.value ? Number(event.target.value) : '');
                                    setDocumentError('');
                                }}
                                disabled={isUploading || loadingRecipients || !selectedCourseId}
                                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-60"
                            >
                                <option value="">-- Seleccionar Destinatario --</option>
                                {loadingRecipients ? (
                                    <option disabled>Cargando directorio académico...</option>
                                ) : (
                                    recipients.map((user) => (
                                        <option key={user.userId} value={user.userId}>
                                            {user.username} ({user.role})
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-2.5 text-center transition-all bg-white group">
                            <input
                                type="file"
                                id="prof-doc-upload-input"
                                ref={fileInputRef}
                                hidden
                                onChange={onFileChange}
                                accept={ACADEMIC_DOCUMENT_ACCEPT}
                                disabled={isUploading || !selectedReceiverId}
                            />
                            <label
                                htmlFor="prof-doc-upload-input"
                                className={`flex flex-col items-center gap-1.5 ${isUploading || !selectedReceiverId
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                                    }`}
                            >
                                {isUploading ? (
                                    <Loader2 className="text-blue-500 animate-spin" size={20} />
                                ) : (
                                    <Upload
                                        className={`transition-colors ${selectedReceiverId
                                            ? 'text-slate-400 group-hover:text-blue-500'
                                            : 'text-slate-300'
                                            }`}
                                        size={20}
                                    />
                                )}
                                <span className="text-[11px] font-bold text-slate-600">
                                    {isUploading
                                        ? 'Transmitiendo payload seguro...'
                                        : !selectedReceiverId
                                            ? 'Selecciona destinatario para desbloquear'
                                            : selectedFile
                                                ? `Archivo listo: ${selectedFile.name}`
                                                : `Seleccionar archivo (${ACADEMIC_DOCUMENT_ALLOWED_LABEL})`
                                    }
                                </span>
                            </label>
                        </div>

                        <GenericButton
                            type="button"
                            onClick={() => void handleManualUpload()}
                            disabled={isUploading || !selectedReceiverId || !selectedFile}
                            variant="primary"
                            icon={isUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            label={isUploading ? 'Enviando...' : 'Enviar documento'}
                            className="w-full justify-center gap-2 py-2! text-xs! font-bold! rounded-lg!"
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 min-h-30">
                    {loadingDocuments ? (
                        <div className="h-full flex flex-col justify-center items-center bg-white border border-slate-100 rounded-xl text-slate-400 p-4">
                            <Loader2 size={20} className="animate-spin mb-2 text-blue-600" />
                            <p className="text-xs font-semibold">Sincronizando documentos de la asignatura...</p>
                        </div>
                    ) : documentList.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 p-4 text-center">
                            <FileText size={20} className="mb-2 text-slate-300" />
                            <p className="text-xs font-semibold">
                                {activeTab === 'RECEIVED'
                                    ? 'No hay documentos recibidos para esta asignatura.'
                                    : 'No has enviado documentos académicos para esta asignatura.'}
                            </p>
                        </div>
                    ) : (
                        documentList.map((doc) => {
                            const isReceived = activeTab === 'RECEIVED';
                            const counterpartLabel = isReceived
                                ? `De: ${doc.sender.username}`
                                : `Para: ${doc.receiver.username}`;

                            return (
                                <div
                                    key={doc.documentid}
                                    ref={(node) => {
                                        rowRefs.current[doc.documentid] = node;
                                    }}
                                    className={`p-2.5 rounded-lg border transition-colors ${highlightedDocumentId === doc.documentid
                                        ? 'border-amber-300 bg-amber-50'
                                        : isReceived && !doc.isRead
                                            ? 'border-blue-200 bg-blue-50/40'
                                            : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{doc.originalname}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{counterpartLabel}</p>
                                        </div>

                                        <GenericButton
                                            type="button"
                                            onClick={() => void handleDownload(doc.documentid, doc.originalname, doc.isRead)}
                                            variant="white"
                                            icon={downloadingId === doc.documentid ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                            ariaLabel={`Descargar documento ${doc.documentid}`}
                                            className="px-2.5! py-1.5! text-slate-600! border border-slate-200 hover:bg-slate-100!"
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </GenericCard>
    );
};

export default ProfessorDocumentManager;
