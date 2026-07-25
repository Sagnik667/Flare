export const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

export const filterByRadius = (originLat, originLng, points, radiusKm, latField = 'latitude', lngField = 'longitude') => {
  return points
    .map(point => {
      const distance = getHaversineDistance(
        parseFloat(originLat),
        parseFloat(originLng),
        parseFloat(point[latField]),
        parseFloat(point[lngField])
      );
      return { ...point, distanceKm: distance, distance_km: distance };
    })
    .filter(point => point.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

export default {
  getHaversineDistance,
  filterByRadius,
};
