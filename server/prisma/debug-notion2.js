require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

console.log('dataSources:', Object.keys(notion.dataSources || {}));
console.log('pages:', Object.keys(notion.pages || {}));
console.log('search:', Object.keys(notion.search || {}));
