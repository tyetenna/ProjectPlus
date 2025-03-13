import mapboxgl from 'https://esm.sh/mapbox-gl@3.9.0';
import { apiKey } from './config.js';
import { primaryLoc, dataPopulationPromise } from './data.js';

mapboxgl.accessToken = '';

// Performance optimized state with memory management
const state = {
    radarTimestamps: [],
    satTimestamps: [],
    animationInterval: null,
    maps: new Map(),
    loadedSources: {
        radar: new Map(),
        sat: new Map()
    },
    timestampCache: {
        radar: {
            lastFetch: 0,
            data: []
        },
        sat: {
            lastFetch: 0,
            data: []
        }
    },
    // Track map visibility for performance
    visibleMaps: new Set()
};

const RADAR_FRAME_COUNT = 16;
const SAT_FRAME_COUNT = 20;
const CACHE_TTL = 120000; // 2 minutes cache TTL

// Debounce function to prevent excessive calls
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Optimized timestamp fetching with caching
async function fetchTimestamps(type) {
    const cache = state.timestampCache[type];
    const now = Date.now();
    
    // Use cached data if it's fresh
    if (now - cache.lastFetch < CACHE_TTL && cache.data.length > 0) {
        return cache.data;
    }
    
    try {
        const response = await fetch(`https://api.weather.com/v3/TileServer/series/productSet/PPAcore?filter=${type}&apiKey=${apiKey}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const data = await response.json();
        const seriesKey = type === 'sat' ? 'sat' : 'radar';
        
        if (!data.seriesInfo?.[seriesKey]) {
            console.error(`No series info found for ${seriesKey}`);
            return cache.data; // Return old data if available
        }
        
        const timestamps = data.seriesInfo[seriesKey].series
            .sort((a, b) => a.ts - b.ts)
            .map(ts => ts.ts)
            .slice(-(type === 'sat' ? SAT_FRAME_COUNT : RADAR_FRAME_COUNT));

        if (type === 'sat') {
            state.satTimestamps = timestamps;
        } else {
            state.radarTimestamps = timestamps;
        }
        
        // Update cache
        cache.lastFetch = now;
        cache.data = timestamps;

        return timestamps;
    } catch (error) {
        console.error(`Failed to fetch ${type} timestamps:`, error);
        return cache.data; // Return old data if available
    }
}

// More efficient cleanup with batch processing
function cleanupOldSources(map, type) {
    if (!map || !map.getStyle) return;
    
    try {
        const timestamps = type === 'sat' ? state.satTimestamps : state.radarTimestamps;
        const sourceCache = state.loadedSources[type];
        const style = map.getStyle();
        
        if (!style || !style.sources) return;
        
        // Get all sources of this type from the map
        const sources = Object.keys(style.sources)
            .filter(id => id.startsWith(`${type}_`));
        
        // Build lists for batch removals
        const layersToRemove = [];
        const sourcesToRemove = [];
        
        // Find sources and layers to remove
        sources.forEach(sourceId => {
            const timestamp = sourceId.split('_')[1];
            if (!timestamps.includes(Number(timestamp))) {
                const layerId = `${type}layer_${timestamp}`;
                
                if (map.getLayer(layerId)) {
                    layersToRemove.push(layerId);
                }
                
                sourcesToRemove.push(sourceId);
                sourceCache.delete(Number(timestamp));
            }
        });
        
        // Batch remove layers (must happen before sources)
        layersToRemove.forEach(layerId => {
            if (map.getLayer(layerId)) map.removeLayer(layerId);
        });
        
        // Batch remove sources
        sourcesToRemove.forEach(sourceId => {
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        });
    } catch (e) {
        console.warn('Error during source cleanup:', e);
    }
}

// Optimized source loading with error handling and caching
async function loadMapSource(map, type, timestamp) {
    const sourceId = `${type}_${timestamp}`;
    const layerId = `${type}layer_${timestamp}`;
    const sourceCache = state.loadedSources[type];

    // Skip if already loaded
    try {
        if (map.getSource(sourceId)) return;
    } catch (e) {
        // Handle invalid map state
    }

    if (!sourceCache.has(timestamp)) {
        const source = {
            type: 'raster',
            tiles: [`https://api.weather.com/v3/TileServer/tile/${type === 'radar' ? 'twcRadarMosaic' : 'sat'}?ts=${timestamp}&xyz={x}:{y}:{z}&apiKey=${apiKey}`],
            tileSize: 512,
            scheme: "xyz",
            minzoom: type === 'radar' ? 5 : 4,
            maxzoom: 12,
            attribution: ''
        };
        sourceCache.set(timestamp, source);
    }

    try {
        // Add source and layer in a single operation to reduce reflows
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, sourceCache.get(timestamp));
            map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                layout: { visibility: 'none' },
                paint: {
                    'raster-opacity': 0.9,
                    'raster-fade-duration': 0,
                    'raster-brightness-max': type === 'sat' ? 1 : 0.9
                }
            });
        }

        // Wait for source to load with a shorter timeout
        await Promise.race([
            new Promise(resolve => {
                const checkLoaded = () => {
                    if (map.isSourceLoaded(sourceId)) {
                        resolve();
                    } else {
                        map.once('sourcedata', checkLoaded);
                    }
                };
                checkLoaded();
            }),
            new Promise(resolve => setTimeout(resolve, 3000)) // Reduced timeout
        ]);
    } catch (e) {
        console.debug(`Error loading source ${sourceId}:`, e);
    }
}

