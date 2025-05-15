// src/components/dispatch-dashboard-section.tsx
"use client";

import type { DispatchPlanResult } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle2, AlertTriangle, XCircle, Info, ListChecks, PackageSearch, Truck, Activity } from "lucide-react";

interface DispatchDashboardSectionProps {
  planData: DispatchPlanResult | null;
  isLoading: boolean;
}

export function DispatchDashboardSection({ planData, isLoading }: DispatchDashboardSectionProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-12 w-12 animate-pulse text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Generating plan, please wait...</p>
      </div>
    );
  }

  if (!planData) {
    return (
      <Alert variant="default" className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>No Plan Generated Yet</AlertTitle>
        <AlertDescription>
          Please input stock and order data in the "Data Input" tab and click "Generate Dispatch Plan" to see results here.
        </AlertDescription>
      </Alert>
    );
  }
  
  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    if (status.toLowerCase().includes("fulfilled")) return "default"; // default is primary, often green-ish or blue-ish
    if (status.toLowerCase().includes("partially")) return "outline"; // orange accent
    if (status.toLowerCase().includes("pending")) return "destructive"; // red
    return "secondary";
  };


  return (
    <div className="space-y-6 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Current Stock CBM</CardTitle>
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
                     <Badge variant={getStatusBadgeVariant(item["Order Status"])}
                       className={
                        item["Order Status"].toLowerCase().includes("partially") ? "border-accent text-accent" : ""
                       }
                     >
                      {item["Order Status"].toLowerCase().includes("fulfilled") && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {item["Order Status"].toLowerCase().includes("partially") && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {item["Order Status"].toLowerCase().includes("pending") && <XCircle className="mr-1 h-3 w-3" />}
                      {item["Order Status"]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.Notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full space-y-4">
        <AccordionItem value="updated-stock">
          <AccordionTrigger className="text-lg font-semibold p-4 bg-card rounded-t-md hover:bg-muted/80">
            <div className="flex items-center gap-2"> <PackageSearch className="h-5 w-5 text-primary" /> Updated Stock Summary</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-md border-t-0">
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

        <AccordionItem value="zero-stock">
           <AccordionTrigger className="text-lg font-semibold p-4 bg-card rounded-t-md hover:bg-muted/80">
             <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Sizes with Zero Stock</div>
           </AccordionTrigger>
           <AccordionContent className="p-4 bg-card rounded-b-md border-t-0">
            {planData.zeroStockSizes.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {planData.zeroStockSizes.map((size, index) => <li key={index}>{size}</li>)}
              </ul>
            ) : (<p className="text-muted-foreground">No sizes currently have zero stock.</p>)}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pending-orders">
          <AccordionTrigger className="text-lg font-semibold p-4 bg-card rounded-t-md hover:bg-muted/80">
            <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-accent" /> Pending Orders</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-card rounded-b-md border-t-0">
            {planData.pendingOrders.length > 0 ? (
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
            ) : (<p className="text-muted-foreground">No orders are currently pending.</p>)}
          </AccordionContent>
        </AccordionItem>
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
    </div>
  );
}
