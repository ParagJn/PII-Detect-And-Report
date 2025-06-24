"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { detectPii, type DetectPiiOutput } from '@/ai/flows/detect-pii-flow';
import { generatePiiSchema } from '@/ai/flows/generate-pii-schema-flow';
import { explainPiiDetection } from '@/ai/flows/explain-pii-detection-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileUp, ShieldCheck, FileText, ChevronRight, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getPiiStyle, getPiiBadgeStyle } from '@/lib/pii-colors';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

type PiiEntity = DetectPiiOutput['piiEntities'][0];

const PII_TYPES = ['EMAIL', 'NAME', 'SSN', 'PHONE', 'ADDRESS', 'PASSPORT', 'DOB', 'AADHAAR', 'PAN'];

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
  return <p className="p-2 max-w-xs">{explanation}</p>;
};

const HighlightedTextViewer = ({ text, entities }: { text: string, entities: PiiEntity[] }) => {
  const parts = useMemo(() => {
    if (!entities?.length) return [text];

    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);
    const result: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    sortedEntities.forEach((entity, index) => {
      if (entity.start > lastIndex) {
        result.push(text.substring(lastIndex, entity.start));
      }
      result.push(
        <TooltipProvider key={`${entity.start}-${index}`} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={getPiiStyle(entity.type)}>
                {text.substring(entity.start, entity.end)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
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

    return result;
  }, [text, entities]);

  return (
    <pre suppressHydrationWarning className="text-sm whitespace-pre-wrap break-words font-sans">
      {parts.map((part, i) => <span key={i}>{part}</span>)}
    </pre>
  );
};


export function PiiProtectorClient() {
  const [rawData, setRawData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [piiResults, setPiiResults] = useState<DetectPiiOutput | null>(null);
  const [jsonSchema, setJsonSchema] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedPiiTypes, setSelectedPiiTypes] = useState<string[]>(PII_TYPES);

  const { toast } = useToast();

  const handlePiiTypeChange = (type: string, checked: boolean) => {
    setSelectedPiiTypes(prev =>
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size exceeds 5MB. Please upload a smaller file.');
        return;
      }

      // Reset state for new file
      setError('');
      setRawData('');
      setPiiResults(null);
      setJsonSchema('');
      setFileName(file.name);
      
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
  };

  const handleScan = async () => {
    if (!rawData) {
      setError('No data to scan. Please upload a file.');
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
    a.download = `${fileName.split('.')[0]}_pii_schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-secondary/50 font-sans">
      <header className="flex items-center justify-between p-4 bg-card border-b">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">PII Protector</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">Help</Button>
          <Button variant="ghost" size="sm">Settings</Button>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-6 lg:p-8 grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Left Panel */}
        <Card className="flex flex-col shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Data Source
            </CardTitle>
            <CardDescription>Upload a file (.txt, .csv, .json) and select PII to scan for.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Input id="file-upload" type="file" onChange={handleFileChange} accept=".txt,.csv,.json" className="flex-grow" disabled={isLoading} />
              <Button onClick={handleScan} disabled={!rawData || isLoading} className="shrink-0">
                {isLoading ? 'Scanning...' : 'Scan Data'}
                {!isLoading && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
            
            <div className="rounded-lg border p-4 space-y-3 bg-secondary/30">
              <h3 className="text-sm font-semibold text-foreground">PII Attributes to Scan for</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                {PII_TYPES.map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`pii-${type}`}
                      checked={selectedPiiTypes.includes(type)}
                      onCheckedChange={(checked) => handlePiiTypeChange(type, !!checked)}
                      disabled={isLoading}
                    />
                    <Label htmlFor={`pii-${type}`} className="text-sm font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-grow rounded-lg border bg-secondary/30 relative">
              <Textarea
                suppressHydrationWarning
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder="Upload or paste your raw data here..."
                className="w-full h-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
              />
              {!rawData && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-4 pointer-events-none">
                  <FileUp className="w-12 h-12 mb-4" />
                  <h3 className="font-semibold text-lg">Upload a File</h3>
                  <p className="text-sm">Your data will be displayed here for review.</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">Max file size: 5MB. All processing is secure.</p>
          </CardFooter>
        </Card>
        
        {/* Right Panel */}
        <Card className="flex flex-col shadow-md">
           <Tabs defaultValue="results" className="flex-grow flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6" />
                      Scan Results
                    </CardTitle>
                    <CardDescription>Detected PII and data schema analysis.</CardDescription>
                  </div>
                   <TabsList>
                    <TabsTrigger value="results">Analysis</TabsTrigger>
                    <TabsTrigger value="schema" disabled={!jsonSchema && !isLoading}>Schema</TabsTrigger>
                  </TabsList>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col min-h-0">
               {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="results" className="flex-grow flex flex-col gap-4 h-full mt-0">
                {isLoading ? (
                   <div className="space-y-4 flex-grow">
                     <Skeleton className="h-8 w-1/3" />
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                     </div>
                     <Separator />
                     <Skeleton className="h-4 w-1/4" />
                     <Skeleton className="h-40 w-full" />
                   </div>
                ) : piiResults ? (
                  <div className="flex flex-col gap-4 flex-grow h-full">
                    <div>
                      <h3 className="font-semibold mb-2">Summary</h3>
                      <p className="text-sm text-muted-foreground">{piiResults.summary}</p>
                    </div>
                    {Object.keys(piiSummaryCounts).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(piiSummaryCounts).map(([type, count]) => (
                             <Badge key={type} variant="outline" className={cn("text-base justify-between p-2", getPiiBadgeStyle(type))}>
                              <span>{type}</span>
                              <span className="font-bold">{count}</span>
                             </Badge>
                          ))}
                      </div>
                    )}
                    <Separator />
                    <div className="flex-grow h-0 overflow-y-auto rounded-lg bg-secondary/30 p-4">
                        <h3 className="font-semibold mb-2 sticky top-0 bg-secondary/30 pb-2">Highlighted Data</h3>
                        <HighlightedTextViewer text={rawData} entities={piiResults.piiEntities} />
                    </div>
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center text-center text-muted-foreground flex-grow">
                      <ShieldCheck className="w-12 h-12 mb-4" />
                      <h3 className="font-semibold text-lg">Awaiting Scan</h3>
                      <p className="text-sm">Results of the PII scan will appear here.</p>
                    </div>
                )}
              </TabsContent>

              <TabsContent value="schema" className="flex-grow flex flex-col h-full mt-0">
                 {isLoading ? (
                   <div className="space-y-2 flex-grow">
                     <Skeleton className="h-full w-full" />
                   </div>
                 ): (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                       <p className="text-sm text-muted-foreground">Generated schema with PII classification.</p>
                       <Button variant="outline" size="sm" onClick={downloadJsonSchema} disabled={!jsonSchema}>
                         <Download className="w-4 h-4 mr-2" />
                         Download
                       </Button>
                    </div>
                    <div className="flex-grow rounded-lg border bg-secondary/30 overflow-auto">
                      <pre className="text-sm p-4 font-mono">
                        <code suppressHydrationWarning>{jsonSchema || 'No schema generated.'}</code>
                      </pre>
                    </div>
                  </div>
                 )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