// Optimized layer initialization with prioritized loading
async function initializeMapLayers(map) {
    if (!map || !map.getContainer) return;
    
    const container = map.getContainer();
    if (!container) return;
    
    const dataType = container.getAttribute('dataType') || '';
    const type = dataType.includes('Sat') ? 'sat' : 'radar';
    const timestamps = type === 'sat' ? state.satTimestamps : state.radarTimestamps;
    
    if (!timestamps.length) return;
    
    // First load the most recent frames for immediate visibility
    const recentTimestamps = timestamps.slice(-3);
    for (const timestamp of recentTimestamps) {
        await loadMapSource(map, type, timestamp);
    }
    
    // Then load the rest in the background
    setTimeout(async () => {
        const remainingTimestamps = timestamps.slice(0, -3);
        for (const timestamp of remainingTimestamps) {
            await loadMapSource(map, type, timestamp);
        }
        cleanupOldSources(map, type);
    }, 100);
}

// Much more efficient animation loop with IntersectionObserver and reduced reflows
function smoothAnimationLoop(map, timestamps) {
    const container = map.getContainer();
    if (!container) return () => {};
    
    const type = container.getAttribute('dataType').includes('Sat') ? 'sat' : 'radar';
    const layerPrefix = `${type}layer_`;
    
    // Clean up any existing animation
    if (state.animationInterval) {
        clearInterval(state.animationInterval);
    }

    // Get all valid layers
    const validLayers = timestamps
        .map(ts => `${layerPrefix}${ts}`)
        .filter(layerId => {
            try {
                return map.getLayer(layerId);
            } catch (e) {
                return false;
            }
        });

    if (validLayers.length === 0) {
        // Try again later if no layers are ready
        setTimeout(() => {
            if (map.loaded()) {
                startRadarAnimation(map);
            }
        }, 500);
        return () => {};
    }

    let currentIndex = 0;
    let shouldAnimate = true;  

    // Initially hide all layers (batch operation)
    validLayers.forEach(layerId => {
        try {
            if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', 'none');
            }
        } catch (e) {}
    });

    // Show first frame
    try {
        if (map.getLayer(validLayers[0])) {
            map.setLayoutProperty(validLayers[0], 'visibility', 'visible');
        }
    } catch (e) {}

    // Use IntersectionObserver to pause animation when not visible
    const observer = new IntersectionObserver((entries) => {
        shouldAnimate = entries[0].isIntersecting;
        
        // Add/remove from visible maps set
        if (shouldAnimate) {
            state.visibleMaps.add(container.id);
        } else {
            state.visibleMaps.delete(container.id);
            
            if (state.animationInterval) {
                clearInterval(state.animationInterval);
                state.animationInterval = null;
                
                // Hide all layers when not visible to save resources
                validLayers.forEach(layerId => {
                    try {
                        if (map.getLayer(layerId)) {
                            map.setLayoutProperty(layerId, 'visibility', 'none');
                        }
                    } catch (e) {}
                });
            }
        }
    }, {
        threshold: 0.1 // Trigger when at least 10% is visible
    });
    
    observer.observe(container);

    state.animationInterval = setInterval(() => {
        if (!shouldAnimate || !container.offsetParent) return;

        try {
            // Hide current layer
            if (map.getLayer(validLayers[currentIndex])) {
                map.setLayoutProperty(validLayers[currentIndex], 'visibility', 'none');
            }
            
            // Move to next frame
            currentIndex = (currentIndex + 1) % validLayers.length;
            
            // Show new layer
            if (map.getLayer(validLayers[currentIndex])) {
                map.setLayoutProperty(validLayers[currentIndex], 'visibility', 'visible');
            }

            // Pause at the end of the sequence
            if (currentIndex === validLayers.length - 1) {
                shouldAnimate = false;
                setTimeout(() => {
                    if (container.offsetParent) {
                        shouldAnimate = true;
                        currentIndex = 0;
                        
                        // Reset visibility (batch operation)
                        validLayers.forEach((layerId, i) => {
                            try {
                                if (map.getLayer(layerId)) {
                                    map.setLayoutProperty(layerId, 'visibility', 
                                        i === 0 ? 'visible' : 'none');
                                }
                            } catch (e) {}
                        });
                    }
                }, 1650);
            }
        } catch (e) {
            // Continue with animation even if one frame fails
        }
    }, 100);

    // Return cleanup function
    return () => {
        observer.disconnect();
        if (state.animationInterval) {
            clearInterval(state.animationInterval);
            state.animationInterval = null;
        }
        
        // Hide all layers on cleanup
        validLayers.forEach(layerId => {
            try {
                if (map.getLayer(layerId)) {
                    map.setLayoutProperty(layerId, 'visibility', 'none');
                }
            } catch (e) {}
        });
        
        // Remove from visible maps set
        state.visibleMaps.delete(container.id);
    };
}

