import { createSelectorCreator, defaultMemoize } from "reselect";
import deepEqual from 'fast-deep-equal';
import { RootState } from "../../store/configureStore";

const createDeepEqualSelector = createSelectorCreator(
    defaultMemoize,
    deepEqual
  )
export const docNamesSelector = createDeepEqualSelector(
    (state: RootState) => Object.keys(state.documents),
    (documents) => documents
  );

export const docTitlesSelector = createDeepEqualSelector(
  (state: RootState) => Object.entries(state.documents).map(([k, { displayName }]) => [k, displayName ?? k] as [string, string]),
  names => names
);