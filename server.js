let express = require('express');
let path = require('path');
let fs = require('fs');
let MongoClient = require('mongodb').MongoClient;
let bodyParser = require('body-parser');
let app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/profile-picture', function(req, res) {
    let img = fs.readFileSync(path.join(__dirname, 'image.jpg'));
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.end(img, 'binary');                     
});

// MongoDB connection string - With authentication
let mongoUrlLocal = "mongodb://admin:password@localhost:27017";

// Remove deprecated options - this will fix the warnings
let MongoClientOptions = {};

// Database configuration
let databaseName = "user-account";
let collectionName = "users";

// Global MongoDB client for connection reuse
let mongoClient = null;

// Initialize MongoDB connection
async function initMongoDB() {
    try {
        mongoClient = new MongoClient(mongoUrlLocal, MongoClientOptions);
        await mongoClient.connect();
        console.log('✅ MongoDB connected successfully');
        
        // Test the connection
        await mongoClient.db(databaseName).admin().ping();
        console.log('✅ MongoDB ping successful');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        console.error('Make sure MongoDB Docker container is running on port 27017');
        mongoClient = null;
    }
}

// Initialize MongoDB when server starts
initMongoDB();

app.get('/get-profile', async function(req, res) {
    if (!mongoClient) {
        console.error('❌ MongoDB not connected');
        res.json({
            name: "Anna smith",
            email: "anna.smith@example.com", 
            interests: "coding",
            _fallback: true
        });
        return;
    }

    try {
        let db = mongoClient.db(databaseName);
        let myquery = { username: "demo" };
        
        let result = await db.collection(collectionName).findOne(myquery);
        
        if (result) {
            console.log('✅ Profile retrieved successfully');
            res.json(result);
        } else {
            console.log('⚠️ No profile found, sending default data');
            res.json({
                name: "Anna smith",
                email: "anna.smith@example.com",
                interests: "coding",
                _default: true
            });
        }
    } catch (error) {
        console.error('❌ Database query error:', error);
        res.json({
            name: "Anna smith",
            email: "anna.smith@example.com",
            interests: "coding",
            _error: true
        });
    }
});

// POST endpoint to save profile data
app.post('/save-profile', async function(req, res) {
    console.log('📝 Attempting to save profile:', req.body);
    
    if (!mongoClient) {
        console.error('❌ MongoDB not connected');
        res.json({ 
            success: false, 
            error: 'Database connection not available. Please try again.' 
        });
        return;
    }

    let profileData = {
        username: "demo",
        name: req.body.name,
        email: req.body.email,
        interests: req.body.interests,
        lastUpdated: new Date()
    };

    try {
        let db = mongoClient.db(databaseName);
        
        // Use upsert to update if exists, insert if doesn't exist
        let result = await db.collection(collectionName).updateOne(
            { username: "demo" },
            { $set: profileData },
            { upsert: true }
        );
        
        console.log('✅ Profile saved successfully:', result);
        res.json({ 
            success: true, 
            message: 'Profile updated successfully!',
            modifiedCount: result.modifiedCount,
            upsertedCount: result.upsertedCount
        });
        
    } catch (error) {
        console.error('❌ Database save error:', error);
        res.json({ 
            success: false, 
            error: 'Failed to save profile data: ' + error.message 
        });
    }
});

// Health check endpoint
app.get('/health', function(req, res) {
    res.json({
        status: 'ok',
        mongodb: mongoClient ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    if (mongoClient) {
        await mongoClient.close();
        console.log('✅ MongoDB connection closed');
    }
    process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Visit http://localhost:${PORT} to view the application`);
    console.log(`🔧 Health check: http://localhost:${PORT}/health`);
});