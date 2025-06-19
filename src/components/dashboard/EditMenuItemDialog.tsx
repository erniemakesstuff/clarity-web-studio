
"use client";

import React, { useState, useEffect } from "react";
import type { MenuItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EditMenuItemDialogProps {
  item: MenuItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (updatedItem: MenuItem) => void;
}

export function EditMenuItemDialog({ item, isOpen, onOpenChange, onSave }: EditMenuItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name);
      setDescription(item.description || "");
      setPrice(item.price);
      setCategory(item.category || "Uncategorized");
    }
  }, [item, isOpen]);

  const handleSave = () => {
    if (!item) return;
    if (!name.trim() || !price.trim() || !category.trim()) {
      toast({
        title: "Validation Error",
        description: "Name, price, and category cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    // Basic price validation (starts with $, has a number)
    if (!price.startsWith("$") || isNaN(parseFloat(price.substring(1)))) {
        toast({
            title: "Validation Error",
            description: "Price must be in a valid format (e.g., $10.99).",
            variant: "destructive",
        });
        return;
    }

    onSave({
      ...item,
      name,
      description,
      price,
      category,
    });
    onOpenChange(false); // Close dialog on save
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Menu Item: {item.name}</DialogTitle>
          <DialogDescription>
            Make changes to the menu item details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-name" className="text-right col-span-1">
              Name
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-description" className="text-right col-span-1">
              Description
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-price" className="text-right col-span-1">
              Price
            </Label>
            <Input
              id="edit-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="col-span-3"
              placeholder="$0.00"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-category" className="text-right col-span-1">
              Category
            </Label>
            <Input
              id="edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Appetizers, Main Courses"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
