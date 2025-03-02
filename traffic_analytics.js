/**
 * Traffic Analytics Module
 * 
 * This module processes and stores website traffic data collected by the client-side
 * traffic agent. It provides insights and optimization suggestions based on the data.
 */

const fs = require('fs');
const path = require('path');

// Storage for traffic data and insights
const trafficData = {
    events: [],          // Raw tracking events
    insights: [],        // Processed insights
    sessionData: {},     // Data organized by session
    dateRanges: {
        today: [],
        lastWeek: [],
        lastMonth: []
    }
};

// Constants
const DATA_DIR = path.join(__dirname, '..', 'data');
const TRAFFIC_FILE = path.join(DATA_DIR, 'traffic.json');
const INSIGHTS_FILE = path.join(DATA_DIR, 'insights.json');
const MAX_EVENTS = 10000; // Limit to prevent memory issues

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing data if available
try {
    if (fs.existsSync(TRAFFIC_FILE)) {
        const fileData = JSON.parse(fs.readFileSync(TRAFFIC_FILE, 'utf8'));
        if (fileData && fileData.events) {
            trafficData.events = fileData.events;
            console.log(`Loaded ${trafficData.events.length} traffic events from storage`);
        }
    }
    
    if (fs.existsSync(INSIGHTS_FILE)) {
        const insightsData = JSON.parse(fs.readFileSync(INSIGHTS_FILE, 'utf8'));
        if (insightsData && insightsData.insights) {
            trafficData.insights = insightsData.insights;
            console.log(`Loaded ${trafficData.insights.length} insights from storage`);
        }
    }
} catch (error) {
    console.error('Error loading traffic data:', error);
}

/**
 * Track an event from the client
 * @param {Object} eventData - Event data from the client
 */
function trackEvent(eventData) {
    // Add server timestamp
    eventData.serverTimestamp = new Date().toISOString();
    
    // Add to events array
    trafficData.events.push(eventData);
    
    // Organize data by session
    const { sessionId } = eventData;
    if (sessionId) {
        if (!trafficData.sessionData[sessionId]) {
            trafficData.sessionData[sessionId] = {
                events: [],
                pageViews: 0,
                conversions: 0,
                firstSeen: eventData.serverTimestamp
            };
        }
        
        trafficData.sessionData[sessionId].events.push(eventData);
        trafficData.sessionData[sessionId].lastSeen = eventData.serverTimestamp;
        
        // Update specific metrics
        if (eventData.type === 'pageView') {
            trafficData.sessionData[sessionId].pageViews++;
        } else if (eventData.type === 'conversion') {
            trafficData.sessionData[sessionId].conversions++;
        }
    }
    
    // Update date range data
    updateDateRanges(eventData);
    
    // Limit the size of the events array
    if (trafficData.events.length > MAX_EVENTS) {
        trafficData.events = trafficData.events.slice(-MAX_EVENTS);
    }
    
    // Save data every 100 events to prevent data loss
    if (trafficData.events.length % 100 === 0) {
        saveTrafficData();
    }
}

/**
 * Update date range buckets for quick access to recent data
 * @param {Object} eventData - Event data to categorize
 */
function updateDateRanges(eventData) {
    const now = new Date();
    const eventDate = new Date(eventData.timestamp || eventData.serverTimestamp);
    
    // Today's data
    if (eventDate.toDateString() === now.toDateString()) {
        trafficData.dateRanges.today.push(eventData);
    }
    
    // Last week's data
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    
    if (eventDate >= oneWeekAgo) {
        trafficData.dateRanges.lastWeek.push(eventData);
    }
    
    // Last month's data
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    if (eventDate >= oneMonthAgo) {
        trafficData.dateRanges.lastMonth.push(eventData);
    }
    
    // Prevent these arrays from growing too large
    const MAX_RECENT_EVENTS = 1000;
    
    if (trafficData.dateRanges.today.length > MAX_RECENT_EVENTS) {
        trafficData.dateRanges.today = trafficData.dateRanges.today.slice(-MAX_RECENT_EVENTS);
    }
    
    if (trafficData.dateRanges.lastWeek.length > MAX_RECENT_EVENTS * 7) {
        trafficData.dateRanges.lastWeek = trafficData.dateRanges.lastWeek.slice(-MAX_RECENT_EVENTS * 7);
    }
    
    if (trafficData.dateRanges.lastMonth.length > MAX_RECENT_EVENTS * 30) {
        trafficData.dateRanges.lastMonth = trafficData.dateRanges.lastMonth.slice(-MAX_RECENT_EVENTS * 30);
    }
}

