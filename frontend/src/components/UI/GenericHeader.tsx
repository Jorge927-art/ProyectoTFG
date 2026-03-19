
interface GenericHeaderProps{
    title: string;
    subtitle?: string;
    imageSrc: string;
    imageAlt: string;
}

const GenericHeader = ({title,subtitle,imageSrc,imageAlt}:GenericHeaderProps) => {
    return(
        <header className="w-full bg-white dark:bg-gray-900 py-12 px-6 md:py-24">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="flex-1 text-center md:text-left space-y-6">
                         <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
                            {title}
                         </h1>
                         {subtitle && (
                             <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
                                {subtitle}
                             </p>
                         )}
                    </div>
                    <div className="flex-1 w-full max-w-lg">
                        <img
                            src={imageSrc}
                            alt={imageAlt}
                            className="w-full h-auto rounded-2xl shadow-2xl object-cover transform hover:scale-105 transition-transform duration-500"
                        />
                    </div>
            </div>
        </header>
    )

}
export default GenericHeader;