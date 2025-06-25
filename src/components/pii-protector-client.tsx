"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { detectPii, type DetectPiiOutput } from '@/ai/flows/detect-pii-flow';
import { generatePiiSchema } from '@/ai/flows/generate-pii-schema-flow';
import { explainPiiDetection } from '@/ai/flows/explain-pii-detection-flow';
import { extractPdfFields } from '@/ai/flows/extract-pdf-fields-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileUp, ShieldCheck, FileText, Download, Loader2, UploadCloud, FileJson, FileType } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getPiiStyle, getPiiBadgeStyle } from '@/lib/pii-colors';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import PII_TYPES from '@/config/pii-attributes.json';

type PiiEntity = DetectPiiOutput['piiEntities'][0];

const PiiExplanation = ({ text }: { text: string }) => {
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchExplanation = async () => {
      setIsLoading(true);
      try {
        const result = await explainPiiDetection({ text });
        setExplanation(result.explanation);
      } catch (e) {
        setExplanation('Could not get explanation for this item.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchExplanation();
  }, [text]);

  if (isLoading) {
    return <div className="p-2"><Skeleton className="h-4 w-32" /></div>;
  }
  return <p className="p-2 text-sm max-w-xs">{explanation}</p>;
};

const HighlightedTextViewer = ({ text, entities }: { text: string, entities: PiiEntity[] }) => {
  const parts = useMemo(() => {
    if (!entities?.length) return [<pre className="text-sm whitespace-pre-wrap break-words font-mono">{text}</pre>];

    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);
    const result: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    sortedEntities.forEach((entity, index) => {
      if (entity.start < lastIndex || entity.end > text.length || entity.start >= entity.end) {
        return; 
      }
      
      if (entity.start > lastIndex) {
        result.push(text.substring(lastIndex, entity.start));
      }
      result.push(
        <TooltipProvider key={`${entity.start}-${index}`} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("rounded-sm px-1 py-0.5", getPiiStyle(entity.type))}>
                {text.substring(entity.start, entity.end)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="bg-black text-white rounded-md">
              <PiiExplanation text={entity.value} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      lastIndex = entity.end;
    });

    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }

    return result.map((part, i) => <span key={i}>{part}</span>);
  }, [text, entities]);

  return (
    <pre suppressHydrationWarning className="text-sm whitespace-pre-wrap break-words font-mono bg-secondary/80 p-4 rounded-lg">
      {parts}
    </pre>
  );
};


