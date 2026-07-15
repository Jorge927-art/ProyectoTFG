import React, { useRef, useState } from 'react';
import { Upload, FileText, Download, Loader2, AlertCircle, FileUp, Inbox, Send, UserCheck } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import { useDocuments } from './useDocuments';
import { useNotifications } from './useNotifications'; // <-- RECOMENDACIÓN NOTEBOOKLM: Importación del Hook
import { markDocumentAsRead } from '../../../../services/documentService'; // <-- RECOMENDACIÓN NOTEBOOKLM: Importación del Servicio

export const DocumentManager = () => {
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
        handleUpload,
        handleSecureDownload
    } = useDocuments();

    // RECOMENDACIÓN NOTEBOOKLM: Extraemos el refresco para actualizar el estado global de la campana
    const { refreshNotifications } = useNotifications();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Validación previa en el cliente para ahorrar ancho de banda (Máx 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setDocumentError("El archivo excede el límite de 5MB configurado por el sistema.");
                return;
            }

            // Regla de negocio en interfaz: Comprobar que se ha seleccionado un destino antes de transmitir
            if (!selectedReceiverId) {
                setDocumentError("Por favor, selecciona un destinatario válido del directorio antes de subir el archivo.");
                return;
            }

            const success = await handleUpload(file);
            if (success && fileInputRef.current) {
                fileInputRef.current.value = ''; // Limpia el input tras la subida exitosa
            }
        }
    };

    // RECOMENDACIÓN NOTEBOOKLM: Modificada para sincronizar la lectura con el backend tras la descarga
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
                refreshNotifications();
            }
        } catch (error) {
            console.error("Error en la descarga segura o actualización:", error);
            setDocumentError("No tienes autorización legítima para procesar este documento.");
        } finally {
            setDownloadingId(null);
        }
    };
    return (
        /* ALINEACIÓN GEOMÉTRICA CONSOLIDADA: Mantiene simetría exacta con tus otras tarjetas en h-109 */
        <GenericCard className="flex flex-col h-109">
            {/* CABECERA DEL COMPONENTE */}
            <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileUp size={18} className="text-blue-600" />
                    <span>Gestión de Documentos Académicos</span>
                </h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {documentList.length}
                </span>
            </div>

            {/* BOTONERA DE PESTAÑAS (TABS) INTERACTIVAS */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-3 shrink-0">
                <GenericButton
                    type="button"
                    onClick={() => setActiveTab('RECEIVED')}
                    variant="white"
                    icon={<Inbox size={14} />}
                    label="Recibido"
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
                    label="Enviar"
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

            {/* CONTENEDOR FLEX PRINCIPAL */}
            <div className="flex-1 flex flex-col space-y-3 min-h-0">

                {/* SELECTOR DE DESTINATARIO Y ZONA DE SUBIDA MULTIPART */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                        <UserCheck size={14} className="text-slate-400 shrink-0" />
                        <select
                            value={selectedReceiverId}
                            aria-label="Seleccionar destinatario"
                            onChange={(e) => {
                                setSelectedReceiverId(e.target.value ? Number(e.target.value) : '');
                                setDocumentError('');
                            }}
                            disabled={isUploading || loadingDirectory}
                            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-60"
                        >
                            <option value="">-- Seleccionar Destinatario --</option>
                            {loadingDirectory ? (
                                <option disabled>Cargando directorio legítimo...</option>
                            ) : (
                                directory?.map((user) => (
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
                            id="doc-upload-input"
                            ref={fileInputRef}
                            hidden
                            onChange={onFileChange}
                            accept=".pdf,.docx,.txt"
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
                                    ? "Transmitiendo payload seguro..."
                                    : !selectedReceiverId
                                        ? "Elige un destinatario arriba para desbloquear"
                                        : "Seleccionar archivo (.pdf, .docx, .txt)"
                                }
                            </span>
                        </label>
                    </div>
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
                            <div
                                key={doc.documentid}
                                className="flex justify-between items-center p-2.5 bg-white border border-slate-100 hover:border-slate-200 rounded-lg shadow-sm transition-all"
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {/* DETALLE VISUAL EXTRA: Opacidad atenuada si el archivo ya fue leído */}
                                    <FileText size={16} className={`shrink-0 ${doc.isRead ? 'text-slate-300' : 'text-slate-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-bold truncate ${doc.isRead ? 'text-slate-400 font-medium' : 'text-slate-700'}`}>
                                            {doc.originalname}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">
                                            {activeTab === 'RECEIVED' ? `De: ${doc.sender.username}` : `Para: ${doc.receiver.username}`}
                                        </p>
                                    </div>
                                </div>

                                <GenericButton
                                    type="button"
                                    onClick={() => handleDownload(doc.documentid, doc.originalname)}
                                    disabled={downloadingId !== null}
                                    variant="white"
                                    icon={downloadingId === doc.documentid ? (
                                        <Loader2 size={14} className="animate-spin text-blue-600" />
                                    ) : (
                                        <Download size={14} className={doc.isRead ? 'text-slate-400' : 'text-blue-600'} />
                                    )}
                                    className="p-1.5! bg-slate-50 hover:bg-slate-100! border border-slate-200 rounded-lg! transition-colors cursor-pointer"
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </GenericCard>
    );
};
