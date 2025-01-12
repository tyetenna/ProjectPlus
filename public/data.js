import { apiKey } from './config.js';

var locations = [];
var currentObs = {};
var primaryLoc = {};
var nearbyLocs = [];
var thirtysixHour = {};
var sevenDay = {};
var bulletins = {};
let almanac = {};

async function fetchRawUserLocation() {
    const customLoc = window.location.search.substring(1);

    if (customLoc) {
        try {
            const response = await fetch(`https://api.weather.com/v3/location/search?query=${customLoc}&language=en-US&format=json&apiKey=45720848946ac3b87c8eeca0686a11ad`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
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
            const response = await fetch('https://pro.ip-api.com/json/?key=AmUN9xAaQALVYu6');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
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
            const response = await fetch(`https://api.weather.com/v3/location/search?query=${lat},${lon}&language=en-US&format=json&apiKey=${apiKey}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
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
                    adminDistrict: ['Not Available']
                }
            };
        }
    }
}

async function fetchNearbyCities(lat, lon) {
    try {
        const response = await fetch(`https://api.weather.com/v3/location/near?geocode=${lat},${lon}&product=observation&format=json&apiKey=${apiKey}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch nearby cities:', error);
        return null;
    }
}

async function fetchCurrentObservations(apiUrl) {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch current observations:', error);
        return null;
    }
}

async function fetchForecasts(apiUrl) {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
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

        primaryLoc = { locId, lat: locLat, lon: locLon, city: twcLocationData.location.displayName[0], state: twcLocationData.location.adminDistrict[0] };
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

async function populateCurrentObs() {
    await fetchPrimaryAndNearbyLocations();

    // Fetch all current observations in parallel
    const fetchPromises = locations.map(async location => {
        const apiUrl = `https://api.weather.com/v3/wx/observations/current?geocode=${location.lat},${location.lon}&units=e&language=en-US&format=json&apiKey=${apiKey}`;
        try {
            const data = await fetchCurrentObservations(apiUrl);
            if (data) {
                currentObs[location.locId] = {
                    city: location.city,
                    state: location.state,
                    ...data
                };
            } else {
                // If data fetch fails, create a fallback object
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
        } catch (error) {
            console.error(`Failed to fetch observations for ${location.city}:`, error);
            // Same fallback object on error
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
    });

    await Promise.all(fetchPromises);
}

async function populateForecasts() {
    const forecastPromises = locations.map(async location => {
        const apiUrl = `https://api.weather.com/v3/wx/forecast/daily/7day?geocode=${location.lat},${location.lon}&format=json&units=e&language=en-US&apiKey=${apiKey}`;
        const data = await fetchForecasts(apiUrl);
        
        if (data) {
            // Process 36-hour forecast (next 3 dayparts after current)
            const dayparts = data.daypart[0];
            const currentDaypartIndex = dayparts.daypartName.findIndex(name => name !== null);
            
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
            // console.log('36 hour forecast for location', location.city, ':', thirtysixHour[location.locId]);
            // Process 7-day forecast with daypart filtering
            const isValidPeriod = (name) => {
                if (!name) return false;
                const lowerName = name.toLowerCase();
                return !lowerName.includes('today') && 
                       !lowerName.includes('night') && 
                       !lowerName.includes('tonight') && 
                       !lowerName.includes('overnight');
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

            // Create almanac record from forecast data
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

            // Add this console.log to verify initial almanac creation
            // console.log('Created initial almanac record for location', location.locId, ':', almanac[location.locId]);

            // Wait for moon phases to be populated before continuing
            await getMoonPhases(location.locId);
            
            // console.log('7-day forecast for location', location.city, ':', sevenDay[location.locId]);
        }
    });

    // Wait for all forecasts and moon phases to complete
    await Promise.all(forecastPromises);
}

async function getMoonPhases(locId) {
    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        const [currentMonthData, nextMonthData] = await Promise.all([
            fetch(`https://www.icalendar37.net/lunar/api/?lang=en&month=${currentMonth}&year=${currentYear}`).then(res => res.json()),
            fetch(`https://www.icalendar37.net/lunar/api/?lang=en&month=${currentMonth === 12 ? 1 : currentMonth + 1}&year=${currentMonth === 12 ? currentYear + 1 : currentYear}`).then(res => res.json())
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
            almanac[locId].moonPhases = nextPhases;
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
            // Sort all alerts by significance
            const sortedAlerts = [...headlinesData.alerts].map(alert => ({
                ...alert,
                significance: alert.significance === 'S' ? 'Y' : alert.significance
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
                        brief: "The " + detailData.alertDetail.source + " has issued a " + detailData.alertDetail.headlineText.replace(/until/gi, "for your viewing area until") + ". Stay tuned to The Weather Channel for further details."
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

// Modify refreshData function
async function refreshData() {
    // Clean up old data before fetching new data
    cleanupOldData();
    
    await populateCurrentObs();
    await populateForecasts();
    await populateBulletins();
}

const dataPopulationPromise = new Promise(async (resolve, reject) => {
    try {
        await populateCurrentObs();
        
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

        await populateForecasts();
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

async function updateFieldsWithNewData() {
    const allFields = document.querySelectorAll('.slide .textdata');
    allFields.forEach(field => {
        const fieldId = field.id;
        const dataTypeAttr = field.getAttribute('dataType');
        if (!dataTypeAttr) {
            // console.log(`Ignoring field: ${fieldId} as it does not have a dataType attribute`);
            return;
        }
        const [dataType, part] = dataTypeAttr.split('_'); // Read the dataType attribute

        // Ignore fields without a dataType value
        if (!dataType) {
            console.log(`Ignoring field: ${fieldId} as it does not have a dataType attribute`);
            return;
        }

        // Determine the location based on field ID
        let location = null;

        if (fieldId.startsWith('now')) {
            location = primaryLoc;
        } else if (fieldId.startsWith('near')) {
            // Extract the number from the field ID, e.g., 'nearCity1' -> index 0
            const match = fieldId.match(/near\w+(\d+)/);
            if (match && match[1]) {
                const index = parseInt(match[1], 10) - 1; // 'nearCity1' corresponds to nearbyLocs[0]
                if (nearbyLocs[index]) {
                    location = nearbyLocs[index];
                }
            }
        } else if (fieldId.startsWith('36hr')) {
            // 36Hr only uses the primary location
            location = primaryLoc;
        } else if (fieldId.startsWith('ext')) {
            // Extended only uses the primary location
            location = primaryLoc;
        } else if (fieldId.startsWith('alm')) {
            // Almanac only uses the primary location
            location = primaryLoc;
        }

        if (!location) {
            // console.log(`No location found for field: ${fieldId}`);
            return;
        }

        const locationId = location.locId;

        if (currentObs[locationId] && (fieldId.startsWith('now') || fieldId.startsWith('near'))) {
            let value = currentObs[locationId][dataType];
            if (dataType === 'windSpeedDir') {
                value = currentObs[locationId].windDirectionCardinal + ' ' + currentObs[locationId].windSpeed;
            }
            if (dataType === 'relativeHumidity') {
                value += '%';
            } else if (dataType === 'windGust') {
                value = value ? value + ' mph' : 'None';
            }
            field.textContent = value;
            // console.log(`Updated field: ${fieldId} with value: ${value}`);
            if (dataType === 'wxPhraseMedium' || 'city') {
                const imgElement = document.querySelector(`#${fieldId}_img`);
                if (imgElement) {
                    imgElement.src = `./images/wxicons/${currentObs[locationId].iconCode}.png`;
                    // console.log(`Updated image src for field: ${fieldId} with src: ./images/wxicons/${currentObs[locationId].iconCode}.png`);
                }
            }
        } else if (thirtysixHour[locationId] && (fieldId.startsWith('36hr'))){
            let value = thirtysixHour[locationId][dataType];
            if (dataType === 'name') {
                value = thirtysixHour[locationId].periods[part].name;
            } else if (dataType === 'narrative') {
                value = thirtysixHour[locationId].periods[part].narrative;
            }
            field.textContent = value;
        } else if (sevenDay[locationId] && (fieldId.startsWith('ext'))){
            // Extract the type and day from the dataType attribute
            let value = sevenDay[locationId][dataType];
            if (dataType === 'name') {
                value = sevenDay[locationId].days[part].name;
            } else if (dataType === 'high') {
                value = sevenDay[locationId].days[part].high;
            } else if (dataType === 'low') {
                value = sevenDay[locationId].days[part].low;
            } else if (dataType === 'icon') {
                const imgElement = document.querySelector(`#${fieldId}_img`);
                if (imgElement) {
                    imgElement.src = `./images/wxicons/${currentObs[locationId].iconCode}.png`;
                    // console.log(`Updated image src for field: ${fieldId} with src: ./images/wxicons/${sevenDay[locationId].days[part].icon}.png`);
                }
            } else if (dataType === 'phrase') {
                value = sevenDay[locationId].days[part].phrase;
            }
            field.textContent = value;
        } else if (almanac[locationId] && (fieldId.startsWith('alm'))){
            let value = almanac[locationId][dataType];
            if (dataType === 'dayOfWeek') {
                value = almanac[locationId][part].dayOfWeek;
            } else if (dataType === 'sunrise') {
                value = almanac[locationId][part].sunrise;
            } else if (dataType === 'sunset') {
                value = almanac[locationId][part].sunset;
            } else if (dataType === "phaseName") {
                value = almanac[locationId].moonPhases[part].phaseName;
            } else if (dataType === "date") {
                value = almanac[locationId].moonPhases[part].date;
            }
            field.textContent = value;
        } else {
            console.log(`No data found for dataType: ${dataType} in location: ${locationId}`);
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
    almanac
};