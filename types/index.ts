export interface GameStation {
  id: string;
  name: string;
  type: 'PC' | 'PS5' | 'XBOX' | 'VR' | 'MOBILE';
  hourlyRate: number;
  isAvailable: boolean;
  imageUrl?: string;
  description?: string;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Booking {
  id: string;
  stationId: string;
  stationName: string;
  stationType: GameStation['type'];
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
}

export interface Category {
  id: string;
  label: string;
  type: GameStation['type'] | 'ALL';
}
