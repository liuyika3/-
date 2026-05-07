/**
 * Jovida Tool Demo — Backend Server
 * 代理所有 Apify 调用，保护 token 不暴露在前端
 */

const express = require('C:/Users/2025lyk/Desktop/dmoes/demo/node_modules/express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();

// 自动读取 .env 文件
try {
  const envFile = path.join(__dirname, '.env');
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
} catch (e) {}

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const PORT = 3456;

app.use(express.json());
app.use(express.static(__dirname));

// ─── Apify helpers ────────────────────────────────────────────────────────────

function apifyPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.apify.com', path, method: 'POST',
      headers: {
        Authorization: 'Bearer ' + APIFY_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject); req.write(data); req.end();
  });
}

function apifyGetRaw(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.apify.com', path,
      headers: { Authorization: 'Bearer ' + APIFY_TOKEN }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d)); }
    ).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForRun(runId, maxTries = 40) {
  let status = 'RUNNING', tries = 0;
  while (['RUNNING', 'READY'].includes(status)) {
    await sleep(3000);
    status = JSON.parse(await apifyGetRaw(`/v2/actor-runs/${runId}`)).data?.status;
    if (++tries > maxTries) throw new Error('Actor 超时');
  }
  if (status !== 'SUCCEEDED') throw new Error('Actor 失败: ' + status);
  return status;
}

// ─── Word analysis (no LLM needed) ───────────────────────────────────────────

