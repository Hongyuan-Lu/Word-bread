import * as fs from 'fs';
import * as path from 'path';
import iconv from 'iconv-lite';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface WordRecord {
  lemma: string;
  exam_level: 'common' | 'CET4' | 'CET6' | 'out_of_syllabus';
  is_common: boolean;
  pos: string;
  cn_gloss: string;
  en_definition: string;
  example_sentence: string;
}

interface ParsedWord {
  lemma: string;
  pos: string;
  cn_gloss: string;
  exam_level: 'common' | 'CET4' | 'CET6';
  is_common: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');

const FILE_MAPPINGS = [
  { filename: '1 初中-乱序.txt', examLevel: 'common' as const, isCommon: true },
  { filename: '2 高中-乱序.txt', examLevel: 'common' as const, isCommon: true },
  { filename: '3 四级-乱序.txt', examLevel: 'CET4' as const, isCommon: false },
  { filename: '4 六级-乱序.txt', examLevel: 'CET6' as const, isCommon: false },
];

const LEVEL_PRIORITY: Record<string, number> = {
  common: 3,
  CET4: 2,
  CET6: 1,
};

function readFileWithEncoding(filePath: string): string {
  try {
    const utf8Content = fs.readFileSync(filePath, 'utf-8');
    if (utf8Content.includes('\uFFFD')) {
      throw new Error('UTF-8 decoding failed, trying GBK');
    }
    return utf8Content;
  } catch {
    const buffer = fs.readFileSync(filePath);
    return iconv.decode(buffer, 'gb18030');
  }
}

// ==========================================
// 改进的 parseLine 函数 - 解决一词多属性问题
// ==========================================

/**
 * 在字符串中查找所有词性及其位置
 * 返回词性开始位置（不含空格）和结束位置
 */
function findAllPosTags(text: string): Array<{ pos: string; start: number; end: number }> {
  const results: Array<{ pos: string; start: number; end: number }> = [];

  // 构建正则：匹配"词性 + 可选空格"的位置
  // 词性必须出现在：1) 字符串开始 2) 空格之后
  const pattern = /(?:^|(?<=\s))((?:vt|vi|n|v|adj|adv|prep|conj|pron|num|int|det|art|aux|phr)\.)(\s*)/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    results.push({
      pos: match[1].toLowerCase(),
      start: match.index,  // 词性开始位置
      end: match.index + match[0].length  // 词性+空格结束位置
    });
  }

  return results;
}

function parseLine(line: string): ParsedWord | null {
  // 1. 清理首尾空白
  let trimmed = line.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return null;
  }

  // 2. 移除行首序号
  trimmed = trimmed.replace(/^\d+[\.\)\]]?\s*/, '');

  // 3. 拆分 lemma 和释义
  let lemma = '';
  let definition = '';

  // 优先按制表符拆分
  const tabIndex = trimmed.indexOf('\t');
  if (tabIndex !== -1) {
    lemma = trimmed.substring(0, tabIndex).trim();
    definition = trimmed.substring(tabIndex + 1).trim();
  } else {
    // 按连续空格拆分（至少2个空格）
    const spaceMatch = trimmed.match(/\s{2,}/);
    if (spaceMatch && spaceMatch.index !== undefined) {
      lemma = trimmed.substring(0, spaceMatch.index).trim();
      definition = trimmed.substring(spaceMatch.index + spaceMatch[0].length).trim();
    } else {
      // 按第一个空格拆分
      const firstSpace = trimmed.indexOf(' ');
      if (firstSpace !== -1) {
        lemma = trimmed.substring(0, firstSpace).trim();
        definition = trimmed.substring(firstSpace + 1).trim();
      } else {
        return null;
      }
    }
  }

  // 4. 验证 lemma
  lemma = lemma.toLowerCase();
  if (!/^[a-z\-\']+$/.test(lemma)) {
    return null;
  }

  // 5. 解析释义
  const posTags = findAllPosTags(definition);

  if (posTags.length === 0) {
    // 没有词性标记，整个作为释义
    return {
      lemma,
      pos: '',
      cn_gloss: definition,
      exam_level: 'common', // 后续会被覆盖
      is_common: true       // 后续会被覆盖
    };
  }

  // 6. 提取每个词性及其对应的释义
  const parsedParts: Array<{ pos: string; gloss: string }> = [];

  for (let i = 0; i < posTags.length; i++) {
    const currentPos = posTags[i];
    const nextPos = posTags[i + 1];

    // 释义范围：从当前词性结束位置到下一个词性开始位置（或字符串结尾）
    let gloss: string;
    if (nextPos) {
      // 从当前词性结束到下一个词性开始
      gloss = definition.substring(currentPos.end, nextPos.start).trim();
    } else {
      // 到字符串结尾
      gloss = definition.substring(currentPos.end).trim();
    }

    if (gloss) {
      parsedParts.push({
        pos: currentPos.pos,
        gloss: gloss
      });
    }
  }

  // 7. 构建输出
  const posString = parsedParts.map(p => p.pos).join('; ');
  const cnGloss = parsedParts.map(p => `${p.pos} ${p.gloss}`).join(' ');

  return {
    lemma,
    pos: posString,
    cn_gloss: cnGloss,
    exam_level: 'common', // 后续会被覆盖
    is_common: true      // 后续会被覆盖
  };
}

