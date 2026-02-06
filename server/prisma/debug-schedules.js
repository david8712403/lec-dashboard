require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function test() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: '289c93f2-5b7f-8030-b1c7-000bdbe00572',
      page_size: 2,
    });

    console.log('Found', response.results.length, 'results');
    if (response.results.length > 0) {
      const first = response.results[0];
      console.log('\nFirst result:');
      console.log('ID:', first.id);
      console.log('Properties:', Object.keys(first.properties));
      console.log('\nFull properties:');
      console.log(JSON.stringify(first.properties, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
