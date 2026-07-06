import React, { useRef } from 'react';
import { Upload, FileText, Download, Loader2, AlertCircle, FileUp } from 'lucide-react';
import GenericCard from '../../../../components/ui/genericCard/GenericCard';
import { useDocuments } from './useDocuments';

export const DocumentManager = () => {
    const {
        documentList,
        loadingDocuments,
        isUploading,
        documentError,
        setDocumentError,
        handleUpload
    } = useDocuments();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Validación previa en el cliente para ahorrar ancho de banda (Máx 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setDocumentError("El archivo excede el límite de 5MB configurado por el sistema.");
                return;
            }

            const success = await handleUpload(file);
            if (success && fileInputRef.current) {
                fileInputRef.current.value = ''; // Limpia el input tras la subida exitosa
            }
        }
    };

    const handleDownload = (filename: string) => {
        // Concatenamos la ruta base de descargas apuntando al almacenamiento estático del backend
        const fileUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/uploads/${filename}`;
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        /* ALINEACIÓN GEOMÉTRICA CONSOLIDADA: Mantiene simetría con tus otras tarjetas */
        <GenericCard className="flex flex-col h-109">
            {/* CABECERA DEL COMPONENTE */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileUp size={18} className="text-blue-600" />
                    <span>Gestión de Documentos Académicos</span>
                </h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {documentList.length}
                </span>
            </div>

            {/* ALERT BOX CONTROLADO DE ERRORES DEL BACKEND */}
            {documentError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 shrink-0">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="truncate">{documentError}</p>
                </div>
            )}

            {/* CONTENEDOR FLEX PRINCIPAL */}
            <div className="flex-1 flex flex-col space-y-4 min-h-0">

                {/* ZONA DE ARRASTRE Y SUBIDA MULTIPART */}
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center transition-all bg-white shrink-0 group">
                    <input
                        type="file"
                        id="doc-upload-input"
                        ref={fileInputRef}
                        hidden
                        onChange={onFileChange}
                        accept=".pdf,.docx,.txt"
                        disabled={isUploading}
                    />
                    <label
                        htmlFor="doc-upload-input"
                        className={`flex flex-col items-center gap-2 ${isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                        {isUploading ? (
                            <Loader2 className="text-blue-500 animate-spin" size={24} />
                        ) : (
                            <Upload className="text-slate-400 group-hover:text-blue-500 transition-colors" size={24} />
                        )}
                        <span className="text-xs font-bold text-slate-600">
                            {isUploading ? "Transmitiendo payload seguro..." : "Seleccionar archivo (.pdf, .docx, .txt)"}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">Tamaño máximo admitido por petición: 5MB</p>
                    </label>
                </div>

                {/* ZONA DE LISTADO CON SCROLL GEOMÉTRICO CONTROLADO [ADR-19] */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 min-h-[140px]">
                    {loadingDocuments ? (
                        <div className="h-full flex flex-col justify-center items-center bg-white border border-slate-100 rounded-xl text-slate-400 p-4">
                            <Loader2 size={20} className="animate-spin mb-2 text-blue-600" />
                            <p className="text-[11px] font-medium text-slate-500">Sincronizando metadatos con PostgreSQL...</p>
                        </div>
                    ) : documentList.length === 0 ? (
                        <div className="p-6 bg-white/80 border border-slate-100 rounded-xl text-center flex flex-col justify-center h-full">
                            <p className="text-xs font-medium text-slate-400 italic">No has subido ni recibido ningún documento.</p>
                        </div>
                    ) : (
                        documentList.map((doc) => (
                            <div
                                key={doc.documentid}
                                className="flex justify-between items-center p-2.5 bg-white border border-slate-100 hover:border-slate-200 rounded-lg shadow-sm transition-all"
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <FileText size={16} className="text-slate-400 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-700 truncate" title={doc.originalname}>
                                            {doc.originalname}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            Subido el: {new Date(doc.upload_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDownload(doc.filename)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer ml-2 shrink-0"
                                    title="Descargar documento"
                                >
                                    <Download size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </GenericCard>
    );
};
