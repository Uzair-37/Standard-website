/**
 * Backend server for ProAudio website
 * This handles API requests and integrates with Tally ERP
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const tallyIntegration = require('./tally_integration');
const trafficAnalytics = require('./traffic_analytics');

// Sample product data - in a real app, this would come from a database
let products = [
    {
        id: 1,
        name: 'Studio Microphone XL5',
        description: 'Professional condenser microphone for studio recording.',
        price: 299.99,
        stock: 15,
        image: 'images/placeholder.jpg'
    },
    {
        id: 2,
        name: 'Audio Interface Pro',
        description: 'High-quality audio interface with low latency.',
        price: 199.99,
        stock: 8,
        image: 'images/placeholder.jpg'
    },
    {
        id: 3,
        name: 'Studio Monitors (Pair)',
        description: 'Accurate sound reproduction for mixing and mastering.',
        price: 449.99,
        stock: 10,
        image: 'images/placeholder.jpg'
    },
    {
        id: 4,
        name: 'Wireless Headphones Studio',
        description: 'Premium wireless headphones with noise cancellation.',
        price: 249.99,
        stock: 20,
        image: 'images/placeholder.jpg'
    },
    {
        id: 5,
        name: 'Digital Mixing Console',
        description: '16-channel digital mixing console for live and studio use.',
        price: 799.99,
        stock: 5,
        image: 'images/placeholder.jpg'
    },
    {
        id: 6,
        name: 'Dynamic Microphone Set',
        description: 'Set of 3 dynamic microphones ideal for drums and live performance.',
        price: 179.99,
        stock: 12,
        image: 'images/placeholder.jpg'
    }
];

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

// Sync with Tally on startup
(async function() {
    try {
        console.log('Initial sync with Tally ERP...');
        products = await tallyIntegration.syncInventoryWithTally(products);
        console.log('Initial sync complete!');
    } catch (error) {
        console.error('Error during initial Tally sync:', error);
    }
})();

// API Routes

// Get all products
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Get product by ID
app.get('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = products.find(p => p.id === id);
    
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

// Update product stock
app.put('/api/products/:id/stock', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { newStock } = req.body;
        
        if (isNaN(newStock)) {
            return res.status(400).json({ message: 'Invalid stock value' });
        }
        
        const product = products.find(p => p.id === id);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Update stock locally
        product.stock = newStock;
        
        // Update stock in Tally
        await tallyIntegration.updateStockInTally(product.name, newStock);
        
        res.json({ message: 'Stock updated successfully', product });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ message: 'Error updating stock' });
    }
});

// Force sync with Tally
app.post('/api/tally/sync', async (req, res) => {
    try {
        products = await tallyIntegration.syncInventoryWithTally(products);
        res.json({ message: 'Sync successful', products });
    } catch (error) {
        console.error('Error syncing with Tally:', error);
        res.status(500).json({ message: 'Error syncing with Tally' });
    }
});

// Chatbot API endpoint
app.post('/api/chatbot', (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ message: 'No message provided' });
    }
    
    // Simple response logic - in a real app, this would be more sophisticated
    const lowerMessage = message.toLowerCase();
    let response;
    
    if (lowerMessage.includes('microphone') || lowerMessage.includes('mic')) {
        response = "We offer professional studio microphones starting from $179.99. Our most popular model is the Studio Microphone XL5 for $299.99.";
    } 
    else if (lowerMessage.includes('interface')) {
        response = "Our Audio Interface Pro ($199.99) is perfect for home studios with low latency and high-quality preamps.";
    }
    else if (lowerMessage.includes('stock') || lowerMessage.includes('available')) {
        const product = products.find(p => lowerMessage.includes(p.name.toLowerCase()));
        if (product) {
            response = `We currently have ${product.stock} units of ${product.name} in stock.`;
        } else {
            response = "Most of our products are in stock. Is there a specific item you're inquiring about?";
        }
    }
    else {
        response = "Thanks for your message. How can I help you with our audio equipment?";
    }
    
    res.json({ response });
});

// Traffic analytics API endpoints
app.post('/api/traffic/track', (req, res) => {
    try {
        const trackingData = req.body;
        trafficAnalytics.trackEvent(trackingData);
        res.status(200).send({ success: true });
    } catch (error) {
        console.error('Error tracking traffic data:', error);
        res.status(500).json({ message: 'Error tracking traffic data' });
    }
});

app.post('/api/traffic/report', (req, res) => {
    try {
        const reportData = req.body;
        trafficAnalytics.saveInsights(reportData);
        res.status(200).send({ success: true });
    } catch (error) {
        console.error('Error saving traffic insights:', error);
        res.status(500).json({ message: 'Error saving traffic insights' });
    }
});

app.get('/api/traffic/insights', (req, res) => {
    try {
        const insights = trafficAnalytics.getInsights();
        res.json(insights);
    } catch (error) {
        console.error('Error retrieving traffic insights:', error);
        res.status(500).json({ message: 'Error retrieving traffic insights' });
    }
});

// Admin dashboard data
app.get('/api/admin/dashboard', (req, res) => {
    try {
        const dashboardData = {
            traffic: trafficAnalytics.getTrafficSummary(),
            conversions: trafficAnalytics.getConversionSummary(),
            topProducts: trafficAnalytics.getTopProducts(),
            deviceStats: trafficAnalytics.getDeviceStats(),
            insights: trafficAnalytics.getHighPriorityInsights()
        };
        res.json(dashboardData);
    } catch (error) {
        console.error('Error retrieving admin dashboard data:', error);
        res.status(500).json({ message: 'Error retrieving admin dashboard data' });
    }
});

// Test route
app.get('/test', (req, res) => {
    res.send('Server is working!');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the website at http://localhost:${PORT}`);
    console.log(`For mobile access, use your computer's IP address instead of localhost`);
});