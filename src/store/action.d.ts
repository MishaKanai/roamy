import { ActionType } from 'typesafe-actions';
import * as slateGraphActions from '../SlateGraph/store/actions';
type SlateGraphAction = ActionType<typeof slateGraphActions>;
export type RootAction = SlateGraphAction;