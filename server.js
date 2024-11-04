const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/images', (req, res) => {
    const imagesDirectory = path.join(__dirname, 'public/images');
    fs.readdir(imagesDirectory, (err, files) => {
        if (err) {
            console.error('Error reading images directory:', err);
            res.status(500).json({ error: 'Unable to fetch images' });
            return;
        }
        const images = files.map(file => `/images/${file}`);
        res.json(images);
    });
});

// Start HTTP server instead of HTTPS since SSL certificates are not available
app.listen(port, () => {
    console.log(`Server is running at https://localhost:${port}`);
});
