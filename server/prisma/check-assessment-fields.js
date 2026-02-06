require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function test() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: '288c93f2-5b7f-817b-8257-000bd8caa217',
      page_size: 1,
    });

    if (response.results.length > 0) {
      const first = response.results[0];
      console.log('所有欄位:');
      Object.keys(first.properties).forEach(key => {
        const prop = first.properties[key];
        console.log(`- ${key}: ${prop.type}`);
      });
      
      // 查看是否有評估文字或備註相關欄位
      console.log('\n其他課程說明:');
      console.log(JSON.stringify(first.properties['其他課程說明'], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
