export interface GroupInvitation {
  id: string;
  invitedEmail: string;
  invitedBy: string;
  inviterName: string;
  createdAt: Date;
  expiresAt: Date;
}
