import React from 'react';
import { RootAction } from '../../store/action';

type MergeContext = {
    inMergeContext: false
} | {
    inMergeContext: true,
    dispatch: (action: RootAction) => void;
}

const mergeContext = React.createContext<MergeContext>({ inMergeContext: false });
export default mergeContext
