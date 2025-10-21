import React, { useState, useMemo, useEffect } from "react";
import { useBookings } from "../../hooks/useBookings";
import Table from "../../components/table/Table";
import { Eye, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import BookingFilters from "./BookingFilters";
import BookingViewModal from "./BookingViewModal";
import { toast } from "react-hot-toast";

const BookingManagement = () => {
  const {
    bookings,
    loading,
    error,
    approveBookingById,
    cancelBookingById,
    completeBookingById,
    fetchBookingsWithDetails,
  } = useBookings();

  const [updatingId, setUpdatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stationFilter, setStationFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatDate = (date) => new Date(date).toLocaleString();
  const formatDateOnly = (date) => new Date(date).toLocaleDateString();

  const handleStatusChange = async (id, newStatus) => {
    // If user selects a no-op status, just return without toasting
    if (newStatus === "Pending") return;
    setUpdatingId(id);
    const actionLabels = {
      Approved: { load: "Approving booking...", success: "Booking approved" },
      Cancelled: { load: "Cancelling booking...", success: "Booking cancelled" },
      Completed: { load: "Completing booking...", success: "Booking completed" },
    };

    // Build the action promise based on status
    const actionPromise = (async () => {
      if (newStatus === "Approved") {
        await approveBookingById(id);
      } else if (newStatus === "Cancelled") {
        await cancelBookingById(id);
      } else if (newStatus === "Completed") {
        await completeBookingById(id);
      } else {
        // No-op for statuses without a backend action
        return;
      }
      await fetchBookingsWithDetails();
    })();

    try {
      await toast.promise(actionPromise, {
        loading: actionLabels[newStatus]?.load || "Updating booking...",
        success: actionLabels[newStatus]?.success || "Booking updated",
        error: (err) =>
          err?.response?.data?.message || err?.message || "Failed to update booking",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Surface loading errors via toast as well
  useEffect(() => {
    // Avoid duplicating error toasts while an update action is in-flight
    if (error && !updatingId) {
      const message = typeof error === "string" ? error : "Failed to load bookings";
      toast.error(message);
    }
  }, [error, updatingId]);

  const uniqueStations = useMemo(() => {
    return [...new Set(bookings.map((b) => b.stationName))].sort();
  }, [bookings]);

  // Calculate booking counts by status
  const bookingStats = useMemo(() => {
    const stats = {
      pending: 0,
      approved: 0,
      completed: 0,
      cancelled: 0,
    };
    bookings.forEach((booking) => {
      const status = booking.status?.toLowerCase();
      if (status === "pending") stats.pending++;
      else if (status === "approved") stats.approved++;
      else if (status === "completed") stats.completed++;
      else if (status === "cancelled") stats.cancelled++;
    });
    return stats;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        searchTerm === "" ||
        booking.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.nic?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || booking.status === statusFilter;
      const matchesStation =
        stationFilter === "All" || booking.stationName === stationFilter;
      const matchesDate =
        dateFilter === "" ||
        formatDateOnly(booking.startTime) === formatDateOnly(dateFilter);
      return matchesSearch && matchesStatus && matchesStation && matchesDate;
    });
  }, [bookings, searchTerm, statusFilter, stationFilter, dateFilter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedBookings = useMemo(
    () => filteredBookings.slice(startIndex, endIndex),
    [filteredBookings, startIndex, endIndex]
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setStationFilter("All");
    setDateFilter("");
    setCurrentPage(1);
  };

  const columns = [
    { header: "#", key: "index" },
    { header: "Name", key: "name" },
    { header: "NIC", key: "nic" },
    { header: "Station Name", key: "stationName" },
    { header: "Slot Name", key: "slotCode" },
    {
      header: "Start Time",
      key: "startTime",
      render: (row) => formatDate(row.startTime),
    },
    {
      header: "End Time",
      key: "endTime",
      render: (row) => formatDate(row.endTime),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => (
        <select
          disabled={updatingId === row.id}
          value={row.status}
          onChange={(e) => handleStatusChange(row.id, e.target.value)}
          className={`border text-sm rounded-lg px-3 py-2 font-medium cursor-pointer transition-all ${
            row.status === "Pending"
              ? "bg-yellow-50 text-yellow-700 border-yellow-300"
              : row.status === "Approved"
              ? "bg-blue-50 text-blue-700 border-blue-300"
              : row.status === "Completed"
              ? "bg-green-50 text-green-700 border-green-300"
              : "bg-red-50 text-red-700 border-red-300"
          }`}
        >
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Completed">Completed</option>
        </select>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBooking(row);
            setIsViewModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
        >
          <Eye className="w-4 h-4" /> View
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Booking Management
      </h1>
      <p className="text-gray-600 mb-6">
        Manage and monitor all charging station bookings
      </p>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {bookingStats.pending}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {bookingStats.approved}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {bookingStats.completed}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {bookingStats.cancelled}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <BookingFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        stationFilter={stationFilter}
        setStationFilter={setStationFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        resetFilters={resetFilters}
        filteredCount={filteredBookings.length}
        totalCount={bookings.length}
        uniqueStations={uniqueStations}
      />

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table
              columns={columns}
              data={paginatedBookings.map((b, i) => ({
                ...b,
                index: startIndex + i + 1,
              }))}
            />
          </div>
        </>
      )}

      <BookingViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        bookingId={selectedBooking?.id}
      />
    </div>
  );
};

export default BookingManagement;
