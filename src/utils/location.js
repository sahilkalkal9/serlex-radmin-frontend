export const getCurrentCoordinates = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        reject(new Error("Location permission denied"));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  });
};

export const reverseGeocodeLocation = async (latitude, longitude) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data) {
    throw new Error("Unable to detect location name");
  }

  const address = data.address || {};

  const areaName =
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.village ||
    address.town ||
    address.city ||
    address.county ||
    "";

  const cityName =
    address.city ||
    address.town ||
    address.village ||
    address.state_district ||
    address.state ||
    "";

  const finalName = [areaName, cityName]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(", ");

  return {
    name: finalName || data.display_name || "Unknown Location",
    coordinates: {
      latitude,
      longitude,
    },
  };
};

export const getAutoLocation = async () => {
  const coords = await getCurrentCoordinates();
  return reverseGeocodeLocation(coords.latitude, coords.longitude);
};
