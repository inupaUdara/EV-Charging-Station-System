import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/button/Button";
import Input from "../../components/input/Input";

export default function ScheduleEditor({ schedules = [], onChange, onClose }) {
  const [localSchedules, setLocalSchedules] = useState([...schedules]);

  const handleAdd = () => {
    setLocalSchedules((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", slotCount: 2 },
    ]);
  };

  const handleUpdate = (index, field, value) => {
    const updated = [...localSchedules];
    // Prevent negative values for slotCount
    if (field === 'slotCount') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0) {
        return; // Don't update if negative or invalid
      }
      updated[index][field] = numValue;
    } else {
      updated[index][field] = value;
    }
    setLocalSchedules(updated);
  };

  const handleDelete = (index) => {
    setLocalSchedules(localSchedules.filter((_, i) => i !== index));
    toast.success("Schedule removed successfully.");
  };

  const validateSchedules = () => {
    if (localSchedules.length === 0) {
      toast.error("Please add at least one schedule.");
      return false;
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    for (let i = 0; i < localSchedules.length; i++) {
      const schedule = localSchedules[i];
      const dayName = dayNames[schedule.dayOfWeek];
      
      // Validate slot count
      if (!schedule.slotCount || schedule.slotCount < 1) {
        toast.error(`${dayName}: Slot count must be at least 1.`);
        return false;
      }
      
      if (schedule.slotCount > 100) {
        toast.error(`${dayName}: Slot count cannot exceed 100.`);
        return false;
      }
      
      // Validate time format and logic
      if (!schedule.startTime || !schedule.endTime) {
        toast.error(`${dayName}: Please select both start and end times.`);
        return false;
      }
      
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        toast.error(`${dayName}: End time must be after start time.`);
        return false;
      }
      
      const duration = endMinutes - startMinutes;
      if (duration < 30) {
        toast.error(`${dayName}: Schedule duration must be at least 30 minutes.`);
        return false;
      }
    }
    
    // Check for duplicate days
    const dayOfWeeks = localSchedules.map(s => s.dayOfWeek);
    const uniqueDays = new Set(dayOfWeeks);
    if (uniqueDays.size !== dayOfWeeks.length) {
      const duplicateDay = dayOfWeeks.find((day, idx) => dayOfWeeks.indexOf(day) !== idx);
      toast.error(`Duplicate schedule found for ${dayNames[duplicateDay]}. Please remove or edit one.`);
      return false;
    }
    
    return true;
  };

  const handleSave = () => {
    if (!validateSchedules()) {
      return;
    }
    
    onChange(localSchedules);
    toast.success("Schedules saved successfully! 🎉");
    onClose();
  };

  return (
    <div className="space-y-4">
      {localSchedules.map((s, idx) => (
        <div
          key={idx}
          className="grid grid-cols-12 gap-3 items-center border-b pb-3"
        >
          <div className="col-span-2">
            <select
              className="border-2 border-gray-200 rounded-xl px-3 py-2 w-full"
              value={s.dayOfWeek}
              onChange={(e) => handleUpdate(idx, "dayOfWeek", parseInt(e.target.value))}
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>

          <div className="col-span-3">
            <Input
              type="time"
              value={s.startTime}
              onChange={(e) => handleUpdate(idx, "startTime", e.target.value)}
            />
          </div>

          <div className="col-span-3">
            <Input
              type="time"
              value={s.endTime}
              onChange={(e) => handleUpdate(idx, "endTime", e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <Input
              type="number"
              min="1"
              value={s.slotCount}
              onChange={(e) => handleUpdate(idx, "slotCount", parseInt(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                  e.preventDefault();
                }
              }}
            />
          </div>

          <div className="col-span-2 text-right">
            <Button variant="danger" size="sm" onClick={() => handleDelete(idx)}>
              Delete
            </Button>
          </div>
        </div>
      ))}

      <div className="flex justify-between pt-3">
        <Button variant="secondary" onClick={handleAdd}>
          + Add Schedule
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Schedules</Button>
        </div>
      </div>
    </div>
  );
}
