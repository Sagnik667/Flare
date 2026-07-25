import logger from '../config/logger.js';

export const geocodeAddress = async (address) => {
  if (!address) {
    return null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FlareVolunteerGeocoding/1.0 (contact@flareapp.org)',
      },
    });

    if (!response.ok) {
      logger.warn(`Nominatim geocoding failed with status: ${response.status}.`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        logger.info(`Successfully geocoded address: "${address}" to [${lat}, ${lon}]`);
        return { latitude: lat, longitude: lon };
      }
    }
    logger.warn(`Nominatim returned empty results for address: "${address}". Using fallback coordinates.`);
  } catch (error) {
    logger.error('Error during address geocoding:', error);
  }

  // Fallback coordinates (Kolkata, India) to ensure registration never blocks
  logger.info(`Using fallback coordinates for address: "${address}" -> [22.572648, 88.363895]`);
  return { latitude: 22.572648, longitude: 88.363895 };
};

export default {
  geocodeAddress,
};
