import {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from "react";
import {
    createDrawing as createDrawingAction,
    deleteDrawing as deleteDrawingAction,
    updateDrawing as updateDrawingAction,
} from "../store/drawingsSlice";
import { DrawingData } from "../store/domain";
import deepEqual from "fast-deep-equal";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types/types";
import { useRoamyDispatch } from "../../SlateGraph/Page";
import { useAppSelector } from "../../store/hooks";
import rfdc from 'rfdc';

const INITIAL_HEIGHT = 400;
const INITIAL_WIDTH = 600;
const createInitialEmptyDrawing = (): DrawingData => ({
    size: {
        height: INITIAL_HEIGHT,
        width: INITIAL_WIDTH,
    },
    elements: [],
});

export const useDrawingPage = (
    drawingName: string,
    options?: {
        viewedFromParentDoc?: string;
    }
) => {
    const viewedFromParentDoc = options?.viewedFromParentDoc;
    const initialDrawing: DrawingData = useMemo(createInitialEmptyDrawing, []);

    const canon_currDrawing: DrawingData = useAppSelector(
        state => state.drawings[drawingName]?.drawing ?? initialDrawing
    );

    const [localDrawing, dispatchLocalDrawing] = useReducer((state: DrawingData, action: Partial<DrawingData>) => {
        return Object.assign({}, state, action) as DrawingData;
    }, canon_currDrawing);

    // defer to canon, when it changes.
    useEffect(() => {
        dispatchLocalDrawing(rfdc()(canon_currDrawing));
    }, [canon_currDrawing])

    const localDrawingRef = useRef(localDrawing);
    localDrawingRef.current = localDrawing;

    const hasBackReferences = useAppSelector(state =>
        Boolean(state.drawings[drawingName]?.backReferences?.length)
    );
    const hasBackReferencesRef = useRef(hasBackReferences);
    hasBackReferencesRef.current = hasBackReferences;
    const currDocRef = useRef(localDrawing);
    currDocRef.current = localDrawing; // always have a ref to the current doc- this lets us check it on cleanup to see if doc is nonempty
    // if not, we can safely delete on unmount.

    const dispatch = useRoamyDispatch();

    /**
     * On mount, creates drawing entry in store.
     * On unmount, deletes if it's empty.
     */
    useEffect(() => {
        if (localDrawing === initialDrawing) {
            dispatch(
                createDrawingAction(
                    drawingName,
                    localDrawing,
                    viewedFromParentDoc ? { withBackref: viewedFromParentDoc } : undefined
                )
            );
        }
        return () => {
            if (
                deepEqual(
                    currDocRef.current,
                    createInitialEmptyDrawing() && !hasBackReferencesRef.current
                )
            ) {
                dispatch(deleteDrawingAction(drawingName));
            }
        };
    }, []); // eslint-disable-line

    const someRealChangeToDrawing_Ref = useRef(false);
    const setDrawing = useCallback(
        (newDrawingElements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
            /**
             * TODO
             * dispatch files to a 'files' reducer
             * all files should be unique, and probably don't need to be merged
             * 
             * we will probably have to run files deletion on index.json save success
             * files might need revisions though, so they are accessible from merges, even if we have already 'deleted' them.
             */
            if (
                // prevent updateDrawing on initial load.
                !someRealChangeToDrawing_Ref.current &&
                deepEqual(newDrawingElements, currDocRef.current.elements)
                // the deep equality check here isn't necessary if we only update according to the change
                // of document hashes, instead of shallow-equal check to determine if 'drawings' store was updated
            ) {
                return;
            }
            someRealChangeToDrawing_Ref.current = true;
            dispatchLocalDrawing({
                elements: newDrawingElements as ExcalidrawElement[]
            })
        },
        [dispatchLocalDrawing]
    );
    /**
     * Intention is to call this at the end of drawing-type events (i.e. onMouseUp and onKeyUp)
     */
    const submitBufferedStateToStore = useCallback(() => {
        dispatch(
            updateDrawingAction(drawingName, {
                elements: rfdc()(localDrawingRef.current.elements)
            })
        )
    }, [dispatch, drawingName])
    return [localDrawing, setDrawing, submitBufferedStateToStore] as [typeof localDrawing, typeof setDrawing, typeof submitBufferedStateToStore];
};
