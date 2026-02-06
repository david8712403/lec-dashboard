require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function test() {
  try {
    const response = await notion.dataSources.query({
      data_source_id: '288c93f2-5b7f-817b-8257-000bd8caa217',
      page_size: 100,
    });

    console.log(`總共找到 ${response.results.length} 筆檢測紀錄\n`);

    let withStudent = 0;
    let withoutStudent = 0;
    let withDate = 0;
    let withoutDate = 0;

    response.results.forEach((page, idx) => {
      const props = page.properties;
      const studentRel = props['🧑🏻‍🎓 個案']?.relation || [];
      const date = props['日期']?.date?.start;
      const name = props['名稱']?.title?.[0]?.plain_text || '(無標題)';

      if (studentRel.length > 0) {
        withStudent++;
      } else {
        withoutStudent++;
        console.log(`❌ 沒有關聯個案: ${name}`);
      }

      if (date) {
        withDate++;
      } else {
        withoutDate++;
        console.log(`❌ 沒有日期: ${name}`);
      }
    });

    console.log(`\n統計：`);
    console.log(`  有關聯個案: ${withStudent}`);
    console.log(`  無關聯個案: ${withoutStudent}`);
    console.log(`  有日期: ${withDate}`);
    console.log(`  無日期: ${withoutDate}`);
    console.log(`  預期可匯入: ${Math.min(withStudent, withDate)}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
