import { api } from './api';

export interface VehicleModel {
  id: string;
  name: string;
  category: string;
  mileage_km: number;
  icon: string;
}

export interface MyVehicle {
  id: string;
  nickname: string;
  model: { name: string; category: string };
  total_distance_m: number;
}

export const getVehicleModels = async (): Promise<VehicleModel[]> => {
  const res = await api.get<{ models: VehicleModel[] }>('/vehicles/models');
  return res.data.models;
};

export const selectVehicle = async (
  vehicleModelId: string,
  nickname: string,
): Promise<{ id: string; nickname: string; total_distance_m: number }> => {
  const res = await api.post('/vehicles', {
    vehicle_model_id: vehicleModelId,
    nickname,
  });
  return res.data;
};

export const getMyVehicle = async (): Promise<MyVehicle> => {
  const res = await api.get<{ vehicle: MyVehicle }>('/vehicles/mine');
  return res.data.vehicle;
};