function processFile(
  filePath: string,
  examLevel: 'common' | 'CET4' | 'CET6',
  isCommon: boolean
): { totalLines: number; validLines: number; skippedLines: number; parsedWords: ParsedWord[] } {
  const content = readFileWithEncoding(filePath);
  const lines = content.split('\n');

  const totalLines = lines.length;
  let validLines = 0;
  let skippedLines = 0;
  const parsedWords: ParsedWord[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) {
      parsed.exam_level = examLevel;
      parsed.is_common = isCommon;
      validLines++;
      parsedWords.push(parsed);
    } else {
      skippedLines++;
    }
  }

  return { totalLines, validLines, skippedLines, parsedWords };
}

function mergeWords(allWords: ParsedWord[]): WordRecord[] {
  const lemmaMap = new Map<string, ParsedWord[]>();

  // 第一步：按 lemma 分组
  for (const word of allWords) {
    if (!lemmaMap.has(word.lemma)) {
      lemmaMap.set(word.lemma, []);
    }
    lemmaMap.get(word.lemma)!.push(word);
  }

  // 第二步：每个 lemma 选择最完整的记录
  const mergedWords: WordRecord[] = [];

  for (const [lemma, words] of lemmaMap) {
    if (words.length === 1) {
      // 只有一个记录，直接使用
      const word = words[0];
      mergedWords.push({
        lemma: word.lemma,
        exam_level: word.exam_level,
        is_common: word.is_common,
        pos: word.pos,
        cn_gloss: word.cn_gloss,
        en_definition: '',
        example_sentence: '',
      });
    } else {
      // 多个记录，选择释义最完整（最长）的
      // 策略：释义长度 > 优先级
      const bestWord = words.reduce((best, current) => {
        // 优先选择释义更长的
        if (current.cn_gloss.length > best.cn_gloss.length) {
          return current;
        } else if (current.cn_gloss.length < best.cn_gloss.length) {
          return best;
        }

        // 释义长度相同，选择优先级低的（common > CET4 > CET6）
        const bestPriority = LEVEL_PRIORITY[best.exam_level] || 0;
        const currentPriority = LEVEL_PRIORITY[current.exam_level] || 0;

        if (currentPriority > bestPriority) {
          return current;
        }

        return best;
      });

      mergedWords.push({
        lemma: bestWord.lemma,
        exam_level: bestWord.exam_level,
        is_common: bestWord.is_common,
        pos: bestWord.pos,
        cn_gloss: bestWord.cn_gloss,
        en_definition: '',
        example_sentence: '',
      });
    }
  }

  return mergedWords;
}

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
  console.log('词表导入脚本 (最终版 - 选择最完整释义)');
  console.log('策略：释义长度 > 优先级');
  console.log('='.repeat(60));

  const fileStats: Record<string, { totalLines: number; validLines: number; skippedLines: number }> = {};
  const allWords: ParsedWord[] = [];

  for (const mapping of FILE_MAPPINGS) {
    const filePath = path.join(DATA_DIR, mapping.filename);
    if (!fs.existsSync(filePath)) {
      console.log(`\n文件不存在: ${filePath}`);
      continue;
    }

    console.log(`\n处理文件: ${mapping.filename}`);

    const result = processFile(filePath, mapping.examLevel, mapping.isCommon);
    fileStats[mapping.filename] = {
      totalLines: result.totalLines,
      validLines: result.validLines,
      skippedLines: result.skippedLines,
    };

    console.log(`  总行数: ${result.totalLines}`);
    console.log(`  有效词数: ${result.validLines}`);
    console.log(`  跳过行数: ${result.skippedLines}`);

    allWords.push(...result.parsedWords);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('去重处理');
  console.log('='.repeat(60));

  const beforeDedup = allWords.length;
  const mergedWords = mergeWords(allWords);
  const afterDedup = mergedWords.length;

  console.log(`\n去重前总数: ${beforeDedup}`);
  console.log(`去重后总数: ${afterDedup}`);

  const commonCount = mergedWords.filter(w => w.exam_level === 'common').length;
  const cet4Count = mergedWords.filter(w => w.exam_level === 'CET4').length;
  const cet6Count = mergedWords.filter(w => w.exam_level === 'CET6').length;

  console.log(`\n各等级数量:`);
  console.log(`  common: ${commonCount}`);
  console.log(`  CET4: ${cet4Count}`);
  console.log(`  CET6: ${cet6Count}`);

  // 统计一词多属性
  const multiPosCount = mergedWords.filter(w => w.pos.includes(';')).length;
  console.log(`\n一词多属性统计:`);
  console.log(`  多词性单词数量: ${multiPosCount}`);

  // 显示一些多词性的示例
  const multiPosSamples = mergedWords
    .filter(w => w.pos.includes(';'))
    .slice(0, 10);

  if (multiPosSamples.length > 0) {
    console.log(`\n多词性单词示例 (前 10 个):`);
    for (const word of multiPosSamples) {
      console.log(`  - ${word.lemma}: pos="${word.pos}"`);
      console.log(`    cn_gloss="${word.cn_gloss.substring(0, 60)}${word.cn_gloss.length > 60 ? '...' : ''}"`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('开始导入到 Supabase');
  console.log('='.repeat(60));

  let successCount = 0;
  let failCount = 0;
  const failReasons: Record<string, number> = {};

  const batchSize = 100;
  for (let i = 0; i < mergedWords.length; i += batchSize) {
    const batch = mergedWords.slice(i, i + batchSize);

    const { error } = await supabase.from('words').upsert(
      batch.map(w => ({
        lemma: w.lemma,
        exam_level: w.exam_level,
        is_common: w.is_common,
        pos: w.pos || null,
        cn_gloss: w.cn_gloss || null,
        en_definition: w.en_definition || null,
        example_sentence: w.example_sentence || null,
      })),
      { onConflict: 'lemma' }
    );

    if (error) {
      failCount += batch.length;
      const reason = error.message || 'Unknown error';
      failReasons[reason] = (failReasons[reason] || 0) + batch.length;
      console.error(`  批次 ${Math.floor(i / batchSize) + 1} 失败: ${error.message}`);
    } else {
      successCount += batch.length;
      console.log(`  批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(mergedWords.length / batchSize)} 完成`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('导入完成');
  console.log('='.repeat(60));

  console.log(`\n每个文件统计:`);
  for (const [filename, stats] of Object.entries(fileStats)) {
    console.log(`  ${filename}:`);
    console.log(`    读取行数: ${stats.totalLines}`);
    console.log(`    有效词数: ${stats.validLines}`);
    console.log(`    跳过行数: ${stats.skippedLines}`);
  }

  console.log(`\n汇总统计:`);
  console.log(`  去重前总数: ${beforeDedup}`);
  console.log(`  去重后总数: ${afterDedup}`);
  console.log(`  common 数量: ${commonCount}`);
  console.log(`  CET4 数量: ${cet4Count}`);
  console.log(`  CET6 数量: ${cet6Count}`);
  console.log(`  多词性单词数量: ${multiPosCount}`);
  console.log(`  upsert 成功数量: ${successCount}`);
  console.log(`  upsert 失败数量: ${failCount}`);

  if (failCount > 0) {
    console.log(`\n失败原因:`);
    for (const [reason, count] of Object.entries(failReasons)) {
      console.log(`  ${reason}: ${count}`);
    }
  }

  console.log(`\n导入完成!`);
}

main().catch(console.error);
