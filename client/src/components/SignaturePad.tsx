import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenTool, Upload, Image } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  label?: string;
  initialData?: string | null;
  readOnly?: boolean;
}

// Compress/resize image to reduce payload size
function compressImage(dataUrl: string, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down if needed
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Convert to JPEG for smaller file size
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export function SignaturePad({
  onSave,
  onClear,
  isLoading,
  label = "Sign above",
  initialData,
  readOnly = false
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEmpty, setIsEmpty] = useState(!initialData);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [isCompressing, setIsCompressing] = useState(false);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setUploadedImage(null);
    setMode('draw');
    onClear();
  };

  const save = async () => {
    if (uploadedImage) {
      // Compress before saving
      setIsCompressing(true);
      try {
        const compressed = await compressImage(uploadedImage, 600, 0.7);
        onSave(compressed);
      } finally {
        setIsCompressing(false);
      }
      return;
    }
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const canvas = sigCanvas.current.getCanvas();
      // For drawn signatures, use PNG but 50% smaller
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width / 2;
      tempCanvas.height = canvas.height / 2;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      }
      onSave(tempCanvas.toDataURL('image/png'));
    }
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        // Compress immediately on upload for preview
        setIsCompressing(true);
        try {
          const compressed = await compressImage(result, 800, 0.8);
          setUploadedImage(compressed);
          setIsEmpty(false);
          setMode('upload');
        } finally {
          setIsCompressing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (readOnly && initialData) {
    return (
      <div className="w-full space-y-2">
        <div className="border-b-2 border-primary/20 pb-4">
          <img src={initialData} alt="Signature" className="h-24 object-contain" />
        </div>
        <p className="text-sm text-muted-foreground font-serif italic">{label}</p>
      </div>
    );
  }

  if (readOnly && !initialData) {
    return (
      <div className="w-full space-y-2 opacity-50">
        <div className="border-b-2 border-dashed border-primary/20 h-24 flex items-center justify-center bg-muted/20">
          <span className="text-muted-foreground text-sm">Pending Signature</span>
        </div>
        <p className="text-sm text-muted-foreground font-serif italic">{label}</p>
      </div>
    );
  }

  const isBusy = isLoading || isCompressing;

  return (
    <div className="w-full space-y-3 print:hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className={cn(
        "border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 relative",
        isEmpty ? "border-dashed border-muted-foreground/30 hover:border-primary/40" : "border-solid border-primary/20"
      )}>
        {isCompressing && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <span className="text-sm text-muted-foreground">Compressing...</span>
          </div>
        )}
        {mode === 'upload' && uploadedImage ? (
          <div className="w-full h-40 flex items-center justify-center bg-gray-50">
            <img
              src={uploadedImage}
              alt="Uploaded signature"
              className="max-h-36 max-w-full object-contain"
            />
          </div>
        ) : (
          <SignatureCanvas
            ref={sigCanvas}
            penColor="rgb(15, 23, 42)"
            canvasProps={{
              className: "w-full h-40 cursor-crosshair",
              style: { width: '100%', height: '160px' }
            }}
            onEnd={handleEnd}
          />
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground font-serif italic flex items-center gap-2">
          {mode === 'upload' ? <Image className="w-3 h-3" /> : <PenTool className="w-3 h-3" />}
          {label}
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={isBusy}
            className="h-8 text-xs"
          >
            <Upload className="w-3 h-3 mr-1" /> Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={isEmpty || isBusy}
            className="h-8 text-xs"
          >
            <Eraser className="w-3 h-3 mr-1" /> Clear
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={isEmpty || isBusy}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isBusy ? "Processing..." : "Accept & Sign"}
            {!isBusy && <Check className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
