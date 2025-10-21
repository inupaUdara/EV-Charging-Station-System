import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Table from "../../components/table/Table";
import Button from "../../components/button/Button";
import Input from "../../components/input/Input";
import Switch from "../../components/switch/Switch";
import Modal from "../../components/modal/Modal";
import { Plus, ArrowLeft, Zap, Power } from "lucide-react";
import SlotFilters from "../../components/filters/SlotFilters";
import {
  getSlots,
  addSlot,
  updateSlot,
  deactivateSlot,
  deleteSlot,
  getStationById,
} from "../../services/stations/stations";

export default function SlotManager() {
  const { id } = useParams(); // stationId
  const navigate = useNavigate();

  const [slots, setSlots] = useState([]);
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState(null); // if null - new

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [connectorTypeFilter, setConnectorTypeFilter] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    code: "",
    connectorType: "",
    powerKw: "",
    isActive: true,
  });

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const data = await getSlots(id);
      setSlots(data);
    } catch (err) {
      console.error("Failed to fetch slots:", err);
      setError("Failed to load slots");
      toast.error("Failed to load slots. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStation = async () => {
    try {
      const data = await getStationById(id);
      setStation(data);
    } catch (err) {
      console.error("Failed to fetch station:", err);
      toast.error("Failed to load station details.");
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchStation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Get unique connector types for filter
  const uniqueConnectorTypes = useMemo(() => {
    return [...new Set(slots.map((slot) => slot.connectorType))].sort();
  }, [slots]);

  // Filter and paginate slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchesSearch =
        searchTerm === "" ||
        slot.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.connectorType?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesConnectorType =
        connectorTypeFilter === "" || slot.connectorType === connectorTypeFilter;
      const matchesStatus = !onlyActive || slot.isActive;
      return matchesSearch && matchesConnectorType && matchesStatus;
    });
  }, [slots, searchTerm, connectorTypeFilter, onlyActive]);

  const totalPages = Math.ceil(filteredSlots.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedSlots = useMemo(
    () => filteredSlots.slice(startIndex, endIndex),
    [filteredSlots, startIndex, endIndex]
  );

  const resetFilters = () => {
    setSearchTerm("");
    setConnectorTypeFilter("");
    setOnlyActive(true);
    setCurrentPage(1);
  };

  const validateSlotData = () => {
    // Validate slot code
    if (!formData.code.trim()) {
      toast.error("Please enter a slot code.");
      return false;
    }
    
    if (formData.code.trim().length < 2) {
      toast.error("Slot code must be at least 2 characters long.");
      return false;
    }
    
    if (formData.code.trim().length > 20) {
      toast.error("Slot code cannot exceed 20 characters.");
      return false;
    }
    
    // Check for duplicate slot code (only when adding new or changing code)
    const isDuplicate = slots.some(slot => {
      const slotId = slot.id || slot._id;
      const editSlotId = editSlot?.id || editSlot?._id;
      return slot.code === formData.code.trim() && slotId !== editSlotId;
    });
    
    if (isDuplicate) {
      toast.error("A slot with this code already exists. Please use a unique code.");
      return false;
    }
    
    // Validate connector type
    if (!formData.connectorType.trim()) {
      toast.error("Please enter a connector type.");
      return false;
    }
    
    if (formData.connectorType.trim().length < 2) {
      toast.error("Connector type must be at least 2 characters long.");
      return false;
    }
    
    // Validate power
    const power = parseFloat(formData.powerKw);
    if (!formData.powerKw || isNaN(power)) {
      toast.error("Please enter a valid power value.");
      return false;
    }
    
    if (power <= 0) {
      toast.error("Power must be greater than 0 kW.");
      return false;
    }
    
    if (power > 500) {
      toast.error("Power cannot exceed 500 kW.");
      return false;
    }
    
    // Check if adding a new slot would exceed the total slot count from schedules
    if (!editSlot && station?.schedules?.length > 0) {
      // Calculate total allowed slots from all schedules
      const totalAllowedSlots = station.schedules.reduce((sum, schedule) => {
        return sum + (schedule.slotCount || 0);
      }, 0);
      
      // Count current active slots
      const currentActiveSlots = slots.filter(slot => slot.isActive).length;
      
      if (currentActiveSlots >= totalAllowedSlots) {
        toast.error(
          `Cannot add more slots. Maximum allowed slots: ${totalAllowedSlots}. ` +
          `Current active slots: ${currentActiveSlots}. ` +
          `Please increase the slot count in the station schedules first.`
        );
        return false;
      }
    }
    
    return true;
  };

  const handleSaveSlot = async () => {
    if (!validateSlotData()) {
      return;
    }
    
    try {
      const payload = {
        code: formData.code.trim(),
        connectorType: formData.connectorType.trim(),
        powerKw: parseFloat(formData.powerKw),
        isActive: formData.isActive,
      };

      if (editSlot) {
        await updateSlot(id, editSlot.id || editSlot._id, payload);
        toast.success("Slot updated successfully! 🎉");
      } else {
        await addSlot(id, payload);
        toast.success("Slot added successfully! 🎉");
      }
      setModalOpen(false);
      setEditSlot(null);
      setFormData({ code: "", connectorType: "", powerKw: "", isActive: true });
      await fetchSlots();
    } catch (err) {
      console.error("Save failed:", err);
      const errorMessage = err?.response?.data?.message || "Failed to save slot. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleDeactivate = async (slot) => {
    if (!window.confirm(`Are you sure you want to deactivate slot "${slot.code}"?`)) {
      return;
    }
    
    try {
      await deactivateSlot(id, slot.id || slot._id);
      toast.success(`Slot "${slot.code}" deactivated successfully.`);
      await fetchSlots();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Cannot deactivate slot. It might have active bookings.";
      toast.error(msg);
    }
  };

  const handleDelete = async (slot) => {
    if (!window.confirm(`Are you sure you want to permanently delete slot "${slot.code}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteSlot(id, slot.id || slot._id);
      toast.success(`Slot "${slot.code}" deleted successfully.`);
      await fetchSlots();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Cannot delete slot. It might have active bookings.";
      toast.error(msg);
    }
  };

  const columns = [
    { 
      header: "Slot Code", 
      key: "code",
      render: (r) => (
        <span className="font-medium text-gray-900">{r.code}</span>
      )
    },
    { 
      header: "Connector Type", 
      key: "connectorType",
      render: (r) => (
        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-200">
          <Zap className="w-4 h-4 mr-1" />
          {r.connectorType}
        </span>
      )
    },
    { 
      header: "Power (kW)", 
      key: "powerKw",
      render: (r) => (
        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-50 text-purple-700 font-medium border border-purple-200">
          <Power className="w-4 h-4 mr-1" />
          {r.powerKw} kW
        </span>
      )
    },
    {
      header: "Status",
      render: (r) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-lg font-medium ${
            r.isActive 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-gray-100 text-gray-600 border border-gray-300"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setEditSlot(r);
              setFormData({
                code: r.code,
                connectorType: r.connectorType,
                powerKw: r.powerKw,
                isActive: r.isActive,
              });
              setModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={!r.isActive}
            onClick={(e) => {
              e.stopPropagation();
              handleDeactivate(r);
            }}
          >
            Deactivate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Calculate slot statistics
  const totalAllowedSlots = station?.schedules?.reduce((sum, schedule) => {
    return sum + (schedule.slotCount || 0);
  }, 0) || 0;
  
  const currentActiveSlots = slots.filter(slot => slot.isActive).length;
  const remainingSlots = totalAllowedSlots - currentActiveSlots;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Slot Manager
          </h1>
          <p className="text-gray-600">
            Manage charging slots for this station
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>
          <Button 
            onClick={() => setModalOpen(true)}
            disabled={currentActiveSlots >= totalAllowedSlots && totalAllowedSlots > 0}
          >
            <Plus className="w-5 h-5" />
            Add Slot
          </Button>
        </div>
      </div>

      {/* Slot Statistics Card */}
      {station && totalAllowedSlots > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Slot Capacity</h3>
              <p className="text-sm text-gray-600">
                Based on station schedules, you can create up to {totalAllowedSlots} active slots
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{currentActiveSlots}</p>
                <p className="text-sm text-gray-600 mt-1">Active Slots</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{totalAllowedSlots}</p>
                <p className="text-sm text-gray-600 mt-1">Max Allowed</p>
              </div>
              <div className="text-center">
                <p className={`text-3xl font-bold ${remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remainingSlots}
                </p>
                <p className="text-sm text-gray-600 mt-1">Remaining</p>
              </div>
            </div>
          </div>
          {remainingSlots <= 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ You've reached the maximum slot capacity. To add more slots, please edit the station and increase the slot count in the schedules.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters Section */}
      <SlotFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        connectorTypeFilter={connectorTypeFilter}
        setConnectorTypeFilter={setConnectorTypeFilter}
        onlyActive={onlyActive}
        setOnlyActive={setOnlyActive}
        resetFilters={resetFilters}
        filteredCount={filteredSlots.length}
        totalCount={slots.length}
        uniqueConnectorTypes={uniqueConnectorTypes}
      />

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading slots...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Table 
            columns={columns} 
            data={paginatedSlots} 
          />
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditSlot(null);
          setFormData({ code: "", connectorType: "", powerKw: "", isActive: true });
        }}
        title={editSlot ? "Edit Slot" : "Add New Slot"}
        size="md"
      >
        <div className="space-y-4">
          {/* Slot Capacity Info (only when adding new slot) */}
          {!editSlot && totalAllowedSlots > 0 && (
            <div className={`p-3 rounded-lg border ${
              remainingSlots > 0 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                remainingSlots > 0 ? 'text-blue-800' : 'text-red-800'
              }`}>
                {remainingSlots > 0 
                  ? `✓ You can add ${remainingSlots} more active slot${remainingSlots !== 1 ? 's' : ''} (${currentActiveSlots}/${totalAllowedSlots} used)`
                  : `⚠️ Maximum slot capacity reached (${currentActiveSlots}/${totalAllowedSlots}). Please increase slot count in schedules.`
                }
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slot Code
            </label>
            <Input
              placeholder="Enter slot code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connector Type
            </label>
            <Input
              placeholder="Enter connector type (e.g., Type2, CCS)"
              value={formData.connectorType}
              onChange={(e) => setFormData({ ...formData, connectorType: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Power (kW)
            </label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Enter power in kW"
              value={formData.powerKw}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers
                if (value === '' || parseFloat(value) >= 0) {
                  setFormData({ ...formData, powerKw: value });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                  e.preventDefault();
                }
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex items-center gap-3 h-11">
              <span className="text-sm text-gray-600">Active</span>
              <Switch
                checked={formData.isActive}
                onChange={() =>
                  setFormData({ ...formData, isActive: !formData.isActive })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlot}>
              {editSlot ? "Update Slot" : "Add Slot"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
