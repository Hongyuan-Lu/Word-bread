import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    console.error('错误: 缺少 NEXT_PUBLIC_SUPABASE_URL 环境变量');
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error('错误: 缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('='.repeat(60));
  console.log('Words 表检查');
  console.log('='.repeat(60));

  // ----------------------------------------------------
  // 修复点：使用分页循环抓取所有数据，突破 1000 条限制
  // ----------------------------------------------------
  let allWords: any[] =[];
  let from = 0;
  const step = 1000;

  console.log('正在从 Supabase 拉取数据，请稍候...');
  
  while (true) {
    const { data, error } = await supabase
      .from('words')
      .select('lemma, exam_level, is_common, pos, cn_gloss')
      .range(from, from + step - 1); // 按范围抓取，比如 0-999, 1000-1999

    if (error) {
      console.error(`查询 words 表失败 (from ${from}):`, error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      break; // 已经没有更多数据了，退出循环
    }

    allWords.push(...data);
    
    // 如果拉取到的数据量少于设定的 step，说明到底了，可以直接退出
    if (data.length < step) {
      break;
    }
    
    from += step;
  }
  // ----------------------------------------------------

  const totalCount = allWords.length;

  const commonCount = allWords.filter(w => w.exam_level === 'common').length;
  const cet4Count = allWords.filter(w => w.exam_level === 'CET4').length;
  const cet6Count = allWords.filter(w => w.exam_level === 'CET6').length;
  const outOfSyllabusCount = allWords.filter(w => w.exam_level === 'out_of_syllabus').length;

  console.log(`\n统计信息:`);
  console.log(`  总数: ${totalCount}`);
  console.log(`  common: ${commonCount}`);
  console.log(`  CET4: ${cet4Count}`);
  console.log(`  CET6: ${cet6Count}`);
  console.log(`  out_of_syllabus: ${outOfSyllabusCount}`);

  const args = process.argv.slice(2);
  // 添加了 -s 或 --samples 参数就可以展示部分词汇
  const showSamples = args.includes('--samples') || args.includes('-s');

  if (showSamples) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('样例输出');
    console.log('='.repeat(60));

    const levels =[
      { name: 'common', level: 'common' },
      { name: 'CET4', level: 'CET4' },
      { name: 'CET6', level: 'CET6' },
      { name: 'out_of_syllabus', level: 'out_of_syllabus' },
    ];

    for (const { name, level } of levels) {
      const samples = allWords.filter(w => w.exam_level === level).slice(0, 5);

      console.log(`\n${name} (前 5 个):`);
      if (samples.length === 0) {
        console.log('  (无)');
      } else {
        for (const word of samples) {
          console.log(`  - lemma: "${word.lemma}", pos: "${word.pos || ''}", cn_gloss: "${(word.cn_gloss || '').substring(0, 40)}${(word.cn_gloss || '').length > 40 ? '...' : ''}"`);
        }
      }
    }
  }

  console.log(`\n检查完成!`);
}

main().catch(console.error);