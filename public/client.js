import { locale, affiliateName, enabledPackages } from './config.js';
import { dataPopulationPromise, currentObs, primaryLoc, bulletins, refreshData, updateFieldsWithNewData } from './data.js';
import { initializeMaps, maps, startRadarAnimation} from './newradar.js';
import { initializePackages } from './packages.js';
import { getMusicElement, duckVolume, restoreVolume } from './music.js';
import { showSettingsMenu } from './settingsMenu.js';

// Function to handle vocal audio playback
async function playVocalAudio(slideId) {
    try {
        const vocalAudio = new Audio(`./audio/${slideId.split("_")[1]}.wav`);
        const originalVolume = duckVolume();

        // Play the vocal track
        await vocalAudio.play();

        // Wait for vocal track to finish
        vocalAudio.onended = () => {
            restoreVolume(originalVolume);
        };
    } catch (error) {
        console.error(`Error playing vocal audio for slide ${slideId}:`, error);
        // Ensure music volume is restored even if there's an error
        restoreVolume(0.3); // Restore to default volume
    }
}

// Function to create and append slide elements with optimizations
const createSlideElements = (slides, ldlElement) => {
    const slidesContainer = document.getElementById('slides-container');
    // Create a document fragment for batch DOM operations
    const fragment = document.createDocumentFragment();
    
    slides.forEach((slide, index) => {
        if (!document.getElementById(slide.id)) {
            const slideElement = document.createElement('div');
            slideElement.classList.add('slide');
            if (index === 0 && slidesContainer.children.length === 0) {
                slideElement.classList.add('active');
            }
            slideElement.id = slide.id;

            // Pre-cache image elements to avoid reflow
            const elementsToAppend = [];

            // Background layer
            const backgroundElement = document.createElement('img');
            backgroundElement.classList.add('background');
            backgroundElement.src = slide.src;
            backgroundElement.alt = slide.text;
            elementsToAppend.push(backgroundElement);

            // Slide layer
            if (slide.slide) {
                const slideLayerElement = document.createElement('img');
                slideLayerElement.classList.add('slide-layer');
                slideLayerElement.src = slide.slide;
                slideLayerElement.alt = 'Slide';
                elementsToAppend.push(slideLayerElement);
            }

            // Optional overlay layer
            if (slide.overlay) {
                const overlayElement = document.createElement('img');
                overlayElement.classList.add('overlay');
                overlayElement.src = slide.overlay;
                overlayElement.alt = 'Overlay';
                elementsToAppend.push(overlayElement);
                
                // Add affiliate logo for slides with overlay
                const affiliateLogoElement = document.createElement('img');
                affiliateLogoElement.classList.add(slide.id === 'UpNext' ? 'affiliate-upnext-logo' : 'affiliate-logo');
                affiliateLogoElement.src = './images/Plus_AffiliateLogo.png';
                affiliateLogoElement.alt = 'Affiliate Logo';
                elementsToAppend.push(affiliateLogoElement);
            } else if (slide.id === 'Affiliate' || slide.id === 'Splash') {
                const affiliateLogoElement = document.createElement('img');
                affiliateLogoElement.classList.add(`affiliate-${slide.id.toLowerCase()}-logo`);
                affiliateLogoElement.src = './images/Plus_AffiliateLogo.png';
                affiliateLogoElement.alt = 'Affiliate Logo';
                elementsToAppend.push(affiliateLogoElement);
            }
                    
            // Text layer (Typically the product name)
            const textElement = document.createElement('div');
            textElement.classList.add('text', 'title');
            textElement.textContent = slide.text;
            elementsToAppend.push(textElement);

            // Fields layer
            if (slide.fields) {
                const fieldsElement = document.createElement('div');
                // Add special case for UpNext slide
                if (slide.id === 'UpNext') {
                    fieldsElement.classList.add('upnext');
                }
                let parts = slide.id.split("_");
                let currId = parts.length > 1 ? parts[1] : slide.id;
                fieldsElement.classList.add(currId.toLowerCase());
                
                // Create a mini-fragment for fields to reduce DOM operations
                const fieldsFragment = document.createDocumentFragment();
                
                slide.fields.forEach(field => {
                    const fieldElement = document.createElement('div');
                    // Split multiple classes and add them individually
                    field.className.split(' ').forEach(className => {
                        fieldElement.classList.add(className);
                    });
                    // Don't add textdata class for upnext items
                    if (!field.className.includes('upnext_item')) {
                        fieldElement.classList.add('textdata');
                    }
                    fieldElement.id = field.id;
                    fieldElement.textContent = field.text;
                    if (field.dataType) {
                        fieldElement.setAttribute('dataType', field.dataType);
                    }
                    fieldsFragment.appendChild(fieldElement);
                    
                    // Create and append the image element if imgSrc is not null
                    if (field.imgSrc) {
                        const imgElement = document.createElement('img');
                        imgElement.src = field.imgSrc;
                        imgElement.id = `${field.id}_img`;
                        imgElement.classList.add(`${field.className.split(' ')[0]}_img`);
                        fieldsFragment.appendChild(imgElement);
                    }

                    // Add Mapbox container if field dataType contains "Radar" or "Sat"
                    if (field.dataType && (field.dataType.includes('Radar') || field.dataType.includes('Sat'))) {
                        const mapContainer = fieldsFragment.querySelector(`#${field.id}`);
                        if (mapContainer) {
                            mapContainer.classList.add('map-container');
                            const type = field.dataType.split('_')[1]; // Get 'Radar' or 'Sat'
                            mapContainer.id = `${slide.id}-${type.toLowerCase()}-map`;
                        }
                    }
                });
                
                fieldsElement.appendChild(fieldsFragment);
                elementsToAppend.push(fieldsElement);
            }

            // Append all elements in one batch
            elementsToAppend.forEach(el => slideElement.appendChild(el));
            
            // Append the LDL element to each slide if it's not one of the initial slides
            if (!slide.id.includes('UpNext') && !['Upgrading', 'Splash'].includes(slide.id)) {
                slideElement.appendChild(ldlElement.cloneNode(true));
            }
            
            fragment.appendChild(slideElement);
        }
    });
    
    // Single DOM update
    slidesContainer.appendChild(fragment);
};