export function PiiProtectorClient() {
  const [rawData, setRawData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [piiResults, setPiiResults] = useState<DetectPiiOutput | null>(null);
  const [jsonSchema, setJsonSchema] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedPiiTypes, setSelectedPiiTypes] = useState<string[]>(PII_TYPES);
  const [isDragging, setIsDragging] = useState(false);

  const { toast } = useToast();

  const handlePiiTypeChange = (type: string, checked: boolean) => {
    setSelectedPiiTypes(prev =>
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };
  
  const resetState = () => {
    setError('');
    setRawData('');
    setPiiResults(null);
    setJsonSchema('');
    setFileName('');
  }

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size exceeds 5MB. Please upload a smaller file.');
        return;
    }

    resetState();
    setFileName(file.name);
    
    if (file.type === 'application/pdf') {
        setIsProcessingPdf(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const pdfDataUri = e.target?.result as string;
            const result = await extractPdfFields({ pdfDataUri });
            const parsedJson = JSON.parse(result.jsonData);
            const formattedJson = JSON.stringify(parsedJson, null, 2);
            setRawData(formattedJson);
          } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to extract data from PDF. ${errorMessage}`);
            toast({
              variant: "destructive",
              title: "PDF Processing Failed",
              description: errorMessage,
            });
          } finally {
            setIsProcessingPdf(false);
          }
        };
        reader.onerror = () => {
          setError('Failed to read the file.');
          setIsProcessingPdf(false);
        };
        reader.readAsDataURL(file);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setRawData(text);
        };
        reader.onerror = () => {
          setError('Failed to read the file.');
        };
        reader.readAsText(file);
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  const handleDragEvents = (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "dragenter" || event.type === "dragover") {
          setIsDragging(true);
      } else if (event.type === "dragleave") {
          setIsDragging(false);
      }
  };

  const handleScan = async () => {
    if (!rawData) {
      setError('No data to scan. Please upload a file or paste data.');
      return;
    }
    if (selectedPiiTypes.length === 0) {
      setError('Please select at least one PII attribute to scan for.');
      return;
    }
    setIsLoading(true);
    setError('');
    setPiiResults(null);
    setJsonSchema('');

    try {
      const [piiDetectionResult, schemaGenerationResult] = await Promise.all([
        detectPii({ data: rawData, piiTypesToScan: selectedPiiTypes }),
        generatePiiSchema({ data: rawData }),
      ]);
      
      setPiiResults(piiDetectionResult);

      try {
        const parsedSchema = JSON.parse(schemaGenerationResult.schema);
        setJsonSchema(JSON.stringify(parsedSchema, null, 2));
      } catch {
        setJsonSchema(schemaGenerationResult.schema);
      }

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to process data. ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false);
    }
  };

  const piiSummaryCounts = useMemo(() => {
    if (!piiResults) return {};
    return piiResults.piiEntities.reduce((acc, entity) => {
      const key = entity.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [piiResults]);
  
  const downloadJsonSchema = () => {
    const blob = new Blob([jsonSchema], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0] || 'schema'}_pii_schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isLoadingState = isLoading || isProcessingPdf;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold tracking-tight">PII Protector</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="text-gray-500 hover:text-black transition-colors">Overview</a>
            <a href="#" className="text-black font-semibold">Scan</a>
            <a href="#" className="text-gray-500 hover:text-black transition-colors">API</a>
            <a href="#" className="text-gray-500 hover:text-black transition-colors">Help</a>
          </nav>
          <div>
            <Button variant="outline" size="sm">Get Started</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="text-center py-8 md:py-16">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Find and Protect Sensitive Data.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Upload any file, and our AI will instantly scan for Personally Identifiable Information, helping you stay secure and compliant.
          </p>
        </div>

        <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-600/10 border-t-4 border-blue-500">
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left side - Upload and Configure */}
            <div className="flex flex-col gap-6">
              <div>
                <Label htmlFor="file-upload" className="text-lg font-semibold">1. Upload Data</Label>
                <p className="text-sm text-muted-foreground mb-3">Drag & drop a file, or click to browse. Max 5MB.</p>
                <label
                  htmlFor="file-upload"
                  className={cn(
                    "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-accent transition-colors",
                    isDragging && "border-blue-500 bg-blue-50"
                  )}
                  onDragEnter={handleDragEvents}
                  onDragOver={handleDragEvents}
                  onDragLeave={handleDragEvents}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">.txt, .csv, .json, or .pdf</p>
                  </div>
                  <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.csv,.json,.pdf" disabled={isLoadingState} />
                </label>
              </div>

              {fileName && !isLoadingState && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary border">
                  <FileType className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
                  <button onClick={resetState} className="ml-auto text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold">2. Choose PII Attributes</h3>
                <p className="text-sm text-muted-foreground mb-3">Select which types of data to scan for.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  {PII_TYPES.map(type => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={`pii-${type}`}
                        checked={selectedPiiTypes.includes(type)}
                        onCheckedChange={(checked) => handlePiiTypeChange(type, !!checked)}
                        disabled={isLoadingState}
                      />
                      <Label htmlFor={`pii-${type}`} className="text-sm font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button size="lg" onClick={handleScan} disabled={!rawData || isLoadingState} className="w-full text-base font-bold">
                {isLoadingState ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
                {isLoading ? 'Scanning...' : isProcessingPdf ? 'Processing PDF...' : 'Scan Data Now'}
              </Button>
            </div>
            
            {/* Right side - Display Data */}
            <div className="flex flex-col">
              <Label className="text-lg font-semibold">Raw Data Preview</Label>
              <p className="text-sm text-muted-foreground mb-3">The content of your uploaded file is shown here.</p>
              <div className="flex-grow rounded-lg border bg-secondary/80 relative min-h-[300px]">
                <Textarea
                  suppressHydrationWarning
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder="Your data will appear here..."
                  className="w-full h-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4 font-mono text-xs"
                  disabled={isLoadingState}
                />
                 {(isLoadingState || !rawData) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-4 pointer-events-none rounded-lg bg-secondary/80">
                    {isProcessingPdf ? (
                      <>
                        <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
                        <h3 className="font-semibold text-base">Extracting Data from PDF...</h3>
                      </>
                    ) : !rawData ? (
                      <>
                        <FileText className="w-10 h-10 mb-3" />
                        <h3 className="font-semibold text-base">Upload a File to Begin</h3>
                        <p className="text-sm">Your data will be displayed here for review.</p>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Results Section */}
          {(piiResults || isLoading) && <Separator />}
          
          <div className="p-6 md:p-8">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Scanning...</h2>
                <Skeleton className="h-8 w-2/3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-48 w-full" />
              </div>
            ) : piiResults ? (
              <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Scan Results</h2>
                    <p className="text-muted-foreground">PII detected in your data. Hover over highlights for details.</p>
                </div>
                
                {Object.keys(piiSummaryCounts).length > 0 ? (
                  <div>
                    <h3 className="font-semibold mb-3">Summary</h3>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(piiSummaryCounts).map(([type, count]) => (
                        <div key={type} className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-sm", getPiiBadgeStyle(type))}>
                          <span>{type}</span>
                          <span className="font-bold bg-white/50 rounded-full px-2">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                   <p className="text-muted-foreground">No PII was detected for the selected attributes.</p>
                )}

                <div>
                    <h3 className="font-semibold mb-3">Highlighted Data</h3>
                    <HighlightedTextViewer text={rawData} entities={piiResults.piiEntities} />
                </div>

                {jsonSchema && (
                    <div>
                        <div className="flex justify-between items-center mb-3">
                           <h3 className="font-semibold">Generated Schema</h3>
                           <Button variant="outline" size="sm" onClick={downloadJsonSchema}>
                             <Download className="w-4 h-4 mr-2" />
                             Download JSON
                           </Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto rounded-lg border bg-secondary/80">
                          <pre className="text-xs p-4 font-mono">
                            <code suppressHydrationWarning>{jsonSchema}</code>
                          </pre>
                        </div>
                    </div>
                )}
              </div>
            ) : null}
          </div>
        </Card>

        <footer className="text-center py-12">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} PII Protector. All Rights Reserved.</p>
        </footer>
      </main>
    </div>
  );
}
