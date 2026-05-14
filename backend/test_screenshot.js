const screenshot = require('screenshot-desktop');

screenshot({ filename: '/tmp/aura_test_shot.png' }).then((imgPath) => {
  console.log('Screenshot saved to', imgPath);
}).catch((err) => {
  console.error('Failed to take screenshot:', err);
});
