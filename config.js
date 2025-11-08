const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const password = 'ai-terminal-2024-secure';
const salt = 'fixed-salt';
const key = crypto.scryptSync(password, salt, 32);

function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const encryptedConfig = {
API_KEY: 'b571b94af0663835389b0c4316a98020:f18a301b29ae0cdb4d9d42fd77dd2ec8477fd89bfb6fd7a97179f7a534babcdb46a180784b607f8765cb213bce817124',
BASE_URL: '2b7ece2ffe865cc57cae7db2e43ce4fc:af8942c1f380215b11e76f7be799073b2d29c64cb57f6da89cef6636b8704779'
};

module.exports = {
    getAPIKey: () => decrypt(encryptedConfig.API_KEY),
    getBaseURL: () => decrypt(encryptedConfig.BASE_URL)
};