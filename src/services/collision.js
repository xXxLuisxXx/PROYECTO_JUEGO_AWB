export function distancePointToSegment(point, segmentStart, segmentEnd) {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared),
  );
  const projection = {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

export function segmentIntersectsCircle(segmentStart, segmentEnd, circle) {
  if (!segmentStart || !segmentEnd) {
    return false;
  }

  const movement = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.y - segmentStart.y);
  if (movement < 4) {
    return false;
  }

  return distancePointToSegment(circle, segmentStart, segmentEnd) <= circle.radius + 12;
}
