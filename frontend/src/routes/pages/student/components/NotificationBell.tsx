import { useState, useRef, useEffect } from 'react';
import { Bell, FileText, TrendingUp } from 'lucide-react';
import { useNotifications } from './useNotifications';
import GenericButton from '../../../../components/ui/genericButton/GenericButton'; // Asegura la ruta a tu botón core

export default function NotificationBell() {
    const { alerts, hasAlerts } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar el panel flotante si el usuario hace clic fuera de él
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botón de la Campana usando el componente core variant="search" para que sea circular */}
            <GenericButton
                variant="search"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5! transition-all ${hasAlerts
                        ? 'bg-red-50! border-red-200! hover:bg-red-100!'
                        : 'bg-white hover:bg-slate-100'
                    }`}
                icon={
                    <Bell
                        size={20}
                        className={hasAlerts ? 'text-red-500 animate-pulse' : 'text-slate-500'}
                    />
                }
                ariaLabel="Campana de notificaciones"
            />

            {/* Punto rojo flotante indicador sobre la campana si hay alertas activas */}
            {hasAlerts && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
            )}

            {/* DESPLEGABLE DE NOTIFICACIONES */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Encabezado */}
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Avisos del Sistema</span>
                        {hasAlerts && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                                {alerts.length} nuevos
                            </span>
                        )}
                    </div>

                    {/* Cuerpo de Alertas */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                        {!hasAlerts ? (
                            <div className="p-6 text-center space-y-1">
                                <p className="text-xs font-semibold text-slate-700">Tu bandeja está limpia</p>
                                <p className="text-[11px] text-slate-400">No tienes avisos pendientes por el momento.</p>
                            </div>
                        ) : (
                            alerts.map((alert, index) => {
                                // Seleccionamos el icono temático limpio según el tipo de aviso
                                const isDoc = alert.type === 'DOCUMENT_INBOX';
                                const iconColor = isDoc ? 'text-blue-500 bg-blue-50' : 'text-emerald-500 bg-emerald-50';
                                const IconComponent = isDoc ? FileText : TrendingUp;

                                return (
                                    <div
                                        key={index}
                                        className="p-3 hover:bg-slate-50/80 transition-colors flex gap-3 items-start"
                                    >
                                        <div className={`p-2 rounded-xl shrink-0 ${iconColor}`}>
                                            <IconComponent size={16} />
                                        </div>
                                        <div className="space-y-0.5 flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{alert.title}</p>
                                            <p className="text-[11px] text-slate-500 leading-normal">{alert.message}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
