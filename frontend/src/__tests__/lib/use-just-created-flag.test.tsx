import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useJustCreatedFlag } from '@/hooks/use-just-created-flag';

const replaceMock = vi.fn();
let params: URLSearchParams;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/simulation/sim-123',
  useSearchParams: () => params,
}));

describe('useJustCreatedFlag', () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it('returns true and immediately strips ?new=1 from the URL when present', () => {
    params = new URLSearchParams('new=1');
    const { result } = renderHook(() => useJustCreatedFlag());

    expect(result.current).toBe(true);
    expect(replaceMock).toHaveBeenCalledWith('/simulation/sim-123', { scroll: false });
  });

  it('returns false and never touches the URL when the marker is absent', () => {
    params = new URLSearchParams();
    const { result } = renderHook(() => useJustCreatedFlag());

    expect(result.current).toBe(false);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
