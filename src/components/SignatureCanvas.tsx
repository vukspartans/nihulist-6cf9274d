import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Download } from 'lucide-react';

interface SignatureCanvasProps {
  onSign: (signatureData: SignatureData) => void;
  required?: boolean;
  className?: string;
}

export interface SignatureData {
  png: string; // base64
  vector: Array<{ x: number; y: number }[]>; // stroke paths
  timestamp: string;
}

export function SignatureCanvas({ onSign, required = false, className = '' }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number }[]>>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [hasSigned, setHasSigned] = useState(false);

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

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;

    const png = canvas.toDataURL('image/png');
    const signatureData: SignatureData = {
      png,
      vector: strokes,
      timestamp: new Date().toISOString(),
    };

    onSign(signatureData);
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) return;

    const link = document.createElement('a');
    link.download = `signature-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>חתימה דיגיטלית</span>
          {required && <span className="text-sm text-destructive">*נדרש</span>}
        </CardTitle>
        <CardDescription>
          חתמו במרחב הלבן באמצעות העכבר או המגע
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative border-2 border-dashed border-muted rounded-lg bg-background">
          <canvas
            ref={canvasRef}
            className="w-full h-40 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSigned && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
              חתמו כאן
            </div>
          )}
        </div>

        <div className="flex gap-2" dir="rtl">
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={!hasSigned}
            className="flex-1"
          >
            <RotateCcw className="ml-2 h-4 w-4" />
            נקה
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSignature}
            disabled={!hasSigned}
            className="flex-1"
          >
            <Download className="ml-2 h-4 w-4" />
            הורד
          </Button>
          <Button
            onClick={save}
            disabled={!hasSigned}
            className="flex-1"
          >
            שמור חתימה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
