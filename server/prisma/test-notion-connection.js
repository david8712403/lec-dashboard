require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');

async function test() {
  console.log('Testing Notion API connection...');
  console.log('API Key:', process.env.NOTION_API_KEY ? 'Found' : 'Not found');

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  console.log('Client created:', typeof notion);
  console.log('databases:', typeof notion.databases);
  console.log('databases.query:', typeof notion.databases?.query);

  // 測試查詢
  try {
    const response = await notion.databases.query({
      database_id: '288c93f25b7f8182b8b4000b75ee12b0',
      page_size: 1,
    });
    console.log('✅ Query successful!');
    console.log('Results:', response.results.length);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
}

test();
