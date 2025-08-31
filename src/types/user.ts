// User types
export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  photoUrl?: string;
  displayCurrency: string;
  connectedUserIds: string[];
  createdAt: Date;
}
