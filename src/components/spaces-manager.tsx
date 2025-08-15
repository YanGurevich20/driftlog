'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Mail, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SpacesService } from '@/services/spaces';
import type { Space, SpaceInvitation } from '@/types';
import { CurrencySelector } from '@/components/currency-selector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export function SpacesManager() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedSpaceForInvite, setSelectedSpaceForInvite] = useState<Space | null>(null);
  
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceCurrency, setNewSpaceCurrency] = useState(user?.preferredCurrency || 'USD');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const loadSpacesAndInvitations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [userSpaces, userInvitations] = await Promise.all([
        SpacesService.getUserSpaces(user.id),
        SpacesService.getUserInvitations(user.email!)
      ]);
      
      setSpaces(userSpaces);
      setInvitations(userInvitations);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSpacesAndInvitations();
      setNewSpaceCurrency(user.preferredCurrency || 'USD');
    }
  }, [user, loadSpacesAndInvitations]);

  const handleCreateSpace = async () => {
    if (!user || !newSpaceName.trim()) return;
    
    setIsCreating(true);
    try {
      await SpacesService.createSpace(
        user.id,
        user.displayName || user.email || 'User',
        newSpaceName,
        newSpaceCurrency
      );
      
      setNewSpaceName('');
      setNewSpaceCurrency(user?.preferredCurrency || 'USD');
      setCreateDialogOpen(false);
      await loadSpacesAndInvitations();
    } catch (error) {
      console.error('Error creating space:', error);
      toast.error('Failed to create space');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!user || !selectedSpaceForInvite || !inviteEmail.trim()) return;
    
    setIsInviting(true);
    try {
      await SpacesService.inviteToSpace(
        selectedSpaceForInvite.id,
        selectedSpaceForInvite.name,
        user.id,
        user.displayName || user.email || 'User',
        inviteEmail
      );
      
      setInviteEmail('');
      setInviteDialogOpen(false);
      setSelectedSpaceForInvite(null);
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAcceptInvitation = async (invitation: SpaceInvitation) => {
    if (!user) return;
    
    try {
      await SpacesService.acceptInvitation(invitation.id, user.id);
      await loadSpacesAndInvitations();
      toast.success(`Joined ${invitation.spaceName}`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitation: SpaceInvitation) => {
    try {
      await SpacesService.rejectInvitation(invitation.id);
      await loadSpacesAndInvitations();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error('Failed to reject invitation');
    }
  };

  const handleSwitchSpace = async (spaceId: string) => {
    if (!user) return;
    
    try {
      await SpacesService.switchUserDefaultSpace(user.id, spaceId);
      window.location.reload();
    } catch (error) {
      console.error('Error switching space:', error);
      toast.error('Failed to switch space');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading spaces...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Space
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Space</DialogTitle>
              <DialogDescription>
                Create a new space to track expenses separately
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="space-name">Space Name</Label>
                <Input
                  id="space-name"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="e.g., Europe Trip, Shared Apartment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-currency">Base Currency</Label>
                <CurrencySelector
                  value={newSpaceCurrency}
                  onChange={setNewSpaceCurrency}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSpace} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Space'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="spaces" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="spaces">My Spaces</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations {invitations.length > 0 && `(${invitations.length})`}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="spaces" className="space-y-2">
          {spaces.map((space) => (
            <div
              key={space.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">{space.name}</div>
                <div className="text-sm text-muted-foreground">
                  {space.baseCurrency} · {space.memberIds.length} member{space.memberIds.length !== 1 ? 's' : ''}
                  {space.id === user?.defaultSpaceId && (
                    <span className="ml-2 text-primary">· Current</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {space.ownerId === user?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSpaceForInvite(space);
                      setInviteDialogOpen(true);
                    }}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
                {space.id !== user?.defaultSpaceId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSwitchSpace(space.id)}
                  >
                    Switch
                  </Button>
                )}
              </div>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="invitations" className="space-y-2">
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending invitations
            </div>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{invitation.spaceName}</div>
                  <div className="text-sm text-muted-foreground">
                    Invited by {invitation.inviterName}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcceptInvitation(invitation)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectInvitation(invitation)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {selectedSpaceForInvite?.name}</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on this space
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteMember} disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}