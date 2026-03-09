import { api } from './api';

export const communityService = {
  getPosts: async () => {
    const res = await api.get('/posts');
    return res.data;
  },

  getRouteBooks: async () => {
    const res = await api.get('/route-books');
    return res.data;
  },
};
