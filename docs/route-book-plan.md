# 路书模块技术执行计划（含完整代码）

> 版本：v2.0 技术执行版 — 2026-03-11
> 项目根目录：`/Users/laobailee/workspace/claudecode/ridetrace/ridetrace-app`

---

## 上下文

RideTrace 是 React Native + Expo Router v3 + TypeScript 骑行 App。路书模块从历史骑行提炼可复用路线，支持社区分享/点赞/收藏/评论。当前 `routes.tsx` 是占位页，`communityService.ts` 仅有 2 个空壳方法，`app/route/` 目录不存在。

**关键技术约束：**
- 封面地图：AMap 静态地图 REST API（Key: `cbdaf35d99a4ba04c9bd9b27d4f561a9`），用 `<Image>` 组件展示，不用 WebView（性能）
- 详情地图：复用 `components/map/StaticTrackMap.tsx`（WebView-based，无需修改）
- 未登录：点赞/收藏/评论弹 Toast，不跳转登录页
- 路由：Expo Router v3，Stack 嵌套，`headerShown: false`，`useSafeAreaInsets()` 处理安全区
- 颜色系统：`Colors.bg=#081112`、`Colors.primary=#0de3f2`、`Colors.glassBg`、`Colors.glassBorder`
- 字体：`SpaceGrotesk_600SemiBold`、`SpaceGrotesk_400Regular`、`JetBrainsMono_400Regular`

---

## 实施顺序总览

```
Phase 1  基础设施（config + amapStatic + communityService 完整重写）
    ↓
Phase 2  路书广场升级（routes.tsx — 封面地图 + 筛选 + 搜索）
    ↓
Phase 3  路书详情页（新建 app/route/_layout.tsx + app/route/[id].tsx）
    ↓
Phase 4  路书创建（ride/[id].tsx 按钮 + 新建 app/route/create.tsx）
    ↓
Phase 5  路书编辑（新建 app/route/edit/[id].tsx）
    ↓
Phase 6  我的路书 + 我的收藏 + 个人页入口 + 骑行记录选择模式
```

---

## Phase 1：基础设施

### Step 1.1 — constants/config.ts：追加 REST Key

在文件末尾追加：
```ts
// 高德地图 REST API Key（Web服务类型，用于静态地图和逆地理编码）
export const AMAP_REST_KEY = 'cbdaf35d99a4ba04c9bd9b27d4f561a9';
```

**自动验证：** `grep "AMAP_REST_KEY" constants/config.ts` 有输出

---

### Step 1.2 — 新建 utils/amapStatic.ts

```ts
type Point = { lat: number; lng: number };

function samplePoints(points: Point[], maxCount: number): Point[] {
  if (points.length <= maxCount) return points;
  const result: Point[] = [];
  const step = points.length / maxCount;
  for (let i = 0; i < maxCount - 1; i++) {
    result.push(points[Math.floor(i * step)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

export function buildStaticMapUrl(
  points: Point[],
  restKey: string,
  width = 600,
  height = 240,
): string | null {
  if (!points || points.length < 2) return null;
  const sampled = samplePoints(points, 50);
  const polyline = sampled.map(p => `${p.lng},${p.lat}`).join(';');
  const start = sampled[0];
  const end = sampled[sampled.length - 1];
  return (
    `https://restapi.amap.com/v3/staticmap` +
    `?key=${restKey}` +
    `&size=${width}*${height}&scale=2&style=8` +
    `&paths=5,0x0de3f2,1,,;${polyline}` +
    `&markers=mid,0x4CAF50,,:${start.lng},${start.lat}` +
    `&markers=mid,0xF44336,,:${end.lng},${end.lat}`
  );
}
```

**自动验证：** `npx tsc --noEmit` 零报错

---

### Step 1.3 — 完整重写 services/communityService.ts

```ts
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
  preview_points: Point[];    // 降采样≤50点，卡片封面用
  track_points?: Point[];     // 完整轨迹，详情页用
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
```

---

## Phase 2：路书广场（app/(tabs)/routes.tsx 完整替换）

功能：搜索（500ms debounce）+ 难度筛选 Tab + 静态地图封面 + 下拉刷新 + 骨架屏

---

## Phase 3：路书详情页

### Step 3.1 — 新建 app/route/_layout.tsx

```ts
import { Stack } from 'expo-router';
export default function RouteLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### Step 3.2 — 新建 app/route/[id].tsx

