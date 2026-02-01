import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenTool } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  label?: string;
  initialData?: string | null;
  readOnly?: boolean;
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
  const [isEmpty, setIsEmpty] = useState(!initialData);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    onClear();
  };

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      onSave(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'));
    }
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() ?? true);
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

  return (
    <div className="w-full space-y-3 print:hidden">
      <div className={cn(
        "border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200",
        isEmpty ? "border-dashed border-muted-foreground/30 hover:border-primary/40" : "border-solid border-primary/20"
      )}>
        <SignatureCanvas 
          ref={sigCanvas}
          penColor="rgb(15, 23, 42)" // slate-900
          canvasProps={{
            className: "w-full h-40 cursor-crosshair",
            style: { width: '100%', height: '160px' } 
          }}
          onEnd={handleEnd}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-serif italic flex items-center gap-2">
          <PenTool className="w-3 h-3" />
          {label}
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clear}
            disabled={isEmpty || isLoading}
            className="h-8 text-xs"
          >
            <Eraser className="w-3 h-3 mr-1" /> Clear
          </Button>
          <Button 
            size="sm" 
            onClick={save}
            disabled={isEmpty || isLoading}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? "Saving..." : "Accept & Sign"}
            {!isLoading && <Check className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
