import { createSlice } from '@reduxjs/toolkit';


interface SyncGateState {
  count: number;
}

const initialState: SyncGateState = {
  count: 0,
};

const syncGateSlice = createSlice({
  name: 'syncGate',
  initialState,
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
    decrement: (state) => {
      if (state.count === 0) {
        throw new Error('Counter cannot go below 0');
      }
      state.count -= 1;
    },
  },
});

export const { increment, decrement } = syncGateSlice.actions;
export default syncGateSlice.reducer;
