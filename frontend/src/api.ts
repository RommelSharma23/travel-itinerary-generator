// frontend/src/api.ts

// Use your actual Render backend URL
const API_BASE_URL = 'https://travel-itinerary-generator-xayl.onrender.com/api';

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
    console.log('API URL:', API_BASE_URL);
    console.log('Making request to:', `${API_BASE_URL}/generate-pdf`);
    console.log('Trip data:', tripData);
    
    const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(tripData),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    console.log('PDF blob received, size:', blob.size);
    return blob;
    
  } catch (error) {
    console.error('Detailed error in generatePDF:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
    }
    throw error;
  }
};

export const downloadPDF = (blob: Blob, filename: string): void => {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('PDF download initiated:', filename);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF');
  }
};

export const uploadLogo = async (file: File): Promise<{ path: string; filename: string }> => {
  try {
    const formData = new FormData();
    formData.append('logo', file);

    console.log('Uploading logo to:', `${API_BASE_URL}/upload-logo`);

    const response = await fetch(`${API_BASE_URL}/upload-logo`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};

export const checkDefaultLogo = async (): Promise<{ hasLogo: boolean; logoPath: string | null }> => {
  try {
    console.log('Checking default logo at:', `${API_BASE_URL}/check-logo`);
    
    const response = await fetch(`${API_BASE_URL}/check-logo`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking default logo:', error);
    throw error;
  }
};