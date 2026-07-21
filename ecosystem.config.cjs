module.exports = {
apps: [{
name: 'qa-ai-app',
script: 'npm',
args: 'run preview -- --host 0.0.0.0 --port 3000',
instances: 1,
autorestart: true,
watch: false,
max_memory_restart: '1G',
env: {
NODE_ENV: 'production',
PORT: 3000
}
}]
};
