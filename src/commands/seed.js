const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting database seeding process...');

// Check if the seedData.json file exists
const seedDataPath = path.join(__dirname, '../seed/seedData.json');
if (!fs.existsSync(seedDataPath)) {
  console.error('Error: seedData.json file not found!');
  process.exit(1);
}

try {
  // Get command line arguments
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  // Run the appropriate npm script
  const command = shouldClear ? 'npm run seed:clear' : 'npm run seed';
  console.log(`Executing: ${command}`);
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('Seed command completed successfully!');
} catch (error) {
  console.error('Error running seed command:', error.message);
  process.exit(1);
}
