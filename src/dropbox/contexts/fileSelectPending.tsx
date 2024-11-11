import React from 'react';
import { useMemo } from "react";

type FileSelectPendingState = {
  _type: 'ok'
} | {
  _type: 'pending'
} | {
  _type: 'error',
  fileFailed?: string,
  message: string
}
const ok = { _type: 'ok' } as const;
export const fileSelectPendingContext = React.createContext<{
  state: FileSelectPendingState,
  setState: (state: FileSelectPendingState) => void;
}>({
  state: ok,
  setState: () => null
});
export const FileSelectPendingProvider: React.FC<{}> = props => {
  const [state, setState] = React.useState<FileSelectPendingState>(ok)
  const value = useMemo(() => ({ state, setState }), [state, setState])
  return <fileSelectPendingContext.Provider
    value={value}
  >{props.children}</fileSelectPendingContext.Provider>
}
