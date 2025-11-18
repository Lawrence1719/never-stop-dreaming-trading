'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const mockCategories = [
  { id: 1, name: 'Electronics', slug: 'electronics', parent: 'None', products: 24, status: 'active' },
  { id: 2, name: 'Accessories', slug: 'accessories', parent: 'Electronics', products: 18, status: 'active' },
  { id: 3, name: 'Clothing', slug: 'clothing', parent: 'None', products: 42, status: 'active' },
  { id: 4, name: 'Books', slug: 'books', parent: 'None', products: 15, status: 'inactive' },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState(mockCategories);
  const [isOpen, setIsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', parent: 'None' });

  const handleAddCategory = () => {
    setIsOpen(false);
    setNewCategory({ name: '', slug: '', parent: 'None' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage product categories</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>Add a new product category</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  placeholder="Enter category name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  placeholder="auto-generated"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                  className="mt-2"
                  readOnly
                />
              </div>
              <Button onClick={handleAddCategory} className="w-full">
                Create Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Categories</CardTitle>
          <CardDescription>Organize your products into categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{category.slug}</TableCell>
                    <TableCell>{category.parent}</TableCell>
                    <TableCell>{category.products}</TableCell>
                    <TableCell>
                      <Badge variant={category.status === 'active' ? 'default' : 'outline'}>
                        {category.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
