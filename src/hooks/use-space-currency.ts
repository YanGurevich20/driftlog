import { useSpace } from './use-space';

export function useSpaceCurrency(spaceId?: string) {
  const { space, loading, error } = useSpace(spaceId);
  return {
    currency: space?.baseCurrency || 'USD',
    loading,
    error
  };
}