/**
 * Save insights from the client
 * @param {Object} insightData - Insight data from the client
 */
function saveInsights(insightData) {
    if (insightData && insightData.insights && Array.isArray(insightData.insights)) {
        const { sessionId, insights, timestamp } = insightData;
        
        // Add server metadata
        const enrichedInsights = insights.map(insight => ({
            ...insight,
            sessionId,
            clientTimestamp: timestamp,
            serverTimestamp: new Date().toISOString()
        }));
        
        // Add to insights array
        trafficData.insights = [...trafficData.insights, ...enrichedInsights];
        
        // Limit insights array size
        const MAX_INSIGHTS = 1000;
        if (trafficData.insights.length > MAX_INSIGHTS) {
            trafficData.insights = trafficData.insights.slice(-MAX_INSIGHTS);
        }
        
        // Save insights to file
        saveInsightsData();
    }
}

/**
 * Save traffic data to file
 */
function saveTrafficData() {
    try {
        fs.writeFileSync(
            TRAFFIC_FILE, 
            JSON.stringify({ 
                events: trafficData.events,
                lastUpdated: new Date().toISOString()
            }, null, 2)
        );
    } catch (error) {
        console.error('Error saving traffic data:', error);
    }
}

/**
 * Save insights data to file
 */
function saveInsightsData() {
    try {
        fs.writeFileSync(
            INSIGHTS_FILE, 
            JSON.stringify({ 
                insights: trafficData.insights,
                lastUpdated: new Date().toISOString()
            }, null, 2)
        );
    } catch (error) {
        console.error('Error saving insights data:', error);
    }
}

/**
 * Get all stored insights
 * @returns {Array} Array of insights
 */
function getInsights() {
    return trafficData.insights;
}

/**
 * Get high priority insights only
 * @returns {Array} Array of high priority insights
 */
function getHighPriorityInsights() {
    return trafficData.insights
        .filter(insight => insight.priority === 'high')
        .sort((a, b) => new Date(b.serverTimestamp) - new Date(a.serverTimestamp))
        .slice(0, 10);
}

/**
 * Get a summary of website traffic
 * @returns {Object} Traffic summary data
 */
function getTrafficSummary() {
    const now = new Date();
    
    // Count unique page views
    const pageViews = {
        today: new Set(),
        weekly: new Set(),
        monthly: new Set()
    };
    
    // Count unique sessions
    const sessions = {
        today: new Set(),
        weekly: new Set(),
        monthly: new Set()
    };
    
    // Count page views and sessions
    trafficData.events.forEach(event => {
        if (event.type === 'pageView') {
            const eventDate = new Date(event.timestamp || event.serverTimestamp);
            const sessionId = event.sessionId;
            
            // Skip if no date or session ID
            if (!eventDate || !sessionId) return;
            
            // Generate a unique identifier for this page view
            const pageViewId = `${sessionId}:${event.path}`;
            
            // Today
            if (eventDate.toDateString() === now.toDateString()) {
                pageViews.today.add(pageViewId);
                sessions.today.add(sessionId);
            }
            
            // This week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            if (eventDate >= oneWeekAgo) {
                pageViews.weekly.add(pageViewId);
                sessions.weekly.add(sessionId);
            }
            
            // This month
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            if (eventDate >= oneMonthAgo) {
                pageViews.monthly.add(pageViewId);
                sessions.monthly.add(sessionId);
            }
        }
    });
    
    return {
        pageViews: {
            today: pageViews.today.size,
            weekly: pageViews.weekly.size,
            monthly: pageViews.monthly.size
        },
        sessions: {
            today: sessions.today.size,
            weekly: sessions.weekly.size,
            monthly: sessions.monthly.size
        },
        timestamp: now.toISOString()
    };
}

/**
 * Get conversion summary (add to cart events)
 * @returns {Object} Conversion summary data
 */
