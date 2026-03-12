import { api } from './api';

export type Point = { lat: number; lng: number };
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SurfaceType = 'road' | 'mountain' | 'city' | 'mixed';
export type Visibility = 'public' | 'private';

export interface RouteBookAuthor { id: string; username: string; }
export interface RouteBookStats { likes: number; favorites: number; comments: number; }

export interface RouteBook {
  id: string; title: string; region: string;
  distance_m: number; elevation_gain_m: number; duration_sec: number;
  difficulty: Difficulty; surface_type: SurfaceType; visibility: Visibility;
  description: string; tags: string[];
  preview_points: Point[];
  track_points?: Point[];
  source_ride_id: string | null;
  author: RouteBookAuthor; stats: RouteBookStats;
  is_liked: boolean; is_favorited: boolean; created_at: string;
}

export interface Comment {
  id: string; content: string;
  author: RouteBookAuthor; created_at: string;
}

export interface CreateRouteBookParams {
  title: string; region: string; difficulty: Difficulty;
  surface_type: SurfaceType; description: string; tags: string[]; visibility: Visibility;
}
export interface UpdateRouteBookParams extends CreateRouteBookParams {}

export const communityService = {
  getRouteBooks: async (params?: { q?: string; difficulty?: string }): Promise<{ routes: RouteBook[] }> => {
    const res = await api.get('/route-books', { params });
    return res.data;
  },
  getRouteBookDetail: async (id: string): Promise<RouteBook> => {
    const res = await api.get(`/route-books/${id}`);
    return res.data;
  },
  createRouteBookFromRide: async (rideId: string, data: CreateRouteBookParams): Promise<RouteBook> => {
    const res = await api.post(`/rides/${rideId}/to-route-book`, data);
    return res.data;
  },
  updateRouteBook: async (id: string, data: UpdateRouteBookParams): Promise<RouteBook> => {
    const res = await api.patch(`/route-books/${id}`, data);
    return res.data;
  },
  deleteRouteBook: async (id: string): Promise<void> => { await api.delete(`/route-books/${id}`); },
  likeRouteBook: async (id: string): Promise<void> => { await api.post(`/route-books/${id}/like`); },
  unlikeRouteBook: async (id: string): Promise<void> => { await api.delete(`/route-books/${id}/like`); },
  favoriteRouteBook: async (id: string): Promise<void> => { await api.post(`/route-books/${id}/favorite`); },
  unfavoriteRouteBook: async (id: string): Promise<void> => { await api.delete(`/route-books/${id}/favorite`); },
  getComments: async (id: string): Promise<Comment[]> => {
    const res = await api.get(`/route-books/${id}/comments`);
    return res.data.comments ?? res.data;
  },
  postComment: async (id: string, content: string): Promise<Comment> => {
    const res = await api.post(`/route-books/${id}/comments`, { content });
    return res.data;
  },
  deleteComment: async (routeId: string, commentId: string): Promise<void> => {
    await api.delete(`/route-books/${routeId}/comments/${commentId}`);
  },
  getMyRouteBooks: async (): Promise<{ routes: RouteBook[] }> => {
    const res = await api.get('/users/me/route-books');
    return res.data;
  },
  getMyFavorites: async (): Promise<{ routes: RouteBook[] }> => {
    const res = await api.get('/users/me/favorites');
    return res.data;
  },
  getPosts: async () => { const res = await api.get('/posts'); return res.data; },
};
