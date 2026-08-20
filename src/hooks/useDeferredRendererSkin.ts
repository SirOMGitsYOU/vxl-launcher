import { useEffect, useState } from "react";

/**
 * Applies the skin URL after attachables/cape effects settle in SkinView.
 * Uses two animation frames so async attachable rebuild starts first.
 */
export function useDeferredRendererSkin(
  skin: string | null | undefined,
  syncKey = "",
): string | null {
  const [appliedSkin, setAppliedSkin] = useState<string | null>(null);

  useEffect(() => {
    if (!skin) {
      setAppliedSkin(null);
      return;
    }

    setAppliedSkin(null);
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setAppliedSkin(skin));
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      if (innerFrame) cancelAnimationFrame(innerFrame);
    };
  }, [skin, syncKey]);

  return appliedSkin;
}
