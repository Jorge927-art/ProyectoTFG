import { useEffect, useRef, useState } from 'react';
import { Inbox, Download, Loader2, AlertCircle, FileText } from 'lucide-react';
import GenericButton from '../../../../components/ui/genericButton/GenericButton';
import {
    downloadDocumentSecure,
    getUserDocuments,
    markDocumentAsRead,
    type DocumentMetadata,
} from '../../../../services/documentService';
import { useNotifications } from '../../../../components/ui/globalNotificationBell/useNotifications';

interface AdminDocumentInboxProps {
    autoFocusUnread?: boolean;
}

export const AdminDocumentInbox = ({ autoFocusUnread = false }: AdminDocumentInboxProps) => {
    const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [highlightedDocumentId, setHighlightedDocumentId] = useState<number | null>(null);
    const loadedRef = useRef(false);
    const highlightTimeoutRef = useRef<number | null>(null);
    const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const { refreshNotifications } = useNotifications();

    const loadInbox = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getUserDocuments();
            setDocuments(Array.isArray(data) ? data : []);
        } catch {
            setDocuments([]);
            setError('No se pudo cargar la bandeja de documentos del administrador.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (loadedRef.current) {
            return;
        }
        loadedRef.current = true;
        void loadInbox();
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
                refreshNotifications();
            }
        } catch {
            setError('No se pudo descargar o marcar el documento como leído.');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-6 w-full h-full">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Inbox size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Bandeja de Documentos</h3>
                        <p className="text-xs text-slate-500">Documentos recibidos por la cuenta administradora</p>
                    </div>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {documents.length}
                </span>
            </div>

            {error && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2">
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
                                : 'border-slate-100'
                                }`}
                        >
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{doc.originalname}</p>
                                <p className="text-[11px] text-slate-500 truncate">
                                    De: {doc.sender.username}
                                </p>
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
    );
};

export default AdminDocumentInbox;
