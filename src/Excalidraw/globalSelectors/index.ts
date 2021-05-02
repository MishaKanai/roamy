import { createSelectorCreator, defaultMemoize } from "reselect";
import { RootState } from "../../store/createRootReducer";
import deepEqual from 'fast-deep-equal';

const createDeepEqualSelector = createSelectorCreator(
    defaultMemoize,
    deepEqual
  )
export const drawingNamesSelector = createDeepEqualSelector(
    (state: RootState) => Object.keys(state.drawings),
    (drawings) => drawings
  );