import HealthEntryCard from "../HealthEntryCard";

export default function HealthEntryCardExample() {
  return (
    <div className="p-4 max-w-md space-y-4">
      <HealthEntryCard
        timestamp={new Date()}
        glucose={125}
        symptomSeverity={4}
        symptoms={["Fatigue", "Brain Fog"]}
        location="Seattle, WA"
        weather="Cloudy"
        aqi={45}
        notes="Feeling okay today, slight fatigue in the afternoon"
        onClick={() => console.log("Entry clicked")}
      />
      
      <HealthEntryCard
        timestamp={new Date(Date.now() - 86400000)}
        glucose={185}
        symptomSeverity={7}
        symptoms={["Fatigue", "Headache", "Nausea"]}
        location="Seattle, WA"
        weather="Rainy"
        aqi={120}
        notes="Not a great day, AQI was high and symptoms were worse than usual"
      />
    </div>
  );
}
