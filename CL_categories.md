Categories implementation plan

- we have created a predefined list of categories and icons src/types/categories_v2.ts
- each user document src/types/user.ts will have a categories property
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  photoUrl?: string;
  displayCurrency: string;
  connectedUserIds: string[];
  createdAt: Date;
  categories: {
    expense: CategoryName[]
    income: CategoryName[]
  }
}
```

- these categories will be populated on user creation based on the default categories
- components that display categories will use getCategoryIcon to display the category icon
- we will create a collapsible setting card for categories where the user can edit the category list
  - on the top it will use an "expense" and "income" tab toggle, the same on as in the entry-form.tsx
  - then there will be a list of the current categories for the current type.
  - each category will have a delete icon
  - we will have an add button that will add based on the complete list in the categories file