import { useState } from "react";
import SymptomSeveritySlider from "../SymptomSeveritySlider";

export default function SymptomSeveritySliderExample() {
  const [value, setValue] = useState(5);
  
  return (
    <div className="p-8 max-w-md">
      <SymptomSeveritySlider value={value} onChange={setValue} />
    </div>
  );
}
