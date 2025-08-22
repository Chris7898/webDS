const path = require('path');
const open = require('open');

// Launch backend
require(path.join(__dirname, 'server.js'));

// Open frontend in default browser
const frontendIndex = path.join(__dirname, 'deploy', 'index.html');
setTimeout(() => {
  open(`file://${frontendIndex}`)
    .then(() => console.log('Frontend opened'))
    .catch((err) => console.error('Failed to open frontend:', err));
}, 500);
