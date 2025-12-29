import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { getFileCategory, safeOpenFile } from "@/utils/safeFileOpen";

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  open,
  onOpenChange,
  fileUrl,
  fileName,
}) => {
  if (!fileUrl) return null;

  const fileCategory = getFileCategory(fileName);

  const handleDownload = () => {
    safeOpenFile(fileUrl, fileName);
  };

  const handleOpenInNewTab = () => {
    safeOpenFile(fileUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base truncate flex-1">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{fileName}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              הורדה
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              פתח בחלון חדש
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 min-h-[400px] bg-muted/30">
          {fileCategory === 'image' && (
            <div className="flex items-center justify-center h-full">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}

          {fileCategory === 'pdf' && (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[70vh] rounded-lg border"
            />
          )}

          {fileCategory === 'other' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <FileText className="h-16 w-16" />
              <p className="text-lg font-medium">לא ניתן להציג תצוגה מקדימה לקובץ זה</p>
              <p className="text-sm">לחצו על "הורדה" לצפייה בקובץ</p>
              <Button onClick={handleDownload} className="gap-2 mt-2">
                <Download className="h-4 w-4" />
                הורד קובץ
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