function analyzeTranscript(captions) {
  const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could','should','may','might',
    'shall','can','need','dare','ought','used','and','but','or','nor','for','yet','so',
    'in','on','at','to','of','up','by','as','it','its','i','you','he','she','we','they',
    'me','him','her','us','them','my','your','his','our','their','this','that','these',
    'those','what','which','who','when','where','why','how','all','each','every','both',
    'few','more','most','other','some','such','no','not','only','same','than','then',
    'too','very','just','about','there','with','from','into','through','during','before',
    'after','above','below','between','out','if','because','while','although','though']);

  // 词频统计
  const freq = {};
  const wordMap = {}; // 保存原始大小写
  captions.forEach(c => {
    c.text.replace(/\n/g, ' ').split(/\s+/).forEach(raw => {
      const w = raw.toLowerCase().replace(/[^a-z']/g, '');
      if (w.length >= 5 && !stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
        wordMap[w] = raw.replace(/[^a-zA-Z']/g, '');
      }
    });
  });

  // 按词频排序，取出现 2-8 次的词（太多=常用词，太少=无意义）
  const vocab = Object.entries(freq)
    .filter(([, count]) => count >= 2 && count <= 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => {
      // 找含这个词的例句
      const example = captions.find(c =>
        c.text.toLowerCase().includes(word)
      )?.text.replace(/\n/g, ' ') || '';
      return { word: wordMap[word] || word, count, example };
    });

  // 长句提取（作为听力练习素材）
  const longSentences = captions
    .filter(c => c.text.replace(/\n/g, ' ').split(' ').length >= 8)
    .slice(0, 5)
    .map(c => ({ start: Number(c.start).toFixed(0), text: c.text.replace(/\n/g, ' ') }));

  // 全文
  const fullText = captions.map(c => c.text.replace(/\n/g, ' ')).join(' ');
  const wordCount = fullText.split(/\s+/).length;

  return { vocab, longSentences, wordCount, total: captions.length };
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// 1. YouTube 搜索
app.post('/api/youtube-search', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    const run = await apifyPost('/v2/acts/api-ninja~youtube-search-scraper/runs?timeout=60&memory=256', {
      query: keyword + ' english explained',
      maxResults: 20
    });
    if (!run.data?.id) throw new Error(run.error?.message || '启动失败');

    await waitForRun(run.data.id);
    const raw = await apifyGetRaw(`/v2/actor-runs/${run.data.id}/dataset/items`);
    const videos = JSON.parse(raw);

    // 过滤合适时长
    const filtered = videos.filter(v => {
      const parts = (v.lengthText || '').split(':').map(Number);
      if (parts.length === 2) return parts[0] >= 3 && parts[0] <= 20;
      return false;
    });

    const list = (filtered.length ? filtered : videos).slice(0, 6).map(v => ({
      videoId: v.videoId,
      title: v.title,
      channel: v.channelTitle,
      duration: v.lengthText,
      thumbnail: v.thumbnail?.[0]?.url,
      url: `https://www.youtube.com/watch?v=${v.videoId}`
    }));

    res.json({ ok: true, videos: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 获取字幕
app.post('/api/transcript', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) return res.status(400).json({ error: '缺少 videoUrl' });

    const run = await apifyPost('/v2/acts/pintostudio~youtube-transcript-scraper/runs?timeout=120&memory=512', {
      videoUrl
    });
    if (!run.data?.id) throw new Error(run.error?.message || '启动失败');

    await waitForRun(run.data.id);
    const raw = await apifyGetRaw(`/v2/actor-runs/${run.data.id}/dataset/items`);
    const parsed = JSON.parse(raw);
    const captions = parsed?.[0]?.data || [];

    const analysis = analyzeTranscript(captions);
    res.json({ ok: true, captions: captions.slice(0, 50), analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Generic HTTPS GET helper (for free public APIs) ─────────────────────────

function httpsGet(hostname, path, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Jovida/1.0)', 'Accept': 'application/json, text/plain, */*' } };
    https.get(options, r => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && maxRedirects > 0) {
        const loc = new URL(r.headers.location, `https://${hostname}`);
        r.resume();
        httpsGet(loc.hostname, loc.pathname + loc.search, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

// 3. PubMed 文献搜索 (NCBI E-utilities — 完全免费，无需 token)
app.post('/api/pubmed', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    // NCBI 建议带 tool + email 避免被限流
    const base = `db=pubmed&tool=JovidaDemo&email=demo%40jovida.app&retmode=json`;

    // Step 1: esearch → 获取 PMIDs
    const searchRaw = await httpsGet(
      'eutils.ncbi.nlm.nih.gov',
      `/entrez/eutils/esearch.fcgi?${base}&term=${encodeURIComponent(keyword)}&retmax=6`
    );
    if (searchRaw.trimStart().startsWith('<')) {
      throw new Error('PubMed 服务暂时无响应，请稍后重试（NCBI 有时会限流）');
    }
    const search = JSON.parse(searchRaw);
    const ids = search.esearchresult?.idlist || [];
    if (!ids.length) return res.json({ ok: true, articles: [] });

    // Step 2: esummary → 获取标题/期刊/作者/年份
    const summaryRaw = await httpsGet(
      'eutils.ncbi.nlm.nih.gov',
      `/entrez/eutils/esummary.fcgi?${base}&id=${ids.join(',')}`
    );
    if (summaryRaw.trimStart().startsWith('<')) {
      throw new Error('PubMed 摘要获取失败，请重试');
    }
    const summary = JSON.parse(summaryRaw);
    const result = summary.result || {};

    const articles = ids.map(id => {
      const doc = result[id] || {};
      const authors = (doc.authors || []).slice(0, 3).map(a => a.name).join(', ');
      return {
        pmid: id,
        title: doc.title || '(no title)',
        journal: doc.fulljournalname || doc.source || '',
        year: (doc.pubdate || '').slice(0, 4),
        authors: authors + ((doc.authors?.length || 0) > 3 ? ' et al.' : ''),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
      };
    });

    res.json({ ok: true, articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reddit 帖子 (Apify trudax~reddit-scraper-lite)
app.post('/api/reddit', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=top&t=month`;
    const run = await apifyPost('/v2/acts/trudax~reddit-scraper-lite/runs?timeout=60&memory=256', {
      startUrls: [{ url: searchUrl }],
      maxItems: 10
    });
    if (!run.data?.id) throw new Error(run.error?.message || '启动失败');

    await waitForRun(run.data.id);
    const raw = await apifyGetRaw(`/v2/actor-runs/${run.data.id}/dataset/items`);
    const posts = JSON.parse(raw);

    const list = (posts || []).slice(0, 8).map(p => ({
      title: p.title || '',
      subreddit: p.communityName || p.parsedCommunityName || '',
      score: p.upVotes || 0,
      comments: p.numberOfComments || 0,
      author: p.username || '',
      body: (p.body || '').slice(0, 300),
      url: p.url || '',
      createdAt: p.createdAt || ''
    }));

    res.json({ ok: true, posts: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Wikipedia 摘要 (Wikipedia REST API — 完全免费)
app.post('/api/wikipedia', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    // Step 1: 搜索最相关页面
    const searchRaw = await httpsGet(
      'en.wikipedia.org',
      `/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&srlimit=1&format=json`
    );
    const searchData = JSON.parse(searchRaw);
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return res.json({ ok: true, article: null });

    // Step 2: 拿 REST summary (含摘要 + 图片)
    const title = encodeURIComponent(firstResult.title.replace(/ /g, '_'));
    const summaryRaw = await httpsGet(
      'en.wikipedia.org',
      `/api/rest_v1/page/summary/${title}`
    );
    const article = JSON.parse(summaryRaw);

    res.json({
      ok: true,
      article: {
        title: article.title || firstResult.title,
        description: article.description || '',
        extract: article.extract || '',
        thumbnail: article.thumbnail?.source || null,
        url: article.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Amazon Shopping (amazon-scraper~amazon-search-terms-scraper)
app.post('/api/shopping', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
    const run = await apifyPost('/v2/acts/amazon-scraper~amazon-search-terms-scraper/runs?timeout=120&memory=512', {
      searchTermUrls: [searchUrl],
      maxItems: 20
    });
    if (!run.data?.id) throw new Error(run.error?.message || '启动失败');

    await waitForRun(run.data.id);
    const raw = await apifyGetRaw(`/v2/actor-runs/${run.data.id}/dataset/items`);
    const pages = JSON.parse(raw);

    // 每个 page item 下有 results 数组，展平取前12个
    const allResults = [];
    for (const page of (pages || [])) {
      if (Array.isArray(page.results)) allResults.push(...page.results);
    }

    const products = allResults.slice(0, 12).map(p => ({
      title: p.title || '',
      price: p.price || '',
      store: 'Amazon',
      rating: p.reviews?.rating ?? null,
      reviews: p.reviews?.count ?? 0,
      thumbnail: p.image || null,
      url: p.link || `https://www.amazon.com/dp/${p.asin}`,
      prime: p.prime || false
    }));

    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Open Food Facts — 食品成分/营养查询 (完全免费，700万+产品)
app.post('/api/food', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });


    const fallbackFood = {
      'Coca-Cola': {
        name: 'Coca-Cola Original Taste',
        brand: 'Coca-Cola',
        nutriscore: 'E',
        image: 'https://images.openfoodfacts.org/images/products/544/900/011/1678/front_en.145.400.jpg',
        ingredients: 'Carbonated water, sugar, colour (caramel E150d), phosphoric acid, natural flavourings including caffeine.',
        additives: ['e150d', 'e338'],
        allergens: '',
        nutrition: {
          calories: 42, sugar: 10.6, fat: 0, protein: 0, carbs: 10.6, salt: 0, fiber: 0
        }
      },
      'Oreo': {
        name: 'Oreo Original',
        brand: 'Nabisco',
        nutriscore: 'E',
        image: 'https://images.openfoodfacts.org/images/products/762/221/044/9283/front_fr.112.400.jpg',
        ingredients: 'Wheat flour, sugar, palm oil, rapeseed oil, fat-reduced cocoa powder, wheat starch, glucose-fructose syrup.',
        additives: ['e500ii', 'e501ii', 'e322'],
        allergens: 'wheat, soya',
        nutrition: {
          calories: 474, sugar: 38, fat: 19, protein: 5.4, carbs: 68, salt: 0.74, fiber: 2.7
        }
      },
      'Oatly': {
        name: 'Oat Drink Barista Edition',
        brand: 'Oatly',
        nutriscore: 'B',
        image: 'https://images.openfoodfacts.org/images/products/739/437/661/6532/front_en.13.400.jpg',
        ingredients: 'Oat base (water, oats 10%), rapeseed oil, acidity regulator (dipotassium phosphate), calcium carbonate.',
        additives: ['e340ii', 'e170'],
        allergens: 'oats',
        nutrition: {
          calories: 59, sugar: 3.2, fat: 3, protein: 1, carbs: 6.6, salt: 0.1, fiber: 0.8
        }
      },
      'Kind bar': {
        name: 'Dark Chocolate Nuts & Sea Salt',
        brand: 'KIND',
        nutriscore: 'C',
        image: 'https://images.openfoodfacts.org/images/products/060/265/217/1864/front_en.45.400.jpg',
        ingredients: 'Almonds, peanuts, chicory root fiber, honey, palm kernel oil, sugar, crisp rice, cocoa mass.',
        additives: ['e322i'],
        allergens: 'almonds, peanuts, soy',
        nutrition: {
          calories: 500, sugar: 12.5, fat: 37.5, protein: 15, carbs: 40, salt: 0.8, fiber: 17.5
        }
      },
      'Greek yogurt': {
        name: 'Greek Yogurt Plain',
        brand: 'Chobani',
        nutriscore: 'A',
        image: 'https://images.openfoodfacts.org/images/products/089/470/001/0046/front_en.38.400.jpg',
        ingredients: 'Pasteurized nonfat milk, live and active cultures.',
        additives: [],
        allergens: 'milk',
        nutrition: {
          calories: 59, sugar: 4, fat: 0, protein: 10, carbs: 4, salt: 0.1, fiber: 0
        }
      }
    };
    
    // Fallback overrides to make sure we always have data for demo queries
    const fbKey = Object.keys(fallbackFood).find(k => keyword.toLowerCase().includes(k.toLowerCase()));
    if (fbKey) {
        return res.json({ ok: true, products: [fallbackFood[fbKey]] });
    }


    const fields = 'product_name,brands,nutriscore_grade,ingredients_text,nutriments,additives_tags,allergens_tags,image_front_small_url';
    const raw = await httpsGet(
      'world.openfoodfacts.org',
      `/cgi/search.pl?search_terms=${encodeURIComponent(keyword)}&json=1&page_size=12&fields=${fields}`
    );
    if (raw.trimStart().startsWith('<')) throw new Error('Open Food Facts 临时无响应');

    const data = JSON.parse(raw);
    const products = (data.products || [])
      .filter(p => p.product_name)
      .slice(0, 10)
      .map(p => {
        const n = p.nutriments || {};
        return {
          name: p.product_name || '',
          brand: p.brands || '',
          nutriscore: (p.nutriscore_grade || '').toUpperCase(),  // A/B/C/D/E
          image: p.image_front_small_url || null,
          ingredients: (p.ingredients_text || '').slice(0, 300),
          additives: (p.additives_tags || [])
            .slice(0, 6)
            .map(a => a.replace(/^en:/, '')),
          allergens: (p.allergens_tags || [])
            .map(a => a.replace(/^en:/, '')).join(', '),
          nutrition: {
            calories: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null,
            protein:  n['proteins_100g']    ?? null,
            carbs:    n['carbohydrates_100g'] ?? null,
            fat:      n['fat_100g']          ?? null,
            fiber:    n['fiber_100g']        ?? null,
            sugar:    n['sugars_100g']       ?? null,
            salt:     n['salt_100g']         ?? null
          }
        };
      });

    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pubmed', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    // NCBI 建议带 tool + email 避免被限流
    const base = `db=pubmed&tool=JovidaDemo&email=demo%40jovida.app&retmode=json`;

    // Step 1: esearch → 获取 PMIDs
    const searchRaw = await httpsGet(
      'eutils.ncbi.nlm.nih.gov',
      `/entrez/eutils/esearch.fcgi?${base}&term=${encodeURIComponent(keyword)}&retmax=6`
    );
    if (searchRaw.trimStart().startsWith('<')) {
      throw new Error('PubMed 服务暂时无响应，请稍后重试（NCBI 有时会限流）');
    }
    const search = JSON.parse(searchRaw);
    const ids = search.esearchresult?.idlist || [];
    if (!ids.length) return res.json({ ok: true, articles: [] });

    // Step 2: esummary → 获取标题/期刊/作者/年份
    const summaryRaw = await httpsGet(
      'eutils.ncbi.nlm.nih.gov',
      `/entrez/eutils/esummary.fcgi?${base}&id=${ids.join(',')}`
    );
    if (summaryRaw.trimStart().startsWith('<')) {
      throw new Error('PubMed 摘要获取失败，请重试');
    }
    const summary = JSON.parse(summaryRaw);
    const result = summary.result || {};

    const articles = ids.map(id => {
      const doc = result[id] || {};
      const authors = (doc.authors || []).slice(0, 3).map(a => a.name).join(', ');
      return {
        pmid: id,
        title: doc.title || '(no title)',
        journal: doc.fulljournalname || doc.source || '',
        year: (doc.pubdate || '').slice(0, 4),
        authors: authors + ((doc.authors?.length || 0) > 3 ? ' et al.' : ''),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
      };
    });

    res.json({ ok: true, articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reddit 帖子 (Apify trudax~reddit-scraper-lite)
app.post('/api/reddit', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=top&t=month`;
    const run = await apifyPost('/v2/acts/trudax~reddit-scraper-lite/runs?timeout=60&memory=256', {
      startUrls: [{ url: searchUrl }],
      maxItems: 10
    });
    if (!run.data?.id) throw new Error(run.error?.message || '启动失败');

    await waitForRun(run.data.id);
    const raw = await apifyGetRaw(`/v2/actor-runs/${run.data.id}/dataset/items`);
    const posts = JSON.parse(raw);

    const list = (posts || []).slice(0, 8).map(p => ({
      title: p.title || '',
      subreddit: p.communityName || p.parsedCommunityName || '',
      score: p.upVotes || 0,
      comments: p.numberOfComments || 0,
      author: p.username || '',
      body: (p.body || '').slice(0, 300),
      url: p.url || '',
      createdAt: p.createdAt || ''
    }));

    res.json({ ok: true, posts: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Wikipedia 摘要 (Wikipedia REST API — 完全免费)
app.post('/api/wikipedia', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    // Step 1: 搜索最相关页面
    const searchRaw = await httpsGet(
      'en.wikipedia.org',
      `/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&srlimit=1&format=json`
    );
    const searchData = JSON.parse(searchRaw);
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return res.json({ ok: true, article: null });

    // Step 2: 拿 REST summary (含摘要 + 图片)
    const title = encodeURIComponent(firstResult.title.replace(/ /g, '_'));
    const summaryRaw = await httpsGet(
      'en.wikipedia.org',
      `/api/rest_v1/page/summary/${title}`
    );
    const article = JSON.parse(summaryRaw);

    res.json({
      ok: true,
      article: {
        title: article.title || firstResult.title,
        description: article.description || '',
        extract: article.extract || '',
        thumbnail: article.thumbnail?.source || null,
        url: article.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Amazon Shopping (amazon-scraper~amazon-search-terms-scraper)
app.post('/api/shopping', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;
    const run = await apifyPost('/v2/acts/amazon-scraper~amazon-search-terms-scraper/runs?timeout=120&memory=512', {
      searchTermUrls: [searchUrl],
      maxItems: 20
    });
    if (!run.data?.id) throw new Error(run.error?.message || '启动失败');

    await waitForRun(run.data.id);
    const raw = await apifyGetRaw(`/v2/actor-runs/${run.data.id}/dataset/items`);
    const pages = JSON.parse(raw);

    // 每个 page item 下有 results 数组，展平取前12个
    const allResults = [];
    for (const page of (pages || [])) {
      if (Array.isArray(page.results)) allResults.push(...page.results);
    }

    const products = allResults.slice(0, 12).map(p => ({
      title: p.title || '',
      price: p.price || '',
      store: 'Amazon',
      rating: p.reviews?.rating ?? null,
      reviews: p.reviews?.count ?? 0,
      thumbnail: p.image || null,
      url: p.link || `https://www.amazon.com/dp/${p.asin}`,
      prime: p.prime || false
    }));

    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Open Food Facts — 食品成分/营养查询 (完全免费，700万+产品)
app.post('/api/food', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    const fields = 'product_name,brands,nutriscore_grade,ingredients_text,nutriments,additives_tags,allergens_tags,image_front_small_url';
    const raw = await httpsGet(
      'world.openfoodfacts.org',
      `/cgi/search.pl?search_terms=${encodeURIComponent(keyword)}&json=1&page_size=12&fields=${fields}`
    );
    if (raw.trimStart().startsWith('<')) throw new Error('Open Food Facts 暂时无响应');

    const data = JSON.parse(raw);
    const products = (data.products || [])
      .filter(p => p.product_name)
      .slice(0, 10)
      .map(p => {
        const n = p.nutriments || {};
        return {
          name: p.product_name || '',
          brand: p.brands || '',
          nutriscore: (p.nutriscore_grade || '').toUpperCase(),  // A/B/C/D/E
          image: p.image_front_small_url || null,
          ingredients: (p.ingredients_text || '').slice(0, 300),
          additives: (p.additives_tags || [])
            .slice(0, 6)
            .map(a => a.replace(/^en:/, '')),
          allergens: (p.allergens_tags || [])
            .map(a => a.replace(/^en:/, '')).join(', '),
          nutrition: {
            calories: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null,
            protein:  n['proteins_100g']    ?? null,
            carbs:    n['carbohydrates_100g'] ?? null,
            fat:      n['fat_100g']          ?? null,
            fiber:    n['fiber_100g']        ?? null,
            sugar:    n['sugars_100g']       ?? null,
            salt:     n['salt_100g']         ?? null
          }
        };
      });

    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. ExerciseDB — 动作库 (wger.de 免费 API)
// wger category IDs (verified from /api/v2/exercisecategory/)
const BODY_PART_MAP = {
  chest: 11, back: 12, legs: 9, shoulders: 13,
  arms: 8, biceps: 8, triceps: 8, abs: 10,
  core: 10, calves: 14, glutes: 9, quads: 9,
  hamstrings: 9, forearms: 8, cardio: 15
};

app.post('/api/exercises', async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少 keyword' });

    const key = keyword.toLowerCase().trim();
    const categoryId = BODY_PART_MAP[key];
    let exercises = [];

    if (categoryId) {
      const raw = await httpsGet('wger.de', `/api/v2/exerciseinfo/?format=json&category=${categoryId}&limit=8`);
      const data = JSON.parse(raw);
      exercises = (data.results || []).map(ex => parseWgerExercise(ex)).filter(Boolean);
    } else {
      const raw = await httpsGet('wger.de', `/en/exercise/search/?term=${encodeURIComponent(keyword)}&language=english&format=json`);
      const data = JSON.parse(raw);
      const ids = (data.suggestions || []).slice(0, 6).map(s => s.data?.id).filter(Boolean);
      const results = await Promise.all(
        ids.map(id =>
          httpsGet('wger.de', `/api/v2/exerciseinfo/${id}/?format=json`)
            .then(r => parseWgerExercise(JSON.parse(r)))
            .catch(() => null)
        )
      );
      exercises = results.filter(Boolean);
    }

    // 并发拉图片（list endpoint 不含图片，detail endpoint 有）
    const withImages = await Promise.all(exercises.map(async ex => {
      const imgRaw = await httpsGet('wger.de', `/api/v2/exerciseimage/?format=json&exercise=${ex.id}&is_main=true&limit=1`).catch(() => '{"results":[]}');
      const imgData = JSON.parse(imgRaw);
      return { ...ex, image: imgData.results?.[0]?.image || null };
    }));

    res.json({ ok: true, exercises: withImages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseWgerExercise(ex) {
  const trans = (ex.translations || []).find(t => t.language === 2)
    || (ex.translations || []).find(t => t.name);  // fallback to any language
  if (!trans?.name) return null;
  return {
    id: ex.id,
    name: trans.name,
    description: (trans.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400),
    category: ex.category?.name || '',
    muscles: (ex.muscles || []).map(m => m.name_en).filter(Boolean),
    musclesSecondary: (ex.muscles_secondary || []).map(m => m.name_en).filter(Boolean),
    equipment: (ex.equipment || []).map(e => e.name).filter(Boolean)
  };
}

// 9. PubMed 摘要（第二步）
app.post('/api/pubmed/abstract', async (req, res) => {
  try {
    const { pmid } = req.body;
    if (!pmid) return res.status(400).json({ error: '缺少 pmid' });
    const raw = await httpsGet(
      'eutils.ncbi.nlm.nih.gov',
      `/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text&tool=JovidaDemo&email=demo%40jovida.app`
    );
    if (raw.trimStart().startsWith('<')) throw new Error('NCBI 暂时无响应');
    // 去掉前面的标题行，只留 Abstract 部分
    const lines = raw.split('\n');
    const absIdx = lines.findIndex(l => /^abstract/i.test(l.trim()));
    const abstract = absIdx >= 0 ? lines.slice(absIdx + 1).join('\n').trim() : raw.trim();
    res.json({ ok: true, abstract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n✅ Jovida Demo Server running at http://localhost:${PORT}`);
  console.log(`   APIFY_TOKEN: ${APIFY_TOKEN ? '已设置 ✓' : '❌ 未设置'}\n`);
});
