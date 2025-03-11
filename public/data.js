import { apiKey } from './config.js';

var locations = [];
var currentObs = {};
var currentObs_es = {};
var primaryLoc = {};
var nearbyLocs = [];
var thirtysixHour = {};
var thirtysixHour_es = {};
var sevenDay = {};
var sevenDay_es = {};
var bulletins = {};
let almanac = {};
let almanac_es = {};

// Caching and debounce utilities
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

async function cachedFetch(url, options = {}) {
    const cacheKey = url, now = Date.now();
    const cached = apiCache.get(cacheKey);
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }
    let attempts = 0, maxAttempts = 3;
    while (attempts < maxAttempts) {
        try {
            const res = await fetch(url, options);
            if (res.ok) {
                const data = await res.json();
                apiCache.set(cacheKey, { timestamp: now, data });
                return data;
            }
            attempts++;
            await new Promise(r => setTimeout(r, 1000 * attempts));
        } catch (e) {
            attempts++;
            if (attempts === maxAttempts) throw e;
            await new Promise(r => setTimeout(r, 1000 * attempts));
        }
    }
    if (cached) return cached.data;
    throw new Error(`Failed to fetch ${url}`);
}

setInterval(() => {
    const now = Date.now();
    apiCache.forEach((val, key) => {
        if (now - val.timestamp > CACHE_TTL) apiCache.delete(key);
    });
}, 10 * 60 * 1000);

async function fetchRawUserLocation() {
    const customLoc = window.location.search.substring(1);

    if (customLoc) {
        try {
            const data = await cachedFetch(`https://api.weather.com/v3/location/search?query=${customLoc}&language=en-US&format=json&apiKey=45720848946ac3b87c8eeca0686a11ad`);
            console.log('Custom Location specified by user:', data.location.displayName[0] + ',', data.location.adminDistrict[0] || data.location.country[0]);
            return {
                lat: data.location.latitude[0],
                lon: data.location.longitude[0]
            };
        } catch (error) {
            console.error('Failed to fetch TWC user location:', error);
            return null;
        }
    } else {
        try {
            const data = await cachedFetch('https://pro.ip-api.com/json/?key=AmUN9xAaQALVYu6');
            return data;
        } catch (error) {
            console.error('Failed to fetch user location:', error);
            return null;
        }
    }
}

async function fetchTWCUserLocation(locationData) {
    if (locationData) {
        const { lat, lon } = locationData;
        try {
            const data = await cachedFetch(`https://api.weather.com/v3/location/search?query=${lat},${lon}&language=en-US&format=json&apiKey=${apiKey}`);
            return data;
        } catch (error) {
            console.error('Failed to fetch TWC user location:', error);
            // Return a fallback object instead of null
            return {
                location: {
                    locId: ['NA_' + lat + '_' + lon],
                    latitude: [lat],
                    longitude: [lon],
                    displayName: ['Not Available'],
                    adminDistrict: ['Not Available'],
                    ianaTimeZone: ['America/New_York']
                }
            };
        }
    }
}

async function fetchNearbyCities(lat, lon) {
    try {
        return await cachedFetch(`https://api.weather.com/v3/location/near?geocode=${lat},${lon}&product=observation&format=json&apiKey=${apiKey}`);
    } catch (error) {
        console.error('Failed to fetch nearby cities:', error);
        return null;
    }
}

// Modify fetch functions to accept a language parameter (default "en-US")
async function fetchCurrentObservations(apiUrl, lang) {
    // Append language parameter if needed (assumes apiUrl has &language=, so replace its value)
    apiUrl = apiUrl.replace(/language=[^&]+/, `language=${lang}`);
    try {
        return await cachedFetch(apiUrl);
    } catch (error) {
        console.error('Failed to fetch current observations:', error);
        return null;
    }
}

// Modify fetch functions to accept a language parameter (default "en-US")
async function fetchForecasts(apiUrl, lang) {
    apiUrl = apiUrl.replace(/language=[^&]+/, `language=${lang}`);
    try {
        return await cachedFetch(apiUrl);
    } catch (error) {
        console.error('Failed to fetch forecast data:', error);
        return null;
    }
}