document.addEventListener('DOMContentLoaded', async () => {
    // Immediately create an "Upgrading" slide so the user sees it while packages load
    const upgradingSlide = {
        id: 'Upgrading',
        src: './images/Plus_Upgrade.png',
        text: '',
        noFade: true,
        duration: 0,
        slide: null,
        overlay: null
    };
    // Append the upgrading slide immediately
    createSlideElements([upgradingSlide], document.createElement('div'));

    // Add bulletin overlay elements to the DOM
    const bulletinOverlay = document.createElement('div');
    bulletinOverlay.id = 'bulletin-overlay';
    const bulletinImage = document.createElement('img');
    const bulletinText = document.createElement('div');
    bulletinText.id = 'bulletin-text';
    const bulletinPhenomenon = document.createElement('div');
    bulletinPhenomenon.id = 'bulletin-phenomenon';
    bulletinOverlay.appendChild(bulletinImage);
    bulletinOverlay.appendChild(bulletinText);
    bulletinOverlay.appendChild(bulletinPhenomenon);
    document.body.appendChild(bulletinOverlay);

    // Initialize packages with proper package names
    const resolvedPackages = await Promise.all(enabledPackages);
    const packageNames = resolvedPackages.map(pkg => pkg.name || 'Core');
    initializePackages(packageNames);

    let slides = [
        // Initial slides that are always shown first, regardless of enabled packages.
        { id: 'Upgrading', src: './images/Plus_Upgrade.png', text: '', noFade: true, duration: 0, slide: null, overlay: null },
        { id: 'Splash', src: './images/Plus_Splash.png', text: '', noFade: true, duration: 10, slide: null, overlay: null },
        { id: 'Affiliate', src: './images/Plus_Affiliate.png', text: '', noFade: false, duration: 10, slide: null, overlay: null , fields: [
            { text: affiliateName, id: 'affiliateName', className: 'affiliateName' },
            { text: 'Your Source for Weatherscan Local', id: 'genericText', className: 'genericText' }
        ]},
    ];

    // Get the container element where slides will be appended
    const slidesContainer = document.getElementById('slides-container');

    // Create the LDL element
    const ldlElement = document.createElement('div');
    ldlElement.id = 'ldl';
    ldlElement.classList.add('ldl');
    ldlElement.classList.add('text');

    // Create and append the initial slides
    createSlideElements(slides, ldlElement);

    let currentSlideIndex = 0; // Initialize the current slide index
    let slideInterval; // Variable to hold the interval ID

    // Function to show a specific slide by index
    const showSlide = (index) => {
        // console.log(`Showing slide index: ${index}, slide ID: ${slides[index].id}`);
        const slidesElements = document.querySelectorAll('.slide');
        const newSlide = slidesElements[index];
        
        // Check if this is a radar or satellite slide
        const mapContainer = newSlide.querySelector('.map-container');
        if (mapContainer) {
            const mapId = mapContainer.id;
            const map = maps.maps.get(mapId);
            if (map) {
                // Ensure map is loaded before starting animation
                if (map.loaded()) {
                    startRadarAnimation(map);
                } else {
                    map.once('load', () => startRadarAnimation(map));
                }
            }
        }
        
        newSlide.style.transition = slides[index].noFade ? 'none' : 'opacity 1s ease-in-out';
        newSlide.classList.add('active'); // Show the current slide
        newSlide.style.zIndex = '2'; // Bring the current slide to the front

        // Check if the slide has vocallocal enabled
        if (slides[index].vocallocal) {
            playVocalAudio(slides[index].id);
        }

        // Remove 'active' from other slides after the transition
        setTimeout(() => {
            slidesElements.forEach((slide, i) => {
                if (i !== index) {
                    slide.classList.remove('active'); // Hide other slides
                    slide.style.zIndex = '1'; // Send other slides to the back
                }
            });
        }, slides[index].noFade ? 0 : 1000); // Match transition duration or remove delay for noFade
    };

    // Function to show the next slide
    const nextSlide = () => {
        currentSlideIndex = (currentSlideIndex + 1) % slides.length; // Increment the slide index and loop back to the start if necessary

        showSlide(currentSlideIndex);

        // Clear the previous timeout and set a new one based on the current slide's duration
        clearTimeout(slideInterval);
        slideInterval = setTimeout(nextSlide, slides[currentSlideIndex].duration * 1000);

        // Check if the current slide is "Splash" to update slides
        if (slides[currentSlideIndex].id === 'Splash') {
            updateSlides();
        }

        // Ensure the first slide is visible when looping
        if (currentSlideIndex === 0) {
            const slidesElements = document.querySelectorAll('.slide'); // Define slidesElements
            slidesElements[currentSlideIndex].style.zIndex = '2';
            slidesElements[currentSlideIndex].classList.add('active');
        }
    };

    // Initialize the first slide
    showSlide(currentSlideIndex);

    // Wait for both data population and initial radar cache
    console.log('Waiting for data population and radar caching...');
    await Promise.all([
        dataPopulationPromise,
    ]);
    console.log('Initial data and radar cache complete');

    let mapsInitialized = false;
    // Function to update slides with the latest data - FIXED
    const updateSlides = async () => {
        const enabledPackagesResolved = await Promise.all(enabledPackages);
        const newSlides = enabledPackagesResolved
            .map(pkg => pkg.slides ? pkg.slides : pkg)
            .flat();
        
        // Keep the first 3 slides (Upgrading, Splash, Affiliate)
        const fixedSlides = slides.slice(0, 3);
        
        // Check if there's an Alert slide and specifically keep it at position 3
        const alertSlide = slides.find(slide => slide.id === 'Alert');
        
        // Build the new slides array in correct order:
        // 1. First 3 fixed slides (Upgrading, Splash, Affiliate)
        // 2. Alert slide (if exists)
        // 3. All package slides
        slides = fixedSlides;
        
        if (alertSlide) {
            slides.splice(3, 0, alertSlide);
        }
        
        // Then append all package slides
        slides = slides.concat(newSlides);
        
        createSlideElements(newSlides, ldlElement);
        if (!mapsInitialized) {
            await initializeMaps(); // Await map initialization
            mapsInitialized = true;
        }
    };

    await updateSlides(); // Initial call to update slides
    // Set the initial timeout based on the first slide's duration
    slideInterval = setTimeout(nextSlide, slides[currentSlideIndex].duration * 1000);

    // Function to update the LDL content
    function updateLDL() {
        // Use primary location's timezone
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: primaryLoc.timezone }));
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const day = days[now.getDay()];
        const month = months[now.getMonth()];
        const date = now.getDate().toString().padStart(2, '0');

        const timeString = `${formattedHours}:${minutes}:${seconds} ${ampm}`;
        const dateString = `${day} ${month} ${date}`;

        const ldlElements = document.querySelectorAll('.ldl');
        ldlElements.forEach(ldl => {
            ldl.innerHTML = `${timeString}<br>${dateString}`;
        });
    }
    
    // Update the LDL content every second
    setInterval(updateLDL, 1000);

    // Function to refresh data and update slides
    let refreshDataAndSlides = async () => {
        console.log('Refreshing data and updating slides...');
        await refreshData(); // Only refresh weather data
        await updateFieldsWithNewData();
        
        // Get the new package slides
        const enabledPackagesResolved = await Promise.all(enabledPackages);
        const newPackageSlides = enabledPackagesResolved
            .map(pkg => pkg.slides ? pkg.slides : pkg)
            .flat();
        
        // Get the first 3 static slides
        const fixedSlides = slides.slice(0, 3);
        
        // Check if Alert slide exists
        const alertSlide = slides.find(slide => slide.id === 'Alert');
        
        // Rebuild slides array in correct order:
        // 1. First 3 fixed slides
        // 2. Alert slide (if exists)
        // 3. New package slides
        slides = fixedSlides;
        
        if (alertSlide) {
            slides.splice(3, 0, alertSlide);
        }
        
        // Then append all package slides
        slides = slides.concat(newPackageSlides);
        
        // Create elements for new slides
        createSlideElements(newPackageSlides, ldlElement);
    };

    // Initial call to refresh data and set interval
    dataPopulationPromise.then(() => {
        setInterval(async () => {
            // Wait until the current slide is "Splash" to refresh data
            while (slides[currentSlideIndex].id !== 'Splash') {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
            }
            await refreshDataAndSlides();
        }, 5 * 60 * 1000); // Refresh every 5 minutes
    });

    // Add global variable to track the currently active bulletin
    let currentActiveAlert = null;

    // Modified updateBulletin function to pass multiple alerts to updateAlertSlide
    const updateBulletin = () => {
        // Retrieve bulletin state
        const hasValidLocationId = primaryLoc?.locId;
        const hasBulletins = bulletins[primaryLoc?.locId]?.length > 0;
        const isOverlayVisible = bulletinOverlay.style.display === 'block';
        const newHighestAlert = hasBulletins ? bulletins[primaryLoc.locId][0] : null;

        if (isOverlayVisible && currentActiveAlert && newHighestAlert) {
            const nowUTC = new Date();
            const expirationTime = newHighestAlert.expirationUTC ? new Date(newHighestAlert.expirationUTC * 1000) : null;
            if (expirationTime && expirationTime < nowUTC) {
                console.log('Alert expired, hiding overlay...');
                bulletinOverlay.style.display = 'none';
                currentActiveAlert = null;
                removeAlertSlide();
                return;
            }
            // If same highest alert is still active, do not modify
            if (currentActiveAlert.summary === newHighestAlert.summary) {
                return;
            }
        }

        if (!hasValidLocationId || !hasBulletins) {
            if (isOverlayVisible) {
                console.log('No bulletins detected, hiding overlay...');
                bulletinOverlay.style.display = 'none';
            }
            currentActiveAlert = null;
            removeAlertSlide();
            return;
        }

        // Process alerts - get up to 3 active alerts
        const topAlerts = bulletins[primaryLoc.locId].slice(0, 3);
        const highestAlert = topAlerts[0]; // First alert is still the highest priority

        const nowUTC = new Date();
        const expirationTime = highestAlert.expirationUTC ? new Date(highestAlert.expirationUTC * 1000) : null;
        if (expirationTime && expirationTime < nowUTC) {
            console.log('Alert expired, hiding overlay...');
            bulletinOverlay.style.display = 'none';
            currentActiveAlert = null;
            removeAlertSlide();
            return;
        }
        
        console.log('Bulletin detected, updating overlay...');
        bulletinImage.src = `./images/Plus_Bulletin_${highestAlert.significance}.png`;
        const text = highestAlert.significance === 'W' || highestAlert.eventDescription === "Special Weather Statement" ?
            highestAlert.description.toUpperCase() :
            highestAlert.brief;
        bulletinText.textContent = text;
        bulletinText.classList.remove('marquee');
        if (!bulletinOverlay.querySelector('.marquee')) {
            bulletinText.classList.add('marquee');
        }
        bulletinText.style.whiteSpace = 'nowrap';
        bulletinText.style.overflow = 'hidden';
        bulletinText.style.textOverflow = 'ellipsis';
        bulletinPhenomenon.textContent = highestAlert.messageType === "Update" && highestAlert.significance === 'W' ?
            highestAlert.eventDescription.toUpperCase() + " UPDATE" :
            highestAlert.eventDescription.toUpperCase();
        $(function () {
            $('.marquee')
                .marquee('destroy')
                .marquee({
                    speed: 170,
                    gap: 1000,
                    startVisible: true,
                    pauseOnHover: false,
                    pauseOnCycle: true,
                    delayBeforeStart: 1000
                });
        });
        if (!isOverlayVisible || text !== bulletinText.textContent) {
            if (hasBulletins && highestAlert.significance === 'W') {
                const audio = new Audio('./warningbeep.wav');
                const originalVolume = duckVolume();
                audio.play();
                audio.onended = () => {
                    restoreVolume(originalVolume);
                };
            }
        }
        bulletinOverlay.style.display = 'block';
        currentActiveAlert = highestAlert;
        
        // Insert/update Alert slide with up to 3 alerts
        updateAlertSlide(topAlerts);
    };

    // Function to add or update the Alert slide with multiple alerts
    function updateAlertSlide(alerts) {
        // Create fields array with location and source for the first alert only
        const fields = [
            { text: primaryLoc.city + " Area", id: 'alertLocation', className: 'alertLocation' },
            { text: "From the " + alerts[0].source, id: 'alertSource1', className: 'alertSource1' }
        ];

        // Add all alert summaries (up to 3)
        for (let i = 0; i < Math.min(alerts.length, 3); i++) {
            fields.push(
                { text: alerts[i].summary, id: `alertSummary${i+1}`, className: `alertSummary${i+1}` }
            );
        }

        // Create alert slide object
        const alertSlide = {
            id: 'Alert',
            src: './images/Plus_Alert.png',
            text: null, 
            noFade: false,
            duration: 10,
            slide: null,
            overlay: null,
            fields: fields
        };
        
        // Check if Alert slide already exists
        const existingAlert = document.getElementById('Alert');
        
        // Find the Alert slide index if it exists
        const alertSlideIndex = slides.findIndex(slide => slide.id === 'Alert');
        
        // Update or insert the slide in the slides array
        if (alertSlideIndex !== -1) {
            slides[alertSlideIndex] = alertSlide;
        } else {
            // Insert at position 3
            slides.splice(3, 0, alertSlide);
        }
        
        // Update DOM only if needed
        if (existingAlert) {
            // Update existing slide content
            const alertLocation = existingAlert.querySelector('#alertLocation');
            const alertSource1 = existingAlert.querySelector('#alertSource1');
            
            if (alertLocation) alertLocation.textContent = primaryLoc.city + " Area";
            if (alertSource1) alertSource1.textContent = "From the " + alerts[0].source;
            
            // First, hide all existing alert elements that might exist from previous updates
            for (let i = 1; i <= 3; i++) {
                const existingSummary = existingAlert.querySelector(`#alertSummary${i}`);
                if (existingSummary) existingSummary.style.display = 'none';
            }
            
            // Update each alert summary
            for (let i = 0; i < Math.min(alerts.length, 3); i++) {
                const alertSummary = existingAlert.querySelector(`#alertSummary${i+1}`);
                if (alertSummary) {
                    alertSummary.textContent = alerts[i].summary;
                    alertSummary.style.display = 'block';
                }
            }
        } else {
            // Create the Alert slide element with all alerts
            createSlideElements([alertSlide], ldlElement);
            
            // Ensure correct position in DOM
            const slidesContainer = document.getElementById('slides-container');
            const alertElement = document.getElementById('Alert');
            const affiliateElement = document.getElementById('Affiliate');
            
            if (alertElement && affiliateElement && affiliateElement.nextSibling) {
                slidesContainer.removeChild(alertElement);
                slidesContainer.insertBefore(alertElement, affiliateElement.nextSibling);
            }
        }
    }

    // Function to remove the Alert slide
    function removeAlertSlide() {
        // Find and remove alert slide if it exists
        const alertSlideIndex = slides.findIndex(slide => slide.id === 'Alert');
        if (alertSlideIndex !== -1) {
            console.log(`Removing Alert slide from position ${alertSlideIndex}`);
            // Remove from slides array
            slides.splice(alertSlideIndex, 1);
            
            // Remove from DOM
            const alertElement = document.getElementById('Alert');
            if (alertElement) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }
    }

    // Initial call to check for bulletins after data is loaded
    dataPopulationPromise.then(() => {
        updateBulletin();
    });

    // Add a periodic check for updated bulletins (including expiration)
    setInterval(updateBulletin, 60000); // Check every 60 seconds

    // Add bulletin check to the data refresh function
    const originalRefreshDataAndSlides = refreshDataAndSlides;
    async function refreshDataAndSlidesWithBulletin() {
        await originalRefreshDataAndSlides();
        updateBulletin();
    }

    // Replace the original refresh function
    refreshDataAndSlides = refreshDataAndSlidesWithBulletin;

    // Initialize background music
    const backgroundMusic = getMusicElement();
    try {
        await backgroundMusic.play();
    } catch (error) {
        console.error('Error playing background music:', error);
    }

});

document.addEventListener('keydown', (e) => {
	if (e.key === "Escape") {
		showSettingsMenu();
	}
});

export { createSlideElements };