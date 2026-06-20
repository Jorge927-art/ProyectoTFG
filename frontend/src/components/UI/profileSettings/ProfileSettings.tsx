import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Upload, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GenericCard from '../genericCard/GenericCard';
import { getProfile, updateProfileData, uploadAvatarFile } from '../../../services/profileService';
import type { ProfileData } from '../../../services/profileService';

export default function ProfileSettings() {
    const navigate = useNavigate();

    // BANDERAS DE ENTRADA AL COMPONENTE REUTILIZABLE
    console.log("[F1_PROFILE_COMP]: El componente ProfileSettings se está intentando montar en pantalla.");

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [formData, setFormData] = useState({ email: '', phoneNumber: '', homeAddress: '' });
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingText, setUpdatingText] = useState<boolean>(false);
    const [updatingAvatar, setUpdatingAvatar] = useState<boolean>(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // BANDERAS DE TRAZA ARRIBA (Seguras y validadas por TypeScript)
    console.log("[F1_PROFILE_COMP]: Intentando montar. Estado loading ->", loading);
    console.log("[F2_PROFILE_COMP]: Datos cargados actualmente ->", profile?.username || "Ninguno (Cargando...)");

    useEffect(() => {
        const loadProfileData = async () => {
            try {
                const data = await getProfile();
                setProfile(data);
                setFormData({
                    email: data.email || '',
                    phoneNumber: data.phoneNumber || '',
                    homeAddress: data.homeAddress || ''
                });
            } catch (error) {
                console.error('Error al cargar el perfil:', error);
                setMessage({ text: 'No se pudieron cargar los datos del perfil', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        loadProfileData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitText = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingText(true);
        setMessage(null);
        try {
            await updateProfileData(formData);
            setMessage({ text: 'Datos de perfil actualizados correctamente', type: 'success' });
            if (profile) {
                setProfile({ ...profile, ...formData });
            }
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Error al actualizar los datos', type: 'error' });
        } finally {
            setUpdatingText(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUpdatingAvatar(true);
        setMessage(null);
        try {
            const response = await uploadAvatarFile(file);
            setMessage({ text: 'Foto de perfil actualizada correctamente', type: 'success' });
            if (profile) {
                setProfile({ ...profile, avatarPath: response.path });
            }
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Error al subir la imagen', type: 'error' });
        } finally {
            setUpdatingAvatar(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-500 font-medium">Cargando configuración de perfil...</div>;
    }

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const avatarUrl = profile?.avatarPath
        ? `${BACKEND_URL}/uploads/${profile.avatarPath}`
        : `data:image/svg+xml;utf8,<svg xmlns="http://w3.org" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <User size={22} className="text-blue-600" />
                        <span>Configuración de mi Perfil</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Amplía tus datos de contacto y gestiona tu imagen de usuario</p>
                </div>

                <button
                    onClick={() => {
                        if (profile?.role === 'ADMIN') navigate('/admin');
                        else if (profile?.role === 'PROFESSOR') navigate('/professor');
                        else navigate('/student');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm self-start sm:self-center cursor-pointer border border-transparent"
                >
                    <ArrowLeft size={14} />
                    <span>Volver al Panel</span>
                </button>




            </header>

            {message && (
                <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 border ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    : 'bg-rose-50 text-rose-800 border-rose-100'
                    }`}>
                    {message.type === 'success' && <CheckCircle size={16} />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <GenericCard>
                        <div className="p-5 flex flex-col items-center text-center space-y-4">
                            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50">
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                {updatingAvatar && (
                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                        <RefreshCw size={20} className="text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">{profile?.username}</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wide inline-block mt-1">
                                    {profile?.role}
                                </span>
                            </div>
                            <label className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                                <Upload size={14} />
                                <span>{updatingAvatar ? 'Subiendo...' : 'Cambiar Foto'}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={updatingAvatar} />
                            </label>
                        </div>
                    </GenericCard>
                </div>

                <div className="md:col-span-2">
                    <GenericCard>
                        <form onSubmit={handleSubmitText} className="p-5 space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Datos Personales y de Contacto</h3>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600">Correo Electrónico</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-blue-600 text-slate-700 bg-slate-50/50" placeholder="tu-correo@ejemplo.com" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                        <Phone size={12} className="text-slate-400" />
                                        <span>Teléfono</span>
                                    </label>
                                    <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-blue-600 text-slate-700" placeholder="Ej: +34 600 000 000" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                        <MapPin size={12} className="text-slate-400" />
                                        <span>Dirección</span>
                                    </label>
                                    <input type="text" name="homeAddress" value={formData.homeAddress} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-blue-600 text-slate-700" placeholder="Ej: Calle Mayor 12, Madrid" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={updatingText}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    {updatingText ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <span>Guardar Cambios</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </GenericCard>
                </div>
            </div>
        </div>
    );
}
