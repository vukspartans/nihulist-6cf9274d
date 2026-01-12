import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Paperclip, Loader2 } from "lucide-react";

interface FileItem {
  id?: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  storagePath?: string;
}

interface NegotiationFilesListProps {
  negotiationFiles: FileItem[];
  projectFiles: FileItem[];
  loadingFiles: boolean;
  onViewFile: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
}

const FileRow = memo(({ 
  file, 
  idx, 
  variant,
  onView, 
  onDownload 
}: { 
  file: FileItem; 
  idx: number; 
  variant: "negotiation" | "project";
  onView: () => void; 
  onDownload: () => void;
}) => {
  const isNegotiation = variant === "negotiation";
  
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isNegotiation 
          ? "bg-white border border-amber-200" 
          : "bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className={`h-4 w-4 flex-shrink-0 ${isNegotiation ? "text-amber-600" : "text-muted-foreground"}`} />
        <span className="text-sm font-medium truncate">{file.name}</span>
        {file.size && file.size > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
            ({(file.size / 1024).toFixed(1)} KB)
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isNegotiation ? "text-amber-700 hover:bg-amber-100" : ""}`}
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isNegotiation ? "text-amber-700 hover:bg-amber-100" : ""}`}
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

FileRow.displayName = "FileRow";

export const NegotiationFilesList = memo(({
  negotiationFiles,
  projectFiles,
  loadingFiles,
  onViewFile,
  onDownloadFile,
}: NegotiationFilesListProps) => {
  const hasNoFiles = negotiationFiles.length === 0 && projectFiles.length === 0 && !loadingFiles;

  return (
    <div className="space-y-4">
      {/* Negotiation Files */}
      {negotiationFiles.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Paperclip className="h-5 w-5" />
              קבצים שצורפו לבקשה ({negotiationFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {negotiationFiles.map((file, idx) => (
                <FileRow
                  key={file.id || idx}
                  file={file}
                  idx={idx}
                  variant="negotiation"
                  onView={() => onViewFile(file)}
                  onDownload={() => onDownloadFile(file)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Files */}
      {(projectFiles.length > 0 || loadingFiles) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              קבצי הפרויקט ({projectFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFiles ? (
              <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען קבצים...
              </div>
            ) : (
              <div className="space-y-2">
                {projectFiles.map((file, idx) => (
                  <FileRow
                    key={idx}
                    file={file}
                    idx={idx}
                    variant="project"
                    onView={() => onViewFile(file)}
                    onDownload={() => onDownloadFile(file)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {hasNoFiles && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>לא צורפו קבצים לבקשה זו</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

NegotiationFilesList.displayName = "NegotiationFilesList";
