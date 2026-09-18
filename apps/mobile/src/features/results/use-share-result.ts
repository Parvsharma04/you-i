import { useCallback, useRef, useState } from 'react';
import { Alert, Platform, type View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export type ShareResultStatus =
  'idle' | 'capturing' | 'sharing' | 'saving' | 'saved';

export type UseShareResultReturn = {
  /** Ref to attach to the view that should be captured. */
  viewRef: React.RefObject<View | null>;
  /** Current step of the capture/share/save pipeline. */
  status: ShareResultStatus;
  /** Start the share flow from the captured view ref. */
  share: () => Promise<void>;
};

/**
 * Captures a view as a PNG and shares it, falling back to saving the image
 * to the camera roll when the native share sheet is unavailable.
 *
 * - Fonts must be loaded before calling `share()` or text renders in a
 *   fallback face inside the captured image.
 * - The captured view must have `collapsable={false}` and be positioned
 *   off-screen (not hidden with opacity/display) or Android will optimize
 *   it away and produce a blank image.
 * - User cancellation of the share sheet is treated as a normal outcome.
 */
export function useShareResult(): UseShareResultReturn {
  const viewRef = useRef<View>(null);
  const [status, setStatus] = useState<ShareResultStatus>('idle');

  const share = useCallback(async () => {
    if (!viewRef.current) return;
    if (status !== 'idle') return;

    setStatus('capturing');

    let uri: string | undefined;
    try {
      uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
    } catch {
      setStatus('idle');
      Alert.alert('Could not create image', 'Please try again.');
      return;
    }

    if (!uri) {
      setStatus('idle');
      Alert.alert('Could not create image', 'Please try again.');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        setStatus('sharing');
        try {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your compatibility result',
            UTI: 'public.png',
          });
        } catch {
          // User dismissed the share sheet or the share was cancelled.
          // This is a normal outcome, not an error.
        }
        setStatus('idle');
        return;
      }

      setStatus('saving');
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('idle');
        Alert.alert(
          'Permission needed',
          'Allow access to Photos to save the result image.',
        );
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      if (Platform.OS === 'android') {
        await MediaLibrary.createAlbumAsync('You & I', asset, false);
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2_000);
    } catch {
      setStatus('idle');
      Alert.alert('Share failed', 'Could not share or save the image.');
    }
  }, [status]);

  return { viewRef, status, share };
}
