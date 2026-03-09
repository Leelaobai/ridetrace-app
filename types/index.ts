export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

export interface Ride {
  id: string;
  status: 'ongoing' | 'paused' | 'completed';
  distance_m: number;
  duration_sec: number;
  avg_speed_kmh: number;
  max_speed_kmh?: number;
  elevation_gain?: number;
  vehicle_nickname?: string;
  started_at: string;
  finished_at?: string;
}

export interface VehicleModel {
  id: string;
  name: string;
  category: 'road' | 'mountain' | 'city' | 'folding' | 'ebike' | string;
  image_url?: string;
}

export interface Vehicle {
  id: string;
  nickname: string;
  model: {
    name: string;
    category: VehicleModel['category'];
  };
  total_distance_m: number;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  altitude?: number;
  speed?: number;
  accuracy?: number;
  recorded_at?: string;
  seq?: number;
}