function getConversionSummary() {
    const now = new Date();
    
    // Count conversions
    const conversions = {
        today: 0,
        weekly: 0,
        monthly: 0
    };
    
    // Count page views for conversion rate calculation
    const pageViews = {
        today: 0,
        weekly: 0,
        monthly: 0
    };
    
    // Process events
    trafficData.events.forEach(event => {
        const eventDate = new Date(event.timestamp || event.serverTimestamp);
        
        // Today
        if (eventDate.toDateString() === now.toDateString()) {
            if (event.type === 'conversion' && event.conversionType === 'add_to_cart') {
                conversions.today++;
            }
            if (event.type === 'pageView') {
                pageViews.today++;
            }
        }
        
        // This week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        if (eventDate >= oneWeekAgo) {
            if (event.type === 'conversion' && event.conversionType === 'add_to_cart') {
                conversions.weekly++;
            }
            if (event.type === 'pageView') {
                pageViews.weekly++;
            }
        }
        
        // This month
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        if (eventDate >= oneMonthAgo) {
            if (event.type === 'conversion' && event.conversionType === 'add_to_cart') {
                conversions.monthly++;
            }
            if (event.type === 'pageView') {
                pageViews.monthly++;
            }
        }
    });
    
    // Calculate conversion rates
    const getRate = (conversions, pageViews) => {
        if (pageViews === 0) return 0;
        return ((conversions / pageViews) * 100).toFixed(2);
    };
    
    return {
        conversions: {
            today: conversions.today,
            weekly: conversions.weekly,
            monthly: conversions.monthly
        },
        rates: {
            today: getRate(conversions.today, pageViews.today),
            weekly: getRate(conversions.weekly, pageViews.weekly),
            monthly: getRate(conversions.monthly, pageViews.monthly)
        },
        timestamp: now.toISOString()
    };
}

/**
 * Get top products based on interactions
 * @returns {Array} Top products data
 */
function getTopProducts() {
    const productInteractions = {};
    
    // Count interactions by product
    trafficData.events.forEach(event => {
        if (
            (event.type === 'interaction' && event.interactionType === 'product_click') ||
            (event.type === 'conversion' && event.conversionType === 'add_to_cart')
        ) {
            const product = event.details;
            if (product) {
                if (!productInteractions[product]) {
                    productInteractions[product] = {
                        name: product,
                        views: 0,
                        cartAdds: 0
                    };
                }
                
                if (event.type === 'interaction' && event.interactionType === 'product_click') {
                    productInteractions[product].views++;
                } else if (event.type === 'conversion' && event.conversionType === 'add_to_cart') {
                    productInteractions[product].cartAdds++;
                }
            }
        }
    });
    
    // Convert to array and sort by total interactions
    return Object.values(productInteractions)
        .sort((a, b) => {
            const totalA = a.views + a.cartAdds;
            const totalB = b.views + b.cartAdds;
            return totalB - totalA;
        })
        .slice(0, 5);
}

/**
 * Get device usage statistics
 * @returns {Object} Device statistics
 */
function getDeviceStats() {
    const devices = {
        desktop: 0,
        mobile: 0,
        unknown: 0
    };
    
    // Count device types
    trafficData.events.forEach(event => {
        if (event.type === 'device' && event.deviceType) {
            const deviceType = event.deviceType.toLowerCase();
            if (deviceType === 'desktop') {
                devices.desktop++;
            } else if (deviceType === 'mobile') {
                devices.mobile++;
            } else {
                devices.unknown++;
            }
        }
    });
    
    // Calculate percentages
    const total = devices.desktop + devices.mobile + devices.unknown;
    
    if (total === 0) {
        return {
            counts: devices,
            percentages: {
                desktop: 0,
                mobile: 0,
                unknown: 0
            }
        };
    }
    
    return {
        counts: devices,
        percentages: {
            desktop: ((devices.desktop / total) * 100).toFixed(1),
            mobile: ((devices.mobile / total) * 100).toFixed(1),
            unknown: ((devices.unknown / total) * 100).toFixed(1)
        }
    };
}

// Set up a periodic job to save data
setInterval(() => {
    saveTrafficData();
    saveInsightsData();
}, 60000); // Save every minute

// Export functions
module.exports = {
    trackEvent,
    saveInsights,
    getInsights,
    getHighPriorityInsights,
    getTrafficSummary,
    getConversionSummary,
    getTopProducts,
    getDeviceStats
};