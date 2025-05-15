// src/components/data-input-section.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form }import "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { runGenerateDispatchPlan } from "@/lib/actions";
import type { StockItem, OrderItem, DispatchPlanResult, AIStockItem, AIOrderItem } from "@/lib/types";
import { StockItemFormSchema, OrderItemFormSchema } from "@/lib/types";
import { OrderInputForm } from "./order-input-form";
import { StockInputForm } from "./stock-input-form";
import { Loader2, Zap } from "lucide-react";
import { format } from "date-fns";

const DataInputFormSchema = z.object({
  stockItems: z.array(StockItemFormSchema),
  orderItems: z.array(OrderItemFormSchema),
});

type DataInputFormValues = z.infer<typeof DataInputFormSchema>;

interface DataInputSectionProps {
  onPlanGenerated: (data: DispatchPlanResult) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
}

export function DataInputSection({ onPlanGenerated, setIsLoading, isLoading }: DataInputSectionProps) {
  const { toast } = useToast();
  const form = useForm<DataInputFormValues>({
    resolver: zodResolver(DataInputFormSchema),
    defaultValues: {
      stockItems: [],
      orderItems: [],
    },
  });

  const onSubmit = async (data: DataInputFormValues) => {
    setIsLoading(true);
    if (data.stockItems.length === 0 || data.orderItems.length === 0) {
      toast({
        title: "Missing Data",
        description: "Please add at least one stock item and one order item.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Client-side order prioritization
    const prioritizedOrders = [...data.orderItems].sort((a, b) => {
      const dateA = new Date(a.DATE).getTime();
      const dateB = new Date(b.DATE).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return a["SR NO"] - b["SR NO"];
    });

    // Transform data for AI
    const aiStockData: AIStockItem[] = data.stockItems.map(item => ({
      ...item,
      PRODUCT: item.PRODUCT || undefined, // Ensure optional fields are undefined if empty
      'MOTOR BAG': item['MOTOR BAG'] || undefined,
    }));

    const aiOrderData: AIOrderItem[] = prioritizedOrders.map(item => ({
      ...item,
      DATE: format(new Date(item.DATE), "yyyy-MM-dd"), // Format date as string for AI
      'SALES PERSON': item['SALES PERSON'] || undefined,
      LOCATION: item.LOCATION || undefined,
      notes: item.notes || undefined,
    }));

    const result = await runGenerateDispatchPlan({ stockData: aiStockData, pendingOrdersData: aiOrderData });

    if ("error" in result) {
      toast({
        title: "Error Generating Plan",
        description: result.error,
        variant: "destructive",
      });
    } else {
      onPlanGenerated(result);
      toast({
        title: "Dispatch Plan Generated",
        description: "View the results in the Dispatch Dashboard tab.",
      });
    }
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <StockInputForm control={form.control} register={form.register} form={form} />
        <OrderInputForm control={form.control} register={form.register} form={form} />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg" className="min-w-[200px]">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Generate Dispatch Plan
          </Button>
        </div>
      </form>
    </Form>
  );
}
