import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import hash_sum from "hash-sum";

export interface Category {
  id: string;
  displayName?: string;
  description?: string;
  color?: string;
  createdDate: Date;
  lastUpdatedDate: Date;
}

export type Categories = {
  [id: string]: Category;
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState: {} as Categories,
  reducers: {
    replaceCategories: {
      reducer: (
        state,
        { payload }: PayloadAction<{ categories: Categories }>
      ) => payload.categories,
      prepare(categories: Categories) {
        return { payload: { categories } };
      },
    },
    setCategoryName: (
      state,
      {
        payload: { id, displayName },
      }: PayloadAction<{ id: string; displayName: string }>
    ) => {
      if (state[id]) state[id].displayName = displayName || undefined;
    },

    setCategoryDescription: (
      state,
      {
        payload: { id, description },
      }: PayloadAction<{ id: string; description: string }>
    ) => {
      if (state[id]) state[id].description = description;
    },

    setCategoryColor: (
      state,
      { payload: { id, color } }: PayloadAction<{ id: string; color: string }>
    ) => {
      if (state[id]) state[id].color = color;
    },

    createCategory: {
      reducer: (
        state,
        {
          payload: { id, displayName, color, description, createdDate },
        }: PayloadAction<Category>
      ) => {
        state[id] = {
          id,
          displayName,
          color,
          description,
          createdDate,
          lastUpdatedDate: createdDate,
        };
      },
      prepare: (displayName: string, color?: string, description?: string) => ({
        payload: {
          id: hash_sum(Date.now()),
          displayName,
          color,
          description,
          createdDate: new Date(),
          lastUpdatedDate: new Date(),
        },
      }),
    },

    deleteCategory: (
      state,
      { payload: { id } }: PayloadAction<{ id: string }>
    ) => {
      delete state[id];
    },
  },
});

export const {
  replaceCategories,
  createCategory,
  deleteCategory,
  setCategoryName,
  setCategoryDescription,
  setCategoryColor,
} = categoriesSlice.actions;

export default categoriesSlice.reducer;
