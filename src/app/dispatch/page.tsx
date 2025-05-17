
'use client';

import { useState, useEffect } from 'react';
// import { fetchDataFromGoogleSheetTool } from '@/ai/tools/google-drive-tools'; // No longer needed directly
import { generateDispatchPlan } from '@/ai/flows/generate-dispatch-plan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Info, ListChecks, PackageSearch, Truck, Activity, BarChart3, ServerCrash, Loader2 } from 'lucide-react';
import type { DispatchPlanResult, AIStockItem, AIOrderItem } from '@/lib/types'; // Import AI types

// Interface for the raw data fetched from /api/google-drive
interface FetchedSheetData {
  stockData: AIStockItem[];
  ordersData: AIOrderItem[];
  message?: string;
  error?: string;
}

export default function DispatchDashboard() {
  const [planData, setPlanData] = useState<DispatchPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true); // True initially to fetch data
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<FetchedSheetData | null>(null);

  const fetchSheetDataAndGeneratePlan = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    else setIsGeneratingPlan(true); // For refresh, it's more like regenerating
    
    setError(null);
    setPlanData(null);

    try {
      // Step 1: Fetch data from Google Sheet via our API
      const response = await fetch('/api/google-drive');
      const fetchedData: FetchedSheetData = await response.json();

      if (!response.ok || fetchedData.error) {
        throw new Error(fetchedData.error || `Failed to fetch data from Google Drive. Status: ${response.status}`);
      }
      setSheetData(fetchedData);
      
      if (!fetchedData.stockData || !fetchedData.ordersData || fetchedData.stockData.length === 0 || fetchedData.ordersData.length === 0) {
        let specificError = "No data returned from Google Sheets.";
        if(fetchedData.stockData?.length === 0 && fetchedData.ordersData?.length > 0) specificError = "Stock data is empty in Google Sheet.";
        if(fetchedData.stockData?.length > 0 && fetchedData.ordersData?.length === 0) specificError = "Orders data is empty in Google Sheet.";
        if(fetchedData.stockData?.length === 0 && fetchedData.ordersData?.length === 0) specificError = "Both stock and orders data are empty in Google Sheet.";
        
        setError(specificError + " Cannot generate dispatch plan.");
        setIsLoading(false);
        setIsGeneratingPlan(false);
        return;
      }

      // Step 2: Generate dispatch plan using the fetched data
      setIsGeneratingPlan(true); // Indicate plan generation started
      const dispatchPlanOutput = await generateDispatchPlan({
        stockData: fetchedData.stockData,
        pendingOrdersData: fetchedData.ordersData,
      });
      
      setPlanData(dispatchPlanOutput);

    } catch (err) {
      console.error('Error in dispatch dashboard:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setPlanData(null);
    } finally {
      setIsLoading(false);
      setIsGeneratingPlan(false);
    }
  };

  useEffect(() => {
    fetchSheetDataAndGeneratePlan();
  }, []);

  const handleRefresh = () => {
    fetchSheetDataAndGeneratePlan(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading initial data from Google Sheets...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment. Please ensure your Google Sheet is accessible and populated.</p>
      </div>
    );
  }

  if (error && !planData) { // Show primary error if plan couldn't be generated at all
    return (
      <div className="container mx-auto p-4 py-8 text-center">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <ServerCrash className="h-5 w-5" />
          <AlertTitle>Error Loading Dispatch Data</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <p className="mt-2 text-xs">Please check your Google Sheet, <code>.env.local</code> configuration, and ensure the backend server is running correctly. You can also try the <a href="/test-google-drive" className="underline">Google Drive Test Page</a>.</p>
          </AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-6" disabled={isGeneratingPlan}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
          {isGeneratingPlan ? 'Retrying...' : 'Retry'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b">
        <div>
            <h1 className="text-2xl font-bold text-foreground">Dispatch Dashboard</h1>
            {sheetData?.message && <p className="text-sm text-muted-foreground">{sheetData.message}</p>}
        </div>
        <Button onClick={handleRefresh} disabled={isGeneratingPlan || isLoading} className="min-w-[150px]">
          <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
          {isGeneratingPlan ? 'Refreshing Plan...' : 'Refresh Data & Plan'}
        </Button>
      </div>
      
      {isGeneratingPlan && !planData && ( // Show this if data fetched but plan is generating
         <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] p-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Generating dispatch plan...</p>
         </div>
      )}

      {error && planData && ( // Show non-critical error if plan exists but refresh failed
        <Alert variant="destructive" className="mb-4">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Refresh Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!planData && !isLoading && !error && (
         <Alert variant="default" className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>No Dispatch Plan Available</AlertTitle>
            <AlertDescription>
            Waiting for data or plan generation. If this persists, try refreshing.
            </AlertDescription>
        </Alert>
      )}

      {planData && (
        <>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Current Stock CBM (from AI Plan)</CardTitle>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{planData.summary.match(/(\d+(\.\d+)?)\s*CBM/)?.[1] || 'N/A'} CBM</div>
              <p className="text-xs text-muted-foreground">{planData.summary}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-primary" />
                <CardTitle>Dispatch Plan</CardTitle>
              </div>
              <CardDescription>Prioritized dispatch plan based on stock and order data.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SR NO</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Stock Before</TableHead>
                    <TableHead>Dispatched</TableHead>
                    <TableHead>Stock After</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planData.dispatchPlan.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item["SR NO"]}</TableCell>
                      <TableCell>{item.Date}</TableCell>
                      <TableCell>{item.Customer}</TableCell>
                      <TableCell>{item.Size}</TableCell>
                      <TableCell>{item["Ordered Quantity"]}</TableCell>
                      <TableCell>{item["Stock Before Allocation"]}</TableCell>
                      <TableCell>{item["Dispatched Quantity"]}</TableCell>
                      <TableCell>{item["Remaining Stock"]}</TableCell>
                      <TableCell>
                         <Badge 
                           variant={
                             item["Order Status"].toLowerCase().includes("fulfilled") ? "default" :
                             item["Order Status"].toLowerCase().includes("partially") ? "outline" :
                             item["Order Status"].toLowerCase().includes("pending") ? "destructive" : "secondary"
                           }
                           className={
                            item["Order Status"].toLowerCase().includes("partially") ? "border-accent text-accent font-semibold" : ""
                           }
                         >
                          {item["Order Status"].toLowerCase().includes("fulfilled") && <CheckCircle className="mr-1 h-3 w-3" />}
                          {item["Order Status"].toLowerCase().includes("partially") && <AlertCircle className="mr-1 h-3 w-3" />}
                          {item["Order Status"].toLowerCase().includes("pending") && <XCircle className="mr-1 h-3 w-3" />}
                          {item["Order Status"]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs">{item.Notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Accordion type="multiple" className="w-full space-y-4" defaultValue={['updated-stock']}>
            <AccordionItem value="updated-stock">
              <AccordionTrigger className="text-lg font-semibold p-4 bg-card rounded-t-md hover:bg-muted/80 border shadow-sm">
                <div className="flex items-center gap-2"> <PackageSearch className="h-5 w-5 text-primary" /> Updated Stock Summary</div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-card rounded-b-md border border-t-0 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Size</TableHead>
                      <TableHead>Remaining Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planData.updatedStockSummary.map((item, index) => (
                      <TableRow key={index} className={item["Remaining Quantity"] === 0 ? "bg-destructive/10" : ""}>
                        <TableCell>{item.SIZE}</TableCell>
                        <TableCell>
                          {item["Remaining Quantity"]}
                          {item["Remaining Quantity"] === 0 && <Badge variant="destructive" className="ml-2">Zero Stock</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>

            {planData.zeroStockSizes.length > 0 && (
                <AccordionItem value="zero-stock">
                <AccordionTrigger className="text-lg font-semibold p-4 bg-card rounded-t-md hover:bg-muted/80 border shadow-sm">
                    <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Sizes with Zero Stock ({planData.zeroStockSizes.length})</div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-card rounded-b-md border border-t-0 shadow-sm">
                    <ul className="list-disc pl-5 space-y-1 text-destructive">
                    {planData.zeroStockSizes.map((size, index) => <li key={index}>{size}</li>)}
                    </ul>
                </AccordionContent>
                </AccordionItem>
            )}

            {planData.pendingOrders.length > 0 && (
                <AccordionItem value="pending-orders">
                <AccordionTrigger className="text-lg font-semibold p-4 bg-card rounded-t-md hover:bg-muted/80 border shadow-sm">
                    <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-accent" /> Pending Orders ({planData.pendingOrders.length})</div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-card rounded-b-md border border-t-0 shadow-sm">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>SR NO</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Pending Qty</TableHead>
                        <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {planData.pendingOrders.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>{item["SR NO"]}</TableCell>
                            <TableCell>{item.Customer}</TableCell>
                            <TableCell>{item.Size}</TableCell>
                            <TableCell>{item["Pending Quantity"]}</TableCell>
                            <TableCell>{item.Reason}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </AccordionContent>
                </AccordionItem>
            )}
          </Accordion>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ListChecks className="h-6 w-6 text-primary" />
                <CardTitle>Recommended Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-foreground dark:prose-invert whitespace-pre-line">
                {planData.recommendedActions}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
