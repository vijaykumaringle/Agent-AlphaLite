// src/components/stock-input-form.tsx
"use client";

import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, PlusCircle, Trash2 } from "lucide-react";
import type { StockItem } from "@/lib/types"; // Using StockItem for form fields

interface StockInputFormProps {
  control: Control<any>; // react-hook-form control object
  register: any; // react-hook-form register function
  form: any; // react-hook-form main object for watching values
}

export function StockInputForm({ control, register, form }: StockInputFormProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "stockItems",
  });

  const handleAddStockItem = () => {
    append({ PRODUCT: "", SIZE: "", Quantity: 0, CBM: 0, 'MOTOR BAG': "" });
  };

  const currentStockItems = form.watch("stockItems") || [];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <CardTitle>Stock Data</CardTitle>
        </div>
        <CardDescription>Add or manage your current stock items.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={handleAddStockItem} className="mb-4" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Stock Item
        </Button>

        {fields.map((item, index) => (
          <div key={item.id} className="mb-6 p-4 border rounded-md relative shadow-sm bg-card/50">
            <h4 className="font-semibold mb-2 text-sm">Stock Item {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              className="absolute top-2 right-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
              aria-label="Remove stock item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name={`stockItems.${index}.PRODUCT`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AAC Blocks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`stockItems.${index}.SIZE`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 600x200x100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`stockItems.${index}.Quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity*</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`stockItems.${index}.CBM`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CBM*</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`stockItems.${index}.MOTOR BAG`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor Bag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Yes/No or quantity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
        
        {currentStockItems.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Current Stock Input</h3>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>CBM</TableHead>
                    <TableHead>Motor Bag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentStockItems.map((stock: StockItem, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{stock.PRODUCT || '-'}</TableCell>
                      <TableCell>{stock.SIZE}</TableCell>
                      <TableCell>{stock.Quantity}</TableCell>
                      <TableCell>{stock.CBM}</TableCell>
                      <TableCell>{stock['MOTOR BAG'] || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
