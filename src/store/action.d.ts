import { ActionType } from 'typesafe-actions';
import * as slateGraphActions from '../SlateGraph/store/actions';
import * as drawingActions from '../Excalidraw/store/actions';
import * as dbxAuthActions from '../dropbox/store/actions'
type SlateGraphAction = ActionType<typeof slateGraphActions>;
type DrawingAction = ActionType<typeof drawingActions>;
type DbxAuthAction = ActionType<typeof dbxAuthActions>;

export type RootAction = SlateGraphAction | DrawingAction | DbxAuthAction;