/**
 * Helper script to generate the JSON needed for creating the first admin user
 * 
 * Usage:
 *   npx tsx create-first-admin.ts <github-username> <email>
 * 
 * This will output the wrangler commands you need to run
 */

function generateUserId(): string {
  // Generate a UUID and remove dashes
  return crypto.randomUUID().replace(/-/g, '');
}

function createAdminUserCommands(username: string, email: string): void {
  const userId = generateUserId();
  const now = new Date().toISOString();

  const userObject = {
    id: userId,
    email: email,
    username: username,
    role: 'admin',
    authSource: 'github',
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  const userJson = JSON.stringify(userObject);
  const usernameLower = username.toLowerCase();

  console.log('\n=== CLOUDFLARE KV SETUP COMMANDS ===\n');
  console.log('Run these commands to create your first admin user:\n');
  
  console.log(`# 1. Create the user profile`);
  console.log(`npx wrangler kv key put --binding=USERS "profile:${userId}" '${userJson}'\n`);
  
  console.log(`# 2. Create the username index`);
  console.log(`npx wrangler kv key put --binding=USERS "index:username:${usernameLower}" "${userId}"\n`);
  
  console.log('=== USER DETAILS ===\n');
  console.log(`User ID: ${userId}`);
  console.log(`Username: ${username}`);
  console.log(`Email: ${email}`);
  console.log(`Role: admin`);
  console.log(`Auth Source: github`);
  console.log(`\nAfter running these commands, log in at /login using GitHub account: ${username}\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Error: Missing required arguments\n');
  console.log('Usage: npx tsx create-first-admin.ts <github-username> <email>');
  console.log('Example: npx tsx create-first-admin.ts johndoe john@example.com');
  process.exit(1);
}

const [username, email] = args;

// Basic validation
if (!username.match(/^[a-zA-Z0-9-]+$/)) {
  console.error('Error: Invalid GitHub username. Use only letters, numbers, and hyphens.');
  process.exit(1);
}

if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  console.error('Error: Invalid email address.');
  process.exit(1);
}

createAdminUserCommands(username, email);
