import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function Research() {
  return (
    <MainLayout>
      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Research</h1>
          <p className="text-muted-foreground text-lg">
            Explore topics and gather information with AI assistance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start a Research Session</CardTitle>
            <CardDescription>
              Enter a topic to begin comprehensive research.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Enter research topic..."
                  className="pl-8"
                />
              </div>
              <Button>Start Research</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {/* Placeholders for past research or suggestions */}
             <Card className="bg-muted/50 border-dashed">
                <CardContent className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">No recent research found.</p>
                </CardContent>
             </Card>
        </div>
      </div>
    </MainLayout>
  );
}
