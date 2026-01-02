import { useState } from 'react';
import { Memory, MemoryUpdate } from '@/hooks/useMemory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit2, Save, X, Plus } from 'lucide-react';

interface MemoryManagerProps {
  memories: Memory[];
  onAdd: (content: string, category: string, isGlobal: boolean) => Promise<any>;
  onUpdate: (id: string, updates: MemoryUpdate) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  projectId?: string;
}

export function MemoryManager({ memories, onAdd, onUpdate, onDelete, projectId }: MemoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('fact');
  const [isGlobal, setIsGlobal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    await onAdd(newContent, newCategory, isGlobal);
    setNewContent('');
    setIsAdding(false);
  };

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await onUpdate(id, { content: editContent });
    setEditingId(null);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Memory Bank</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {isAdding && (
          <div className="p-3 border rounded-md bg-muted/50 space-y-3">
             <Input
               placeholder="What should I remember?"
               value={newContent}
               onChange={(e) => setNewContent(e.target.value)}
               autoFocus
             />
             <div className="flex gap-2">
               <Select value={newCategory} onValueChange={setNewCategory}>
                 <SelectTrigger className="h-8 w-[120px]">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="fact">Fact</SelectItem>
                   <SelectItem value="preference">Preference</SelectItem>
                   <SelectItem value="instruction">Instruction</SelectItem>
                 </SelectContent>
               </Select>
               <Button size="sm" onClick={handleAdd}>Save</Button>
               <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
             </div>
          </div>
        )}

        {memories.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No memories stored yet.
          </p>
        )}

        {memories.map((memory) => (
          <div key={memory.id} className="p-3 border rounded-md group hover:bg-muted/30 transition-colors">
            {editingId === memory.id ? (
              <div className="space-y-2">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => saveEdit(memory.id)}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <p className="text-sm">{memory.content}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {memory.category}
                    </Badge>
                    {memory.is_global && (
                       <Badge variant="outline" className="text-[10px] h-5">Global</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(memory)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(memory.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
