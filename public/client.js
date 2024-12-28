import { locale, affiliateName, enabledPackages } from './config.js';
import { dataPopulationPromise, currentObs, primaryLoc, bulletins, refreshData, updateFieldsWithNewData } from './data.js';
import { initializeMaps, maps, startRadarAnimation} from './newradar.js';
import { initializePackages } from './packages.js';

// Function to create and append slide elements
const createSlideElements = (slides, ldlElement) => {
    const slidesContainer = document.getElementById('slides-container');
    slides.forEach((slide, index) => {
        if (!document.getElementById(slide.id)) {
            const slideElement = document.createElement('div');
            slideElement.classList.add('slide');
            if (index === 0 && slidesContainer.children.length === 0) {
                slideElement.classList.add('active'); // Set the first slide as active only during initial creation
            }
            slideElement.id = slide.id;

            // Background layer
            const backgroundElement = document.createElement('img');
            backgroundElement.classList.add('background');
            backgroundElement.src = slide.src;
            backgroundElement.alt = slide.text;

            // Slide layer
            let slideLayerElement = null;
            if (slide.slide) {
                slideLayerElement = document.createElement('img');
                slideLayerElement.classList.add('slide-layer');
                slideLayerElement.src = slide.slide;
                slideLayerElement.alt = 'Slide';
            }

            // Optional overlay layer
            let overlayElement = null;
            if (slide.overlay) {
                overlayElement = document.createElement('img');
                overlayElement.classList.add('overlay');
                overlayElement.src = slide.overlay;
                overlayElement.alt = 'Overlay';
            }

            // Text layer (Typically the product name)
            const textElement = document.createElement('div');
            textElement.classList.add('text', 'title');
            textElement.textContent = slide.text;

            // Fields layer
            let fieldsElement = null;
            if (slide.fields) {
                fieldsElement = document.createElement('div');
                // Add special case for UpNext slide
                if (slide.id === 'UpNext') {
                    fieldsElement.classList.add('upnext');
                }
                fieldsElement.classList.add(slide.id.toLowerCase());
                slide.fields.forEach(field => {
                    const fieldElement = document.createElement('div');
                    // Split multiple classes and add them individually
                    const classNames = field.className.split(' ');
                    classNames.forEach(className => {
                        fieldElement.classList.add(className);
                    });
                    // Don't add textdata class for upnext items
                    if (!classNames.includes('upnext_item')) {
                        fieldElement.classList.add('textdata');
                    }
                    fieldElement.id = field.id;
                    fieldElement.textContent = field.text;
                    if (field.dataType) {
                        fieldElement.setAttribute('dataType', field.dataType);
                    }
                    fieldsElement.appendChild(fieldElement);
                    
                    // Create and append the image element if imgSrc is not null
                    if (field.imgSrc) {
                        const imgElement = document.createElement('img');
                        imgElement.src = field.imgSrc;
                        imgElement.classList.add(`${field.className.split(' ')[0]}_img`);
                        fieldsElement.appendChild(imgElement);
                    }

                    // Add Mapbox container if field dataType contains "Radar" or "Sat"
                    if (field.dataType && (field.dataType.split('_').includes('Radar') || field.dataType.split('_').includes('Sat'))) {
                        const mapContainer = fieldsElement.querySelector(`#${field.id}`);
                        mapContainer.classList.add('map-container');
                        const type = field.dataType.split('_')[1]; // Get 'Radar' or 'Sat'
                        // Assign a unique ID based on type
                        mapContainer.id = `${slide.id}-${type.toLowerCase()}-map`;
                        
                        fieldsElement.appendChild(mapContainer);
                    }
                });
            }

            // Append elements to the slide
            slideElement.appendChild(backgroundElement);
            if (slideLayerElement) {
                slideElement.appendChild(slideLayerElement);
            }
            if (overlayElement) {
                slideElement.appendChild(overlayElement);
                // Add affiliate logo for slides with overlay or special cases
                if (slide.overlay || slide.id === 'Affiliate') {
                    const affiliateLogoElement = document.createElement('img');
                    affiliateLogoElement.classList.add(slide.id === 'UpNext' ? 'affiliate-upnext-logo' : 'affiliate-logo');
                    affiliateLogoElement.src = './images/Plus_AffiliateLogo.png';
                    affiliateLogoElement.alt = 'Affiliate Logo';
                    slideElement.appendChild(affiliateLogoElement);
                }
            } else if (slide.id === 'Affiliate' || slide.id === 'Splash') {
                const affiliateLogoElement = document.createElement('img');
                affiliateLogoElement.classList.add(`affiliate-${slide.id.toLowerCase()}-logo`);
                affiliateLogoElement.src = './images/Plus_AffiliateLogo.png';
                affiliateLogoElement.alt = 'Affiliate Logo';
                slideElement.appendChild(affiliateLogoElement);
            }
                    
            slideElement.appendChild(textElement);
            if (fieldsElement) {
                slideElement.appendChild(fieldsElement);
            }
            slidesContainer.appendChild(slideElement);
            // Append the LDL element to each slide if it's not one of the initial slides
            if (!['Upgrading', 'Splash', 'UpNext'].includes(slide.id)) {
                slideElement.appendChild(ldlElement.cloneNode(true));
            }
        }
    });
};


