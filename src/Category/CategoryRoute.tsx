import React, { useState } from "react";
import {
  Category,
  createCategory,
  deleteCategory,
  setCategoryName,
  setCategoryColor,
  setCategoryDescription,
} from "./store/categoriesSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import chroma from "chroma-js";

const fixedSaturation = 0.5; // Fixed saturation value (50%)
const fixedLightness = 0.5; // Fixed lightness value (50%)

// Regex pattern to validate a hex color code (e.g., #RRGGBB or #RGB)
const hexColorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Function to validate hex color code
const isValidHex = (color: string) => hexColorPattern.test(color);

// Function to generate a unique hue that is distinct from existing colors
const generateUniqueHue = (existingColors: string[]) => {
  const existingHues = existingColors
    .map((color) => {
      if (isValidHex(color)) {
        return chroma(color).get("hsl.h");
      }
      return null;
    })
    .filter((hue): hue is number => hue !== null);

  let hue = Math.random() * 360;
  while (existingHues.some((existingHue) => Math.abs(existingHue - hue) < 30)) {
    hue = Math.random() * 360;
  }

  return hue;
};

const CategoriesManager: React.FC = () => {
  const categories = useAppSelector((state) => state.categories);
  const dispatch = useAppDispatch();

  const [newDisplayName, setNewDisplayName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const existingColors = Object.values(categories).map(
    (category) => category.color || "#000"
  );
  const uniqueHue = generateUniqueHue(existingColors);
  const defaultColor = chroma
    .hsl(uniqueHue, fixedSaturation, fixedLightness)
    .hex();

  React.useEffect(() => {
    if (!newColor) setNewColor(defaultColor);
  }, [defaultColor, newColor]);

  const handleAddCategory = () => {
    if (newDisplayName.trim()) {
      dispatch(createCategory(newDisplayName, newColor, newDescription));
      setNewDisplayName("");
      setNewColor(defaultColor); // Reset to a new unique color after adding
      setNewDescription("");
    }
  };

  const handleDeleteCategory = (id: string) => {
    dispatch(deleteCategory({ id }));
  };

  const handleUpdateCategoryName = (id: string, displayName: string) => {
    dispatch(setCategoryName({ id, displayName }));
  };

  const handleUpdateCategoryDescription = (id: string, description: string) => {
    dispatch(setCategoryDescription({ id, description }));
  };

  const handleUpdateCategoryColor = (id: string, color: string) => {
    if (isValidHex(color)) {
      dispatch(setCategoryColor({ id, color }));
    } else {
      dispatch(setCategoryColor({ id, color: "#808080" })); // Default to gray if invalid
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: "0 auto", padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Categories Manager
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexDirection: "column", mb: 3 }}>
        <TextField
          label="Category Name"
          variant="outlined"
          value={newDisplayName}
          onChange={(e) => setNewDisplayName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Description"
          variant="outlined"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          fullWidth
        />
        <input
          type="color"
          value={isValidHex(newColor) ? newColor : defaultColor}
          onChange={(e) => {
            const hue = chroma(e.target.value).get("hsl.h");
            const color = chroma
              .hsl(hue, fixedSaturation, fixedLightness)
              .hex();
            setNewColor(color);
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddCategory}
          disabled={!newDisplayName.trim()}
        >
          Add Category
        </Button>
      </Box>

      <List>
        {Object.values(categories).map((category) => (
          <ListItem key={category.id} disablePadding>
            <Card sx={{ width: "100%", marginBottom: 2 }}>
              <CardContent>
                <TextField
                  label="Category Name"
                  variant="outlined"
                  value={category.displayName || ""}
                  onChange={(e) =>
                    handleUpdateCategoryName(category.id, e.target.value)
                  }
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Description"
                  variant="outlined"
                  value={category.description || ""}
                  onChange={(e) =>
                    handleUpdateCategoryDescription(category.id, e.target.value)
                  }
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <input
                  type="color"
                  value={
                    isValidHex(category.color || "")
                      ? category.color
                      : defaultColor
                  }
                  onChange={(e) => {
                    const hue = chroma(e.target.value).get("hsl.h");
                    const color = chroma
                      .hsl(hue, fixedSaturation, fixedLightness)
                      .hex();
                    handleUpdateCategoryColor(category.id, color);
                  }}
                />
              </CardContent>
              <CardActions>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteCategory(category.id)}
                  color="secondary"
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default CategoriesManager;
