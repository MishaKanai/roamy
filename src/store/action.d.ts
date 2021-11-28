import { ActionType } from 'typesafe-actions';
import * as slateGraphActions from '../SlateGraph/store/actions';
import * as drawingActions from '../Excalidraw/store/actions';
import * as dbxAuthActions from '../dropbox/store/actions';
import * as mergeActions from '../dropbox/resolveMerge/store/actions';
import { LocationChangeAction } from 'connected-react-router';

type SlateGraphAction = ActionType<typeof slateGraphActions>;
type DrawingAction = ActionType<typeof drawingActions>;
type DbxAuthAction = ActionType<typeof dbxAuthActions>;
type MergeAction = ActionType<typeof mergeActions>;

export type RootAction = SlateGraphAction | DrawingAction | DbxAuthAction | MergeAction | LocationChangeAction;