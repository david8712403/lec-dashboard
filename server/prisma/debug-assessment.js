require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function test() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: '288c93f2-5b7f-817b-8257-000bd8caa217',
      page_size: 2,
    });

    if (response.results.length > 0) {
      const first = response.results[0];
      console.log('檢測紀錄欄位:', Object.keys(first.properties));
      console.log('\n視覺能力:');
      console.log(JSON.stringify(first.properties['視覺 能力'], null, 2));
      console.log('\n聽語能力:');
      console.log(JSON.stringify(first.properties['聽語  能力'], null, 2));
      console.log('\n感覺動作能力:');
      console.log(JSON.stringify(first.properties['感覺動作 能力'], null, 2));
      console.log('\n各項比例:');
      console.log('視覺比例:', first.properties['視覺 比例']);
      console.log('聽語比例:', first.properties['聽語 比例']);
      console.log('感覺動作比例:', first.properties['感覺動作 比例']);
      console.log('學科比例:', first.properties['學科 比例']);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
