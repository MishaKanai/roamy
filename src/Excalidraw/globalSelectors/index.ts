import { createSelectorCreator, defaultMemoize } from "reselect";
import deepEqual from 'fast-deep-equal';
import { RootState } from "../../store/configureStore";

const createDeepEqualSelector = createSelectorCreator(
    defaultMemoize,
    deepEqual
  )
export const drawingNamesSelector = createDeepEqualSelector(
    (state: RootState) => Object.keys(state.drawings),
    (drawings) => drawings
  );