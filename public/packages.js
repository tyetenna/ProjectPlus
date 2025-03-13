import { enabledPackageNames } from './config.js';
import { currentObs, thirtysixHour, sevenDay, almanac, primaryLoc, nearbyLocs, dataPopulationPromise, currentObs_es, sevenDay_es, almanac_es } from './data.js';

// Update the packageState object with more complete package info
const packageState = {
    currentPackage: 'Core',
    enabledPackages: ['Core', 'ExtraLocal', 'Spanish', 'Summer', 'Winter', 'Golf', 'BoatBeach', 'Garden', 'Ski', 'FallFoliage', 'Health', 'Aviation', 'Airport', 'Travel', 'IntlTravel'], 
    disabledPackages: ['Summer', 'Winter', 'Golf', 'BoatBeach', 'Garden', 'Ski', 'FallFoliage', 'Health', 'Aviation', 'Airport', 'Travel', 'IntlTravel'], // Disabled packages in settings menu
    packageTitles: {
        'Core': 'Your Local Forecast',
        'MiniCore': 'Your Local Forecast',
        get ExtraLocal() { return primaryLoc && primaryLoc.city ? `Forecast for ${primaryLoc.city}` : 'Forecast for Unknown'; },
        'Spanish': 'Spanish Forecast',
        'Summer': 'Outdoor Activity',
        'Winter': 'Outdoor Activity',
        'Golf': 'Golf',
        'BoatBeach': 'Boat and Beach',
        'Garden': 'Gardening',
        'Ski': 'Skiing',
        'FallFoliage': 'Fall Foliage',
        'Health': 'Health',
        'Aviation': 'Aviation',
        'Airport': 'Airport',
        'Travel': 'Travel Outlook',
        'IntlTravel': 'International Travel'
    }
};
// Packages are defined as async functions that return an array of slides
// Each slide is an object with the following properties:
// id: unique identifier for the slide
// src: path to the background image
// text: title text for the slide
// noFade: boolean to disable fade transition
// duration: time in seconds before advancing to the next slide
// slide: path to the slide image (optional)
// overlay: path to the overlay image (optional)
// vocallocal: boolean to enable vocal local (optional)
// fields: array of objects with text, id, className, dataType, and imgSrc properties (optional)
//
// The Core package is the primary package that displays the local forecast
const Core = async (locale) => {
    const thisPackage = "Core";  // current package name
    await dataPopulationPromise;

    // Check if locale is defined
    if (!locale) {
        throw new Error('Locale is not defined');
    }

    // Verify that primary location data exists
    if (!primaryLoc.locId || !currentObs[primaryLoc.locId]) {
        console.error('Primary location data not available');
        // Set default data
        primaryLoc.locId = 'DEFAULT';
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
    }

    // Ensure nearbyLocs has enough entries with default data
    while (nearbyLocs.length < 8) {
        const defaultLocId = `DEFAULT_${nearbyLocs.length}`;
        nearbyLocs.push({
            locId: defaultLocId,
            city: 'Not Available',
            state: 'Not Available'
        });
        currentObs[defaultLocId] = {
            city: 'Not Available',
            state: 'Not Available',
            temperature: '--',
            windSpeed: '--',
            windDirectionCardinal: '--',
            iconCode: 44
        };
    }

    // Create UpNext slide using only the enabledPackageNames list
    const slides = [];
    if (enabledPackageNames.length >= 1) {
        const upNextFields = enabledPackageNames.map(pkg => ({
            text: packageState.packageTitles[pkg],
            id: `${thisPackage}_upnext_${pkg.toLowerCase()}`,  // modified ID with package prefix
            className: `upnext_item${pkg === thisPackage ? ' upnext_item-current' : ''}`,
            dataType: 'package_name'
        }));
        slides.unshift({
            id: `${thisPackage}_UpNext`,  // modified to be unique per package
            src: './images/background/' + locale + '/upnext.png',
            text: 'Up Next...',
            noFade: true,
            duration: 6,
            slide: null,
            overlay: './images/Plus_UpNext.png',
            fields: upNextFields
        });
    }
    
    // For each remaining slide, prepend the package name to the id.
    slides.push(
        { id: `${thisPackage}_Radar`, src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            { id: `${thisPackage}_radarMapContainer`, className: 'map-container', dataType: 'local_Radar' }
        ] },
        { id: `${thisPackage}_Now`, src: './images/background/' + locale + '/now.png', text: 'Current Conditions', noFade: true, duration: 10, slide: './images/Slide_Now.png', overlay: './images/Plus_Product.png', vocallocal: true, fields: [
            { text: currentObs[primaryLoc.locId].city, id: `${thisPackage}_nowCity`, className: 'city', dataType:"city", imgSrc: null },
            { text: currentObs[primaryLoc.locId].relativeHumidity + "%", id: `${thisPackage}_nowHumidity`, className: 'humidity', dataType:"relativeHumidity", imgSrc: null },
            { text: currentObs[primaryLoc.locId].pressureAltimeter, id: `${thisPackage}_nowPressure`, className: 'pressure', dataType:"pressureAltimeter", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windSpeedDisplay, id: `${thisPackage}_nowWind`, className: 'wind', dataType:"windSpeedDir", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windGust ? currentObs[primaryLoc.locId].windGust + " mph" : "None", id: `${thisPackage}_nowGusts`, className: 'gusts', dataType:"windGust", imgSrc: null },
            { text: currentObs[primaryLoc.locId].temperature, id: `${thisPackage}_nowTemperature`, className: 'temperature', dataType:"temperature", imgSrc: null },
            { text: currentObs[primaryLoc.locId].wxPhraseMedium, id: `${thisPackage}_nowCondition`, className: 'condition', dataType:"wxPhraseMedium", imgSrc: `./images/wxicons/${currentObs[primaryLoc.locId].iconCode}.png` }
        ] },
        { id: `${thisPackage}_Nearby1`, src: './images/background/' + locale + '/nearby.png', text: 'Current Conditions', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            { text: "TEMP", id: `${thisPackage}_nearTempLabel`, className: 'tempLabel', imgSrc: null },
            { text: "WIND", id: `${thisPackage}_nearWindLabel`, className: 'windLabel', imgSrc: null },
            // Nearby City 1
            { text: currentObs[nearbyLocs[0].locId].city, id: `${thisPackage}_nearCity1`, className: 'city_1', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[0].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[0].locId].temperature, id: `${thisPackage}_nearTemp1`, className: 'temperature_1', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[0].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir1`, className: 'windDir_1', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[0].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed1`, className: 'windSpeed_1', dataType:"windSpeedDir", imgSrc: null },
            // Nearby City 2
            { text: currentObs[nearbyLocs[1].locId].city, id: `${thisPackage}_nearCity2`, className: 'city_2', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[1].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[1].locId].temperature, id: `${thisPackage}_nearTemp2`, className: 'temperature_2', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[1].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir2`, className: 'windDir_2', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[1].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed2`, className: 'windSpeed_2', dataType:"windSpeedDir", imgSrc: null },
            // Nearby City 3
            { text: currentObs[nearbyLocs[2].locId].city, id: `${thisPackage}_nearCity3`, className: 'city_3', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[2].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[2].locId].temperature, id: `${thisPackage}_nearTemp3`, className: 'temperature_3', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[2].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir3`, className: 'windDir_3', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[2].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed3`, className: 'windSpeed_3', dataType:"windSpeedDir", imgSrc: null },
            // Nearby City 4
            { text: currentObs[nearbyLocs[3].locId].city, id: `${thisPackage}_nearCity4`, className: 'city_4', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[3].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[3].locId].temperature, id: `${thisPackage}_nearTemp4`, className: 'temperature_4', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[3].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir4`, className: 'windDir_4', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[3].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed4`, className: 'windSpeed_4', dataType:"windSpeedDir", imgSrc: null },
        ] },
        { id: `${thisPackage}_Nearby2`, src: './images/background/' + locale + '/nearby.png', text: 'Current Conditions', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "TEMP", id: `${thisPackage}_nearTempLabel`, className: 'tempLabel', imgSrc: null },
            { text: "WIND", id: `${thisPackage}_nearWindLabel`, className: 'windLabel', imgSrc: null },
            // Nearby City 5
            { text: currentObs[nearbyLocs[4].locId].city, id: `${thisPackage}_nearCity5`, className: 'city_1', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[4].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[4].locId].temperature, id: `${thisPackage}_nearTemp5`, className: 'temperature_1', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[4].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir5`, className: 'windDir_1', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[4].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed5`, className: 'windSpeed_1', dataType:"windSpeedDir", imgSrc: null },
            // Nearby City 6
            { text: currentObs[nearbyLocs[5].locId].city, id: `${thisPackage}_nearCity6`, className: 'city_2', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[5].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[5].locId].temperature, id: `${thisPackage}_nearTemp6`, className: 'temperature_2', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[5].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir6`, className: 'windDir_2', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[5].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed6`, className: 'windSpeed_2', dataType:"windSpeedDir", imgSrc: null },
            // Nearby City 7
            { text: currentObs[nearbyLocs[6].locId].city, id: `${thisPackage}_nearCity7`, className: 'city_3', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[6].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[6].locId].temperature, id: `${thisPackage}_nearTemp7`, className: 'temperature_3', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[6].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir7`, className: 'windDir_3', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[6].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed7`, className: 'windSpeed_3', dataType:"windSpeedDir", imgSrc: null },
            // Nearby City 8
            { text: currentObs[nearbyLocs[7].locId].city, id: `${thisPackage}_nearCity8`, className: 'city_4', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[7].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[7].locId].temperature, id: `${thisPackage}_nearTemp8`, className: 'temperature_4', dataType:"temperature", imgSrc: null },
            // { text: currentObs[nearbyLocs[7].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir8`, className: 'windDir_4', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[7].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed8`, className: 'windSpeed_4', dataType:"windSpeedDir", imgSrc: null },
        ] },
        { id: `${thisPackage}_Radar2`, src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            // Add a container for the radar map
            { id: `${thisPackage}_radarMapContainer`, className: 'map-container', dataType: 'local_Radar' } // Added dataType "Radar"
        ] },
        { id: `${thisPackage}_thirtysixHour1`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: true, fields: [
                { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].name, id: `${thisPackage}_36hrName1`, className: 'name', dataType:"name_0", imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].narrative, id: `${thisPackage}_36hrNarrative1`, className: 'narrative', dataType:"narrative_0", imgSrc: null }
            ]
        },
        { id: `${thisPackage}_thirtysixHour2`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].name, id: `${thisPackage}_36hrName2`, className: 'name', dataType:"name_1", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].narrative, id: `${thisPackage}_36hrNarrative2`, className: 'narrative', dataType:"narrative_1", imgSrc: null },
        ] },
        { id: `${thisPackage}_thirtysixHour3`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].name, id: `${thisPackage}_36hrName3`, className: 'name', dataType:"name_2", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].narrative, id: `${thisPackage}_36hrNarrative3`, className: 'narrative', dataType:"narrative_2", imgSrc: null },
        ] },
        { id: `${thisPackage}_Extended`, src: './images/background/' + locale + '/extended.png', text: 'Extended Forecast', noFade: false, duration: 10, slide: './images/Slide_Extended.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: sevenDay[primaryLoc.locId].city, id: `${thisPackage}_extCity`, className: 'city', dataType:"city", imgSrc: null },
            // Day 1
            { text: sevenDay[primaryLoc.locId].days[0].name, id: `${thisPackage}_extName1`, className: 'name1', dataType:"name_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].high, id: `${thisPackage}_extHigh1`, className: 'high1', dataType:"high_0", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash1`, className: 'slash1', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].low, id: `${thisPackage}_extLow1`, className: 'low1', dataType:"low_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].phrase, id: `${thisPackage}_extPhrase1`, className: 'phrase1', dataType:"phrase_0", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[0].icon}.png` },
            // Day 2
            { text: sevenDay[primaryLoc.locId].days[1].name, id: `${thisPackage}_extName2`, className: 'name2', dataType:"name_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].high, id: `${thisPackage}_extHigh2`, className: 'high2', dataType:"high_1", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash2`, className: 'slash2', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].low, id: `${thisPackage}_extLow2`, className: 'low2', dataType:"low_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].phrase, id: `${thisPackage}_extPhrase2`, className: 'phrase2', dataType:"phrase_1", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[1].icon}.png` },
            // Day 3
            { text: sevenDay[primaryLoc.locId].days[2].name, id: `${thisPackage}_extName3`, className: 'name3', dataType:"name_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].high, id: `${thisPackage}_extHigh3`, className: 'high3', dataType:"high_2", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash3`, className: 'slash3', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].low, id: `${thisPackage}_extLow3`, className: 'low3', dataType:"low_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].phrase, id: `${thisPackage}_extPhrase3`, className: 'phrase3', dataType:"phrase_2", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[2].icon}.png` },
            // Day 4
            { text: sevenDay[primaryLoc.locId].days[3].name, id: `${thisPackage}_extName4`, className: 'name4', dataType:"name_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].high, id: `${thisPackage}_extHigh4`, className: 'high4', dataType:"high_3", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash4`, className: 'slash4', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].low, id: `${thisPackage}_extLow4`, className: 'low4', dataType:"low_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].phrase, id: `${thisPackage}_extPhrase4`, className: 'phrase4', dataType:"phrase_3", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[3].icon}.png` },
            // Day 5
            { text: sevenDay[primaryLoc.locId].days[4].name, id: `${thisPackage}_extName5`, className: 'name5', dataType:"name_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].high, id: `${thisPackage}_extHigh5`, className: 'high5', dataType:"high_4", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash5`, className: 'slash5', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].low, id: `${thisPackage}_extLow5`, className: 'low5', dataType:"low_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].phrase, id: `${thisPackage}_extPhrase5`, className: 'phrase5', dataType:"phrase_4", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[4].icon}.png` },
        ]},
        { id: `${thisPackage}_Almanac`, src: './images/background/' + locale + '/almanac.png', text: 'Almanac', noFade: false, duration: 10, slide: './images/Slide_Almanac.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            // Text Labels
            { text:"Sunrise", id: `${thisPackage}_sunriseLabel`, className: 'sunriseLabel', imgSrc: null },
            { text:"Sunset", id: `${thisPackage}_sunsetLabel`, className: 'sunsetLabel', imgSrc: null },
            // Days of the Week
            { text:almanac[primaryLoc.locId][0].dayOfWeek, id: `${thisPackage}_almDow1`, className: 'dow1', dataType: "dayOfWeek_0", imgSrc: null },
            { text:almanac[primaryLoc.locId][1].dayOfWeek, id: `${thisPackage}_almDow2`, className: 'dow2', dataType: "dayOfWeek_1", imgSrc: null },
            // Sunrise and Sunset Times
            { text:almanac[primaryLoc.locId][0].sunrise, id: `${thisPackage}_almSunriseTime1`, className: 'sunriseTime1', dataType: "sunrise_0", imgSrc: null },
            { text:almanac[primaryLoc.locId][0].sunset, id: `${thisPackage}_almSunsetTime1`, className: 'sunsetTime1', dataType: "sunset_0", imgSrc: null },
            { text:almanac[primaryLoc.locId][1].sunrise, id: `${thisPackage}_almSunriseTime2`, className: 'sunriseTime2', dataType: "sunrise_1", imgSrc: null },
            { text:almanac[primaryLoc.locId][1].sunset, id: `${thisPackage}_almSunsetTime2`, className: 'sunsetTime2', dataType: "sunset_1", imgSrc: null },
            // Moon Phase Names + Icons
            { text: almanac[primaryLoc.locId].moonPhases[0].phaseName, id: `${thisPackage}_almPhase1`, className: 'phase1', dataType: "phaseName_0", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[0].phaseName}.png` },
            { text: almanac[primaryLoc.locId].moonPhases[1].phaseName, id: `${thisPackage}_almPhase2`, className: 'phase2', dataType: "phaseName_1", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[1].phaseName}.png` },
            { text: almanac[primaryLoc.locId].moonPhases[2].phaseName, id: `${thisPackage}_almPhase3`, className: 'phase3', dataType: "phaseName_2", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[2].phaseName}.png` },
            { text: almanac[primaryLoc.locId].moonPhases[3].phaseName, id: `${thisPackage}_almPhase4`, className: 'phase4', dataType: "phaseName_3", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[3].phaseName}.png` },
            // Moon Phase Dates
            { text:almanac[primaryLoc.locId].moonPhases[0].date, id: `${thisPackage}_almDate1`, className: 'date1', dataType: "date_0", imgSrc: null },
            { text:almanac[primaryLoc.locId].moonPhases[1].date, id: `${thisPackage}_almDate2`, className: 'date2', dataType: "date_1", imgSrc: null },
            { text:almanac[primaryLoc.locId].moonPhases[2].date, id: `${thisPackage}_almDate3`, className: 'date3', dataType: "date_2", imgSrc: null },
            { text:almanac[primaryLoc.locId].moonPhases[3].date, id: `${thisPackage}_almDate4`, className: 'date4', dataType: "date_3", imgSrc: null },
        ] },
        { id: `${thisPackage}_RegSat`, src: './images/background/' + locale + '/almanac.png', text: 'Regional Satellite', noFade: true, duration: 20, slide: './images/Slide_Satellite.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            // Add a container for the radar map
            { id: `${thisPackage}_radarMapContainer`, className: 'map-container', dataType: 'regional_Sat' } 
        ] },
        { id: `${thisPackage}_RegRad`, src: './images/background/' + locale + '/almanac.png', text: 'Regional Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            // Add a container for the radar map
            { id: `${thisPackage}_radarMapContainer`, className: 'map-container', dataType: 'regional_Radar' } 
        ] },
        { id: `${thisPackage}_Radar3`, src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            // Add a container for the radar map
            { id: `${thisPackage}_radarMapContainer`, className: 'map-container', dataType: 'local_Radar' } // Added dataType "Radar"
        ] }
    );
    
    return slides;
};
const MiniCore = async (locale) => {
    const thisPackage = "MiniCore";  // current package name
    await dataPopulationPromise;

    // Check if locale is defined
    if (!locale) {
        throw new Error('Locale is not defined');
    }

    // Verify that primary location data exists
    if (!primaryLoc.locId || !currentObs[primaryLoc.locId]) {
        console.error('Primary location data not available');
        // Set default data
        primaryLoc.locId = 'DEFAULT';
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
    }

    // Ensure nearbyLocs has enough entries with default data
    while (nearbyLocs.length < 8) {
        const defaultLocId = `DEFAULT_${nearbyLocs.length}`;
        nearbyLocs.push({
            locId: defaultLocId,
            city: 'Not Available',
            state: 'Not Available'
        });
        currentObs[defaultLocId] = {
            city: 'Not Available',
            state: 'Not Available',
            temperature: '--',
            windSpeed: '--',
            windDirectionCardinal: '--',
            iconCode: 44
        };
    }

    // Always create UpNext using the enabledPackageNames
    const slides = [];
    if (enabledPackageNames.length >= 1) {
        const upNextFields = enabledPackageNames.map(pkg => ({
            text: packageState.packageTitles[pkg],
            id: `${thisPackage}_upnext_${pkg.toLowerCase()}`,  // unique per package
            className: `upnext_item${pkg === thisPackage ? ' upnext_item-current' : ''}`,
            dataType: 'package_name'
        }));
        slides.unshift({
            id: `${thisPackage}_UpNext`,
            src: './images/background/' + locale + '/upnext.png',
            text: 'Up Next...',
            noFade: true,
            duration: 6,
            slide: null,
            overlay: './images/Plus_UpNext.png',
            fields: upNextFields
        });
    }
    slides.push(
        { id: `${thisPackage}_Radar`, src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            { id: `${thisPackage}_radarMapContainer`, className: 'map-container', dataType: 'local_Radar' }
        ] },
        { id: `${thisPackage}_Now`, src: './images/background/' + locale + '/now.png', text: 'Current Conditions', noFade: true, duration: 10, slide: './images/Slide_Now.png', overlay: './images/Plus_Product.png', vocallocal: true, fields: [
            { text: currentObs[primaryLoc.locId].city, id: `${thisPackage}_nowCity`, className: 'city', dataType: "city", imgSrc: null },
            { text: currentObs[primaryLoc.locId].relativeHumidity + "%", id: `${thisPackage}_nowHumidity`, className: 'humidity', dataType: "relativeHumidity", imgSrc: null },
            { text: currentObs[primaryLoc.locId].pressureAltimeter, id: `${thisPackage}_nowPressure`, className: 'pressure', dataType: "pressureAltimeter", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windSpeedDisplay, id: `${thisPackage}_nowWind`, className: 'wind', dataType: "windSpeedDir", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windGust ? currentObs[primaryLoc.locId].windGust + " mph" : "None", id: `${thisPackage}_nowGusts`, className: 'gusts', dataType: "windGust", imgSrc: null },
            { text: currentObs[primaryLoc.locId].temperature, id: `${thisPackage}_nowTemperature`, className: 'temperature', dataType: "temperature", imgSrc: null },
            { text: currentObs[primaryLoc.locId].wxPhraseMedium, id: `${thisPackage}_nowCondition`, className: 'condition', dataType: "wxPhraseMedium", imgSrc: `./images/wxicons/${currentObs[primaryLoc.locId].iconCode}.png` }
        ] },
        { id: `${thisPackage}_thirtysixHour1`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: true, fields: [
                { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].name, id: `${thisPackage}_36hrName1`, className: 'name', dataType: "name_0", imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].narrative, id: `${thisPackage}_36hrNarrative1`, className: 'narrative', dataType: "narrative_0", imgSrc: null }
            ]
        },
        { id: `${thisPackage}_thirtysixHour2`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].name, id: `${thisPackage}_36hrName2`, className: 'name', dataType: "name_1", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].narrative, id: `${thisPackage}_36hrNarrative2`, className: 'narrative', dataType: "narrative_1", imgSrc: null },
        ] },
        { id: `${thisPackage}_thirtysixHour3`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].name, id: `${thisPackage}_36hrName3`, className: 'name', dataType: "name_2", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].narrative, id: `${thisPackage}_36hrNarrative3`, className: 'narrative', dataType: "narrative_2", imgSrc: null }
        ] },
        { id: `${thisPackage}_Extended`, src: './images/background/' + locale + '/extended.png', text: 'Extended Forecast', noFade: false, duration: 10, slide: './images/Slide_Extended.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: sevenDay[primaryLoc.locId].city, id: `${thisPackage}_extCity`, className: 'city', dataType:"city", imgSrc: null },
            // Day 1
            { text: sevenDay[primaryLoc.locId].days[0].name, id: `${thisPackage}_extName1`, className: 'name1', dataType:"name_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].high, id: `${thisPackage}_extHigh1`, className: 'high1', dataType:"high_0", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash1`, className: 'slash1', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].low, id: `${thisPackage}_extLow1`, className: 'low1', dataType:"low_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].phrase, id: `${thisPackage}_extPhrase1`, className: 'phrase1', dataType:"phrase_0", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[0].icon}.png` },
            // Day 2
            { text: sevenDay[primaryLoc.locId].days[1].name, id: `${thisPackage}_extName2`, className: 'name2', dataType:"name_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].high, id: `${thisPackage}_extHigh2`, className: 'high2', dataType:"high_1", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash2`, className: 'slash2', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].low, id: `${thisPackage}_extLow2`, className: 'low2', dataType:"low_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].phrase, id: `${thisPackage}_extPhrase2`, className: 'phrase2', dataType:"phrase_1", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[1].icon}.png` },
            // Day 3
            { text: sevenDay[primaryLoc.locId].days[2].name, id: `${thisPackage}_extName3`, className: 'name3', dataType:"name_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].high, id: `${thisPackage}_extHigh3`, className: 'high3', dataType:"high_2", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash3`, className: 'slash3', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].low, id: `${thisPackage}_extLow3`, className: 'low3', dataType:"low_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].phrase, id: `${thisPackage}_extPhrase3`, className: 'phrase3', dataType:"phrase_2", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[2].icon}.png` },
            // Day 4
            { text: sevenDay[primaryLoc.locId].days[3].name, id: `${thisPackage}_extName4`, className: 'name4', dataType:"name_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].high, id: `${thisPackage}_extHigh4`, className: 'high4', dataType:"high_3", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash4`, className: 'slash4', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].low, id: `${thisPackage}_extLow4`, className: 'low4', dataType:"low_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].phrase, id: `${thisPackage}_extPhrase4`, className: 'phrase4', dataType:"phrase_3", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[3].icon}.png` },
            // Day 5
            { text: sevenDay[primaryLoc.locId].days[4].name, id: `${thisPackage}_extName5`, className: 'name5', dataType:"name_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].high, id: `${thisPackage}_extHigh5`, className: 'high5', dataType:"high_4", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash5`, className: 'slash5', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].low, id: `${thisPackage}_extLow5`, className: 'low5', dataType:"low_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].phrase, id: `${thisPackage}_extPhrase5`, className: 'phrase5', dataType:"phrase_4", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[4].icon}.png` },
        ]},
        { id: `${thisPackage}_Radar2`, src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            // Add a container for the radar map
            { id: `${thisPackage}_radarMapContainer`, className: 'map-container', dataType: 'local_Radar' } // Added dataType "Radar"
        ] }
    );
    return { name: thisPackage, slides };
};
const ExtraLocal = async (locale) => {
    const thisPackage = "ExtraLocal";  // current package name
    await dataPopulationPromise;

    // Check if locale is defined
    if (!locale) {
        throw new Error('Locale is not defined');
    }

    // Verify that primary location data exists
    if (!primaryLoc.locId || !currentObs[primaryLoc.locId]) {
        console.error('Primary location data not available');
        // Set default data
        primaryLoc.locId = 'DEFAULT';
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
    }

    // Ensure nearbyLocs has enough entries with default data
    while (nearbyLocs.length < 8) {
        const defaultLocId = `DEFAULT_${nearbyLocs.length}`;
        nearbyLocs.push({
            locId: defaultLocId,
            city: 'Not Available',
            state: 'Not Available'
        });
        currentObs[defaultLocId] = {
            city: 'Not Available',
            state: 'Not Available',
            temperature: '--',
            windSpeed: '--',
            windDirectionCardinal: '--',
            iconCode: 44
        };
    }

    // Always create UpNext using the enabledPackageNames
    const slides = [];
    if (enabledPackageNames.length >= 1) {
        const upNextFields = enabledPackageNames.map(pkg => ({
            text: packageState.packageTitles[pkg],
            id: `${thisPackage}_upnext_${pkg.toLowerCase()}`,  // unique per package
            className: `upnext_item${pkg === thisPackage ? ' upnext_item-current' : ''}`,
            dataType: 'package_name'
        }));
        slides.unshift({
            id: `${thisPackage}_UpNext`,
            src: './images/background/' + locale + '/upnext.png',
            text: 'Up Next...',
            noFade: true,
            duration: 6,
            slide: null,
            overlay: './images/Plus_UpNext.png',
            fields: upNextFields
        });
    }
    slides.push(
        { id: `${thisPackage}_Now`, src: './images/background/' + locale + '/now.png', text: 'Current Conditions', noFade: true, duration: 10, slide: './images/Slide_Now.png', overlay: './images/Plus_Product.png', vocallocal: true, fields: [
            { text: currentObs[primaryLoc.locId].city, id: `${thisPackage}_nowCity`, className: 'city', dataType: "city", imgSrc: null },
            { text: currentObs[primaryLoc.locId].relativeHumidity + "%", id: `${thisPackage}_nowHumidity`, className: 'humidity', dataType: "relativeHumidity", imgSrc: null },
            { text: currentObs[primaryLoc.locId].pressureAltimeter, id: `${thisPackage}_nowPressure`, className: 'pressure', dataType: "pressureAltimeter", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windSpeedDisplay, id: `${thisPackage}_nowWind`, className: 'wind', dataType: "windSpeedDir", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windGust ? currentObs[primaryLoc.locId].windGust + " mph" : "None", id: `${thisPackage}_nowGusts`, className: 'gusts', dataType: "windGust", imgSrc: null },
            { text: currentObs[primaryLoc.locId].temperature, id: `${thisPackage}_nowTemperature`, className: 'temperature', dataType: "temperature", imgSrc: null },
            { text: currentObs[primaryLoc.locId].wxPhraseMedium, id: `${thisPackage}_nowCondition`, className: 'condition', dataType: "wxPhraseMedium", imgSrc: `./images/wxicons/${currentObs[primaryLoc.locId].iconCode}.png` }
        ] },
        { id: `${thisPackage}_thirtysixHour1`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: true, fields: [
                { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].name, id: `${thisPackage}_36hrName1`, className: 'name', dataType: "name_0", imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].narrative, id: `${thisPackage}_36hrNarrative1`, className: 'narrative', dataType: "narrative_0", imgSrc: null }
            ]
        },
        { id: `${thisPackage}_thirtysixHour2`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].name, id: `${thisPackage}_36hrName2`, className: 'name', dataType: "name_1", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].narrative, id: `${thisPackage}_36hrNarrative2`, className: 'narrative', dataType: "narrative_1", imgSrc: null },
        ] },
        { id: `${thisPackage}_thirtysixHour3`, src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "National Weather Service", id: `${thisPackage}_36hrNWS`, className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].name, id: `${thisPackage}_36hrName3`, className: 'name', dataType: "name_2", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].narrative, id: `${thisPackage}_36hrNarrative3`, className: 'narrative', dataType: "narrative_2", imgSrc: null }
        ] },
        { id: `${thisPackage}_Extended`, src: './images/background/' + locale + '/extended.png', text: 'Extended Forecast', noFade: false, duration: 10, slide: './images/Slide_Extended.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: sevenDay[primaryLoc.locId].city, id: `${thisPackage}_extCity`, className: 'city', dataType:"city", imgSrc: null },
            // Day 1
            { text: sevenDay[primaryLoc.locId].days[0].name, id: `${thisPackage}_extName1`, className: 'name1', dataType:"name_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].high, id: `${thisPackage}_extHigh1`, className: 'high1', dataType:"high_0", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash1`, className: 'slash1', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].low, id: `${thisPackage}_extLow1`, className: 'low1', dataType:"low_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].phrase, id: `${thisPackage}_extPhrase1`, className: 'phrase1', dataType:"phrase_0", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[0].icon}.png` },
            // Day 2
            { text: sevenDay[primaryLoc.locId].days[1].name, id: `${thisPackage}_extName2`, className: 'name2', dataType:"name_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].high, id: `${thisPackage}_extHigh2`, className: 'high2', dataType:"high_1", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash2`, className: 'slash2', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].low, id: `${thisPackage}_extLow2`, className: 'low2', dataType:"low_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].phrase, id: `${thisPackage}_extPhrase2`, className: 'phrase2', dataType:"phrase_1", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[1].icon}.png` },
            // Day 3
            { text: sevenDay[primaryLoc.locId].days[2].name, id: `${thisPackage}_extName3`, className: 'name3', dataType:"name_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].high, id: `${thisPackage}_extHigh3`, className: 'high3', dataType:"high_2", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash3`, className: 'slash3', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].low, id: `${thisPackage}_extLow3`, className: 'low3', dataType:"low_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].phrase, id: `${thisPackage}_extPhrase3`, className: 'phrase3', dataType:"phrase_2", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[2].icon}.png` },
            // Day 4
            { text: sevenDay[primaryLoc.locId].days[3].name, id: `${thisPackage}_extName4`, className: 'name4', dataType:"name_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].high, id: `${thisPackage}_extHigh4`, className: 'high4', dataType:"high_3", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash4`, className: 'slash4', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].low, id: `${thisPackage}_extLow4`, className: 'low4', dataType:"low_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].phrase, id: `${thisPackage}_extPhrase4`, className: 'phrase4', dataType:"phrase_3", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[3].icon}.png` },
            // Day 5
            { text: sevenDay[primaryLoc.locId].days[4].name, id: `${thisPackage}_extName5`, className: 'name5', dataType:"name_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].high, id: `${thisPackage}_extHigh5`, className: 'high5', dataType:"high_4", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash5`, className: 'slash5', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].low, id: `${thisPackage}_extLow5`, className: 'low5', dataType:"low_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].phrase, id: `${thisPackage}_extPhrase5`, className: 'phrase5', dataType:"phrase_4", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[4].icon}.png` },
        ]}
    );
    return { name: thisPackage, slides };
};

// ------------------------------
// Non-locale packages
// ------------------------------

const Spanish = async (locale) => {
    const thisPackage = "Spanish";  // current package name
    await dataPopulationPromise;

    // Check if locale is defined
    if (!locale) {
        throw new Error('Locale is not defined');
    }

    // Verify that primary location data exists
    if (!primaryLoc.locId || !currentObs[primaryLoc.locId]) {
        console.error('Primary location data not available');
        // Set default data
        primaryLoc.locId = 'DEFAULT';
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
    }

    // Ensure nearbyLocs has enough entries with default data
    while (nearbyLocs.length < 8) {
        const defaultLocId = `DEFAULT_${nearbyLocs.length}`;
        nearbyLocs.push({
            locId: defaultLocId,
            city: 'Not Available',
            state: 'Not Available'
        });
        currentObs[defaultLocId] = {
            city: 'Not Available',
            state: 'Not Available',
            temperature: '--',
            windSpeed: '--',
            windDirectionCardinal: '--',
            iconCode: 44
        };
    }

    // Create UpNext slide using only the enabledPackageNames list
    const slides = [];
    if (enabledPackageNames.length >= 1) {
        const upNextFields = enabledPackageNames.map(pkg => ({
            text: packageState.packageTitles[pkg],
            id: `${thisPackage}_upnext_${pkg.toLowerCase()}`,  // modified ID with package prefix
            className: `upnext_item${pkg === thisPackage ? ' upnext_item-current' : ''}`,
            dataType: 'package_name'
        }));
        slides.unshift({
            id: `${thisPackage}_UpNext`,  // modified to be unique per package
            src: './images/background/packages/' + thisPackage + '/upnext.png',
            text: 'Up Next...',
            noFade: true,
            duration: 6,
            slide: null,
            overlay: './images/Plus_UpNext.png',
            fields: upNextFields
        });
    }
    
    // For each remaining slide, prepend the package name to the id.
    slides.push(
        { id: `${thisPackage}_Now`, src: './images/background/packages/' + thisPackage + '/now.png', text: 'Condiciones Actuales', noFade: true, duration: 10, slide: './images/Slide_NowES.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            { text: currentObs_es[primaryLoc.locId].city, id: `${thisPackage}_nowCity`, className: 'city', dataType:"city_es", imgSrc: null },
            { text: currentObs_es[primaryLoc.locId].relativeHumidity + "%", id: `${thisPackage}_nowHumidity`, className: 'humidity', dataType:"relativeHumidity_es", imgSrc: null },
            { text: currentObs_es[primaryLoc.locId].pressureAltimeter, id: `${thisPackage}_nowPressure`, className: 'pressure', dataType:"pressureAltimeter_es", imgSrc: null },
            { text: currentObs_es[primaryLoc.locId].windSpeedDisplay, id: `${thisPackage}_nowWind`, className: 'wind', dataType:"windSpeedDir_es", imgSrc: null },
            { text: currentObs_es[primaryLoc.locId].windGust ? currentObs[primaryLoc.locId].windGust + " mph" : "None", id: `${thisPackage}_nowGusts`, className: 'gusts', dataType:"windGust_es", imgSrc: null },
            { text: currentObs_es[primaryLoc.locId].temperature, id: `${thisPackage}_nowTemperature`, className: 'temperature', dataType:"temperature_es", imgSrc: null },
            { text: currentObs_es[primaryLoc.locId].wxPhraseLong, id: `${thisPackage}_nowCondition`, className: 'condition', dataType:"wxPhraseLong_es", imgSrc: `./images/wxicons/${currentObs[primaryLoc.locId].iconCode}.png` }
        ] },
        { id: `${thisPackage}_Nearby1`, src: './images/background/packages/' + thisPackage + '/nearby.png', text: 'Condiciones Actuales', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields: [
            { text: "TEMP", id: `${thisPackage}_nearTempLabel`, className: 'tempLabel', imgSrc: null },
            { text: "VIENTO", id: `${thisPackage}_nearWindLabel`, className: 'windLabel', imgSrc: null },
            // Nearby City 1
            { text: currentObs_es[nearbyLocs[0].locId].city, id: `${thisPackage}_nearCity1`, className: 'city_1', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[0].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[0].locId].temperature, id: `${thisPackage}_nearTemp1`, className: 'temperature_1', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[0].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir1`, className: 'windDir_1', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[0].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed1`, className: 'windSpeed_1', dataType:"windSpeedDir_es", imgSrc: null },
            // Nearby City 2
            { text: currentObs_es[nearbyLocs[1].locId].city, id: `${thisPackage}_nearCity2`, className: 'city_2', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[1].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[1].locId].temperature, id: `${thisPackage}_nearTemp2`, className: 'temperature_2', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[1].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir2`, className: 'windDir_2', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[1].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed2`, className: 'windSpeed_2', dataType:"windSpeedDir_es", imgSrc: null },
            // Nearby City 3
            { text: currentObs_es[nearbyLocs[2].locId].city, id: `${thisPackage}_nearCity3`, className: 'city_3', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[2].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[2].locId].temperature, id: `${thisPackage}_nearTemp3`, className: 'temperature_3', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[2].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir3`, className: 'windDir_3', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[2].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed3`, className: 'windSpeed_3', dataType:"windSpeedDir_es", imgSrc: null },
            // Nearby City 4
            { text: currentObs_es[nearbyLocs[3].locId].city, id: `${thisPackage}_nearCity4`, className: 'city_4', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[3].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[3].locId].temperature, id: `${thisPackage}_nearTemp4`, className: 'temperature_4', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[3].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir4`, className: 'windDir_4', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[3].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed4`, className: 'windSpeed_4', dataType:"windSpeedDir_es", imgSrc: null },
        ] },
        { id: `${thisPackage}_Nearby2`, src: './images/background/packages/' + thisPackage + '/nearby.png', text: 'Condiciones Actuales', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: "TEMP", id: `${thisPackage}_nearTempLabel`, className: 'tempLabel', imgSrc: null },
            { text: "VIENTO", id: `${thisPackage}_nearWindLabel`, className: 'windLabel', imgSrc: null },
            // Nearby City 5
            { text: currentObs_es[nearbyLocs[4].locId].city, id: `${thisPackage}_nearCity5`, className: 'city_1', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[4].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[4].locId].temperature, id: `${thisPackage}_nearTemp5`, className: 'temperature_1', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[4].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir5`, className: 'windDir_1', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[4].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed5`, className: 'windSpeed_1', dataType:"windSpeedDir_es", imgSrc: null },
            // Nearby City 6
            { text: currentObs_es[nearbyLocs[5].locId].city, id: `${thisPackage}_nearCity6`, className: 'city_2', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs_es[nearbyLocs[5].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[5].locId].temperature, id: `${thisPackage}_nearTemp6`, className: 'temperature_2', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[5].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir6`, className: 'windDir_2', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[5].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed6`, className: 'windSpeed_2', dataType:"windSpeedDir_es", imgSrc: null },
            // Nearby City 7
            { text: currentObs_es[nearbyLocs[6].locId].city, id: `${thisPackage}_nearCity7`, className: 'city_3', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs_es[nearbyLocs[6].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[6].locId].temperature, id: `${thisPackage}_nearTemp7`, className: 'temperature_3', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[6].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir7`, className: 'windDir_3', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[6].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed7`, className: 'windSpeed_3', dataType:"windSpeedDir_es", imgSrc: null },
            // Nearby City 8
            { text: currentObs_es[nearbyLocs[7].locId].city, id: `${thisPackage}_nearCity8`, className: 'city_4', dataType:"city_es", imgSrc: `./images/wxicons/${currentObs_es[nearbyLocs[7].locId].iconCode}.png` },
            { text: currentObs_es[nearbyLocs[7].locId].temperature, id: `${thisPackage}_nearTemp8`, className: 'temperature_4', dataType:"temperature_es", imgSrc: null },
            // { text: currentObs_es[nearbyLocs[7].locId].windDirectionCardinal, id: `${thisPackage}_nearWindDir8`, className: 'windDir_4', dataType:"windDirectionCardinal_es", imgSrc: null },
            { text: currentObs_es[nearbyLocs[7].locId].windSpeedDisplay , id: `${thisPackage}_nearWindSpeed8`, className: 'windSpeed_4', dataType:"windSpeedDir_es", imgSrc: null },
        ] },
        { id: `${thisPackage}_Extended`, src: './images/background/packages/' + thisPackage + '/extended.png', text: 'Pronóstico Extendido', noFade: false, duration: 10, slide: './images/Slide_Extended.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            { text: sevenDay_es[primaryLoc.locId].city, id: `${thisPackage}_extCity`, className: 'city', dataType:"city_es", imgSrc: null },
            // Day 1
            { text: sevenDay_es[primaryLoc.locId].days[0].name, id: `${thisPackage}_extName1`, className: 'name1', dataType:"name_0_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[0].high, id: `${thisPackage}_extHigh1`, className: 'high1', dataType:"high_0_es", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash1`, className: 'slash1', imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[0].low, id: `${thisPackage}_extLow1`, className: 'low1', dataType:"low_0_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[0].phrase, id: `${thisPackage}_extPhrase1`, className: 'phrase1_es', dataType:"phrase_0_es", imgSrc: `./images/wxicons/${sevenDay_es[primaryLoc.locId].days[0].icon}.png` },
            // Day 2
            { text: sevenDay_es[primaryLoc.locId].days[1].name, id: `${thisPackage}_extName2`, className: 'name2', dataType:"name_1_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[1].high, id: `${thisPackage}_extHigh2`, className: 'high2', dataType:"high_1_es", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash2`, className: 'slash2', imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[1].low, id: `${thisPackage}_extLow2`, className: 'low2', dataType:"low_1_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[1].phrase, id: `${thisPackage}_extPhrase2`, className: 'phrase2_es', dataType:"phrase_1_es", imgSrc: `./images/wxicons/${sevenDay_es[primaryLoc.locId].days[1].icon}.png` },
            // Day 3
            { text: sevenDay_es[primaryLoc.locId].days[2].name, id: `${thisPackage}_extName3`, className: 'name3', dataType:"name_2_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[2].high, id: `${thisPackage}_extHigh3`, className: 'high3', dataType:"high_2_es", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash3`, className: 'slash3', imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[2].low, id: `${thisPackage}_extLow3`, className: 'low3', dataType:"low_2_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[2].phrase, id: `${thisPackage}_extPhrase3`, className: 'phrase3_es', dataType:"phrase_2_es", imgSrc: `./images/wxicons/${sevenDay_es[primaryLoc.locId].days[2].icon}.png` },
            // Day 4
            { text: sevenDay_es[primaryLoc.locId].days[3].name, id: `${thisPackage}_extName4`, className: 'name4', dataType:"name_3_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[3].high, id: `${thisPackage}_extHigh4`, className: 'high4', dataType:"high_3_es", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash4`, className: 'slash4', imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[3].low, id: `${thisPackage}_extLow4`, className: 'low4', dataType:"low_3_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[3].phrase, id: `${thisPackage}_extPhrase4`, className: 'phrase4_es', dataType:"phrase_3_es", imgSrc: `./images/wxicons/${sevenDay_es[primaryLoc.locId].days[3].icon}.png` },
            // Day 5
            { text: sevenDay_es[primaryLoc.locId].days[4].name, id: `${thisPackage}_extName5`, className: 'name5', dataType:"name_4_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[4].high, id: `${thisPackage}_extHigh5`, className: 'high5', dataType:"high_4_es", imgSrc: null },
            { text: "/", id: `${thisPackage}_extSlash5`, className: 'slash5', imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[4].low, id: `${thisPackage}_extLow5`, className: 'low5', dataType:"low_4_es", imgSrc: null },
            { text: sevenDay_es[primaryLoc.locId].days[4].phrase, id: `${thisPackage}_extPhrase5`, className: 'phrase5_es', dataType:"phrase_4_es", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[4].icon}.png` },
        ]},
        { id: `${thisPackage}_Almanac`, src: './images/background/packages/' + thisPackage + '/almanac.png', text: 'Almanaque', noFade: false, duration: 10, slide: './images/Slide_AlmanacES.png', overlay: './images/Plus_Product.png', vocallocal: false, fields:[
            // Text Labels
            { text:"Salida", id: `${thisPackage}_sunriseLabel`, className: 'sunriseLabel', imgSrc: null },
            { text:"Puesta", id: `${thisPackage}_sunsetLabel`, className: 'sunsetLabel', imgSrc: null },
            // Days of the Week
            { text:almanac_es[primaryLoc.locId][0].dayOfWeek, id: `${thisPackage}_almDow1`, className: 'dow1', dataType: "dayOfWeek_0_es", imgSrc: null },
            { text:almanac_es[primaryLoc.locId][1].dayOfWeek, id: `${thisPackage}_almDow2`, className: 'dow2', dataType: "dayOfWeek_1_es", imgSrc: null },
            // Sunrise and Sunset Times
            { text:almanac_es[primaryLoc.locId][0].sunrise, id: `${thisPackage}_almSunriseTime1`, className: 'sunriseTime1', dataType: "sunrise_0_es", imgSrc: null },
            { text:almanac_es[primaryLoc.locId][0].sunset, id: `${thisPackage}_almSunsetTime1`, className: 'sunsetTime1', dataType: "sunset_0_es", imgSrc: null },
            { text:almanac_es[primaryLoc.locId][1].sunrise, id: `${thisPackage}_almSunriseTime2`, className: 'sunriseTime2', dataType: "sunrise_1_es", imgSrc: null },
            { text:almanac_es[primaryLoc.locId][1].sunset, id: `${thisPackage}_almSunsetTime2`, className: 'sunsetTime2', dataType: "sunset_1_es", imgSrc: null },
            // Moon Phase Names + Icons
            { text: almanac_es[primaryLoc.locId].moonPhases[0].phaseName, id: `${thisPackage}_almPhase1`, className: 'phase1', dataType: "phaseName_0_es", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[0].phaseName}.png` },
            { text: almanac_es[primaryLoc.locId].moonPhases[1].phaseName, id: `${thisPackage}_almPhase2`, className: 'phase2', dataType: "phaseName_1_es", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[1].phaseName}.png` },
            { text: almanac_es[primaryLoc.locId].moonPhases[2].phaseName, id: `${thisPackage}_almPhase3`, className: 'phase3', dataType: "phaseName_2_es", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[2].phaseName}.png` },
            { text: almanac_es[primaryLoc.locId].moonPhases[3].phaseName, id: `${thisPackage}_almPhase4`, className: 'phase4', dataType: "phaseName_3_es", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[3].phaseName}.png` },
            // Moon Phase Dates
            { text:almanac_es[primaryLoc.locId].moonPhases[0].date, id: `${thisPackage}_almDate1`, className: 'date1', dataType: "date_0_es", imgSrc: null },
            { text:almanac_es[primaryLoc.locId].moonPhases[1].date, id: `${thisPackage}_almDate2`, className: 'date2', dataType: "date_1_es", imgSrc: null },
            { text:almanac_es[primaryLoc.locId].moonPhases[2].date, id: `${thisPackage}_almDate3`, className: 'date3', dataType: "date_2_es", imgSrc: null },
            { text:almanac_es[primaryLoc.locId].moonPhases[3].date, id: `${thisPackage}_almDate4`, className: 'date4', dataType: "date_3_es", imgSrc: null },
        ] }
    );
    
    return slides;
};


// Add this function to initialize the package state
export function initializePackages(enabledPackagesList) {
    // Validate each package has a title
    packageState.enabledPackages = enabledPackagesList.filter(pkg => {
        if (!packageState.packageTitles[pkg]) {
            console.warn(`Package "${pkg}" has no title defined in packageTitles`);
            return false;
        }
        return true;
    });
    packageState.currentPackage = packageState.enabledPackages[0];
    console.log('Initialized packages:', packageState);
}

// Export the package state to be accessed by other modules
export { packageState };

// Initial call to refresh data and set interval
dataPopulationPromise.then(() => {
    // setInterval(() => refreshDataAndSlides(configLocale), 10000); // Refresh every 10 minutes
});

export { Core, MiniCore, ExtraLocal, Spanish };