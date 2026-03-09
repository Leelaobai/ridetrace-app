import { api } from './api';

const USE_MOCK = true;

export interface VehicleModel {
  id: string;
  name: string;
  category: string;
  mileage_km: number;
  icon: string;
}

const MOCK_VEHICLES: VehicleModel[] = [
  { id: 'mock-road',     name: 'Lishi AeroX SR-7',       category: 'road',     mileage_km: 1240, icon: '🚴' },
  { id: 'mock-gravel',   name: 'Specialized Tarmac SL7', category: 'road',     mileage_km: 850,  icon: '🚵' },
  { id: 'mock-mountain', name: 'Canyon Grail CF SLX',    category: 'mountain', mileage_km: 312,  icon: '🏔️' },
  { id: 'mock-city',     name: '城市通勤车',              category: 'city',     mileage_km: 88,   icon: '🏙️' },
  { id: 'mock-ebike',    name: '电助力车',                category: 'ebike',    mileage_km: 0,    icon: '⚡' },
];

export const getVehicleModels = async (): Promise<VehicleModel[]> => {
  if (USE_MOCK) return MOCK_VEHICLES;
  const res = await api.get<{ models: VehicleModel[] }>('/vehicles/models');
  return res.data.models;
};

export const selectVehicle = async (vehicleModelId: string, nickname: string) => {
  if (USE_MOCK) return { id: 'mock-vehicle-001', nickname, total_distance_m: 0 };
  const res = await api.post('/vehicles', { vehicle_model_id: vehicleModelId, nickname });
  return res.data;
};
