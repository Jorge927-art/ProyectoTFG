export const NO_SUBTITLES_TEXT = 'Sin subtítulos';

export const getSubtitleLanguagesDisplay = (value: string | null | undefined): string => {
    const normalized = value?.trim();
    return normalized ? normalized : NO_SUBTITLES_TEXT;
};