async function fetchBulletins(lat, lon) {
    try {
        const response = await fetch(`https://api.weather.com/v3/alerts/headlines?geocode=${lat},${lon}&format=json&language=en-US&apiKey=${apiKey}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const text = await response.text();
        if (!text) {
            return null;
        }
        const data = JSON.parse(text);
        return data;
    } catch (error) {
        console.error('Failed to fetch bulletins:', error);
        return null;
    }
}

async function fetchBulletinDetail(detailKey) {
    try {
        const response = await fetch(`https://api.weather.com/v3/alerts/detail?alertId=${detailKey}&format=json&language=en-US&apiKey=${apiKey}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch bulletin detail:', error);
        return null;
    }
}

function getSeverityOrder(significance) {
    switch (significance) {
        case 'W': return 3; // Warning (highest)
        case 'A': return 2; // Watch
        case 'Y': return 1; // Advisory (lowest)
        default: return 0;
    }
}

async function fetchPrimaryAndNearbyLocations() {
    const locationData = await fetchRawUserLocation();
    const twcLocationData = await fetchTWCUserLocation(locationData);

    if (twcLocationData) {
        const locId = twcLocationData.location.locId[0];
        const locLat = twcLocationData.location.latitude[0];
        const locLon = twcLocationData.location.longitude[0];
        const timezone = twcLocationData.location.ianaTimeZone[0];

        primaryLoc = { locId, lat: locLat, lon: locLon, city: twcLocationData.location.displayName[0], state: twcLocationData.location.adminDistrict[0], timezone: timezone};
        locations.push(primaryLoc);

        const nearbyCitiesData = await fetchNearbyCities(locLat, locLon);
        if (nearbyCitiesData && nearbyCitiesData.location) {
            // Fetch nearby location data in parallel
            const nearbyPromises = Array.from({ length: Math.min(8, nearbyCitiesData.location.latitude.length - 1) }, async (_, i) => {
                const index = i + 1;
                const nearbyLocData = {
                    lat: nearbyCitiesData.location.latitude[index],
                    lon: nearbyCitiesData.location.longitude[index]
                };
                const twcNearbyLocData = await fetchTWCUserLocation(nearbyLocData);
                if (twcNearbyLocData) {
                    const nearbyLoc = {
                        locId: twcNearbyLocData.location.locId[0],
                        lat: twcNearbyLocData.location.latitude[0],
                        lon: twcNearbyLocData.location.longitude[0],
                        city: twcNearbyLocData.location.displayName[0],
                        state: twcNearbyLocData.location.adminDistrict[0]
                    };
                    nearbyLocs.push(nearbyLoc);
                    locations.push(nearbyLoc);
                }
            });
            await Promise.all(nearbyPromises);
        }
    }
}

// Modify populate functions to accept a language
async function populateCurrentObs(lang) {
    await fetchPrimaryAndNearbyLocations();

    // Fetch all current observations in parallel
    const fetchPromises = locations.map(async location => {
        const apiUrl = `https://api.weather.com/v3/wx/observations/current?geocode=${location.lat},${location.lon}&units=e&language=${lang}&format=json&apiKey=${apiKey}`;
        try {
            const data = await fetchCurrentObservations(apiUrl, lang);
            if (data) {
                if (lang === "es-US") {
                    currentObs_es[location.locId] = {
                        city: location.city,
                        state: location.state,
                        ...data
                    };
                } else {
                    currentObs[location.locId] = {
                        city: location.city,
                        state: location.state,
                        ...data
                    };
                }
            } else {
                // If data fetch fails, create a fallback object
                if (lang === "es-US") {
                    currentObs_es[location.locId] = {
                        city: 'Not Available',
                        state: 'Not Available',
                        temperature: '--',
                        windSpeed: '--',
                        windDirectionCardinal: '--',
                        relativeHumidity: '--',
                        windGust: '--',
                        wxPhraseMedium: 'Data Unavailable',
                        iconCode: 44
                    };
                } else {
                    currentObs[location.locId] = {
                        city: 'Not Available',
                        state: 'Not Available',
                        temperature: '--',
                        windSpeed: '--',
                        windDirectionCardinal: '--',
                        relativeHumidity: '--',
                        windGust: '--',
                        wxPhraseMedium: 'Data Unavailable',
                        iconCode: 44
                    };
                }
            }
        } catch (error) {
            console.error(`Failed to fetch observations for ${location.city}:`, error);
            // Same fallback object on error
            if (lang === "es-US") {
                currentObs_es[location.locId] = {
                    city: 'No Disponible',
                    state: 'No Disponible',
                    temperature: '--',
                    windSpeed: '--',
                    windDirectionCardinal: '--',
                    relativeHumidity: '--',
                    windGust: '--',
                    wxPhraseMedium: 'Datos no Disponibles',
                    iconCode: 44
                };
            } else {
                currentObs[location.locId] = {
                    city: 'Not Available',
                    state: 'Not Available',
                    temperature: '--',
                    windSpeed: '--',
                    windDirectionCardinal: '--',
                    relativeHumidity: '--',
                    windGust: '--',
                    wxPhraseMedium: 'Data Unavailable',
                    iconCode: 44
                };
            }
        }
    });

    await Promise.all(fetchPromises);
}

// Modify populate functions to accept a language
async function populateForecasts(lang = "en-US") {
    const forecastPromises = locations.map(async location => {
        const apiUrl = `https://api.weather.com/v3/wx/forecast/daily/7day?geocode=${location.lat},${location.lon}&format=json&units=e&language=${lang}&apiKey=${apiKey}`;
        const data = await fetchForecasts(apiUrl, lang);
        
        if (data) {
            // Process 36-hour forecast (next 3 dayparts after current)
            const dayparts = data.daypart[0];
            const currentDaypartIndex = dayparts.daypartName.findIndex(name => name !== null);
            
            if (lang === "es-US") {
                thirtysixHour_es[location.locId] = {
                    city: location.city,
                    state: location.state,
                    periods: dayparts.daypartName
                        .slice(currentDaypartIndex , currentDaypartIndex + 3)
                        .map((name, idx) => ({
                            name,
                            narrative: dayparts.narrative[currentDaypartIndex + idx]
                        }))
                        .filter(period => period.name)
                };
            } else {
                thirtysixHour[location.locId] = {
                    city: location.city,
                    state: location.state,
                    periods: dayparts.daypartName
                        .slice(currentDaypartIndex , currentDaypartIndex + 3)
                        .map((name, idx) => ({
                            name,
                            narrative: dayparts.narrative[currentDaypartIndex + idx]
                        }))
                        .filter(period => period.name)
                };
            }
            // if (lang === "es-US") {
            //     console.log('36 hour Spanish forecast for location', location.city, ':', thirtysixHour_es[location.locId]);
            // }
            // else {
            //     console.log('36 hour forecast for location', location.city, ':', thirtysixHour[location.locId]);
            // }
            // Process 7-day forecast with daypart filtering
            const isValidPeriod = (name) => {
                if (!name) return false;
                const lowerName = name.toLowerCase();
                return !lowerName.includes('today') && 
                       !lowerName.includes('night') && 
                       !lowerName.includes('tonight') && 
                       !lowerName.includes('overnight');
            };

            const isValidPeriod_es = (name) => {
                if (!name) return false;
                const lowerName = name.toLowerCase();
                return !lowerName.includes('hoy') && 
                       !lowerName.includes('noche');
            };

            // Create mapping for shortened day names
            const shortDayNames = {
                'Sunday': 'SUN',
                'Monday': 'MON',
                'Tuesday': 'TUE',
                'Wednesday': 'WED',
                'Thursday': 'THU',
                'Friday': 'FRI',
                'Saturday': 'SAT'
            };

            const shortDayNames_es = {
                'Domingo': 'DOM',
                'Lunes': 'LUN',
                'Martes': 'MAR',
                'Miércoles': 'MIERC',
                'Jueves': 'JUE',
                'Viernes': 'VIE',
                'Sábado': 'SAB'
            };

            if (lang === "es-US") {
                sevenDay_es[location.locId] = {
                    city: location.city,
                    state: location.state,
                    days: Array.from({ length: 7 }, (_, i) => {
                        const dayStart = currentDaypartIndex + (i * 2);
                        let periodIndex = dayStart;
                        while (periodIndex < dayparts.daypartName.length && !isValidPeriod_es(dayparts.daypartName[periodIndex])) {
                            periodIndex++;
                        }
                        
                        return {
                            high: data.temperatureMax[i + 1],
                            low: data.temperatureMin[i + 1],
                            name: shortDayNames_es[data.dayOfWeek[i + 1]], // Use the shortened day name
                            icon: dayparts.iconCode[periodIndex],
                            phrase: dayparts.wxPhraseLong[periodIndex].toUpperCase()
                        };
                    })
                };
            } else {
                sevenDay[location.locId] = {
                    city: location.city,
                    state: location.state,
                    days: Array.from({ length: 7 }, (_, i) => {
                        const dayStart = currentDaypartIndex + (i * 2);
                        let periodIndex = dayStart;
                        while (periodIndex < dayparts.daypartName.length && !isValidPeriod(dayparts.daypartName[periodIndex])) {
                            periodIndex++;
                        }
                        
                        return {
                            high: data.temperatureMax[i + 1],
                            low: data.temperatureMin[i + 1],
                            name: shortDayNames[data.dayOfWeek[i + 1]], // Use the shortened day name
                            icon: dayparts.iconCode[periodIndex],
                            phrase: dayparts.wxPhraseShort[periodIndex].toUpperCase()
                        };
                    })
                };
            }

            // Create almanac record from forecast data
            if (lang === "es-US") {
                almanac_es[location.locId] = {
                    0: {
                        dayOfWeek: data.dayOfWeek[0].substring(0, 3).toUpperCase(),
                        sunrise: new Date(data.sunriseTimeLocal[0]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                        sunset: new Date(data.sunsetTimeLocal[0]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                    },
                    1: {
                        dayOfWeek: data.dayOfWeek[1].substring(0, 3).toUpperCase(),
                        sunrise: new Date(data.sunriseTimeLocal[1]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                        sunset: new Date(data.sunsetTimeLocal[1]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                        
                    },
                    moonPhases: [] // Will be populated by getMoonPhases
                };
            } else {
                almanac[location.locId] = {
                    0: {
                        dayOfWeek: data.dayOfWeek[0].substring(0, 3).toUpperCase(),
                        sunrise: new Date(data.sunriseTimeLocal[0]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                        sunset: new Date(data.sunsetTimeLocal[0]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                    },
                    1: {
                        dayOfWeek: data.dayOfWeek[1].substring(0, 3).toUpperCase(),
                        sunrise: new Date(data.sunriseTimeLocal[1]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                        sunset: new Date(data.sunsetTimeLocal[1]).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        }).toLowerCase(),
                        
                    },
                    moonPhases: [] // Will be populated by getMoonPhases
                };
            }

            // Add this console.log to verify initial almanac creation
            // console.log('Created initial almanac record for location', location.locId, ':', almanac[location.locId]);

            // Wait for moon phases to be populated before continuing
            await getMoonPhases(location.locId, lang);
            
            // console.log('7-day forecast for location', location.city, ':', sevenDay[location.locId]);
        }
    });

    // Wait for all forecasts and moon phases to complete
    await Promise.all(forecastPromises);
}

// Update getMoonPhases to accept an optional lang parameter if necessary
async function getMoonPhases(locId, lang) {
    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        const langCode = lang === "en-US" ? "en" : "es";
        const [currentMonthData, nextMonthData] = await Promise.all([
            fetch(`https://www.icalendar37.net/lunar/api/?lang=${langCode}&month=${currentMonth}&year=${currentYear}`).then(res => res.json()),
            fetch(`https://www.icalendar37.net/lunar/api/?lang=${langCode}&month=${currentMonth === 12 ? 1 : currentMonth + 1}&year=${currentMonth === 12 ? currentYear + 1 : currentYear}`).then(res => res.json())
        ]);



        const nextPhases = [];
        const processPhases = (data, year, month) => {
            for (let phase in data.phase) {
                if (data.phase[phase].isPhaseLimit && nextPhases.length < 4) {
                    nextPhases.push({
                        phaseName: data.phase[phase].phaseName.split(' ')[0],
                        date: new Date(year, month - 1, parseInt(phase)).toLocaleString('en-US', {month: 'short', day: 'numeric'})
                    });
                }
            }
        };

        processPhases(currentMonthData, currentYear, currentMonth);
        if (nextPhases.length < 4) {
            processPhases(nextMonthData, currentMonth === 12 ? currentYear + 1 : currentYear, currentMonth === 12 ? 1 : currentMonth + 1);
        }

        // Sort phases by date and ensure we have data before assigning
        nextPhases.sort((a, b) => new Date(a.date) - new Date(b.date));
        if (nextPhases.length > 0) {
            if (lang === "es-US") {
                almanac_es[locId].moonPhases = nextPhases;
            } else {
                almanac[locId].moonPhases = nextPhases;
            }
            return nextPhases;
        }
    } catch (error) {
        console.error('Error fetching moon phases:', error);
        // Provide default moon phases in case of error
        return [{phaseName: 'N/A', date: 'N/A'}];
    }
}

async function populateBulletins() {
    for (const location of locations) {
        const headlinesData = await fetchBulletins(location.lat, location.lon);
        
        if (headlinesData && headlinesData.alerts && headlinesData.alerts.length > 0) {
            // Sort all alerts by significance, overriding "Special Marine Warning" to "Y"
            const sortedAlerts = [...headlinesData.alerts].map(alert => ({
                ...alert,
                significance: alert.eventDescription === 'Special Marine Warning' ? 'Y' :
                              (alert.significance === 'S' ? 'Y' : alert.significance)
            })).sort((a, b) => 
                getSeverityOrder(b.significance) - getSeverityOrder(a.significance)
            );

            // Create an array to store all bulletin details for this location
            const locationBulletins = [];

            // Process each alert in order of significance
            for (const alert of sortedAlerts) {
                const detailData = await fetchBulletinDetail(alert.detailKey);
                if (detailData && detailData.alertDetail) {
                    locationBulletins.push({
                        source: detailData.alertDetail.source,
                        phenomena: detailData.alertDetail.phenomena,
                        significance: detailData.alertDetail.significance === 'S' ? 'Y' : detailData.alertDetail.significance,
                        messageType: detailData.alertDetail.messageType,
                        eventDescription: detailData.alertDetail.eventDescription,
                        headlineText: detailData.alertDetail.headlineText,
                        description: detailData.alertDetail.texts[0].description.replace(/(\r\n|\n|\r|\*)/gm, " "),
                        brief: "The " + detailData.alertDetail.source + " has issued a " + detailData.alertDetail.headlineText.replace(/until/gi, "for your viewing area until") + ". Stay tuned to The Weather Channel for further details.",
                        summary: detailData.alertDetail.headlineText.replace(/until/gi, "in effect until") + ".",
                        source: detailData.alertDetail.source,
                        expirationUTC: detailData.alertDetail.expireTimeUTC,
                    });
                }
            }

            // Store the array of bulletins for this location
            bulletins[location.locId] = locationBulletins;
            // console.log('Bulletins for location', location.city, ':', bulletins[location.locId]);
        }
    }
}

// Add this function after the variable declarations
function cleanupOldData() {
    // Keep only the last hour of bulletins
    for (const locId in bulletins) {
        if (bulletins[locId].length > 10) {
            bulletins[locId] = bulletins[locId].slice(-10);
        }
    }
    
    // Clean up observation data for removed locations
    const validLocIds = new Set(locations.map(loc => loc.locId));
    for (const locId in currentObs) {
        if (!validLocIds.has(locId)) {
            delete currentObs[locId];
            delete thirtysixHour[locId];
            delete sevenDay[locId];
            delete almanac[locId];
            delete bulletins[locId];
        }
    }
}

// In refreshData, call the default (en-US) functions and then Spanish ones
const refreshData = debounce(async function() {
    cleanupOldData();
    await Promise.all([
        populateCurrentObs("en-US"),
        populateCurrentObs("es-US"),
        populateForecasts("en-US"),
        populateForecasts("es-US"),
        populateBulletins()
    ]);
}, 1000);

const dataPopulationPromise = new Promise(async (resolve, reject) => {
    try {
        await Promise.all([
            populateCurrentObs("en-US"),
            populateCurrentObs("es-US"),
        ]);
        
        // Set default data if primary location wasn't populated
        if (!primaryLoc.locId || !currentObs[primaryLoc.locId]) {
            primaryLoc = {
                locId: 'DEFAULT',
                city: 'Not Available',
                state: 'Not Available',
                lat: 0,
                lon: 0
            };
            currentObs[primaryLoc.locId] = {
                city: 'Not Available',
                state: 'Not Available',
                temperature: '--',
                windSpeed: '--',
                windDirectionCardinal: '--',
                relativeHumidity: '--',
                windGust: '--',
                wxPhraseMedium: 'Data Unavailable',
                iconCode: 44,
                pressureAltimeter: '--'
            };

            // Add default 36-hour forecast data
            thirtysixHour[primaryLoc.locId] = {
                city: 'Not Available',
                state: 'Not Available',
                periods: [
                    { name: 'Not Available', narrative: 'Forecast data currently unavailable.' },
                    { name: 'Not Available', narrative: 'Forecast data currently unavailable.' },
                    { name: 'Not Available', narrative: 'Forecast data currently unavailable.' }
                ]
            };

            // Add default 7-day forecast data
            sevenDay[primaryLoc.locId] = {
                city: 'Not Available',
                state: 'Not Available',
                days: Array(7).fill({
                    high: '--',
                    low: '--',
                    name: 'N/A',
                    icon: 44,
                    phrase: 'NOT AVAILABLE'
                })
            };

            // Add default almanac data
            almanac[primaryLoc.locId] = {
                0: {
                    dayOfWeek: 'N/A',
                    sunrise: '--:-- am',
                    sunset: '--:-- pm'
                },
                1: {
                    dayOfWeek: 'N/A',
                    sunrise: '--:-- am',
                    sunset: '--:-- pm'
                },
                moonPhases: Array(4).fill({
                    phaseName: 'N/A',
                    date: 'N/A'
                })
            };
        }
        await Promise.all([
        populateForecasts("en-US"),
        populateForecasts("es-US"),
        ]);
        await populateBulletins();
        resolve();
    } catch (error) {
        console.error('Error during data population:', error);
        // Use the same default data structure as above
        // Set default data even on error
        primaryLoc = {
            locId: 'DEFAULT',
            city: 'Not Available',
            state: 'Not Available',
            lat: 0,
            lon: 0
        };
        
        // Set all default data structures here too
        currentObs[primaryLoc.locId] = {
            city: 'Not Available',
            state: 'Not Available',
            temperature: '--',
            windSpeed: '--',
            windDirectionCardinal: '--',
            relativeHumidity: '--',
            windGust: '--',
            wxPhraseMedium: 'Data Unavailable',
            iconCode: 44,
            pressureAltimeter: '--'
        };
        
        thirtysixHour[primaryLoc.locId] = {
            city: 'Not Available',
            state: 'Not Available',
            periods: [
                { name: 'Not Available', narrative: 'Forecast data currently unavailable.' },
                { name: 'Not Available', narrative: 'Forecast data currently unavailable.' },
                { name: 'Not Available', narrative: 'Forecast data currently unavailable.' }
            ]
        };

        sevenDay[primaryLoc.locId] = {
            city: 'Not Available',
            state: 'Not Available',
            days: Array(7).fill({
                high: '--',
                low: '--',
                name: 'N/A',
                icon: 44,
                phrase: 'NOT AVAILABLE'
            })
        };

        almanac[primaryLoc.locId] = {
            0: {
                dayOfWeek: 'N/A',
                sunrise: '--:-- am',
                sunset: '--:-- pm'
            },
            1: {
                dayOfWeek: 'N/A',
                sunrise: '--:-- am',
                sunset: '--:-- pm'
            },
            moonPhases: Array(4).fill({
                phaseName: 'N/A',
                date: 'N/A'
            })
        };

        resolve(); // Resolve with default data instead of rejecting
    }
});

// In updateFieldsWithNewData, check for a trailing "_es" in dataType.
async function updateFieldsWithNewData() {
    // Iterate all .textdata elements in slides
    const allFields = document.querySelectorAll('.slide .textdata');
    allFields.forEach(field => {
        // Normalize the field id by removing any package prefix
        let normalizedFieldId = field.id;
        if (normalizedFieldId.includes('_')) {
            normalizedFieldId = normalizedFieldId.split('_').slice(1).join('_');
        }
        // Use normalized id in place of the full id
        const dataTypeAttr = field.getAttribute('dataType');
        if (!dataTypeAttr) {
            return;
        }
        // Check if this field is for Spanish data
        let useSpanish = false;
        let baseDataType = dataTypeAttr;
        if (dataTypeAttr.endsWith("_es")) {
            useSpanish = true;
            baseDataType = dataTypeAttr.substring(0, dataTypeAttr.length - 3);
        }
        const [dataTypeBase, part] = baseDataType.split('_');

        let location = null;
        if (normalizedFieldId.startsWith('now')) {
            location = primaryLoc;
        } else if (normalizedFieldId.startsWith('near')) {
            const match = normalizedFieldId.match(/near\w+(\d+)/);
            if (match && match[1]) {
                const index = parseInt(match[1], 10) - 1;
                if (nearbyLocs[index]) {
                    location = nearbyLocs[index];
                }
            }
        } else if (normalizedFieldId.startsWith('36hr')) {
            location = primaryLoc;
        } else if (normalizedFieldId.startsWith('ext')) {
            location = primaryLoc;
        } else if (normalizedFieldId.startsWith('alm')) {
            location = primaryLoc;
        }

        if (!location) {
            return;
        }
        const locationId = location.locId;

        // Choose data objects based on language
        const obs = useSpanish ? currentObs_es : currentObs;
        const hr36 = useSpanish ? thirtysixHour_es : thirtysixHour;
        const ext = useSpanish ? sevenDay_es : sevenDay;
        const alm = useSpanish ? almanac_es : almanac;

        if (obs[locationId] && (normalizedFieldId.startsWith('now') || normalizedFieldId.startsWith('near'))) {
            let value = obs[locationId][dataTypeBase];
            if (dataTypeBase === 'windSpeedDir') {
                value = obs[locationId].windDirectionCardinal + ' ' + obs[locationId].windSpeed;
            }
            if (dataTypeBase === 'relativeHumidity') {
                value += '%';
            } else if (dataTypeBase === 'windGust') {
                value = value ? value + ' mph' : 'None';
            }
            field.textContent = value;
            if (dataTypeBase === 'wxPhraseMedium' || dataTypeBase === 'city') {
                const imgElement = document.querySelector(`#${field.id}_img`);
                if (imgElement) {
                    imgElement.src = `./images/wxicons/${obs[locationId].iconCode}.png`;
                }
            }
        } else if (hr36[locationId] && (normalizedFieldId.startsWith('36hr'))) {
            let value = "";
            if (dataTypeBase === 'name') {
                value = hr36[locationId].periods[part].name;
            } else if (dataTypeBase === 'narrative') {
                value = hr36[locationId].periods[part].narrative;
            }
            field.textContent = value;
        } else if (ext[locationId] && (normalizedFieldId.startsWith('ext'))) {
            let value = "";
            if (dataTypeBase === 'name') {
                value = ext[locationId].days[part].name;
            } else if (dataTypeBase === 'high') {
                value = ext[locationId].days[part].high;
            } else if (dataTypeBase === 'low') {
                value = ext[locationId].days[part].low;
            } else if (dataTypeBase === 'icon') {
                const imgElement = document.querySelector(`#${field.id}_img`);
                if (imgElement) {
                    imgElement.src = `./images/wxicons/${obs[locationId].iconCode}.png`;
                }
            } else if (dataTypeBase === 'phrase') {
                value = ext[locationId].days[part].phrase;
            }
            field.textContent = value;
        } else if (alm[locationId] && (normalizedFieldId.startsWith('alm'))) {
            let value = "";
            if (dataTypeBase === 'dayOfWeek') {
                value = alm[locationId][part].dayOfWeek;
            } else if (dataTypeBase === 'sunrise') {
                value = alm[locationId][part].sunrise;
            } else if (dataTypeBase === 'sunset') {
                value = alm[locationId][part].sunset;
            } else if (dataTypeBase === "phaseName") {
                value = alm[locationId].moonPhases[part].phaseName;
            } else if (dataTypeBase === "date") {
                value = alm[locationId].moonPhases[part].date;
            }
            field.textContent = value;
        } else {
            console.log(`No data found for dataType: ${dataTypeBase} in location: ${locationId}`);
        }
    });
}

export { 
    currentObs, 
    primaryLoc, 
    nearbyLocs, 
    dataPopulationPromise, 
    refreshData, 
    updateFieldsWithNewData,
    thirtysixHour,
    sevenDay,
    bulletins,
    almanac,
    currentObs_es,
    thirtysixHour_es,
    sevenDay_es,
    almanac_es
};