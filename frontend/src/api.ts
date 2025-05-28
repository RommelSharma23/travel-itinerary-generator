// frontend/src/api.ts
const API_BASE_URL = 'http://localhost:5000/api';

export interface TripData {
  customerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  adultsCount: number;
  childrenCount: number;
  tripId: string;
  totalPrice: number;
  inclusions: string;
  exclusions: string;
  additionalNotes: string;
  dailyItinerary: Array<{
    dayNumber: number;
    title: string;
    description: string;
  }>;
  companyLogo?: string;
}

export const generatePDF = async (tripData: TripData): Promise<Blob> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate PDF');
    }

    return await response.blob();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const uploadLogo = async (file: File): Promise<{ path: string; filename: string }> => {
  try {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetch(`${API_BASE_URL}/upload-logo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload logo');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};
