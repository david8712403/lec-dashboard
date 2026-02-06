const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assessments = await prisma.assessment.findMany({
    take: 5,
    orderBy: { assessed_at: 'desc' }
  });
  
  console.log('Sample Assessment Records:\n');
  assessments.forEach(a => {
    console.log(`ID: ${a.id.substring(0, 8)}...`);
    console.log(`Stars (top-level): ${a.stars}`);
    console.log(`Status: ${a.status}`);
    const metrics = typeof a.metrics === 'string' ? JSON.parse(a.metrics) : a.metrics;
    console.log(`Metrics keys:`, Object.keys(metrics));
    console.log(`Has stars in metrics?`, 'stars' in metrics);
    console.log('---\n');
  });
  
  // Check stars distribution
  const starCounts = await prisma.assessment.groupBy({
    by: ['stars'],
    _count: { stars: true }
  });
  console.log('Stars distribution:');
  starCounts.forEach(s => console.log(`  ${s.stars} stars: ${s._count.stars} records`));
}

main().finally(() => prisma.$disconnect());
