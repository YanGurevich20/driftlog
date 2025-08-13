'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SpacesService } from '@/services/spaces';
import type { Space } from '@/types';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export function SpaceSelector() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpace] = useState<{ id: string; name: string; baseCurrency: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Load current space
        if (user.defaultSpaceId) {
          const spaceDoc = await getDoc(doc(db, 'spaces', user.defaultSpaceId));
          if (spaceDoc.exists()) {
            const data = spaceDoc.data();
            setCurrentSpace({
              id: user.defaultSpaceId,
              name: data.name,
              baseCurrency: data.baseCurrency
            });
          }
        }
        
        // Load all user spaces
        const userSpaces = await SpacesService.getUserSpaces(user.id);
        setSpaces(userSpaces);
      } catch (error) {
        console.error('Error loading spaces:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadData();
    }
  }, [user]);

  const handleSwitchSpace = async (spaceId: string) => {
    if (!user) return;
    
    try {
      await SpacesService.switchUserDefaultSpace(user.id, spaceId);
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error switching space:', error);
      toast.error('Failed to switch space');
    }
  };

  if (loading || !currentSpace) {
    return null;
  }

  // If user only has one space, just show the name without dropdown
  if (spaces.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-md">
        <span className="text-sm font-medium">{currentSpace.name}</span>
        <span className="text-sm text-muted-foreground">({currentSpace.baseCurrency})</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-3 py-1 h-auto bg-muted/50 hover:bg-muted"
        >
          <span className="text-sm font-medium">{currentSpace.name}</span>
          <span className="text-sm text-muted-foreground">({currentSpace.baseCurrency})</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <div className="space-y-1">
          {spaces.map((space) => (
            <Button
              key={space.id}
              variant={space.id === currentSpace.id ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleSwitchSpace(space.id)}
              disabled={space.id === currentSpace.id}
            >
              <div className="flex flex-col items-start">
                <span className="text-sm">{space.name}</span>
                <span className="text-xs text-muted-foreground">
                  {space.baseCurrency} · {space.memberIds.length} member{space.memberIds.length !== 1 ? 's' : ''}
                </span>
              </div>
            </Button>
          ))}
          <div className="border-t pt-1">
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Manage Spaces
              </Button>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}