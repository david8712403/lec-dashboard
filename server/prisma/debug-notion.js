require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

console.log('notion keys:', Object.keys(notion));
console.log('notion.databases keys:', Object.keys(notion.databases || {}));
console.log('Full notion.databases:', notion.databases);
