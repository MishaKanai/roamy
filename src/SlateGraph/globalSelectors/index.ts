import { createSelectorCreator, defaultMemoize } from "reselect";
import { RootState } from "../../store/rootReducer";
import deepEqual from 'fast-deep-equal';

const createDeepEqualSelector = createSelectorCreator(
    defaultMemoize,
    deepEqual
  )
export const docNamesSelector = createDeepEqualSelector(
    (state: RootState) => Object.keys(state.documents),
    (documents) => documents
  );