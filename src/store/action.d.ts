import { ActionType } from 'typesafe-actions';
import * as slateGraphActions from '../SlateGraph/store/actions';
import * as drawingActions from '../Excalidraw/store/actions';
type SlateGraphAction = ActionType<typeof slateGraphActions>;
type DrawingAction = ActionType<typeof drawingActions>;
export type RootAction = SlateGraphAction | DrawingAction;