// src/components/order-input-form.tsx
"use client";

import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ClipboardList, PlusCircle, Trash2 } from "lucide-react";
import type { OrderItem } from "@/lib/types"; // Using OrderItem for form fields


interface OrderInputFormProps {
  control: Control<any>; // react-hook-form control object
  register: any; // react-hook-form register function
  form: any; // react-hook-form main object
}

export function OrderInputForm({ control, register, form }: OrderInputFormProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "orderItems",
  });

  const handleAddOrderItem = () => {
    append({ 
      'SR NO': (fields.length + 1), 
      DATE: new Date(), 
      'SALES PERSON': "", 
      CUSTOMER: "", 
      LOCATION: "", 
      SIZE: "", 
      QNTY: 1, 
      CBM: 0, 
      notes: "" 
    });
  };
  
  const currentOrderItems = form.watch("orderItems") || [];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          <CardTitle>Pending Orders Data</CardTitle>
        </div>
        <CardDescription>Add or manage your pending customer orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={handleAddOrderItem} className="mb-4" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Order Item
        </Button>

        {fields.map((item, index) => (
          <div key={item.id} className="mb-6 p-4 border rounded-md relative shadow-sm bg-card/50">
            <h4 className="font-semibold mb-2 text-sm">Order Item {index + 1}</h4>
             <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              className="absolute top-2 right-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
              aria-label="Remove order item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name={`orderItems.${index}.SR NO`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SR NO*</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`orderItems.${index}.DATE`}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`orderItems.${index}.SALES PERSON`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Person</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`orderItems.${index}.CUSTOMER`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ACME Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`orderItems.${index}.LOCATION`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., City, State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`orderItems.${index}.SIZE`}
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
                name={`orderItems.${index}.QNTY`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity*</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`orderItems.${index}.CBM`}
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
                name={`orderItems.${index}.notes`}
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Any specific instructions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}

        {currentOrderItems.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Current Pending Orders Input</h3>
            <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SR NO</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>CBM</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrderItems.map((order: OrderItem, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{order['SR NO']}</TableCell>
                    <TableCell>{order.DATE ? format(new Date(order.DATE), "PPP") : '-'}</TableCell>
                    <TableCell>{order.CUSTOMER}</TableCell>
                    <TableCell>{order.SIZE}</TableCell>
                    <TableCell>{order.QNTY}</TableCell>
                    <TableCell>{order.CBM}</TableCell>
                    <TableCell>{order.notes || '-'}</TableCell>
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
