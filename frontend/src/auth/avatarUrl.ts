export const resolveAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return undefined;

    if (/^https?:\/\//i.test(avatarPath)) {
        return avatarPath;
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const normalizedPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;

    if (normalizedPath.startsWith('/uploads/')) {
        return `${apiBaseUrl}${normalizedPath}`;
    }

    return `${apiBaseUrl}/uploads${normalizedPath}`;
};