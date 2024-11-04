import React from "react";
import { useSelector } from "react-redux";
import { TextField, Autocomplete } from "@mui/material";
import { useAppSelector } from "../../store/hooks";

interface CategorySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange }) => {
  const categories = useAppSelector((state) => state.categories);

  // Convert categories object into an array with id and displayName for Autocomplete options
  const categoryOptions = Object.values(categories).map((category) => ({
    id: category.id,
    displayName: category.displayName || "Unnamed Category",
  }));

  return (
    <Autocomplete
      options={categoryOptions}
      getOptionLabel={(option) => option.displayName}
      value={categoryOptions.find((option) => option.id === value) || null}
      onChange={(event, newValue) => onChange(newValue ? newValue.id : null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Category (Optional)"
          variant="outlined"
          size="small"
          style={{ maxWidth: 128 * 3 }}
        />
      )}
    />
  );
};

export default CategorySelect;
