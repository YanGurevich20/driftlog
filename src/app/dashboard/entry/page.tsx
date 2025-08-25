import { EntryForm } from '@/components/entry-form';
import { CategoriesSettings } from '@/components/categories-settings';

export default function NewEntryPage() {
  return (
    <div className="space-y-8">
      <EntryForm />
      <CategoriesSettings />
    </div>
  );
}