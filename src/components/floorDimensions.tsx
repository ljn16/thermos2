export default function FloorDimensionsInput({
  dimensions,
  onDimensionsChange,
}: {
  dimensions: Dimensions;
  onDimensionsChange: (newDimensions: Dimensions) => void;
}): JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onDimensionsChange({ ...dimensions, [name]: parseInt(value, 10) });
  };

  return (
    <div className="flex flex-col">
      <h3 className="font-semibold text-center">Floor Dimensions</h3>
      <div className="space-x-2">
        <label>
          Height
          <input
            className="w-12 rounded-sm ml-1"
            type="number"
            name="height"
            value={dimensions.height}
            onChange={handleChange}
          />
        </label>
        <label>
          Width
          <input
            className="w-12 rounded-sm ml-1"
            type="number"
            name="width"
            value={dimensions.width}
            onChange={handleChange}
          />
        </label>
      </div>
    </div>
  );
}