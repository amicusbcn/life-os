import { FileText } from "lucide-react";

export function TimelineAttachments({ files }: { files: string[] }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {files.map((url, i) => {
        const isPDF = url.toLowerCase().endsWith('.pdf');
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group h-16 w-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all bg-white"
          >
            {isPDF ? (
              <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-600">
                <FileText size={18} />
                <span className="text-[8px] font-black mt-1 uppercase">PDF</span>
              </div>
            ) : (
              <img src={url} className="object-cover h-full w-full" alt="Adjunto" />
            )}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
}