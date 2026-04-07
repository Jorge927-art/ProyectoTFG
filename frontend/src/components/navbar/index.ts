/**
 * Barrel export para componentes de navegación.
 * 
 * PATRÓN: Centraliza las exportaciones de la carpeta /navbar para simplificar imports
 * en componentes consumidores.
 * 
 * VENTAJAS:
 * - Imports más limpios: `import { Navbar, NavbarUser } from '@/components/navbar'`
 *   en lugar de: `import Navbar from '@/components/navbar/Navbar'`
 * - Cambios de estructura: mover archivos sin romper imports de consumidores
 * - Control de API: decidir qué se exporta públicamente vs privado
 * 
 * COMPONENTES EXPORTADOS:
 * 1. Navbar - Barra de navegación para usuarios sin autenticar
 * 2. NavbarUser - Barra de navegación para usuarios autenticados
 * 3. MainNavbar - Componente orquestador que elige Navbar o NavbarUser según sesión
 */

/** Navbar para usuarios sin autenticar (login/registro). */
export { default as Navbar } from './Navbar';

/** Navbar para usuarios autenticados (perfil/logout). */
export { default as NavbarUser } from './NavbarUser';

/** Componente que elige entre Navbar o NavbarUser según estado de sesión. */
export { default as MainNavbar } from './MainNavbar';
