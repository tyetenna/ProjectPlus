import { locale as configLocale, enabledPackages } from './config.js';
import { currentObs, thirtysixHour, sevenDay, almanac, primaryLoc, nearbyLocs, dataPopulationPromise, refreshData, updateFieldsWithNewData } from './data.js';
import { createSlideElements } from './client.js';

// Update the packageState object with more complete package info
const packageState = {
    currentPackage: 'Core',
    enabledPackages: ['Core', 'ExtraLocal', 'Spanish', 'Summer', 'Winter', 'Golf', 'BoatBeach', 'Garden', 'Ski', 'FallFoliage', 'Health', 'Aviation', 'Airport', 'Travel', 'IntlTravel'], 
    packageTitles: {
        'Core': 'Your Local Forecast',
        'MiniCore': 'Your Local Forecast',
        'ExtraLocal': 'Your Local Forecast',
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

// Add this function to get the next, current, and previous packages
function getPackageContext(currentPackage) {
    const packages = packageState.enabledPackages;
    const currentIndex = packages.indexOf(currentPackage);
    return {
        previous: packages[currentIndex - 1] || packages[packages.length - 1],
        current: currentPackage,
        next: packages[(currentIndex + 1) % packages.length]
    };
}

// Package contents
const Core = async (locale) => {
    await dataPopulationPromise;

    // Check if locale is defined
    if (!locale) {
        throw new Error('Locale is not defined');
    }

    // Get package context for the UpNext slide
    const context = getPackageContext('Core');
    
    // Create the UpNext slide with proper package information
    const upNextFields = packageState.enabledPackages.map((pkg) => ({
        text: packageState.packageTitles[pkg],
        id: `upnext_${pkg.toLowerCase()}`,
        className: `upnext_item${pkg === 'Core' ? ' upnext_item-current' : ''}`,
        dataType: 'package_name'
    }));

    const slides = [
        { id: 'UpNext', src: './images/background/' + locale + '/upnext.png', text: 'Up Next...', noFade: true, duration: 6, slide: null, overlay: './images/Plus_UpNext.png', fields: upNextFields},
        { id: 'Radar', src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', fields: [
            { id: 'radarMapContainer', className: 'map-container', dataType: 'local_Radar' } 
        ] },
        { id: 'Now', src: './images/background/' + locale + '/now.png', text: 'Current Conditions', noFade: true, duration: 10, slide: './images/Slide_Now.png', overlay: './images/Plus_Product.png', fields: [
            { text: currentObs[primaryLoc.locId].city, id: 'nowCity', className: 'city', dataType:"city", imgSrc: null },
            { text: currentObs[primaryLoc.locId].relativeHumidity + "%", id: 'nowHumidity', className: 'humidity', dataType:"relativeHumidity", imgSrc: null },
            { text: currentObs[primaryLoc.locId].pressureAltimeter, id: 'nowPressure', className: 'pressure', dataType:"pressureAltimeter", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windDirectionCardinal + " " + currentObs[primaryLoc.locId].windSpeed, id: 'nowWind', className: 'wind', dataType:"windSpeedDir", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windGust ? currentObs[primaryLoc.locId].windGust + " mph" : "None", id: 'nowGusts', className: 'gusts', dataType:"windGust", imgSrc: null },
            { text: currentObs[primaryLoc.locId].temperature, id: 'nowTemperature', className: 'temperature', dataType:"temperature", imgSrc: null },
            { text: currentObs[primaryLoc.locId].wxPhraseMedium, id: 'nowCondition', className: 'condition', dataType:"wxPhraseMedium", imgSrc: `./images/wxicons/${currentObs[primaryLoc.locId].iconCode}.png` }
        ] },
        { id: 'Nearby1', src: './images/background/' + locale + '/nearby.png', text: 'Current Conditions', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields: [
            { text: "TEMP", id: 'nearTempLabel', className: 'tempLabel', imgSrc: null },
            { text: "WIND", id: 'nearWindLabel', className: 'windLabel', imgSrc: null },
            // Nearby City 1
            { text: currentObs[nearbyLocs[0].locId].city, id: 'nearCity1', className: 'city_1', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[0].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[0].locId].temperature, id: 'nearTemp1', className: 'temperature_1', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[0].locId].windDirectionCardinal, id: 'nearWindDir1', className: 'windDir_1', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[0].locId].windSpeed, id: 'nearWindSpeed1', className: 'windSpeed_1', dataType:"windSpeed", imgSrc: null },
            // Nearby City 2
            { text: currentObs[nearbyLocs[1].locId].city, id: 'nearCity2', className: 'city_2', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[1].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[1].locId].temperature, id: 'nearTemp2', className: 'temperature_2', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[1].locId].windDirectionCardinal, id: 'nearWindDir2', className: 'windDir_2', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[1].locId].windSpeed, id: 'nearWindSpeed2', className: 'windSpeed_2', dataType:"windSpeed", imgSrc: null },
            // Nearby City 3
            { text: currentObs[nearbyLocs[2].locId].city, id: 'nearCity3', className: 'city_3', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[2].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[2].locId].temperature, id: 'nearTemp3', className: 'temperature_3', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[2].locId].windDirectionCardinal, id: 'nearWindDir3', className: 'windDir_3', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[2].locId].windSpeed, id: 'nearWindSpeed3', className: 'windSpeed_3', dataType:"windSpeed", imgSrc: null },
            // Nearby City 4
            { text: currentObs[nearbyLocs[3].locId].city, id: 'nearCity4', className: 'city_4', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[3].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[3].locId].temperature, id: 'nearTemp4', className: 'temperature_4', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[3].locId].windDirectionCardinal, id: 'nearWindDir4', className: 'windDir_4', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[3].locId].windSpeed, id: 'nearWindSpeed4', className: 'windSpeed_4', dataType:"windSpeed", imgSrc: null },
        ] },
        { id: 'Nearby2', src: './images/background/' + locale + '/nearby.png', text: 'Current Conditions', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields:[
            { text: "TEMP", id: 'nearTempLabel', className: 'tempLabel', imgSrc: null },
            { text: "WIND", id: 'nearWindLabel', className: 'windLabel', imgSrc: null },
            // Nearby City 5
            { text: currentObs[nearbyLocs[4].locId].city, id: 'nearCity5', className: 'city_1', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[4].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[4].locId].temperature, id: 'nearTemp5', className: 'temperature_1', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[4].locId].windDirectionCardinal, id: 'nearWindDir5', className: 'windDir_1', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[4].locId].windSpeed, id: 'nearWindSpeed5', className: 'windSpeed_1', dataType:"windSpeed", imgSrc: null },
            // Nearby City 6
            { text: currentObs[nearbyLocs[5].locId].city, id: 'nearCity6', className: 'city_2', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[5].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[5].locId].temperature, id: 'nearTemp6', className: 'temperature_2', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[5].locId].windDirectionCardinal, id: 'nearWindDir6', className: 'windDir_2', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[5].locId].windSpeed, id: 'nearWindSpeed6', className: 'windSpeed_2', dataType:"windSpeed", imgSrc: null },
            // Nearby City 7
            { text: currentObs[nearbyLocs[6].locId].city, id: 'nearCity7', className: 'city_3', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[6].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[6].locId].temperature, id: 'nearTemp7', className: 'temperature_3', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[6].locId].windDirectionCardinal, id: 'nearWindDir7', className: 'windDir_3', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[6].locId].windSpeed, id: 'nearWindSpeed7', className: 'windSpeed_3', dataType:"windSpeed", imgSrc: null },
            // Nearby City 8
            { text: currentObs[nearbyLocs[7].locId].city, id: 'nearCity8', className: 'city_4', dataType:"city", imgSrc: `./images/wxicons/${currentObs[nearbyLocs[7].locId].iconCode}.png` },
            { text: currentObs[nearbyLocs[7].locId].temperature, id: 'nearTemp8', className: 'temperature_4', dataType:"temperature", imgSrc: null },
            { text: currentObs[nearbyLocs[7].locId].windDirectionCardinal, id: 'nearWindDir8', className: 'windDir_4', dataType:"windDirectionCardinal", imgSrc: null },
            { text: currentObs[nearbyLocs[7].locId].windSpeed, id: 'nearWindSpeed8', className: 'windSpeed_4', dataType:"windSpeed", imgSrc: null },
        ] },
        { id: 'Radar2', src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', fields: [
            // Add a container for the radar map
            { id: 'radarMapContainer', className: 'map-container', dataType: 'local_Radar' } // Added dataType "Radar"
        ] },
        { id: 'thirtysixHour1', src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields: [
                { text: "National Weather Service", id: '36hrNWS', className: 'nws', imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].name, id: '36hrName1', className: 'name', dataType:"name_0", imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].narrative, id: '36hrNarrative1', className: 'narrative', dataType:"narrative_0", imgSrc: null }
            ]
        },
        { id: 'thirtysixHour2', src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields:[
            { text: "National Weather Service", id: '36hrNWS', className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].name, id: '36hrName2', className: 'name', dataType:"name_1", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].narrative, id: '36hrNarrative2', className: 'narrative', dataType:"narrative_1", imgSrc: null },
        ] },
        { id: 'thirtysixHour3', src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields:[
            { text: "National Weather Service", id: '36hrNWS', className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].name, id: '36hrName3', className: 'name', dataType:"name_2", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].narrative, id: '36hrNarrative3', className: 'narrative', dataType:"narrative_2", imgSrc: null },
        ] },
        { id: 'Extended', src: './images/background/' + locale + '/extended.png', text: 'Extended Forecast', noFade: false, duration: 10, slide: './images/Slide_Extended.png', overlay: './images/Plus_Product.png', fields:[
            { text: sevenDay[primaryLoc.locId].city, id: 'extCity', className: 'city', dataType:"city", imgSrc: null },
            // Day 1
            { text: sevenDay[primaryLoc.locId].days[0].name, id: 'extName1', className: 'name1', dataType:"name_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].high, id: 'extHigh1', className: 'high1', dataType:"high_0", imgSrc: null },
            { text: "/", id: 'extSlash1', className: 'slash1', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].low, id: 'extLow1', className: 'low1', dataType:"low_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].phrase, id: 'extPhrase1', className: 'phrase1', dataType:"phrase_0", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[0].icon}.png` },
            // Day 2
            { text: sevenDay[primaryLoc.locId].days[1].name, id: 'extName2', className: 'name2', dataType:"name_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].high, id: 'extHigh2', className: 'high2', dataType:"high_1", imgSrc: null },
            { text: "/", id: 'extSlash2', className: 'slash2', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].low, id: 'extLow2', className: 'low2', dataType:"low_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].phrase, id: 'extPhrase2', className: 'phrase2', dataType:"phrase_1", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[1].icon}.png` },
            // Day 3
            { text: sevenDay[primaryLoc.locId].days[2].name, id: 'extName3', className: 'name3', dataType:"name_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].high, id: 'extHigh3', className: 'high3', dataType:"high_2", imgSrc: null },
            { text: "/", id: 'extSlash3', className: 'slash3', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].low, id: 'extLow3', className: 'low3', dataType:"low_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].phrase, id: 'extPhrase3', className: 'phrase3', dataType:"phrase_2", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[2].icon}.png` },
            // Day 4
            { text: sevenDay[primaryLoc.locId].days[3].name, id: 'extName4', className: 'name4', dataType:"name_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].high, id: 'extHigh4', className: 'high4', dataType:"high_3", imgSrc: null },
            { text: "/", id: 'extSlash4', className: 'slash4', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].low, id: 'extLow4', className: 'low4', dataType:"low_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].phrase, id: 'extPhrase4', className: 'phrase4', dataType:"phrase_3", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[3].icon}.png` },
            // Day 5
            { text: sevenDay[primaryLoc.locId].days[4].name, id: 'extName5', className: 'name5', dataType:"name_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].high, id: 'extHigh5', className: 'high5', dataType:"high_4", imgSrc: null },
            { text: "/", id: 'extSlash5', className: 'slash5', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].low, id: 'extLow5', className: 'low5', dataType:"low_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].phrase, id: 'extPhrase5', className: 'phrase5', dataType:"phrase_4", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[4].icon}.png` },
        ]},
        { id: 'Almanac', src: './images/background/' + locale + '/almanac.png', text: 'Almanac', noFade: false, duration: 10, slide: './images/Slide_Almanac.png', overlay: './images/Plus_Product.png', fields:[
            // Text Labels
            { text:"Sunrise", id: 'sunriseLabel', className: 'sunriseLabel', imgSrc: null },
            { text:"Sunset", id: 'sunsetLabel', className: 'sunsetLabel', imgSrc: null },
            // Days of the Week
            { text:almanac[primaryLoc.locId][0].dayOfWeek, id: 'almDow1', className: 'dow1', dataType: "dayOfWeek_0", imgSrc: null },
            { text:almanac[primaryLoc.locId][1].dayOfWeek, id: 'almDow2', className: 'dow2', dataType: "dayOfWeek_1", imgSrc: null },
            // Sunrise and Sunset Times
            { text:almanac[primaryLoc.locId][0].sunrise, id: 'almSunriseTime1', className: 'sunriseTime1', dataType: "sunrise_0", imgSrc: null },
            { text:almanac[primaryLoc.locId][0].sunset, id: 'almSunsetTime1', className: 'sunsetTime1', dataType: "sunset_0", imgSrc: null },
            { text:almanac[primaryLoc.locId][1].sunrise, id: 'almSunriseTime2', className: 'sunriseTime2', dataType: "sunrise_1", imgSrc: null },
            { text:almanac[primaryLoc.locId][1].sunset, id: 'almSunsetTime2', className: 'sunsetTime2', dataType: "sunset_1", imgSrc: null },
            // Moon Phase Names + Icons
            { text: almanac[primaryLoc.locId].moonPhases[0].phaseName, id: 'almPhase1', className: 'phase1', dataType: "phaseName_0", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[0].phaseName}.png` },
            { text: almanac[primaryLoc.locId].moonPhases[1].phaseName, id: 'almPhase2', className: 'phase2', dataType: "phaseName_1", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[1].phaseName}.png` },
            { text: almanac[primaryLoc.locId].moonPhases[2].phaseName, id: 'almPhase3', className: 'phase3', dataType: "phaseName_2", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[2].phaseName}.png` },
            { text: almanac[primaryLoc.locId].moonPhases[3].phaseName, id: 'almPhase4', className: 'phase4', dataType: "phaseName_3", imgSrc: `./images/moon/${almanac[primaryLoc.locId].moonPhases[3].phaseName}.png` },
            // Moon Phase Dates
            { text:almanac[primaryLoc.locId].moonPhases[0].date, id: 'almDate1', className: 'date1', dataType: "date_0", imgSrc: null },
            { text:almanac[primaryLoc.locId].moonPhases[1].date, id: 'almDate2', className: 'date2', dataType: "date_1", imgSrc: null },
            { text:almanac[primaryLoc.locId].moonPhases[2].date, id: 'almDate3', className: 'date3', dataType: "date_2", imgSrc: null },
            { text:almanac[primaryLoc.locId].moonPhases[3].date, id: 'almDate4', className: 'date4', dataType: "date_3", imgSrc: null },
        ] },
        { id: 'RegSat', src: './images/background/' + locale + '/almanac.png', text: 'Regional Satellite', noFade: true, duration: 20, slide: './images/Slide_Satellite.png', overlay: './images/Plus_Product.png', fields: [
            // Add a container for the radar map
            { id: 'radarMapContainer', className: 'map-container', dataType: 'regional_Sat' } 
        ] },
        { id: 'RegRad', src: './images/background/' + locale + '/almanac.png', text: 'Regional Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', fields: [
            // Add a container for the radar map
            { id: 'radarMapContainer', className: 'map-container', dataType: 'regional_Radar' } 
        ] },
        { id: 'Radar3', src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', fields: [
            // Add a container for the radar map
            { id: 'radarMapContainer', className: 'map-container', dataType: 'local_Radar' } // Added dataType "Radar"
        ] }
    ];
    
    return slides;
};

const MiniCore = async (locale) => {
    await dataPopulationPromise;

    // Check if locale is defined
    if (!locale) {
        throw new Error('Locale is not defined');
    }

    // Get package context for the UpNext slide
    const context = getPackageContext('MiniCore');
    
    // Create the UpNext slide with proper package information
    const upNextFields = packageState.enabledPackages.map((pkg) => ({
        text: packageState.packageTitles[pkg],
        id: `upnext_${pkg.toLowerCase()}`,
        className: `upnext_item${pkg === 'Core' ? ' upnext_item-current' : ''}`,
        dataType: 'package_name'
    }));

    const slides = [
        { id: 'UpNext', src: './images/background/' + locale + '/upnext.png', text: 'Up Next...', noFade: true, duration: 6, slide: null, overlay: './images/Plus_UpNext.png', fields: upNextFields},
        { id: 'Radar', src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', fields: [
            { id: 'radarMapContainer', className: 'map-container', dataType: 'local_Radar' } 
        ] },
        { id: 'Now', src: './images/background/' + locale + '/now.png', text: 'Current Conditions', noFade: true, duration: 10, slide: './images/Slide_Now.png', overlay: './images/Plus_Product.png', fields: [
            { text: currentObs[primaryLoc.locId].city, id: 'nowCity', className: 'city', dataType:"city", imgSrc: null },
            { text: currentObs[primaryLoc.locId].relativeHumidity + "%", id: 'nowHumidity', className: 'humidity', dataType:"relativeHumidity", imgSrc: null },
            { text: currentObs[primaryLoc.locId].pressureAltimeter, id: 'nowPressure', className: 'pressure', dataType:"pressureAltimeter", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windDirectionCardinal + " " + currentObs[primaryLoc.locId].windSpeed, id: 'nowWind', className: 'wind', dataType:"windSpeedDir", imgSrc: null },
            { text: currentObs[primaryLoc.locId].windGust ? currentObs[primaryLoc.locId].windGust + " mph" : "None", id: 'nowGusts', className: 'gusts', dataType:"windGust", imgSrc: null },
            { text: currentObs[primaryLoc.locId].temperature, id: 'nowTemperature', className: 'temperature', dataType:"temperature", imgSrc: null },
            { text: currentObs[primaryLoc.locId].wxPhraseMedium, id: 'nowCondition', className: 'condition', dataType:"wxPhraseMedium", imgSrc: `./images/wxicons/${currentObs[primaryLoc.locId].iconCode}.png` }
        ] },
        { id: 'thirtysixHour1', src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields: [
                { text: "National Weather Service", id: '36hrNWS', className: 'nws', imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].name, id: '36hrName1', className: 'name', dataType:"name_0", imgSrc: null },
                { text: thirtysixHour[primaryLoc.locId].periods[0].narrative, id: '36hrNarrative1', className: 'narrative', dataType:"narrative_0", imgSrc: null }
            ]
        },
        { id: 'thirtysixHour2', src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields:[
            { text: "National Weather Service", id: '36hrNWS', className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].name, id: '36hrName2', className: 'name', dataType:"name_1", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[1].narrative, id: '36hrNarrative2', className: 'narrative', dataType:"narrative_1", imgSrc: null },
        ] },
        { id: 'thirtysixHour3', src: './images/background/' + locale + '/36hr.png', text: '36 Hour Forecast', noFade: false, duration: 10, slide: './images/Slide_Near_36.png', overlay: './images/Plus_Product.png', fields:[
            { text: "National Weather Service", id: '36hrNWS', className: 'nws', imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].name, id: '36hrName3', className: 'name', dataType:"name_2", imgSrc: null },
            { text: thirtysixHour[primaryLoc.locId].periods[2].narrative, id: '36hrNarrative3', className: 'narrative', dataType:"narrative_2", imgSrc: null },
        ] },
        { id: 'Extended', src: './images/background/' + locale + '/extended.png', text: 'Extended Forecast', noFade: false, duration: 10, slide: './images/Slide_Extended.png', overlay: './images/Plus_Product.png', fields:[
            { text: sevenDay[primaryLoc.locId].city, id: 'extCity', className: 'city', dataType:"city", imgSrc: null },
            // Day 1
            { text: sevenDay[primaryLoc.locId].days[0].name, id: 'extName1', className: 'name1', dataType:"name_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].high, id: 'extHigh1', className: 'high1', dataType:"high_0", imgSrc: null },
            { text: "/", id: 'extSlash1', className: 'slash1', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].low, id: 'extLow1', className: 'low1', dataType:"low_0", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[0].phrase, id: 'extPhrase1', className: 'phrase1', dataType:"phrase_0", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[0].icon}.png` },
            // Day 2
            { text: sevenDay[primaryLoc.locId].days[1].name, id: 'extName2', className: 'name2', dataType:"name_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].high, id: 'extHigh2', className: 'high2', dataType:"high_1", imgSrc: null },
            { text: "/", id: 'extSlash2', className: 'slash2', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].low, id: 'extLow2', className: 'low2', dataType:"low_1", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[1].phrase, id: 'extPhrase2', className: 'phrase2', dataType:"phrase_1", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[1].icon}.png` },
            // Day 3
            { text: sevenDay[primaryLoc.locId].days[2].name, id: 'extName3', className: 'name3', dataType:"name_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].high, id: 'extHigh3', className: 'high3', dataType:"high_2", imgSrc: null },
            { text: "/", id: 'extSlash3', className: 'slash3', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].low, id: 'extLow3', className: 'low3', dataType:"low_2", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[2].phrase, id: 'extPhrase3', className: 'phrase3', dataType:"phrase_2", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[2].icon}.png` },
            // Day 4
            { text: sevenDay[primaryLoc.locId].days[3].name, id: 'extName4', className: 'name4', dataType:"name_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].high, id: 'extHigh4', className: 'high4', dataType:"high_3", imgSrc: null },
            { text: "/", id: 'extSlash4', className: 'slash4', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].low, id: 'extLow4', className: 'low4', dataType:"low_3", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[3].phrase, id: 'extPhrase4', className: 'phrase4', dataType:"phrase_3", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[3].icon}.png` },
            // Day 5
            { text: sevenDay[primaryLoc.locId].days[4].name, id: 'extName5', className: 'name5', dataType:"name_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].high, id: 'extHigh5', className: 'high5', dataType:"high_4", imgSrc: null },
            { text: "/", id: 'extSlash5', className: 'slash5', imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].low, id: 'extLow5', className: 'low5', dataType:"low_4", imgSrc: null },
            { text: sevenDay[primaryLoc.locId].days[4].phrase, id: 'extPhrase5', className: 'phrase5', dataType:"phrase_4", imgSrc: `./images/wxicons/${sevenDay[primaryLoc.locId].days[4].icon}.png` },
        ]},
        { id: 'Radar2', src: './images/background/' + locale + '/nearby.png', text: 'Local Doppler', noFade: true, duration: 20, slide: './images/Slide_Radar.png', overlay: './images/Plus_Product.png', fields: [
            // Add a container for the radar map
            { id: 'radarMapContainer', className: 'map-container', dataType: 'local_Radar' } // Added dataType "Radar"
        ] }
    ];
    
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

export { Core, MiniCore };