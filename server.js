// var express = require('express');
// var path = require('path');
// var fs = require('fs');
// var app = express();


// app.get('/', function(req, res) {
//     res.sendFile(path.join(__dirname, 'index.html'));
// });

// app.get('/data', function(req, res) {
//     var img = fs.readFileSync(path.join(__dirname, 'image.jpg'));
//     res.writeHead(200, {'Content-Type': 'image/jpeg'});
//     res.end(img, 'binary');
// });

// app.listen(3000, function() {
//     console.log('Server is running on http://localhost:3000');
// }   );


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

// MongoDB connection string - make sure this matches your setup
let mongoUrlLocal = "mongodb://admin:password@localhost:27017";

// MongoDB options
let MongoClientOptions = { useNewUrlParser: true, useUnifiedTopology: true };

// Database configuration
let databaseName = "user-account"; // Fixed typo: was "dabtabaseName"
let collectionName = "users";

app.get('/get-profile', function(req, res) {
    // Connect to the database
    MongoClient.connect(mongoUrlLocal, MongoClientOptions, function(err, client) {
        if(err) {
            console.error('MongoDB connection error:', err);
            console.error('Make sure MongoDB is running and accessible at localhost:27017');
            console.error('Check if username/password are correct');
            // Send fallback data instead of crashing
            res.json({
                name: "Anna smith",
                email: "anna.smith@example.com", 
                interests: "coding"
            });
            return;
        }

        let db = client.db(databaseName);
        let myquery = { username: "demo" };

        db.collection(collectionName).findOne(myquery, function(err, result) {
            if(err) {
                console.error('Database query error:', err);
                client.close();
                // Send fallback data instead of crashing
                res.json({
                    name: "Anna smith",
                    email: "anna.smith@example.com",
                    interests: "coding"
                });
                return;
            }
            
            client.close();
            
            // Send response - if no result found, send default data
            if (result) {
                res.json(result);
            } else {
                res.json({
                    name: "Anna smith",
                    email: "anna.smith@example.com",
                    interests: "coding"
                });
            }
        });             
    });
});

// POST endpoint to save profile data
app.post('/save-profile', function(req, res) {
    let profileData = {
        username: "demo",
        name: req.body.name,
        email: req.body.email,
        interests: req.body.interests
    };

    MongoClient.connect(mongoUrlLocal, MongoClientOptions, function(err, client) {
        if(err) {
            console.error('MongoDB connection error:', err);
            res.json({ 
                success: false, 
                error: 'Database connection failed. Make sure MongoDB is running.' 
            });
            return;
        }

        let db = client.db(databaseName);
        
        // Use upsert to update if exists, insert if doesn't exist
        db.collection(collectionName).updateOne(
            { username: "demo" },
            { $set: profileData },
            { upsert: true },
            function(err, result) {
                client.close();
                
                if(err) {
                    console.error('Database save error:', err);
                    res.json({ 
                        success: false, 
                        error: 'Failed to save profile data' 
                    });
                } else {
                    console.log('Profile saved successfully');
                    res.json({ 
                        success: true, 
                        message: 'Profile updated successfully!' 
                    });
                }
            }
        );
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the application`);
});