import React, { useRef, useState } from 'react';
import { Upload, FileText, Download, Loader2, AlertCircle, FileUp, Inbox, Send, UserCheck, CheckCircle } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { useDocuments } from './useDocuments';
import type { EnrollmentInfo } from '../../../../services/courseTypes';
import { emitNotificationsRefresh } from '../../../../components/ui/globalNotificationBell/useNotifications';
import {
    hideAllReceivedGeneralDocuments,
    hideAllSentGeneralDocuments,
    markDocumentAsRead,
} from '../../../../services/documentService'; // <-- RECOMENDACIÓN NOTEBOOKLM: Importación del Servicio
import {
    ACADEMIC_DOCUMENT_ACCEPT,
    ACADEMIC_DOCUMENT_ALLOWED_LABEL,
    ACADEMIC_DOCUMENT_MAX_SIZE_BYTES,
    buildAcademicDocumentSizeErrorMessage,
} from '../../../../services/academicDocumentUploadConfig';

/**
 * Componente para gestionar la subida, descarga y visualización de documentos académicos.
 * @returns JSX.Element
 */
interface DocumentManagerProps {
    autoFocusDocuments?: boolean;
    focusDocumentId?: number | null;
    enrolledList?: EnrollmentInfo[];
}

export const DocumentManager = ({
    autoFocusDocuments = false,
    focusDocumentId = null,
    enrolledList = [],
}: DocumentManagerProps) => {
    const {
        documentList,
        activeTab,
        setActiveTab,
        loadingDocuments,
        isUploading,
        documentError,
        setDocumentError,
        directory,
        loadingDirectory,
        selectedReceiverId,
        setSelectedReceiverId,
        fetchDirectoryForCourse = async () => undefined,
        handleUpload,
        clearReceivedDocuments = () => undefined,
        clearSentDocuments = () => undefined,
        handleSecureDownload
    } = useDocuments();

    //estado local para controlar la descarga en curso y evitar descargas simultáneas
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
    const [highlightedDocumentId, setHighlightedDocumentId] = useState<number | null>(null);
    const [clearingTray, setClearingTray] = useState(false);
    const [showClearConfirmation, setShowClearConfirmation] = useState(false);
    const highlightTimeoutRef = useRef<number | null>(null);
    const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const autoFocusAppliedRef = useRef(false);

    React.useEffect(() => {
        setSelectedCourseId((current) => {
            if (current && enrolledList.some((enrollment) => enrollment.course.course_id === current)) {
                return current;
            }
            return '';
        });
    }, [enrolledList]);

    React.useEffect(() => {
        if (!selectedCourseId) {
            setSelectedReceiverId('');
            return;
        }

        void fetchDirectoryForCourse(selectedCourseId);
    }, [fetchDirectoryForCourse, selectedCourseId, setSelectedReceiverId]);

    React.useEffect(() => {
        if (!autoFocusDocuments) {
            autoFocusAppliedRef.current = false;
            return;
        }

        if (autoFocusAppliedRef.current) {
            return;
        }

        autoFocusAppliedRef.current = true;
        if (activeTab !== 'RECEIVED') {
            setActiveTab('RECEIVED');
        }
    }, [activeTab, autoFocusDocuments, setActiveTab]);

    React.useEffect(() => {
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

    React.useEffect(() => {
        return () => {
            if (highlightTimeoutRef.current) {
                window.clearTimeout(highlightTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Maneja el cambio de archivo en el input de subida.
     * @param e Evento de cambio del input de archivo
     * @returns Promise<void>
     */
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Validación previa en el cliente para ahorrar ancho de banda.
            if (file.size > ACADEMIC_DOCUMENT_MAX_SIZE_BYTES) {
                setDocumentError(buildAcademicDocumentSizeErrorMessage());
                return;
            }

            // Regla de negocio en interfaz: Comprobar que se ha seleccionado un destino antes de transmitir
            if (!selectedReceiverId) {
                setDocumentError("Por favor, selecciona un destinatario válido del directorio antes de subir el archivo.");
                return;
            }

            setSelectedFile(file);
            setDocumentError('');
            setUploadSuccess('');
        }
    };

    const handleManualUpload = async () => {
        if (!selectedFile) {
            setDocumentError('Selecciona un archivo antes de enviar.');
            return;
        }

        if (!selectedReceiverId) {
            setDocumentError('Por favor, selecciona un destinatario válido del directorio antes de subir el archivo.');
            return;
        }

        try {
            const success = selectedCourseId
                ? await handleUpload(selectedFile, selectedCourseId)
                : await handleUpload(selectedFile);
            if (success && fileInputRef.current) {
                fileInputRef.current.value = '';
                setSelectedFile(null);
                setUploadSuccess(`Documento enviado correctamente: ${selectedFile.name}.`);
            }
        } catch (error) {
            console.error('Error al transmitir el documento:', error);
            setUploadSuccess('');
            setDocumentError('No se pudo subir el documento. Inténtalo de nuevo.');
        }
    };

    /**
     * maneja la descarga segura de un documento y marca como leído si es necesario.
     * @param documentId ID del documento a descargar
     * @param originalName Nombre original del archivo
     * @returns Promise<void>
     */
    const handleDownload = async (documentId: number, originalName: string) => {
        if (downloadingId !== null) return;
        try {
            setDownloadingId(documentId);
            setDocumentError('');

            // 1. Iniciar el stream de bytes seguro
            await handleSecureDownload(documentId, originalName);

            // 2. Si es un documento recibido, disparamos el marcado como leído en PostgreSQL
            if (activeTab === 'RECEIVED') {
                await markDocumentAsRead(documentId);

                // 3. Forzar al canal de alarmas a re-evaluar el estado rojo/gris de la campana
                emitNotificationsRefresh();
            }
        } catch (error) {
            console.error("Error en la descarga segura o actualización:", error);
            setDocumentError("No tienes autorización legítima para procesar este documento.");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleTabChange = (tab: 'RECEIVED' | 'SENT') => {
        setActiveTab(tab);

        if (tab === 'RECEIVED') {
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClearCurrentTray = () => {
        setShowClearConfirmation(true);
    };

    const confirmClearCurrentTray = async () => {
        const trayLabel = activeTab === 'RECEIVED' ? 'entrada' : 'salida';
        setShowClearConfirmation(false);

        try {
            setClearingTray(true);
            setDocumentError('');

            if (activeTab === 'RECEIVED') {
                await hideAllReceivedGeneralDocuments();
                clearReceivedDocuments();
                emitNotificationsRefresh();
            } else {
                await hideAllSentGeneralDocuments();
                clearSentDocuments();
            }

            setHighlightedDocumentId(null);
        } catch {
            setDocumentError(`No se pudo limpiar la bandeja de ${trayLabel}.`);
        } finally {
            setClearingTray(false);
        }
    };

    return (
        /* ALINEACIÓN GEOMÉTRICA CONSOLIDADA: hereda la altura del contenedor padre para mantener simetría */
        <GenericCard className="flex flex-col h-full">
            {/* CABECERA DEL COMPONENTE */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileUp size={18} className="text-blue-600" />
                    <span>Gestión documentos/trabajos</span>
                </h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {documentList.length}
                </span>
            </div>

            <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 mb-3 shrink-0 space-y-2">
                <label htmlFor="student-document-course-selector" className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    Asignatura del documento
                </label>
                <select
                    id="student-document-course-selector"
                    aria-label="Seleccionar asignatura"
                    value={selectedCourseId}
                    onChange={(event) => {
                        const value = Number(event.target.value);
                        setSelectedCourseId(Number.isFinite(value) && value > 0 ? value : '');
                        setDocumentError('');
                    }}
                    disabled={isUploading}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-60"
                >
                    <option value="">Cursos</option>
                    {enrolledList.map((enrollment) => (
                        <option key={enrollment.enrollmentid} value={enrollment.course.course_id}>
                            {enrollment.course.title}
                        </option>
                    ))}
                </select>
                {selectedCourseId && (
                    <div className="flex items-center gap-2">
                        <UserCheck size={14} className="text-slate-400 shrink-0" />
                        <select
                            value={selectedReceiverId}
                            aria-label="Seleccionar destinatario"
                            onChange={(event) => {
                                setSelectedReceiverId(event.target.value ? Number(event.target.value) : '');
                                setDocumentError('');
                            }}
                            disabled={isUploading || loadingDirectory}
                            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-60"
                        >
                            <option value="">-- Seleccionar Destinatario --</option>
                            {loadingDirectory ? (
                                <option disabled>Cargando directorio legítimo...</option>
                            ) : (
                                directory.map((user) => (
                                    <option key={user.userId} value={user.userId}>
                                        {user.username} ({user.role})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                )}
            </div>

            {/* BOTONERA DE PESTAÑAS (TABS) INTERACTIVAS */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-3 shrink-0">
                <GenericButton
                    type="button"
                    onClick={() => handleTabChange('RECEIVED')}
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
                    onClick={() => handleTabChange('SENT')}
                    variant="white"
                    icon={<Send size={14} />}
                    label="Enviados"
                    className={`flex-1 justify-center gap-2 py-1.5! text-xs! font-bold! rounded-lg! transition-all! cursor-pointer ${activeTab === 'SENT'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                />
            </div>

            {/* ALERT BOX CONTROLADO DE ERRORES DEL BACKEND */}
            {documentError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 shrink-0">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="truncate">{documentError}</p>
                </div>
            )}
            {uploadSuccess && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg flex items-center gap-2 shrink-0">
                    <CheckCircle size={14} className="shrink-0" />
                    <p className="truncate">{uploadSuccess}</p>
                </div>
            )}

            {/* CONTENEDOR FLEX PRINCIPAL */}
            <div className="flex-1 flex flex-col space-y-3 min-h-0">

                {activeTab === 'SENT' && (
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2.5 shrink-0">
                        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-2.5 text-center transition-all bg-white group">
                            <input
                                type="file"
                                id="doc-upload-input"
                                ref={fileInputRef}
                                hidden
                                onChange={onFileChange}
                                accept={ACADEMIC_DOCUMENT_ACCEPT}
                                disabled={isUploading || !selectedReceiverId}
                            />
                            <label
                                htmlFor="doc-upload-input"
                                className={`flex flex-col items-center gap-1.5 ${isUploading || !selectedReceiverId
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                                    }`}
                            >
                                {isUploading ? (
                                    <Loader2 className="text-blue-500 animate-spin" size={20} />
                                ) : selectedFile ? (
                                    <>
                                        <CheckCircle className="text-emerald-500" size={20} />
                                        <span className="text-[11px] font-bold text-slate-700 truncate max-w-full px-1.5">Archivo seleccionado: {selectedFile.name}</span>
                                        <span className="text-[10px] text-slate-500 font-semibold">Archivo seleccionado para enviar</span>
                                    </>
                                ) : (
                                    <Upload
                                        className={`transition-colors ${selectedReceiverId
                                            ? 'text-slate-400 group-hover:text-blue-500'
                                            : 'text-slate-300'
                                            }`}
                                        size={20}
                                    />
                                )}
                                {!selectedFile && (
                                    <span className="text-[11px] font-bold text-slate-600">
                                        {isUploading
                                            ? "Transmitiendo payload seguro..."
                                            : !selectedReceiverId
                                                ? "Elige un destinatario arriba para desbloquear"
                                                : `Seleccionar archivo (${ACADEMIC_DOCUMENT_ALLOWED_LABEL})`
                                        }
                                    </span>
                                )}
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

                {activeTab === 'RECEIVED' && (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-[11px] font-semibold text-blue-700 shrink-0">
                        Mostrando documentos recibidos en tu bandeja.
                    </div>
                )}

                <div className="shrink-0">
                    <GenericButton
                        type="button"
                        onClick={() => void handleClearCurrentTray()}
                        disabled={loadingDocuments || documentList.length === 0 || clearingTray}
                        variant="text"
                        label={clearingTray ? 'Limpiando...' : activeTab === 'RECEIVED' ? 'Limpiar bandeja de entrada' : 'Limpiar bandeja de salida'}
                        icon={clearingTray ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                        className="text-xs! font-bold! text-slate-600!"
                    />
                    {activeTab === 'RECEIVED' && (
                        <span className="ml-2 text-[10px] font-medium text-slate-400">
                            Se borrarán todos tus documentos. Este borrado es definitivo.
                        </span>
                    )}
                </div>
                {/* ZONA DE LISTADO CON SCROLL GEOMÉTRICO CONTROLADO [ADR-19] */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 min-h-30">
                    {loadingDocuments ? (
                        <div className="h-full flex flex-col justify-center items-center bg-white border border-slate-100 rounded-xl text-slate-400 p-4">
                            <Loader2 size={20} className="animate-spin mb-2 text-blue-600" />
                            <p className="text-[11px] font-medium text-slate-500">Sincronizando metadatos con PostgreSQL...</p>
                        </div>
                    ) : documentList.length === 0 ? (
                        <div className="p-6 bg-white/80 border border-slate-100 rounded-xl text-center flex flex-col justify-center h-full">
                            <p className="text-xs font-medium text-slate-400 italic">
                                {activeTab === 'RECEIVED'
                                    ? "Tu bandeja de entrada está vacía."
                                    : "No has enviado ningún documento todavía."
                                }
                            </p>
                        </div>
                    ) : (
                        documentList.map((doc) => (
                            (() => {
                                const sentView = activeTab === 'SENT';
                                const fileIconClass = sentView
                                    ? 'text-slate-400'
                                    : doc.isRead
                                        ? 'text-slate-300'
                                        : 'text-slate-500';
                                const downloadIconClass = sentView
                                    ? 'text-slate-400'
                                    : doc.isRead
                                        ? 'text-slate-400'
                                        : 'text-blue-600';
                                const titleClass = sentView
                                    ? 'text-slate-500 font-medium'
                                    : doc.isRead
                                        ? 'text-slate-400 font-medium'
                                        : 'text-slate-700';

                                return (
                                    <div
                                        key={doc.documentid}
                                        ref={(node) => {
                                            rowRefs.current[doc.documentid] = node;
                                        }}
                                        data-testid={`document-row-${doc.documentid}`}
                                        className={`flex justify-between items-center p-2.5 bg-white border hover:border-slate-200 rounded-lg shadow-sm transition-all ${highlightedDocumentId === doc.documentid
                                            ? 'border-amber-300 bg-amber-50/60'
                                            : 'border-slate-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            {/* DETALLE VISUAL EXTRA: Opacidad atenuada si el archivo ya fue leído */}
                                            <FileText size={16} className={`shrink-0 ${fileIconClass}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-bold truncate ${titleClass}`}>
                                                    {doc.originalname}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                                    {activeTab === 'RECEIVED' ? `De: ${doc.sender.username}` : `Para: ${doc.receiver.username}`}
                                                </p>
                                            </div>
                                        </div>

                                        <GenericButton
                                            type="button"
                                            ariaLabel={`Descargar documento ${doc.documentid}`}
                                            testId={`download-document-${doc.documentid}`}
                                            onClick={() => handleDownload(doc.documentid, doc.originalname)}
                                            disabled={downloadingId !== null}
                                            variant="white"
                                            icon={downloadingId === doc.documentid ? (
                                                <Loader2 size={14} className="animate-spin text-blue-600" />
                                            ) : (
                                                <Download size={14} className={downloadIconClass} />
                                            )}
                                            className="p-1.5! bg-slate-50 hover:bg-slate-100! border border-slate-200 rounded-lg! transition-colors cursor-pointer"
                                        />
                                    </div>
                                );
                            })()
                        ))
                    )}
                </div>
            </div>
            {showClearConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="student-clear-documents-title">
                        <h2 id="student-clear-documents-title" className="text-base font-bold text-slate-800">Se borrarán todos tus documentos. Este borrado es definitivo.</h2>
                        <div className="mt-5 flex justify-end gap-2">
                            <GenericButton type="button" variant="white" label="Cancelar" onClick={() => setShowClearConfirmation(false)} />
                            <GenericButton type="button" variant="primary" label="Aceptar" onClick={() => void confirmClearCurrentTray()} />
                        </div>
                    </div>
                </div>
            )}
        </GenericCard>
    );
};