export async function startRadarAnimation(map) {
    const container = map.getContainer();
    const type = container.getAttribute('dataType').includes('Sat') ? 'sat' : 'radar';
    const timestamps = type === 'sat' ? state.satTimestamps : state.radarTimestamps;

    if (container._cleanup) {
        container._cleanup();
    }
    container._cleanup = smoothAnimationLoop(map, timestamps);
}

// Optimize map initialization to implement lazy loading
export async function initializeMaps() {
    // Fetch timestamps in parallel
    await Promise.all([
        fetchTimestamps('radar'),
        fetchTimestamps('sat')
    ]);
    
    // Get all radar and satellite containers
    const radarContainers = Array.from(document.querySelectorAll('.map-container[dataType*="Radar"]'));
    const satContainers = Array.from(document.querySelectorAll('.map-container[dataType*="Sat"]'));
    
    // Track visible containers for lazy loading
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const container = entry.target;
            const id = container.id;
            
            if (entry.isIntersecting) {
                // Lazy load map when container becomes visible
                if (!state.maps.has(id)) {
                    initializeMapForContainer(container);
                }
            }
        });
    }, { threshold: 0.1 });
    
    // Function to initialize a single map
    function initializeMapForContainer(container) {
        const id = container.id;
        const isRadar = container.getAttribute('dataType').includes('Radar');
        const zoomLevel = container.getAttribute('dataType').startsWith('regional') ? 5.7 : 8.7;

        const map = new mapboxgl.Map({
            container,
            style: 'mapbox://styles/tyetenna/cm4uiu2xk000a01s8emz0bn89',
            center: [primaryLoc.lon, primaryLoc.lat],
            zoom: zoomLevel,
            attributionControl: false,
            maxZoom: 10,
            minZoom: 4,
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: false,
            validateStyle: false 
        });

        map.once('load', async () => {
            // Hide controls
            document.querySelectorAll('.mapboxgl-control-container')
                .forEach(ctrl => ctrl.style.display = 'none');
                
            // Initialize layers only when map is visible
            if (container.offsetParent) {
                await initializeMapLayers(map);
            }
        });

        // Add error handling
        map.on('error', (e) => {
            console.warn('Map error:', e);
        });

        // Cleanup on map removal
        map.on('remove', () => {
            if (container._cleanup) {
                container._cleanup();
                container._cleanup = null;
            }
            state.maps.delete(id);
            state.visibleMaps.delete(id);
        });

        state.maps.set(id, map);
    }
    
    // Initially set IDs and observe containers
    let index = 0;
    [...radarContainers, ...satContainers].forEach(container => {
        if (!container.id || container.id === '') {
            container.id = `map-${index++}`;
        }
        observer.observe(container);
    });
    
    // Initialize only visible maps immediately, rest will be lazy loaded
    const visibleContainers = [...radarContainers, ...satContainers].filter(container => {
        const rect = container.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    });
    
    // Initialize visible maps
    visibleContainers.forEach(container => {
        initializeMapForContainer(container);
    });

    startTimestampRefresh();
    return state.maps;
}

// Add cleanup function for map instances
export function cleanupMap(mapId) {
    const map = state.maps.get(mapId);
    if (map) {
        if (map.getContainer()._cleanup) {
            map.getContainer()._cleanup();
        }
        map.remove();
        state.maps.delete(mapId);
    }
}

// Add efficient, staggered timestamp refresh
function startTimestampRefresh() {
    // Refresh radar timestamps every 2 minutes
    const refreshRadarTimestamps = debounce(async () => {
        await fetchTimestamps('radar');
        
        // Only update visible radar maps for performance
        state.maps.forEach((map, id) => {
            if (state.visibleMaps.has(id) && 
                map.getContainer().getAttribute('dataType').includes('Radar')) {
                initializeMapLayers(map);
            }
        });
    }, 500); // Debounce to avoid duplicate calls
    
    setInterval(refreshRadarTimestamps, 2 * 60 * 1000);

    // Refresh satellite timestamps every 10 minutes
    const refreshSatTimestamps = debounce(async () => {
        await fetchTimestamps('sat');
        
        // Only update visible sat maps for performance
        state.maps.forEach((map, id) => {
            if (state.visibleMaps.has(id) && 
                map.getContainer().getAttribute('dataType').includes('Sat')) {
                initializeMapLayers(map);
            }
        });
    }, 500);
    
    setInterval(refreshSatTimestamps, 10 * 60 * 1000);
}

export { state as maps };