功能：顶部导航 + StaticTrackMap（高度280）+ 4格统计 + 路面/标签 + 描述 + 点赞/收藏/分享互动栏 + 评论区（含输入框） + 作者 `...` 菜单

---

## Phase 4：路书创建

### Step 4.1 — app/ride/[id].tsx：追加「生成路书」按钮

### Step 4.2 — 新建 app/route/create.tsx

功能：接收 `rideId` → 加载骑行数据 → 自动预填标题/逆地理编码地区 → 完整表单 → 提交创建

表单字段（完整）：
- 路书名称（必填，maxLength=30）
- 地区（可手动修改）
- 难度：简单/中等/困难（单选，默认中等）
- 路面类型：公路/山地/城市/混合（单选，默认公路）
- 标签：风景/爬坡/适合新手/夜骑/打卡/长途（多选）
- 可见性：公开/仅自己（单选，默认公开）
- 描述（选填，multiline，maxLength=500）

---

## Phase 5：路书编辑（app/route/edit/[id].tsx）

从详情页 `...` 菜单进入，复用 create.tsx 的表单结构，预填所有字段，提交调用 `updateRouteBook`。

---

## Phase 6：我的路书 + 我的收藏 + 个人页 + 骑行记录选择模式

### Step 6.1 — 新建 app/route/my.tsx
### Step 6.2 — 新建 app/route/favorites.tsx
### Step 6.3 — app/(tabs)/profile.tsx：追加菜单项
### Step 6.4 — app/ride/records.tsx：骑行记录选择模式

---

## 后端 API 约定

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/route-books?q=&difficulty=` | 可选 | 列表（含 preview_points） |
| GET | `/route-books/:id` | 可选 | 详情（含 track_points） |
| POST | `/rides/:id/to-route-book` | 必需 | 从骑行生成路书 |
| PATCH | `/route-books/:id` | 必需（仅作者） | 编辑 |
| DELETE | `/route-books/:id` | 必需（仅作者） | 删除 |
| POST/DELETE | `/route-books/:id/like` | 必需 | 点赞/取消 |
| POST/DELETE | `/route-books/:id/favorite` | 必需 | 收藏/取消 |
| GET | `/route-books/:id/comments` | 可选 | 评论列表 |
| POST | `/route-books/:id/comments` | 必需 | 发评论 |
| DELETE | `/route-books/:id/comments/:cid` | 必需 | 删评论 |
| GET | `/users/me/route-books` | 必需 | 我创建的（含私密） |
| GET | `/users/me/favorites` | 必需 | 我收藏的 |

---

## 关键文件汇总

| 文件 | 操作 | Phase |
|---|---|---|
| `constants/config.ts` | 追加 AMAP_REST_KEY | 1 |
| `utils/amapStatic.ts` | 新建 | 1 |
| `services/communityService.ts` | 完整重写 | 1 |
| `app/(tabs)/routes.tsx` | 完整替换 | 2 |
| `app/route/_layout.tsx` | 新建 Stack layout | 3 |
| `app/route/[id].tsx` | 新建详情页 | 3 |
| `app/ride/[id].tsx` | 追加「生成路书」按钮 | 4 |
| `app/route/create.tsx` | 新建创建表单 | 4 |
| `app/route/edit/[id].tsx` | 新建编辑表单 | 5 |
| `app/route/my.tsx` | 新建我创建的路书 | 6 |
| `app/route/favorites.tsx` | 新建我的收藏 | 6 |
| `app/(tabs)/profile.tsx` | 追加 2 个菜单项 | 6 |
| `app/ride/records.tsx` | 追加选择模式 | 6 |

**直接复用（无需修改）：**
- `components/map/StaticTrackMap.tsx` — 详情页地图
- `utils/formatters.ts` — formatDistance / formatDuration / formatDate
- `utils/errors.ts` — getErrorMessage
- `store/authStore.ts` — token / user
