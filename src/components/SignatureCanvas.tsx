import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Upload, X, Stamp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureCanvasProps {
  onSign: (signatureData: SignatureData) => void;
  required?: boolean;
  className?: string;
  compact?: boolean;
}

export interface SignatureData {
  png: string; // base64
  vector: Array<{ x: number; y: number }[]>; // stroke paths
  timestamp: string;
  stampImage?: string; // optional company stamp base64
}

export function SignatureCanvas({ onSign, required = false, className = '', compact = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number }[]>>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [hasSigned, setHasSigned] = useState(false);
  const [stampImage, setStampImage] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Drawing settings
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getCoordinates(e);
    setCurrentStroke([point]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const point = getCoordinates(e);
    setCurrentStroke(prev => [...prev, point]);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke]);
      setHasSigned(true);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    setCurrentStroke([]);
    setHasSigned(false);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setStampImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeStamp = () => {
    setStampImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;

    const png = canvas.toDataURL('image/png');
    const signatureData: SignatureData = {
      png,
      vector: strokes,
      timestamp: new Date().toISOString(),
      stampImage: stampImage || undefined,
    };

    onSign(signatureData);
  };


  // Redraw all strokes when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
  }, [strokes]);

  return (
    <Card className={cn(className)}>
      <CardHeader className={cn(compact ? "p-3 sm:p-4 pb-1 sm:pb-2" : "p-4 sm:p-6")} dir="rtl">
        <CardTitle className={cn("flex items-center justify-between", compact ? "text-sm sm:text-base" : "text-base sm:text-lg")}>
          <span>חתימה דיגיטלית</span>
          {required && <span className={cn("text-destructive", compact ? "text-xs" : "text-xs sm:text-sm")}>*נדרש</span>}
        </CardTitle>
        <CardDescription className={cn(compact ? "text-xs" : "text-xs sm:text-sm")}>
          חתמו במרחב הלבן באמצעות העכבר או המגע
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-3 sm:space-y-4", compact ? "p-3 sm:p-4 pt-0" : "p-4 sm:p-6 pt-0")}>
        <div className="relative border-2 border-dashed border-muted rounded-lg bg-background">
          <canvas
            ref={canvasRef}
            className={cn("w-full cursor-crosshair touch-none", compact ? "h-24 sm:h-32" : "h-32 sm:h-40")}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSigned && (
            <div className={cn("absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground", compact ? "text-sm" : "text-sm sm:text-base")}>
              חתמו כאן
            </div>
          )}
        </div>

        {/* Company Stamp Upload Section */}
        <div className={cn("border rounded-lg bg-muted/30", compact ? "p-2 sm:p-3" : "p-3")} dir="rtl">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Stamp className={cn("text-muted-foreground", compact ? "h-3 w-3 sm:h-4 sm:w-4" : "h-4 w-4")} />
              <span className={cn("font-medium", compact ? "text-xs sm:text-sm" : "text-sm")}>חותמת חברה (אופציונלי)</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleStampUpload}
              className="hidden"
            />
            {!stampImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(compact && "h-7 text-xs px-2 sm:h-8 sm:text-sm sm:px-3")}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={cn(compact ? "h-3 w-3 me-1" : "h-3 w-3 me-1")} />
                העלאה
              </Button>
            )}
          </div>
          
          {stampImage && (
            <div className={cn("flex items-center gap-2 sm:gap-3 bg-background rounded border", compact ? "p-1.5 sm:p-2" : "p-2")}>
              <img 
                src={stampImage} 
                alt="חותמת חברה" 
                className={cn("w-auto object-contain", compact ? "h-10 sm:h-14" : "h-16")}
              />
              <div className={cn("flex-1 text-muted-foreground", compact ? "text-xs sm:text-sm" : "text-sm")}>
                חותמת הועלתה בהצלחה
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(compact && "h-7 w-7 p-0 sm:h-8 sm:w-8")}
                onClick={removeStamp}
              >
                <X className={cn(compact ? "h-3 w-3 sm:h-4 sm:w-4" : "h-4 w-4")} />
              </Button>
            </div>
          )}
          
          {!stampImage && (
            <p className={cn("text-muted-foreground", compact ? "text-[10px] sm:text-xs" : "text-xs")}>
              ניתן להעלות קובץ PNG או JPG (עד 2MB)
            </p>
          )}
        </div>

        <div className="flex gap-2" dir="rtl">
          <Button
            onClick={save}
            disabled={!hasSigned}
            className={cn("flex-1", compact && "h-8 sm:h-9 text-xs sm:text-sm")}
          >
            שמור חתימה
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={!hasSigned}
            className={cn("flex-1", compact && "h-8 sm:h-9 text-xs sm:text-sm")}
          >
            <RotateCcw className={cn("me-1.5 sm:me-2", compact ? "h-3 w-3 sm:h-4 sm:w-4" : "h-4 w-4")} />
            נקה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