document.addEventListener('DOMContentLoaded', async () => {
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
    const packageNames = enabledPackages.map(pkg => 
        typeof pkg === 'string' ? pkg : pkg.name || 'Core'
    );
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
    // Function to update slides with the latest data
    const updateSlides = async () => {
        const enabledSlides = await Promise.all(enabledPackages);
        const newSlides = enabledSlides.flat();
        // Ensure initial slides are correctly referenced (assuming there are 3 initial slides)
        slides = slides.slice(0, 3).concat(newSlides); // Changed from slice(0, 4) to slice(0, 3)
        createSlideElements(newSlides, ldlElement); // Only create elements for new slides

        if (!mapsInitialized) {
            await initializeMaps(); // Await map initialization
            mapsInitialized = true;
        }
    };

    await updateSlides(); // Initial call to update slides
    // Set the initial timeout based on the first slide's duration
    slideInterval = setTimeout(nextSlide, slides[currentSlideIndex].duration * 1000);

    // Create the LDL element
    ldlElement.id = 'ldl';
    ldlElement.classList.add('ldl');
    ldlElement.classList.add('text');

    // Append the LDL element to each slide
    slides.forEach(slide => {
        const slideElement = document.getElementById(slide.id);
        if (slideElement) {
            if (slide.id === 'Upgrading' || slide.id === 'Splash' || slide.id === 'UpNext') {
            }
            else{
                slideElement.appendChild(ldlElement.cloneNode(true));
            }
        }
    });

    // Function to update the LDL content
    function updateLDL() {
        const now = new Date();
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
        const enabledSlides = await Promise.all(enabledPackages);
        const slides = enabledSlides.flat();
        createSlideElements(slides);
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

    // Function to update bulletin display
    const updateBulletin = () => {
        // Check if bulletins array is empty for the location
        if (!primaryLoc?.locId || !bulletins[primaryLoc.locId]?.length || bulletinOverlay.style.display === 'block') {
            console.log('No bulletins detected or bulletin already visible, hiding overlay...');
            bulletinOverlay.style.display = 'none';
            return;
        }

        console.log('Bulletin detected, updating overlay...');
        const highestAlert = bulletins[primaryLoc.locId][0];
        bulletinImage.src = `./images/Plus_Bulletin_${highestAlert.significance}.png`;
        
        // Set text based on significance
        const text = highestAlert.significance === 'W' ||  highestAlert.eventDescription === "Special Weather Statement" ? 
            highestAlert.description.toUpperCase() : 
            highestAlert.brief;
        
        bulletinText.textContent = text;
        bulletinText.classList.remove('marquee');
        if (!bulletinOverlay.querySelector('.marquee')) {
            bulletinText.classList.add('marquee');
        }

        // Force single line by setting style constraints
        bulletinText.style.whiteSpace = 'nowrap';
        bulletinText.style.overflow = 'hidden';
        bulletinText.style.textOverflow = 'ellipsis';
        
        bulletinPhenomenon.textContent = highestAlert.messageType === "Update" && highestAlert.significance === 'W' ? 
            highestAlert.eventDescription.toUpperCase() + " UPDATE" : 
            highestAlert.eventDescription.toUpperCase();

        // Initialize marquee after setting text
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

        bulletinOverlay.style.display = 'block';
    };

    // Initial call to check for bulletins after data is loaded
    dataPopulationPromise.then(() => {
        updateBulletin();
    });

    // Add bulletin check to the data refresh function
    const originalRefreshDataAndSlides = refreshDataAndSlides;
    async function refreshDataAndSlidesWithBulletin() {
        await originalRefreshDataAndSlides();
        updateBulletin();
    }

    // Replace the original refresh function
    refreshDataAndSlides = refreshDataAndSlidesWithBulletin;

});

export { createSlideElements };