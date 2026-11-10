import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Id } from '@convex/_generated/dataModel';
import { DEFAULT_MODEL_ID, VIDEO_MODELS, type ModelId, type Resolution } from '@convex/lib/models';

export type ComposerState = {
  prompt: string;
  avatarId: Id<'avatars'> | null;
  productId: Id<'products'> | null;
  templateId: Id<'templates'> | null;
  modelId: ModelId;
  duration: number;
  resolution: Resolution;
  variations: number;
};

const initial = (): ComposerState => {
  const model = VIDEO_MODELS[DEFAULT_MODEL_ID];
  return {
    prompt: '',
    avatarId: null,
    productId: null,
    templateId: null,
    modelId: model.id,
    duration: model.defaultDuration,
    resolution: model.resolutions[0],
    variations: 1,
  };
};

type Ctx = {
  state: ComposerState;
  update: (patch: Partial<ComposerState>) => void;
  setModel: (id: ModelId) => void;
  reset: (patch?: Partial<ComposerState>) => void;
};

const ComposerContext = createContext<Ctx | null>(null);

/** Draft of the video being composed; shared by the Create screen and its picker sheets. */
export function ComposerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComposerState>(initial);

  const update = useCallback((patch: Partial<ComposerState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  /** Switching model keeps settings valid for that model. */
  const setModel = useCallback((id: ModelId) => {
    setState((s) => {
      const m = VIDEO_MODELS[id];
      return {
        ...s,
        modelId: id,
        duration: m.durations.includes(s.duration) ? s.duration : m.defaultDuration,
        resolution: m.resolutions.includes(s.resolution) ? s.resolution : m.resolutions[0],
      };
    });
  }, []);

  const reset = useCallback((patch?: Partial<ComposerState>) => {
    setState(() => {
      const base = initial();
      const next = { ...base, ...patch };
      const m = VIDEO_MODELS[next.modelId] ?? VIDEO_MODELS[DEFAULT_MODEL_ID];
      if (!m.durations.includes(next.duration)) next.duration = m.defaultDuration;
      if (!m.resolutions.includes(next.resolution)) next.resolution = m.resolutions[0];
      return next;
    });
  }, []);

  const value = useMemo(() => ({ state, update, setModel, reset }), [state, update, setModel, reset]);
  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

export function useComposer() {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error('useComposer must be used inside ComposerProvider');
  return ctx;
}
