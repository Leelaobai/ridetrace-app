const MOCK_POSTS = [
  {
    id: '1',
    username: '骑行侠',
    avatar: '🚴',
    time: '2小时前',
    title: '周末苏州骑行记录',
    excerpt: '今天从苏州古城出发，沿着太湖大道一路向西，风景真的太美了。路况非常好，强烈推荐给大家！',
    location: '苏州',
    distance: '42.5 KM',
    likes: 28,
    comments: 8,
  },
  {
    id: '2',
    username: '风之子',
    avatar: '🏔',
    time: '昨天',
    title: '莫干山爬坡挑战',
    excerpt: '终于完成了莫干山的爬坡路线，全程爬升1200米，腿快断了但心情极好。山顶的云海太震撼了。',
    location: '湖州',
    distance: '68.2 KM',
    likes: 54,
    comments: 21,
  },
  {
    id: '3',
    username: '城市漫行者',
    avatar: '🌆',
    time: '3天前',
    title: '上海滨江骑行',
    excerpt: '从杨浦滨江一路骑到徐汇滨江，沿途风景很美，周末骑个来回刚刚好。推荐傍晚出发，灯光超好看。',
    location: '上海',
    distance: '25.3 KM',
    likes: 18,
    comments: 5,
  },
];

const MOCK_ROUTES = [
  {
    id: '1',
    title: '苏州环太湖路线',
    region: '苏州',
    distance: '128 KM',
    rating: 4.8,
    difficulty: '中等',
    coverColors: ['#0de3f2', '#0a6870'],
  },
  {
    id: '2',
    title: '莫干山爬坡挑战',
    region: '湖州',
    distance: '85 KM',
    rating: 4.6,
    difficulty: '困难',
    coverColors: ['#4CAF50', '#1a5c1e'],
  },
  {
    id: '3',
    title: '上海滨江全线',
    region: '上海',
    distance: '45 KM',
    rating: 4.5,
    difficulty: '简单',
    coverColors: ['#FF9800', '#7a4800'],
  },
];

export const communityService = {
  getPosts: async () => ({ posts: MOCK_POSTS, total: MOCK_POSTS.length }),
  getRouteBooks: async () => ({ routes: MOCK_ROUTES, total: MOCK_ROUTES.length }),
};
