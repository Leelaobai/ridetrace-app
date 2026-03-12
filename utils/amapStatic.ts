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
    `&size=${width}*${height}&scale=2&style=7` +
    `&paths=8,0x0de3f2,1,,:${polyline}` +
    `&markers=mid,0x4CAF50,:${start.lng},${start.lat}` +
    `&markers=mid,0xF44336,:${end.lng},${end.lat}`
  );
}
