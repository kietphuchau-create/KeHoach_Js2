import { useState, useEffect, useRef } from 'react';

interface UseSingleTabLockOptions {
  channelKey: string;
  moduleName: string;
  onTakeOver?: () => void;
}

export function useSingleTabLock({ channelKey, moduleName, onTakeOver }: UseSingleTabLockOptions) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tabId = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    tabIdRef.current = tabId;

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(`medsched_lock_${channelKey}`);
      setChannel(ch);

      // Hỏi các tab khác xem có ai đang chiếm quyền module này không
      ch.postMessage({ type: 'WHO_IS_ACTIVE', senderTabId: tabId });

      ch.onmessage = (event) => {
        const data = event.data;
        if (!data || data.senderTabId === tabId) return;

        if (data.type === 'WHO_IS_ACTIVE') {
          // Tab hiện tại đang hoạt động -> trả lời để tab mới biết mà khóa lại
          ch?.postMessage({ type: 'I_AM_ACTIVE', activeTabId: tabId });
        }

        if (data.type === 'I_AM_ACTIVE') {
          setIsBlocked(true);
        }

        if (data.type === 'TAKE_OVER') {
          if (data.targetTabId !== tabId) {
            setIsBlocked(true);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }

    return () => {
      if (ch) ch.close();
    };
  }, [channelKey]);

  const handleTakeOver = () => {
    if (channel && tabIdRef.current) {
      channel.postMessage({
        type: 'TAKE_OVER',
        targetTabId: tabIdRef.current,
      });
      setIsBlocked(false);
      onTakeOver?.();
    }
  };

  return {
    isBlocked,
    handleTakeOver,
    moduleName,
  };
}
