// frontend/src/App.tsx
import React, { useState } from 'react';
import { generatePDF, downloadPDF, TripData } from './api';

function App() {
  const [tripData, setTripData] = useState<TripData>({
    customerName: '',
    destination: '',
    startDate: '',
    endDate: '',
    duration: 0,
    adultsCount: 1,
    childrenCount: 0,
    tripId: '',
    totalPrice: 0,
    inclusions: '',
    exclusions: '',
    additionalNotes: '',
    dailyItinerary: [
      { dayNumber: 1, title: '', description: '' }
    ]
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Validate required fields
      if (!tripData.customerName || !tripData.destination) {
        alert('Please fill in customer name and destination');
        return;
      }

      console.log('Generating PDF with data:', tripData);
      
      // Call API to generate PDF
      const pdfBlob = await generatePDF(tripData);
      
      // Generate filename
      const filename = `itinerary-${tripData.customerName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      
      // Download the PDF
      downloadPDF(pdfBlob, filename);
      
      alert('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check if the backend server is running.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const addDay = () => {
    setTripData(prev => ({
      ...prev,
      dailyItinerary: [
        ...prev.dailyItinerary,
        { 
          dayNumber: prev.dailyItinerary.length + 1, 
          title: '', 
          description: '' 
        }
      ]
    }));
  };

  const removeDay = (dayIndex: number) => {
    if (tripData.dailyItinerary.length > 1) {
      setTripData(prev => ({
        ...prev,
        dailyItinerary: prev.dailyItinerary.filter((_, index) => index !== dayIndex)
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Travel Itinerary Generator
          </h1>
          <p className="text-gray-600 mt-1">
            Create professional travel itineraries in PDF format
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form className="space-y-8">
          
          {/* Basic Trip Information */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Basic Trip Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={tripData.customerName}
                  onChange={(e) => setTripData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <label className="form-label">Destination</label>
                <input
                  type="text"
                  className="form-input"
                  value={tripData.destination}
                  onChange={(e) => setTripData(prev => ({ ...prev, destination: e.target.value }))}
                  placeholder="Enter destination"
                />
              </div>
              
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={tripData.startDate}
                  onChange={(e) => setTripData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={tripData.endDate}
                  onChange={(e) => setTripData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="form-label">Adults</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={tripData.adultsCount}
                  onChange={(e) => setTripData(prev => ({ ...prev, adultsCount: parseInt(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="form-label">Children</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={tripData.childrenCount}
                  onChange={(e) => setTripData(prev => ({ ...prev, childrenCount: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* Inclusions & Exclusions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Inclusions & Exclusions
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="form-label">Inclusions</label>
                <textarea
                  rows={4}
                  className="form-input"
                  value={tripData.inclusions}
                  onChange={(e) => setTripData(prev => ({ ...prev, inclusions: e.target.value }))}
                  placeholder="List what's included in the trip..."
                />
              </div>
              
              <div>
                <label className="form-label">Exclusions</label>
                <textarea
                  rows={4}
                  className="form-input"
                  value={tripData.exclusions}
                  onChange={(e) => setTripData(prev => ({ ...prev, exclusions: e.target.value }))}
                  placeholder="List what's not included..."
                />
              </div>
            </div>
          </div>

          {/* Day-by-Day Itinerary */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Day-by-Day Itinerary
              </h2>
              <button
                type="button"
                onClick={addDay}
                className="btn-primary"
              >
                Add Day
              </button>
            </div>
            
            <div className="space-y-4">
              {tripData.dailyItinerary.map((day, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Day {day.dayNumber}</h3>
                    {tripData.dailyItinerary.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDay(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Day Title</label>
                      <input
                        type="text"
                        className="form-input"
                        value={day.title}
                        onChange={(e) => {
                          const updatedItinerary = [...tripData.dailyItinerary];
                          updatedItinerary[index].title = e.target.value;
                          setTripData(prev => ({ ...prev, dailyItinerary: updatedItinerary }));
                        }}
                        placeholder="Enter day title"
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Description</label>
                      <textarea
                        rows={3}
                        className="form-input"
                        value={day.description}
                        onChange={(e) => {
                          const updatedItinerary = [...tripData.dailyItinerary];
                          updatedItinerary[index].description = e.target.value;
                          setTripData(prev => ({ ...prev, dailyItinerary: updatedItinerary }));
                        }}
                        placeholder="Describe the day's activities..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate PDF Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="btn-primary text-lg px-8 py-3 disabled:opacity-50"
            >
              {isGeneratingPDF ? 'Generating PDF...' : 'Generate PDF'}
            </button>
          </div>
          
        </form>
      </main>
    </div>
  );
}

export default App;