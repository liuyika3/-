/**
 * Gemini Web 客户端
 * 支持多种 Gemini 模型的 Web 界面
 * 
 * 注意：常量定义已移至 constants.js
 * Skill 管理相关方法已移至 skill-management.js
 */

class GeminiWebClient {
    constructor() {
        this.apiKey = '';
        this.currentModel = 'gemini-3-pro-preview';
        this.temperature = 0.7;
        // 默认输出长度：适当加大，减少长回复被截断的概率（前端与后端统一默认 44444，实际会被 Vertex 模型上限自动裁剪）
        this.maxTokens = 44444;
        this.topP = 0.95;
        this.topK = 40;
        this.candidateCount = 1;
        this.stopSequences = '';
        this.contextWindow = 20;
        this.enableGrounding = false; // Grounding功能开关
        this.enableImageToImage = false; // 图生图功能开关
        this.imageToImageReference = []; // 图生图参考图片数组（base64）
        this.attachedFiles = [];
        this.skillsEnabled = false; // Skill 模式开关
        this.autoWebTimers = {}; // 自动网页生成定时器
        this.processLogBuffers = {}; // 存储各任务的运行日志，供后台重放
        this.instagramBackgroundState = {}; // Instagram 复杂任务的后台运行状态
        this.lastBackgroundNoticeAt = 0;
        this.cachedHtmlPreviewUrls = {}; // 缓存Blob预览链接，避免频繁创建
        this.styleBatchCurrentRunIds = {}; // 记录每个任务最近一次批量任务ID
        this.styleBatchStopFlags = {}; // 记录每个任务的批量运行停止标志
        this.healthReportBatchStopFlags = {}; // 记录健康报告批量运行停止标志
        
        // 海报制作系统提示词（默认值）
        this.posterCommonPrompt = ''; // 通用系统提示词（会添加到所有功能的最前面）
        this.posterImagePrompt = 'You are an AI image generation assistant. Generate images directly based on user descriptions. Please respond in Chinese. When users provide image descriptions, you should generate the image directly, not just provide prompts.';
        this.posterTextPrompt = '你是一个专业的科普内容创作助手，专门为网页创作文字内容。你的任务是创作类似科普小知识页面的内容。要求：科学性（准确、有科学依据）、可读性（通俗易懂）、提供价值（对用户有帮助），并附带清晰的参考文献，每个参考文献要包含可点击的真实URL链接（使用Markdown格式：[标题](URL)）。使用中文写作，内容结构清晰，可以使用小标题分段。在文末单独列出"参考文献"部分。';
        this.posterWebPrompt = '你是一个专业的排版助手。根据用户的需求，将提供的图片和文字内容进行排版，使用Markdown格式输出。\n\n重要要求：\n1. 使用Markdown格式进行排版，合理整合图片和文字内容\n2. 使用标题、段落、列表等Markdown元素组织内容\n3. **图片处理（关键）**：用户会提供图片的base64数据URL。你必须在Markdown中直接使用这些base64 data URL格式来显示图片。\n   - 格式：![图片描述](data:image/png;base64,完整的base64字符串)\n   - 或者：![图片描述](data:image/jpeg;base64,完整的base64字符串)\n   - 必须使用完整的base64 data URL，不要使用占位符或引用标识\n   - 图片会通过API的parts参数传递给你，同时也会在文本中提供完整的data URL\n4. 文字内容使用适当的Markdown格式（标题、粗体、列表等）\n5. 排版美观、结构清晰、层次分明，图片和文字要合理穿插\n\n请直接输出Markdown格式的排版结果，确保图片使用完整的base64 data URL格式，能够直接显示，不要只提供提示词或说明。';
        
        this.defaultInstagramPrompts = {
            designer: '你是一名资深的社交媒体创意设计师兼活动总监。根据用户给出的主题，产出一份 Markdown 结构的执行方案，至少包含：1）整体洞察与视觉定位；2）每张图片（图片1、图片2、...）的构图、主体、镜头语言、配色与情绪；3）底部文字需覆盖的卖点、语气与结构（不要改写文案本身，只说明要点）；4）网页排版/交互建议。语言使用中文，条理清晰，方便后续直接复制。',
            image: 'You are an AI image generation assistant focused on crafting scroll-stopping Instagram visuals. When用户描述图片，请你直接输出可供Gemini Image模型使用的提示词，强调画面构图、光线、镜头语言、配色与风格细节。保持中文回复，但可包含少量英语样式词（如 neon, cinematic 等）。',
            text: '你是一位资深的 Instagram 文案创作者。请根据用户需求写出简短、有节奏感、富有情绪张力的中文文案，可加入 emoji、话题标签或号召语，整体字数控制在 80 字以内，突出场景感与行动号召。',
            web: '',
            engineer: '你是一位严谨的提示词工程师。请阅读用户提供的创意方案，只输出一个 JSON 对象，key 必须是“图片1”“图片2”...（按顺序递增）以及“底部文字”。图片 value 需为中文提示词，明确主体、镜头、环境、光线、色调等信息；底部文字 value 必须完整复用用户提供的原文案（保留换行与 Markdown 结构，不要改写）。禁止添加额外字段或解释，确保 JSON 可直接解析。'
        };
        this.instagramVisualRules = '';
        this.instagramPrompts = { ...this.defaultInstagramPrompts };
        this.loadInstagramPromptSettings();
        
        this.defaultStylePresets = [
            {
                id: 'style_modern_minimal',
                title: '现代极简',
                content: '整体保持充足留白与几何构图，配色以冷灰 + 霓虹强调色为主。画面文字精炼，强调呼吸感与对称性。'
            },
            {
                id: 'style_vintage_warm',
                title: '复古暖调',
                content: '使用复古胶片质感与暖色调，加入颗粒与渐变，字体可参考 Serif 或手写体，突出故事感与人情味。'
            },
            {
                id: 'style_street_flash',
                title: '街头电光',
                content: '配色高饱和，强调霓虹、电光与动感线条。使用动词口号、emoji 与强烈对比，营造街头潮流氛围。'
            }
        ];
        this.stylePresets = [];
        this.loadStylePresets();
        this.loadInstagramPromptFiles();
        
        // 对话管理
        this.conversations = []; // 存储所有对话
        this.folders = []; // 存储所有文件夹
        this.currentConversationId = null; // 当前对话ID
        this.currentMode = 'text'; // 当前模式：text, image, search
        this.draggedElement = null; // 当前拖拽的元素
        
        // 任务管理
        this.tasks = []; // 存储所有任务
        this.currentView = 'chat'; // 当前视图：chat, tasks
        
        this.initializeElements();
        this.initPromptEditor();
        this.populateVirtualUserOptions();
        this.bindEvents();
        this.loadSettings();
        this.checkVertexStatus(); // 检查 Vertex AI 状态
        this.checkAndCleanStorage();
        this.loadConversations();
        this.loadTasks();
        this.resetInstagramStorageState();
        
        // 加载 Skill 列表
        // skill列表已移除
        
        // 如果没有任务，创建默认的"海报制作"任务
        if (this.tasks.length === 0) {
            this.createTask('海报制作', 'poster');
        }
        
        // 尝试迁移旧数据（如果还没有"文案助手"对话）
        this.migrateOldData();
        
        // 初始化Tab状态
        this.switchMode('text');
        
        // 初始化视图
        this.switchView('chat');
        
        // 如果没有对话，创建默认对话（但不保存，仅用于临时使用）
        if (this.conversations.length === 0) {
            const defaultId = this.createNewConversation('文案助手', 'You are a helpful assistant. Please answer in Chinese.');
            // 标记为临时对话，不保存到本地存储
            const defaultConv = this.getConversation(defaultId);
            if (defaultConv) {
                defaultConv.isTemporary = true;
                defaultConv.tabType = 'text';
            }
        }
        
        // 加载第一个对话（按更新时间排序，最新的在前）
        if (this.conversations.length > 0) {
            const sortedConversations = [...this.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
            this.switchConversation(sortedConversations[0].id);
        }
    }

    /**
     * 应用Instagram JSON提示词并自动执行
     * @param {Object} task - 任务对象
     */
    async applyInstagramJsonPrompt(task) {
        const input = document.getElementById(`instagram-json-prompt-${task.id}`);
        if (!input) return;
        
        const raw = input.value.trim();
        if (!raw) {
            this.showNotification('请粘贴JSON提示词', 'error');
            return;
        }
        
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            this.showNotification('JSON格式错误，请检查', 'error');
            return;
        }
        
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
            this.showNotification('JSON必须为对象格式', 'error');
            return;
        }
        
        const imagePromptMap = {};
        let textPrompt = '';
        Object.entries(parsed).forEach(([key, value]) => {
            if (typeof value !== 'string') return;
            const match = key.match(/^图片(\d+)$/);
            if (match) {
                const index = parseInt(match[1], 10);
                if (index > 0) {
                    imagePromptMap[index] = value;
                }
            } else if (key === '底部文字') {
                textPrompt = this.normalizeBottomCaption(value);
            }
        });
        
        const indices = Object.keys(imagePromptMap).map(num => parseInt(num, 10)).sort((a, b) => a - b);
        if (indices.length === 0 && !textPrompt) {
            this.showNotification('JSON中未找到图片或底部文字提示词', 'error');
            return;
        }
        
        const container = document.getElementById(`instagram-image-inputs-${task.id}`);
        if (!container) return;
        
        this.updateInstagramBackgroundState(task.id, {
            status: 'running',
            stage: 'prepare',
            totalImages: indices.length,
            completedImages: 0,
            hasText: !!textPrompt,
            textReady: !textPrompt
        });
        
        if (indices.length > 0) {
            this.ensureInstagramImageInputs(task.id, indices[indices.length - 1]);
            indices.forEach(index => {
                const item = container.querySelector(`.instagram-image-input-item[data-image-index="${index}"]`);
                if (item) {
                    const textarea = item.querySelector('.instagram-image-prompt');
                    if (textarea) {
                        textarea.value = imagePromptMap[index] || '';
                    }
                }
            });
        }
        
        if (textPrompt) {
            const textInput = document.getElementById(`instagram-text-prompt-${task.id}`);
            if (textInput) {
                textInput.value = textPrompt;
            }
        }
        
        try {
            this.showNotification('已应用提示词，开始自动生成', 'info');
            
            let imagePromises = [];
            if (indices.length > 0) {
                this.updateInstagramBackgroundState(task.id, { stage: 'images' });
                imagePromises = indices.map(index => {
                    const item = container.querySelector(`.instagram-image-input-item[data-image-index="${index}"]`);
                    const resultElement = item ? item.querySelector('.instagram-image-result') : null;
                    const prompt = imagePromptMap[index];
                    if (!prompt) return Promise.resolve(null);
                    return this.generateInstagramImage(task, index, prompt, resultElement).then(imageData => {
                        if (imageData) {
                            this.incrementInstagramBackgroundCounter(task.id, 'completedImages');
                        }
                        return imageData;
                    });
                });
            }
            
            let textPromise = Promise.resolve(null);
            if (textPrompt) {
                this.updateInstagramBackgroundState(task.id, { stage: 'text' });
                textPromise = this.generateInstagramText(task).then(textData => {
                    if (textData) {
                        this.updateInstagramBackgroundState(task.id, { textReady: true });
                    }
                    return textData;
                });
            }
            
            await Promise.all([...imagePromises, textPromise]);
            this.updateInstagramBackgroundState(task.id, { stage: 'web' });
            this.showInstagramStorage(task.id);
            await this.generateInstagramWebpage(task);
            if (this.currentView !== 'tasks') {
                this.showNotification('Instagram 网页已生成，可在任务面板查看。', 'success');
            }
        } catch (error) {
            console.error('自动生成流程失败:', error);
            this.showNotification('自动生成失败：' + error.message, 'error');
        } finally {
            this.updateInstagramBackgroundState(task.id, { status: 'clear' });
        }
    }

    /**
     * 调用提示词工程师生成JSON
     * @param {Object} task
     */
    async refineInstagramPrompts(task) {
        const engineerInput = document.getElementById(`instagram-prompt-engineer-${task.id}`);
        const jsonInput = document.getElementById(`instagram-json-prompt-${task.id}`);
        if (!engineerInput || !jsonInput) return;
        
        const idea = engineerInput.value.trim();
        if (!idea) {
            this.showNotification(`请先输入${ENGINEER_LABEL}描述`, 'error');
            this.appendProcessLog(task.id, 'engineer', '未输入描述，无法调用模型。', 'warning');
            return;
        }
        
        jsonInput.value = '提示词生成中，请稍候...';
        // 使用 Vertex AI，优先使用 Instagram 任务选择的模型，否则使用任务模型选择，默认 gemini-3-pro-preview
        const modelToUse = this.getInstagramTaskModel(task) || this.getTaskModelSelection(task, 'engineer') || 'gemini-3-pro-preview';
        this.appendProcessLog(task.id, 'engineer', `调用 ${modelToUse}，${ENGINEER_LABEL}输入预览：${this.truncateForLog(idea)}`);
        
        try {
            const systemPrompt = this.getInstagramPromptValue('engineer')?.trim();
            const payloadText = this.buildStyledSystemUserPrompt(task, systemPrompt, idea);
            
            // 构建配置对象
            const config = {
                temperature: this.temperature || 0.7,
                max_output_tokens: this.maxTokens || 1024,
                top_p: this.topP || 0.95,
                top_k: this.topK || 40
            };
            
            // 调用后端 Vertex AI API
            const response = await fetch('http://localhost:5000/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelToUse,
                    contents: payloadText,
                    config: config
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success || !data.text) {
                throw new Error(data.error || 'Vertex AI 响应格式错误: ' + JSON.stringify(data));
            }
            
            const rawText = data.text;
            if (!rawText) {
                console.warn(`${ENGINEER_LABEL} API未返回文本：`, data);
                this.appendProcessLog(task.id, 'engineer', '模型未返回 JSON，可能被拦截。', 'error');
                throw new Error('未获得JSON结果');
            }
            
            const jsonString = this.extractJsonString(rawText);
            if (!jsonString) {
                this.appendProcessLog(task.id, 'engineer', '返回文本中未提取到 JSON。', 'error');
                throw new Error('返回内容中未找到有效JSON');
            }
            
            jsonInput.value = jsonString;
            await this.applyInstagramJsonPrompt(task);
            this.appendProcessLog(task.id, 'engineer', 'JSON 生成完成，已自动执行。', 'info');
        } catch (error) {
            console.error(`${ENGINEER_LABEL} 生成失败:`, error);
            jsonInput.value = '';
            this.showNotification(`${ENGINEER_LABEL} 失败：` + error.message, 'error');
            this.appendProcessLog(task.id, 'engineer', `错误：${error.message}`, 'error');
        }
    }

    /**
     * 调用设计师生成执行方案
     * @param {Object} task - 任务对象
     */
    async runInstagramDesigner(task) {
        if (!task) return;
        const themeInput = document.getElementById(`instagram-designer-theme-${task.id}`);
        const resultContainer = document.getElementById(`instagram-designer-result-${task.id}`);
        const pushBtn = document.querySelector(`.use-designer-plan-btn[data-task-id="${task.id}"]`);
        if (!themeInput || !resultContainer) return;
        
        const theme = themeInput.value.trim();
        if (!theme) {
            this.showNotification(`请输入${DESIGNER_LABEL}主题`, 'error');
            this.appendProcessLog(task.id, 'designer', '未输入主题，无法调用模型。', 'warning');
            return;
        }
        const pagesInput = document.getElementById(`instagram-designer-pages-${task.id}`);
        const imagePages = pagesInput ? this.normalizePositiveInteger(pagesInput.value) : '';
        if (pagesInput) {
            pagesInput.value = imagePages;
        }
        
        // 使用 Vertex AI，不需要 API Key
        
        resultContainer.innerHTML = `<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> ${DESIGNER_LABEL} 正在构思方案...</div>`;
        if (pushBtn) {
            pushBtn.disabled = true;
            pushBtn.dataset.plan = '';
        }
        const designerModel = this.getInstagramTaskModel(task) || this.getTaskModelSelection(task, 'designer') || 'gemini-3-pro-preview';
        this.appendProcessLog(task.id, 'designer', `调用 ${designerModel}，${DESIGNER_LABEL}输入预览：${this.truncateForLog(theme)}${imagePages ? `（图片张数要求：${imagePages}）` : ''}`);
        
        try {
            if (!task.data) {
                task.data = {};
            }
            if (!task.data.designer) {
                task.data.designer = {};
            }
            task.data.designer.imagePages = imagePages;
            task.updatedAt = Date.now();
            this.saveTasks();
            
            const themePayload = imagePages
                ? `${theme}\n\n【图片张数要求】请严格规划并输出 ${imagePages} 张图片（图片1/图片2/...），不得增减，并在方案中清晰编号。`
                : theme;
            
            const planText = await this.generateDesignerPlan(task, themePayload);
            
            task.data.designer.theme = theme;
            task.data.designer.plan = planText;
            task.updatedAt = Date.now();
            this.saveTasks();
            
            resultContainer.innerHTML = `<div class="designer-plan">${this.formatMarkdown(planText)}</div>`;
            this.appendProcessLog(task.id, 'designer', `方案生成成功，自动推送${ENGINEER_LABEL}。`, 'info');
            if (pushBtn) {
                pushBtn.disabled = false;
                pushBtn.dataset.plan = planText;
            }
            
            const engineerInput = document.getElementById(`instagram-prompt-engineer-${task.id}`);
            if (engineerInput) {
                engineerInput.value = planText;
            }
            this.appendProcessLog(task.id, 'engineer', `收到${DESIGNER_LABEL}方案，准备生成 JSON。`, 'info');
            
            this.showNotification(`设计方案已生成，正在自动提交给${ENGINEER_LABEL}...`, 'info');
            await this.refineInstagramPrompts(task);
        } catch (error) {
            console.error(`${DESIGNER_LABEL} 生成失败:`, error);
            resultContainer.innerHTML = `<div class="error-text">生成失败：${this.escapeHtml(error.message)}</div>`;
            if (pushBtn) {
                pushBtn.disabled = true;
                pushBtn.dataset.plan = '';
            }
            this.showNotification(`${DESIGNER_LABEL} 失败：` + error.message, 'error');
            this.appendProcessLog(task.id, 'designer', `错误：${error.message}`, 'error');
        }
    }
    
    /**
     * 将设计师方案填入提示词工程师输入框
     * @param {Object} task - 任务对象
     */
    applyDesignerPlanToEngineer(task) {
        if (!task) return;
        const engineerInput = document.getElementById(`instagram-prompt-engineer-${task.id}`);
        const plan = task.data?.designer?.plan;
        if (!engineerInput) return;
        
        if (!plan) {
            this.showNotification(`请先生成${DESIGNER_LABEL}方案`, 'error');
            return;
        }
        
        engineerInput.value = plan;
        this.showNotification(`已将设计方案填入${ENGINEER_LABEL}输入框`, 'success');
    }

    /**
     * 调用模型生成设计方案（支持风格覆盖）
     * @param {Object} task
     * @param {string} theme
     * @param {Object} options
     * @returns {Promise<string>}
     */
    async generateDesignerPlan(task, theme, options = {}) {
        const styleAppendOverride = options.styleAppendOverride || null;
        // 使用 Vertex AI，优先使用 Instagram 任务选择的模型，否则使用任务模型选择，默认 gemini-3-pro-preview（文字模型）
        const modelToUse = this.getInstagramTaskModel(task) || this.getTaskModelSelection(task, 'designer') || 'gemini-3-pro-preview';
        const systemPrompt = this.getInstagramPromptValue('designer')?.trim();
        const payloadText = this.buildStyledSystemUserPrompt(task, systemPrompt, theme, styleAppendOverride);
        
        // 构建配置对象
        const config = {
            temperature: this.temperature || 0.7,
            max_output_tokens: 32768, // 使用最大token限制，确保不会因为token限制而截断
            top_p: this.topP || 0.95,
            top_k: this.topK || 40
        };
        
        // 调用后端 Vertex AI API
        const response = await fetch('http://localhost:5000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelToUse,
                contents: payloadText,
                config: config
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.text) {
            throw new Error(data.error || 'Vertex AI 响应格式错误: ' + JSON.stringify(data));
        }
        
        const planText = data.text;
        
        // 检查响应
        if (!planText || !planText.trim()) {
            throw new Error('模型未返回内容或内容为空');
        }
        
        return planText;
    }
    
    /**
     * 风格批量运行设计师
     * @param {Object} task
     */
    async runInstagramDesignerBatch(task) {
        if (!task || !task.id) return;
        // 使用 Vertex AI，不需要 API Key
        if (!task.data) {
            task.data = {};
        }
        if (!task.data.styleBatchInputs) {
            task.data.styleBatchInputs = {};
        }
        if (!task.data.styleBatchResults) {
            task.data.styleBatchResults = [];
        }
        if (!Array.isArray(task.data.styleBatchThumbnails)) {
            task.data.styleBatchThumbnails = [];
        }
        if (!this.styleBatchCurrentRunIds) {
            this.styleBatchCurrentRunIds = {};
        }
        const presets = this.getPrimaryStylePresets();
        if (!presets.length) {
            this.showNotification('当前没有可用的风格预设', 'warning');
            return;
        }
        const inputs = task.data?.styleBatchInputs || {};
        const jobs = [];
        const invalidStyles = [];
        presets.forEach(style => {
            const raw = (inputs[style.id] || '').trim();
            if (!raw) return;
            let parsed = null;
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                invalidStyles.push(`${style.title || style.id}：${error.message}`);
                return;
            }
            Object.entries(parsed).forEach(([key, value]) => {
                if (!/^主题\d+$/i.test(key)) {
                    return;
                }
                if (typeof value !== 'string' || !value.trim()) {
                    return;
                }
                const jobId = `style_batch_job_${style.id}_${key}_${Date.now()}_${jobs.length}`;
                const styleTitle = style.title || style.id || '风格';
                jobs.push({
                    jobId,
                    style,
                    styleTitle,
                    styleAppend: this.getStyleAppendixFromPreset(style),
                    themeKey: key,
                    themeText: value.trim()
                });
            });
        });
        // 去重逻辑：基于主题键和主题文本，确保每个唯一主题只运行一次
        const uniqueJobMap = new Map();
        const dedupedJobs = [];
        const seenKeys = new Set();
        jobs.forEach(job => {
            // 使用主题键和主题文本作为唯一标识
            const uniqueKey = `${job.themeKey}__${job.themeText}`.toLowerCase().trim();
            if (seenKeys.has(uniqueKey)) {
                console.log(`跳过重复任务：${job.themeKey} - ${job.themeText}`);
                return;
            }
            seenKeys.add(uniqueKey);
            dedupedJobs.push(job);
        });
        
        // 按风格顺序排序：根据presets的顺序来排序任务
        const styleOrderMap = new Map();
        presets.forEach((style, index) => {
            styleOrderMap.set(style.id, index);
        });
        dedupedJobs.sort((a, b) => {
            const orderA = styleOrderMap.get(a.style.id) ?? 999;
            const orderB = styleOrderMap.get(b.style.id) ?? 999;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            // 如果风格相同，按主题键排序（主题1、主题2...）
            const themeNumA = parseInt(a.themeKey.match(/\d+/)?.[0] || '999');
            const themeNumB = parseInt(b.themeKey.match(/\d+/)?.[0] || '999');
            return themeNumA - themeNumB;
        });
        
        if (invalidStyles.length) {
            const message = `JSON 格式错误：${invalidStyles[0]}`;
            this.showNotification(message, 'error');
            this.updateStyleBatchStatus(task.id, message, 'error');
            this.resetStyleBatchProgress(task.id, []);
            return;
        }
        
        if (!dedupedJobs.length) {
            const msg = '请至少在一个风格框中粘贴包含 “主题1” 键的 JSON 数据';
            this.showNotification(msg, 'warning');
            this.updateStyleBatchStatus(task.id, msg, 'warning');
            this.resetStyleBatchProgress(task.id, []);
            return;
        }
        const duplicateCount = jobs.length - dedupedJobs.length;
        if (duplicateCount > 0) {
            this.showNotification(`检测到 ${duplicateCount} 个重复主题，已自动去重`, 'warning');
        }
        
        const batchRunId = `style_batch_run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.styleBatchCurrentRunIds[task.id] = batchRunId;
        this.styleBatchStopFlags[task.id] = false; // 初始化停止标志
        task.data.styleBatchLastRunId = batchRunId;
        task.data.styleBatchLastRunStartedAt = Date.now();
        this.saveTasks();
        
        // 显示停止按钮，隐藏运行按钮
        this.toggleStyleBatchButtons(task.id, true);
        
        this.resetStyleBatchProgress(task.id, dedupedJobs);
        this.updateStyleBatchStatus(task.id, `共 ${dedupedJobs.length} 个主题，正在生成（每次2个）...`, 'info');
        this.appendProcessLog(task.id, 'designer', `批量生成开始：${dedupedJobs.length} 个主题，每次同时运行2个`, 'info');
        
        const pipelineResults = [];
        const BATCH_SIZE = 2; // 每次同时运行2个任务
        
        // 分批处理任务，每次只同时运行2个
        for (let i = 0; i < dedupedJobs.length; i += BATCH_SIZE) {
            // 检查是否已请求停止
            if (this.styleBatchStopFlags[task.id]) {
                this.appendProcessLog(task.id, 'designer', `[批量] 用户已停止批量运行`, 'warning');
                this.updateStyleBatchStatus(task.id, `已停止：已完成 ${pipelineResults.length}/${dedupedJobs.length} 个主题`, 'warning');
                break;
            }
            const batch = dedupedJobs.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(dedupedJobs.length / BATCH_SIZE);
            
            this.updateStyleBatchStatus(task.id, `共 ${dedupedJobs.length} 个主题，正在生成第 ${batchNumber}/${totalBatches} 批（${batch.length}个）...`, 'info');
            this.appendProcessLog(task.id, 'designer', `[批量] 开始第 ${batchNumber}/${totalBatches} 批（${batch.length}个任务）`, 'info');
            
            // 同时运行当前批次的任务
            const batchSettled = await Promise.allSettled(batch.map(async (job) => {
                try {
                    const pipelineResult = await this.runStyleBatchPipeline(task, job, batchRunId);
                    pipelineResults.push(pipelineResult);
                    this.appendProcessLog(task.id, 'designer', `[批量] ${job.style.title || job.style.id} - ${job.themeKey} 完成`, 'info');
                    return { success: true, job: pipelineResult };
                } catch (error) {
                    const hint = this.truncateForLog(error.message || '执行失败', 80);
                    this.updateStyleBatchProgress(task.id, job.jobId, {
                        status: 'error',
                        step: hint
                    });
                    this.appendProcessLog(task.id, 'designer', `[批量] ${job.style.title || job.style.id} - ${job.themeKey} 失败：${error.message}`, 'error');
                    return { success: false, job, error };
                }
            }));
            
            // 保存当前批次的结果（只保存当前批次，避免重复）
            const batchResults = [];
            batchSettled.forEach(result => {
                if (result.status === 'fulfilled' && result.value?.success && result.value?.job) {
                    batchResults.push(result.value.job);
                }
            });
            
            const savedResultKeys = new Set();
            batchResults.forEach(entry => {
                const resultKey = `${entry.themeKey}__${entry.themeText}__${entry.runId || batchRunId}`.toLowerCase().trim();
                if (savedResultKeys.has(resultKey)) {
                    console.log(`跳过重复批量结果保存：${entry.themeKey} - ${entry.themeText}`);
                    return;
                }
                savedResultKeys.add(resultKey);
                
                task.data.styleBatchResults.unshift({
                    id: 'style_batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    styleId: entry.style?.id || '',
                    styleTitle: entry.styleTitle || entry.style?.title || '',
                    themeKey: entry.themeKey,
                    themeText: entry.themeText,
                    plan: entry.plan,
                    previewUrl: entry.previewUrl || '',
                    htmlContent: entry.webHtml || '',
                    createdAt: entry.createdAt,
                    runId: entry.runId || batchRunId,
                    designerPrompt: entry.designerPrompt || '',
                    engineerPrompt: entry.engineerPrompt || '',
                    designerModel: entry.designerModel || '',
                    engineerModel: entry.engineerModel || '',
                    styleAppend: entry.styleAppend || '',
                    imageResults: entry.imageResults || []
                });
            });
            
            // 限制结果数量
            const MAX_STYLE_BATCH_RESULTS = 40;
            if (task.data.styleBatchResults.length > MAX_STYLE_BATCH_RESULTS) {
                const removedEntries = task.data.styleBatchResults.slice(MAX_STYLE_BATCH_RESULTS);
                removedEntries.forEach(removed => {
                    const cacheKey = this.getStyleBatchResultCacheKey(task.id, removed.id);
                    this.clearCachedHtmlPreviewUrl(cacheKey);
                });
                task.data.styleBatchResults = task.data.styleBatchResults.slice(0, MAX_STYLE_BATCH_RESULTS);
            }
            this.saveTasks();
            this.refreshStyleBatchResults(task);
            
            // 每批完成后，自动下载当前批次的结果
            const batchSuccessCount = batchSettled.filter(r => r.status === 'fulfilled' && r.value?.success).length;
            if (batchSuccessCount > 0 && batchResults.length > 0) {
                this.appendProcessLog(task.id, 'designer', `[批量] 第 ${batchNumber} 批完成，开始自动下载当前批次HTML（${batchResults.length}个）...`, 'info');
                // 延迟一下，确保结果已保存
                await new Promise(resolve => setTimeout(resolve, 500));
                // 只下载当前批次的结果
                await this.downloadStyleBatchEntriesHtml(batchResults);
            }
            
            // 如果不是最后一批，稍作延迟，避免请求过于频繁
            if (i + BATCH_SIZE < dedupedJobs.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // 结果已在分批处理中保存，这里不再重复保存
        
        // 恢复按钮状态
        this.toggleStyleBatchButtons(task.id, false);
        
        // 清除停止标志
        this.styleBatchStopFlags[task.id] = false;
        
        const successCount = pipelineResults.length;
        const isStopped = this.styleBatchStopFlags[task.id] || (successCount < dedupedJobs.length && successCount > 0);
        const message = isStopped 
            ? `已停止：已完成 ${successCount}/${dedupedJobs.length} 个主题`
            : `已完成：${successCount}/${dedupedJobs.length}`;
        this.updateStyleBatchStatus(task.id, message, isStopped ? 'warning' : (successCount > 0 ? 'success' : 'warning'));
        if (successCount > 0 && !isStopped) {
            this.showNotification(`批量生成完成（${successCount}/${dedupedJobs.length}）`, 'success');
        } else if (isStopped) {
            this.showNotification(`批量运行已停止（已完成 ${successCount}/${dedupedJobs.length}）`, 'warning');
        } else {
            this.showNotification('批量生成全部失败，请查看运行状态', 'error');
        }
        this.resetStyleBatchProgress(task.id, []);
    }
    
    /**
     * 停止批量运行
     * @param {string} taskId - 任务ID
     */
    stopStyleBatch(taskId) {
        if (!taskId) return;
        this.styleBatchStopFlags[taskId] = true;
        this.appendProcessLog(taskId, 'designer', `[批量] 收到停止请求，将在当前批次完成后停止`, 'warning');
        this.showNotification('已发送停止请求，将在当前批次完成后停止', 'info');
    }
    
    /**
     * 切换批量运行按钮状态
     * @param {string} taskId - 任务ID
     * @param {boolean} isRunning - 是否正在运行
     */
    toggleStyleBatchButtons(taskId, isRunning) {
        const modal = document.getElementById(`style-batch-modal-${taskId}`);
        if (!modal) return;
        const runBtn = modal.querySelector('.run-style-batch-btn');
        const stopBtn = modal.querySelector('.stop-style-batch-btn');
        if (runBtn) {
            runBtn.style.display = isRunning ? 'none' : 'inline-block';
        }
        if (stopBtn) {
            stopBtn.style.display = isRunning ? 'inline-block' : 'none';
        }
    }
    
    /**
     * 从文本中提取JSON
     * @param {string} text
     */
    extractJsonString(text) {
        if (!text) return null;
        let jsonPart = text.trim();
        const fencedMatch = jsonPart.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fencedMatch && fencedMatch[1]) {
            jsonPart = fencedMatch[1].trim();
        }
        const firstBrace = jsonPart.indexOf('{');
        const lastBrace = jsonPart.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            return null;
        }
        return jsonPart.slice(firstBrace, lastBrace + 1);
    }

    initializeElements() {
        // 主要元素
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.stopButton = document.getElementById('stop-button');
        this.modelSelect = document.getElementById('model-select');
        
        // 文件上传元素
        this.fileUploadButton = document.getElementById('file-upload-button');
        this.fileInput = document.getElementById('file-input');
        
        // 设置面板元素
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.vertexStatusEl = document.getElementById('vertex-status');
        this.vertexProjectEl = document.getElementById('vertex-project');
        this.vertexLocationEl = document.getElementById('vertex-location');
        this.reconfigureVertexBtn = document.getElementById('reconfigure-vertex-btn');
        this.vertexReconfigForm = document.getElementById('vertex-reconfig-form');
        this.saveVertexConfigBtn = document.getElementById('save-vertex-config-btn');
        this.cancelVertexConfigBtn = document.getElementById('cancel-vertex-config-btn');
        this.vertexConfigStatus = document.getElementById('vertex-config-status');
        this.temperatureSlider = document.getElementById('temperature');
        this.temperatureValue = document.getElementById('temperature-value');
        this.maxTokensInput = document.getElementById('max-tokens');
        this.topPSlider = document.getElementById('top-p');
        this.topPValue = document.getElementById('top-p-value');
        this.topKInput = document.getElementById('top-k');
        this.candidateCountInput = document.getElementById('candidate-count');
        this.stopSequencesInput = document.getElementById('stop-sequences');
        this.contextWindowInput = document.getElementById('context-window');
        this.enableGroundingInput = document.getElementById('enable-grounding');
        this.enableImageToImageInput = document.getElementById('enable-image-to-image');
        this.imageToImageInput = document.getElementById('image-to-image-input');
        this.imageToImageUploadBtn = document.getElementById('image-to-image-upload-btn');
        this.imageToImagePreview = document.getElementById('image-to-image-preview');
        this.removeImageToImageBtn = document.getElementById('remove-image-to-image-btn');
        this.systemPromptInput = document.getElementById('system-prompt');
        this.posterCommonPromptInput = document.getElementById('poster-common-prompt');
        this.posterImagePromptInput = document.getElementById('poster-image-prompt');
        this.imageToImagePromptInput = document.getElementById('image-to-image-prompt');
        this.posterTextPromptInput = document.getElementById('poster-text-prompt');
        this.posterWebPromptInput = document.getElementById('poster-web-prompt');
        this.instagramDesignerPromptInput = document.getElementById('instagram-designer-prompt');
        this.instagramEngineerPromptInput = document.getElementById('instagram-engineer-prompt');
        this.instagramImagePromptSettingInput = document.getElementById('instagram-image-prompt');
        this.instagramTextPromptSettingInput = document.getElementById('instagram-text-prompt');
        this.agentPromptInput = document.getElementById('agent-prompt');
        this.agentPromptGroup = document.getElementById('agent-prompt-group');
        this.jovidaPromptExpertGroup = document.getElementById('jovida-prompt-expert-group');
        this.jovidaTargetAgentInput = document.getElementById('jovida-target-agent');
        this.summaryAssistantGroup = document.getElementById('summary-assistant-group');
        this.lengthLimitInput = document.getElementById('length-limit');
        this.contentPurposeInput = document.getElementById('content-purpose');
        this.outputFormatSelect = document.getElementById('output-format');
        this.nutritionistGroup = document.getElementById('nutritionist-group');
        this.patientInfoInput = document.getElementById('patient-info');
        this.jovidaEffectCheckerGroup = document.getElementById('jovida-effect-checker-group');
        this.userPersonalInfoInput = document.getElementById('user-personal-info');
        this.jovidaVirtualUserGroup = document.getElementById('jovida-virtual-user-group');
        this.jovidaVirtualUserSelect = document.getElementById('jovida-virtual-user-select');
        this.jovidaAssistantGroup = document.getElementById('jovida-assistant-group');
        this.jovidaModeSelect = document.getElementById('jovida-mode');
        this.jovidaPromptPureInput = document.getElementById('jovida-prompt-pure');
        this.jovidaPromptFullInput = document.getElementById('jovida-prompt-full');
        this.jovidaVirtualUserPromptList = document.getElementById('jovida-virtual-user-prompts');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.clearChatBtn = document.getElementById('clear-chat');
        this.clearStorageLiteBtn = document.getElementById('clear-storage-lite');
        this.clearStorageBtn = document.getElementById('clear-storage');
        
        // Skill 相关元素
        this.toggleSkillsBtn = document.getElementById('toggle-skills');
        this.writeSkillBtn = document.getElementById('write-skill-btn');
        this.skillFileInput = document.getElementById('skill-file-input');
        this.skillUploadBtn = document.getElementById('skill-upload-btn');
        // skill列表已移除，不再需要
        this.manageSkillsBtn = document.getElementById('manage-skills-btn');
        this.openSkillsDirBtn = document.getElementById('open-skills-dir-btn');
        this.writeSkillModal = document.getElementById('write-skill-modal');
        this.closeWriteSkillModalBtn = document.getElementById('close-write-skill-modal');
        this.cancelWriteSkillBtn = document.getElementById('cancel-write-skill');
        this.confirmWriteSkillBtn = document.getElementById('confirm-write-skill');
        this.writeSkillNameInput = document.getElementById('write-skill-name');
        this.writeSkillContentInput = document.getElementById('write-skill-content');
        this.writeSkillStatusDiv = document.getElementById('write-skill-status');
        this.editSkillBtn = document.getElementById('edit-skill-btn');
        this.editSkillModal = document.getElementById('edit-skill-modal');
        this.closeEditSkillModalBtn = document.getElementById('close-edit-skill-modal');
        this.cancelEditSkillBtn = document.getElementById('cancel-edit-skill');
        this.saveEditSkillBtn = document.getElementById('save-edit-skill');
        this.editSkillSelect = document.getElementById('edit-skill-select');
        this.editSkillContentInput = document.getElementById('edit-skill-content');
        this.editSkillStatusDiv = document.getElementById('edit-skill-status');
        this.skillManagementModal = document.getElementById('skill-management-modal');
        this.closeSkillModalBtn = document.getElementById('close-skill-modal');
        this.skillManagementContent = document.getElementById('skill-management-content');
        
        // 对话列表元素
        this.conversationsSidebar = document.getElementById('conversations-sidebar');
        this.conversationsList = document.getElementById('conversations-list');
        this.newConversationBtn = document.getElementById('new-conversation-btn');
        this.newFolderBtn = document.getElementById('new-folder-btn');
        this.toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
        this.showSidebarBtn = document.getElementById('show-sidebar-btn');
        
        // Tab元素
        this.tabText = document.getElementById('tab-text');
        this.tabImage = document.getElementById('tab-image');
        this.tabSearch = document.getElementById('tab-search');
        
        // 视图切换元素
        this.headerTabChat = document.getElementById('header-tab-chat');
        this.headerTabTasks = document.getElementById('header-tab-tasks');
        this.viewChat = document.getElementById('view-chat');
        this.viewTasks = document.getElementById('view-tasks');
        this.headerContentChat = document.getElementById('header-content-chat');
        this.tasksList = document.getElementById('tasks-list');
        this.addTaskBtn = document.getElementById('add-task-btn');
        
        // 加载指示器
        this.loadingIndicator = document.getElementById('loading-indicator');
    }

    bindEvents() {
        // 发送消息
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => {
                console.log('发送按钮被点击');
                this.sendMessage().catch(error => {
                    console.error('发送消息失败:', error);
                    this.showNotification('发送消息失败: ' + error.message, 'error');
                });
            });
        } else {
            console.error('找不到发送按钮元素');
        }
        
        if (this.stopButton) {
            this.stopButton.addEventListener('click', () => this.stopCurrentGeneration());
        } else {
            console.error('找不到停止按钮元素');
        }
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 自动调整输入框高度
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.updateCharCount();
            // 自动保存输入内容到当前对话
            this.autoSaveInputContent();
        });

        // 模型选择
        this.modelSelect.addEventListener('change', (e) => {
            const selectedModel = e.target.value;
            // 文字创作模式下禁止选择图像模型
            if (this.currentMode === 'text' && selectedModel.includes('image')) {
                // 回退到非图像模型（优先当前已选或默认）
                const fallbackModel = 'gemini-3-pro-preview';
                this.modelSelect.value = fallbackModel;
                this.currentModel = fallbackModel;
                this.showNotification('文字创作模式下不支持 Gemini Image 模型，已自动切回文本模型。', 'error');
                return;
            }
            this.currentModel = selectedModel;
            this.showNotification(`已切换到 ${selectedModel}`, 'info');
        });

        // 设置面板
        this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        if (this.clearStorageLiteBtn) {
            this.clearStorageLiteBtn.addEventListener('click', () => this.clearNonConversationStorage());
        }
        if (this.clearStorageBtn) {
            this.clearStorageBtn.addEventListener('click', () => this.clearAllStorage());
        }
        
        // Skill 相关事件
        if (this.toggleSkillsBtn) {
            this.toggleSkillsBtn.addEventListener('click', () => {
                this.skillsEnabled = !this.skillsEnabled;
                this.toggleSkillsBtn.textContent = this.skillsEnabled ? 'Skill 模式：开' : 'Skill 模式：关';
                this.toggleSkillsBtn.style.background = this.skillsEnabled ? '#10b981' : '';
                this.showNotification(
                    this.skillsEnabled ? '已开启 Skill 模式（将根据文档库回答）' : '已关闭 Skill 模式（普通对话）',
                    'info'
                );
            });
        }
        
        if (this.writeSkillBtn) {
            this.writeSkillBtn.addEventListener('click', () => {
                this.showWriteSkillModal();
            });
        }
        
        if (this.closeWriteSkillModalBtn) {
            this.closeWriteSkillModalBtn.addEventListener('click', () => {
                this.hideWriteSkillModal();
            });
        }
        
        if (this.cancelWriteSkillBtn) {
            this.cancelWriteSkillBtn.addEventListener('click', () => {
                this.hideWriteSkillModal();
            });
        }
        
        if (this.confirmWriteSkillBtn) {
            this.confirmWriteSkillBtn.addEventListener('click', () => {
                this.submitWriteSkill();
            });
        }
        
        // 写入 Skill 自动保存
        if (this.writeSkillContentInput) {
            let autoSaveTimer = null;
            this.writeSkillContentInput.addEventListener('input', () => {
                clearTimeout(autoSaveTimer);
                autoSaveTimer = setTimeout(() => {
                    this.autoSaveWriteSkillDraft();
                }, 1000); // 1秒后自动保存
            });
        }
        
        // 编辑 Skill 相关事件
        if (this.editSkillBtn) {
            this.editSkillBtn.addEventListener('click', () => {
                this.showEditSkillModal();
            });
        }
        
        if (this.closeEditSkillModalBtn) {
            this.closeEditSkillModalBtn.addEventListener('click', () => {
                this.hideEditSkillModal();
            });
        }
        
        if (this.cancelEditSkillBtn) {
            this.cancelEditSkillBtn.addEventListener('click', () => {
                this.hideEditSkillModal();
            });
        }
        
        if (this.saveEditSkillBtn) {
            this.saveEditSkillBtn.addEventListener('click', () => {
                this.submitEditSkill();
            });
        }
        
        if (this.editSkillSelect) {
            this.editSkillSelect.addEventListener('change', async (e) => {
                const skillName = e.target.value;
                if (skillName) {
                    await this.loadSkillContent(skillName);
                } else {
                    if (this.editSkillContentInput) {
                        this.editSkillContentInput.value = '';
                        this.editSkillContentInput.readOnly = true;
                    }
                    if (this.saveEditSkillBtn) {
                        this.saveEditSkillBtn.disabled = true;
                    }
                }
            });
        }
        
        if (this.skillUploadBtn) {
            this.skillUploadBtn.addEventListener('click', () => {
                this.skillFileInput.click();
            });
        }
        
        if (this.skillFileInput) {
            this.skillFileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;
                await this.uploadSkillFiles(files);
            });
        }
        
        if (this.manageSkillsBtn) {
            this.manageSkillsBtn.addEventListener('click', () => {
                this.showSkillManagementModal();
            });
        }
        
        if (this.openSkillsDirBtn) {
            this.openSkillsDirBtn.addEventListener('click', async () => {
                await this.openSkillsDirectory();
            });
        }
        
        if (this.closeSkillModalBtn) {
            this.closeSkillModalBtn.addEventListener('click', () => {
                this.skillManagementModal.style.display = 'none';
            });
        }
        
        // 点击弹窗外部关闭
        if (this.skillManagementModal) {
            this.skillManagementModal.addEventListener('click', (e) => {
                if (e.target === this.skillManagementModal) {
                    this.skillManagementModal.style.display = 'none';
                }
            });
        }
        
        if (this.writeSkillModal) {
            this.writeSkillModal.addEventListener('click', (e) => {
                if (e.target === this.writeSkillModal) {
                    this.hideWriteSkillModal();
                }
            });
        }
        
        if (this.editSkillModal) {
            this.editSkillModal.addEventListener('click', (e) => {
                if (e.target === this.editSkillModal) {
                    this.hideEditSkillModal();
                }
            });
        }
        
        // Grounding开关自动保存
        if (this.enableGroundingInput) {
            this.enableGroundingInput.addEventListener('change', () => {
                this.enableGrounding = this.enableGroundingInput.checked;
                this.autoSaveGroundingSetting();
            });
        }

        // 温度滑块
        this.temperatureSlider.addEventListener('input', (e) => {
            this.temperatureValue.textContent = e.target.value;
        });

        // Top-P滑块
        this.topPSlider.addEventListener('input', (e) => {
            this.topPValue.textContent = e.target.value;
        });

        // 文件上传
        this.fileUploadButton.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // 系统提示词自动保存
        this.systemPromptInput.addEventListener('input', () => {
            this.autoSaveSystemPrompt();
        });

        // Agent prompt自动保存（仅提示词专家对话）
        this.agentPromptInput.addEventListener('input', () => {
            this.autoSaveAgentPrompt();
        });

        // Jovida提示词专家参数自动保存
        this.jovidaTargetAgentInput.addEventListener('input', () => {
            this.autoSaveJovidaPromptExpertParams();
        });

        // 精炼总结助手参数自动保存
        this.lengthLimitInput.addEventListener('input', () => {
            this.autoSaveSummaryAssistantParams();
        });
        this.contentPurposeInput.addEventListener('input', () => {
            this.autoSaveSummaryAssistantParams();
        });
        this.outputFormatSelect.addEventListener('change', () => {
            this.autoSaveSummaryAssistantParams();
        });

        // 营养师病人信息自动保存
        this.patientInfoInput.addEventListener('input', () => {
            this.autoSaveNutritionistParams();
        });

        // jovida效果检查助手用户信息自动保存
        this.userPersonalInfoInput.addEventListener('input', () => {
            this.autoSaveJovidaEffectCheckerParams();
        });

        if (this.jovidaVirtualUserSelect) {
            this.jovidaVirtualUserSelect.addEventListener('change', () => {
                this.handleVirtualUserSelection();
            });
        }

        // Jovida助手参数自动保存
        this.jovidaModeSelect.addEventListener('change', () => {
            // 切换模式时立即更新显示的system prompt
            const conversation = this.getCurrentConversation();
            if (conversation && conversation.title === 'Jovida后台日志提取助手') {
                const mode = this.jovidaModeSelect.value;
                const prompt = mode === 'pure-dialog' 
                    ? (conversation.jovidaPromptPure || '')
                    : (conversation.jovidaPromptFull || '');
                this.systemPromptInput.value = prompt;
            }
            this.autoSaveJovidaParams();
        });
        this.jovidaPromptPureInput.addEventListener('input', () => {
            // 如果当前是纯对话模式，同步更新system prompt显示
            const conversation = this.getCurrentConversation();
            if (conversation && conversation.title === 'Jovida后台日志提取助手' && 
                (conversation.jovidaMode || 'pure-dialog') === 'pure-dialog') {
                this.systemPromptInput.value = this.jovidaPromptPureInput.value;
            }
            this.autoSaveJovidaParams();
        });
        this.jovidaPromptFullInput.addEventListener('input', () => {
            // 如果当前是全过程模式，同步更新system prompt显示
            const conversation = this.getCurrentConversation();
            if (conversation && conversation.title === 'Jovida后台日志提取助手' && 
                (conversation.jovidaMode || 'pure-dialog') === 'full-process') {
                this.systemPromptInput.value = this.jovidaPromptFullInput.value;
            }
            this.autoSaveJovidaParams();
        });

        // 视图切换事件
        if (this.headerTabChat) {
            this.headerTabChat.addEventListener('click', () => this.switchView('chat'));
        }
        if (this.headerTabTasks) {
            this.headerTabTasks.addEventListener('click', () => this.switchView('tasks'));
        }
        
        // Tab切换事件
        if (this.tabText) {
            this.tabText.addEventListener('click', () => this.switchMode('text'));
        }
        if (this.tabImage) {
            this.tabImage.addEventListener('click', () => this.switchMode('image'));
        }
        if (this.tabSearch) {
            this.tabSearch.addEventListener('click', () => this.switchMode('search'));
        }
        
        // 任务管理事件
        if (this.addTaskBtn) {
            this.addTaskBtn.addEventListener('click', () => this.showAddTaskDialog());
        }
        
        // 对话列表相关事件
        this.newConversationBtn.addEventListener('click', () => this.createNewConversationByMode());
        this.newFolderBtn.addEventListener('click', () => this.showNewFolderDialog());
        this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.showSidebarBtn.addEventListener('click', () => this.showSidebar());

        // 为根列表添加拖拽接收功能（只绑定一次）
        this.conversationsList.addEventListener('dragover', (e) => {
            e.preventDefault();
            // 只有在拖拽对话项时才显示拖拽效果
            if (this.draggedElement && this.draggedElement.classList.contains('conversation-item')) {
                const folderElement = e.target.closest('.folder-header, .folder-content');
                if (!folderElement) {
                    this.conversationsList.classList.add('drag-over');
                }
            }
        });
        
        this.conversationsList.addEventListener('dragleave', (e) => {
            // 只有当离开列表区域时才移除样式
            if (!this.conversationsList.contains(e.relatedTarget)) {
                this.conversationsList.classList.remove('drag-over');
            }
        });
        
        this.conversationsList.addEventListener('drop', (e) => {
            e.preventDefault();
            this.conversationsList.classList.remove('drag-over');
            
            if (this.draggedElement) {
                const conversationId = this.draggedElement.dataset.conversationId;
                // 检查是否拖到了文件夹上，如果不是，则移到根目录
                const folderElement = e.target.closest('.folder-header, .folder-content');
                if (!folderElement) {
                    this.moveConversationToFolder(conversationId, null);
                }
            }
        });

        // Vertex AI 重新配置事件
        if (this.reconfigureVertexBtn) {
            this.reconfigureVertexBtn.addEventListener('click', () => {
                this.showVertexReconfigForm();
            });
        }
        
        if (this.saveVertexConfigBtn) {
            this.saveVertexConfigBtn.addEventListener('click', () => {
                this.saveVertexConfig();
            });
        }
        
        if (this.cancelVertexConfigBtn) {
            this.cancelVertexConfigBtn.addEventListener('click', () => {
                this.hideVertexReconfigForm();
            });
        }

        // 图生图功能事件绑定
        if (this.enableImageToImageInput) {
            this.enableImageToImageInput.addEventListener('change', () => {
                this.enableImageToImage = this.enableImageToImageInput.checked;
                const uploadArea = document.getElementById('image-to-image-upload-area');
                if (uploadArea) {
                    uploadArea.style.display = this.enableImageToImage ? 'block' : 'none';
                }
                if (!this.enableImageToImage) {
                    this.imageToImageReference = [];
                    if (this.imageToImagePreview) {
                        this.imageToImagePreview.style.display = 'none';
                    }
                }
                this.saveSettings();
            });
        }
        
        if (this.imageToImageUploadBtn && this.imageToImageInput) {
            this.imageToImageUploadBtn.addEventListener('click', () => {
                this.imageToImageInput.click();
            });
            
            this.imageToImageInput.addEventListener('change', (e) => {
                this.handleImageToImageUpload(e.target.files);
            });
        }
        
        if (this.removeImageToImageBtn) {
            this.removeImageToImageBtn.addEventListener('click', () => {
                this.imageToImageReference = [];
                this.updateImageToImagePreview();
            });
        }

        // 点击外部关闭设置面板
        document.addEventListener('click', (e) => {
            if (!this.settingsPanel.contains(e.target) && !this.settingsToggle.contains(e.target)) {
                this.settingsPanel.classList.remove('open');
            }
        });
    }
    
    /**
     * 处理图生图图片上传（支持多文件）
     * @param {FileList} files - 图片文件列表
     */
    async handleImageToImageUpload(files) {
        if (!files || files.length === 0) {
            return;
        }

        // 处理所有文件
        const newImages = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 检查文件大小（图片可以稍大一些，比如 20MB）
            if (file.size > 20 * 1024 * 1024) {
                errors.push(`${file.name}: 文件太大（需小于20MB）`);
                continue;
            }

            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                errors.push(`${file.name}: 不是图片文件`);
                continue;
            }

            try {
                // 读取图片为 base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        // 提取 base64 数据（去掉 data:image/xxx;base64, 前缀）
                        const dataUrl = e.target.result;
                        const base64Match = dataUrl.match(/^data:image\/([^;]+);base64,(.+)$/);
                        if (base64Match) {
                            resolve({
                                mime_type: `image/${base64Match[1]}`,
                                data: base64Match[2],
                                filename: file.name
                            });
                        } else {
                            reject(new Error('无法解析图片数据'));
                        }
                    };
                    reader.onerror = (e) => reject(new Error('读取图片失败'));
                    reader.readAsDataURL(file);
                });

                newImages.push(base64);
            } catch (error) {
                console.error(`读取图片失败 ${file.name}:`, error);
                errors.push(`${file.name}: ${error.message}`);
            }
        }

        // 添加到参考图片数组（追加模式，不清空已有图片）
        if (newImages.length > 0) {
            this.imageToImageReference = this.imageToImageReference || [];
            this.imageToImageReference.push(...newImages);
            this.updateImageToImagePreview();
            
            if (errors.length > 0) {
                this.showNotification(`已上传 ${newImages.length} 张图片，${errors.length} 张失败: ${errors.join('; ')}`, 'warning');
            } else {
                this.showNotification(`已上传 ${newImages.length} 张参考图片`, 'success');
            }
        } else if (errors.length > 0) {
            this.showNotification(`上传失败: ${errors.join('; ')}`, 'error');
        }
    }

    /**
     * 更新图生图预览区域
     */
    updateImageToImagePreview() {
        const previewContainer = document.getElementById('image-to-image-preview-container');
        const previewArea = document.getElementById('image-to-image-preview');
        
        if (!previewContainer || !previewArea) return;

        // 清空容器
        previewContainer.innerHTML = '';

        if (!this.imageToImageReference || this.imageToImageReference.length === 0) {
            previewArea.style.display = 'none';
            return;
        }

        // 显示所有图片
        this.imageToImageReference.forEach((img, index) => {
            const imgWrapper = document.createElement('div');
            imgWrapper.style.position = 'relative';
            imgWrapper.style.border = '1px solid #475569';
            imgWrapper.style.borderRadius = '6px';
            imgWrapper.style.overflow = 'hidden';
            imgWrapper.style.background = '#1e293b';

            const imgEl = document.createElement('img');
            imgEl.src = `data:${img.mime_type};base64,${img.data}`;
            imgEl.style.width = '100%';
            imgEl.style.height = 'auto';
            imgEl.style.display = 'block';

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.style.position = 'absolute';
            removeBtn.style.top = '4px';
            removeBtn.style.right = '4px';
            removeBtn.style.padding = '0.25rem 0.4rem';
            removeBtn.style.background = 'rgba(220, 38, 38, 0.9)';
            removeBtn.style.border = 'none';
            removeBtn.style.borderRadius = '4px';
            removeBtn.style.color = 'white';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.fontSize = '0.75rem';
            removeBtn.title = '移除这张图片';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.imageToImageReference.splice(index, 1);
                this.updateImageToImagePreview();
                this.showNotification('已移除图片', 'info');
            });

            imgWrapper.appendChild(imgEl);
            imgWrapper.appendChild(removeBtn);
            previewContainer.appendChild(imgWrapper);
        });

        previewArea.style.display = 'block';
    }

    async checkVertexStatus() {
        // 检查 Vertex AI 状态
        if (!this.vertexStatusEl) return;
        
        try {
            const response = await fetch('http://localhost:5000/api/health');
            const data = await response.json();
            
            if (data.status === 'ok') {
                if (data.vertex_configured) {
                    this.vertexStatusEl.textContent = '✓ 已配置';
                    this.vertexStatusEl.style.color = '#10b981';
                    
                    // 从后端获取当前配置信息
                    try {
                        const configResponse = await fetch('http://localhost:5000/api/get-vertex-config');
                        const configData = await configResponse.json();
                        if (configData.success && configData.config) {
                            if (this.vertexProjectEl) {
                                this.vertexProjectEl.textContent = configData.config.GOOGLE_CLOUD_PROJECT || '-';
                            }
                            if (this.vertexLocationEl) {
                                this.vertexLocationEl.textContent = configData.config.GOOGLE_CLOUD_LOCATION || '-';
                            }
                        }
                    } catch (e) {
                        console.error('获取配置信息失败:', e);
                    }
                } else {
                    this.vertexStatusEl.textContent = '✗ 未配置';
                    this.vertexStatusEl.style.color = '#ef4444';
                    if (this.vertexProjectEl) this.vertexProjectEl.textContent = '-';
                    if (this.vertexLocationEl) this.vertexLocationEl.textContent = '-';
                }
            }
        } catch (error) {
            this.vertexStatusEl.textContent = '✗ 检查失败';
            this.vertexStatusEl.style.color = '#ef4444';
            if (this.vertexProjectEl) this.vertexProjectEl.textContent = '-';
            if (this.vertexLocationEl) this.vertexLocationEl.textContent = '-';
        }
    }

    showVertexReconfigForm() {
        if (!this.vertexReconfigForm) return;
        
        // 加载当前配置
        this.loadVertexConfigToForm();
        
        this.vertexReconfigForm.style.display = 'block';
    }

    hideVertexReconfigForm() {
        if (this.vertexReconfigForm) {
            this.vertexReconfigForm.style.display = 'none';
        }
        if (this.vertexConfigStatus) {
            this.vertexConfigStatus.textContent = '';
        }
    }

    async loadVertexConfigToForm() {
        try {
            const response = await fetch('http://localhost:5000/api/get-vertex-config');
            const data = await response.json();
            
            if (data.success && data.config) {
                const config = data.config;
                const projectInput = document.getElementById('reconfig-project');
                const locationInput = document.getElementById('reconfig-location');
                const useVertexInput = document.getElementById('reconfig-use-vertex');
                const credsInput = document.getElementById('reconfig-credentials');
                
                if (projectInput) projectInput.value = config.GOOGLE_CLOUD_PROJECT || 'innertest-471009';
                if (locationInput) locationInput.value = config.GOOGLE_CLOUD_LOCATION || 'global';
                if (useVertexInput) useVertexInput.value = config.GOOGLE_GENAI_USE_VERTEXAI || 'True';
                if (credsInput) credsInput.value = config.GOOGLE_APPLICATION_CREDENTIALS || 'C:\\Users\\ZhuanZ（无密码）\\Desktop\\Google Vertex\\vertex_ai_credentials.json';
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    async saveVertexConfig() {
        if (!this.vertexConfigStatus) return;
        
        const projectInput = document.getElementById('reconfig-project');
        const locationInput = document.getElementById('reconfig-location');
        const useVertexInput = document.getElementById('reconfig-use-vertex');
        const credsInput = document.getElementById('reconfig-credentials');
        
        if (!projectInput || !locationInput || !useVertexInput || !credsInput) {
            this.vertexConfigStatus.textContent = '错误：找不到配置输入框';
            this.vertexConfigStatus.style.color = '#ef4444';
            return;
        }
        
        const config = {
            GOOGLE_CLOUD_PROJECT: projectInput.value.trim(),
            GOOGLE_CLOUD_LOCATION: locationInput.value.trim(),
            GOOGLE_GENAI_USE_VERTEXAI: useVertexInput.value.trim(),
            GOOGLE_APPLICATION_CREDENTIALS: credsInput.value.trim()
        };
        
        if (!config.GOOGLE_CLOUD_PROJECT || !config.GOOGLE_CLOUD_LOCATION || !config.GOOGLE_GENAI_USE_VERTEXAI || !config.GOOGLE_APPLICATION_CREDENTIALS) {
            this.vertexConfigStatus.textContent = '错误：请填写所有配置项';
            this.vertexConfigStatus.style.color = '#ef4444';
            return;
        }
        
        this.vertexConfigStatus.textContent = '正在保存配置...';
        this.vertexConfigStatus.style.color = '#6b7280';
        
        try {
            const response = await fetch('http://localhost:5000/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.vertexConfigStatus.textContent = '✓ 配置保存成功！';
                this.vertexConfigStatus.style.color = '#10b981';
                this.showNotification('Vertex AI 配置已更新', 'success');
                
                // 刷新状态
                setTimeout(() => {
                    this.checkVertexStatus();
                    this.hideVertexReconfigForm();
                }, 1000);
            } else {
                throw new Error(data.error || '保存失败');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            this.vertexConfigStatus.textContent = '✗ 保存失败：' + error.message;
            this.vertexConfigStatus.style.color = '#ef4444';
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message && this.attachedFiles.length === 0) return;

        // 获取当前对话
        const conversation = this.getCurrentConversation();
        if (!conversation) {
            this.showNotification('没有活动的对话', 'error');
            return;
        }
        
        // 保存输入内容到对话对象
        conversation.inputContent = this.messageInput.value;
        conversation.attachedFiles = [...this.attachedFiles];
        
        // 标记对话正在生成
        conversation.isGenerating = true;
        this.updateConversationsList();

        // 如果是"提示词专家"对话且有agent prompt，将其添加到消息前
        let messagePrefix = '';
        if (conversation.title === '提示词专家' && conversation.agentPrompt) {
            messagePrefix = `[当前Agent的Prompt]\n${conversation.agentPrompt}\n\n---\n\n[用户问题]\n`;
        }
        
        // 如果是"Jovida提示词专家"对话且有目标agent信息，将其添加到消息前
        if (conversation.title === 'Jovida提示词专家' && conversation.jovidaTargetAgent) {
            messagePrefix = `[当前要为哪个Agent设计提示词]\n${conversation.jovidaTargetAgent}\n\n---\n\n[用户问题]\n`;
        }
        
        // 如果是"美国注册营养师"对话且有病人信息，将其添加到消息前
        if (conversation.title === '美国注册营养师' && conversation.patientInfo) {
            messagePrefix = `[病人已知信息]\n${conversation.patientInfo}\n\n---\n\n[用户问题]\n`;
        }
        
        // 如果是"jovida效果检查助手"对话且有用户个人信息，将其添加到消息前
        if (conversation.title === 'jovida效果检查助手' && conversation.userPersonalInfo) {
            messagePrefix = `[用户个人信息]\n${conversation.userPersonalInfo}\n\n---\n\n[用户问题]\n`;
        }
        
        // 如果是"精炼总结助手"对话，将长度限制、内容用途和输出格式添加到system prompt
        // 保存原始system prompt以便后续恢复
        let originalSystemPrompt = conversation.systemPrompt;
        if (conversation.title === '精炼总结助手') {
            let additionalInstructions = [];
            if (conversation.lengthLimit) {
                additionalInstructions.push(`长度限制：${conversation.lengthLimit}字`);
            }
            if (conversation.contentPurpose) {
                additionalInstructions.push(`内容用途：${conversation.contentPurpose}`);
            }
            if (conversation.outputFormat) {
                let formatDescription = '';
                switch(conversation.outputFormat) {
                    case 'bulletpoints':
                        formatDescription = '要点列表 (Bullet Points)';
                        break;
                    case 'numbered':
                        formatDescription = '编号列表 (Numbered List)';
                        break;
                    case 'json':
                        formatDescription = 'JSON格式';
                        break;
                    case 'markdown':
                        formatDescription = 'Markdown格式';
                        break;
                    case '表格':
                        formatDescription = '表格格式';
                        break;
                    case '大纲':
                        formatDescription = '大纲格式';
                        break;
                    case '段落':
                        formatDescription = '段落格式';
                        break;
                    case '文本':
                        formatDescription = '文本格式';
                        break;
                    default:
                        formatDescription = conversation.outputFormat;
                }
                additionalInstructions.push(`输出格式：${formatDescription}`);
            }
            if (additionalInstructions.length > 0) {
                // 将这些信息添加到system prompt中（临时修改，用于本次API调用）
                conversation.systemPrompt = `${originalSystemPrompt}\n\n[输出要求]\n${additionalInstructions.join('\n')}`;
            }
        }

        // 构建完整消息（包含文件内容）
        let fullMessage = messagePrefix + message;
        if (this.attachedFiles.length > 0) {
            const fileContents = this.attachedFiles.map(file => {
                let content = file.content;
                
                // 为docx文件添加特殊标记
                if (file.name.endsWith('.docx')) {
                    content = `[DOCX文档: ${file.name}]\n\n${content}`;
                }
                // 为PDF文件添加特殊标记
                else if (file.name.endsWith('.pdf')) {
                    content = `[PDF文档: ${file.name}]\n\n${content}`;
                }
                // 为其他文件添加标记
                else {
                    content = `[文件: ${file.name}]\n\n${content}`;
                }
                
                return content;
            }).join('\n\n---\n\n');
            
            fullMessage = message ? `${message}\n\n---\n\n${fileContents}` : fileContents;
        }

        // 添加用户消息到 UI
        this.addMessage(fullMessage, 'user');
        
        // 立即将用户消息添加到对话历史（确保无论后续是否出错都会保存）
        conversation.history.push({ role: 'user', content: fullMessage });
        conversation.updatedAt = Date.now();
        this.saveConversations();
        
        // 清空输入框（但保存到对话对象中）
        this.messageInput.value = '';
        conversation.inputContent = '';
        this.autoResizeTextarea();
        this.updateCharCount();

        // 标记对话正在生成
        conversation.isGenerating = true;
        this.showLoadingForConversation(conversation.id, true);

        // 保存当前对话ID，防止切换对话后更新错误的对话
        const currentConvId = conversation.id;

        try {
            // 调用Gemini API，传入当前会话ID确保使用正确的历史记录
            const response = await this.callGeminiAPI(fullMessage, currentConvId);
            
            // 检查对话是否仍然是当前对话（可能用户已经切换了）
            const currentConv = this.getConversation(currentConvId);
            if (!currentConv) {
                // 对话已被删除，不处理响应
                return;
            }
            
            // 处理响应（可能是文本或图片）
            if (typeof response === 'object' && response.type === 'image') {
                // 如果当前对话仍然是活动对话，才显示消息
                if (currentConvId === this.currentConversationId) {
                    this.addImageMessage(response.data, response.mimeType);
                }
                // 保存图片到对话历史（以特殊格式）
                currentConv.history.push({ role: 'assistant', content: '[图片已生成]', imageData: response.data, mimeType: response.mimeType });
                currentConv.lastMessage = '[图片已生成]';
                currentConv.updatedAt = Date.now();
                this.saveConversations();
            } else if (typeof response === 'object' && response.type === 'text') {
                if (currentConvId === this.currentConversationId) {
                    this.addMessage(response.content, 'bot');
                }
            } else {
                // 普通文本响应（已在callGeminiAPI中保存历史）
                if (currentConvId === this.currentConversationId) {
                    const responseText = typeof response === 'object' ? response.text : response;
                    this.addMessage(responseText, 'bot');
                    
                    // 如果返回了 skills_used，显示出来
                    if (typeof response === 'object' && Array.isArray(response.skills_used) && response.skills_used.length > 0) {
                        const skillsMsg = `📚 本次回答参考了以下文档技能：\n- ${response.skills_used.join('\n- ')}`;
                        this.addMessage(skillsMsg, 'system');
                    }
                }
            }
            
            // 清空附件（仅对当前对话）
            if (currentConvId === this.currentConversationId) {
                this.clearAttachedFiles();
                currentConv.attachedFiles = [];
            }
        } catch (error) {
            console.error('API调用错误:', error);
            const currentConv = this.getConversation(currentConvId);
            if (currentConv) {
                // 无论是否当前对话，都要保存错误消息到历史
                const errorMessage = `抱歉，发生了错误：${error.message}`;
                currentConv.history.push({ role: 'assistant', content: errorMessage });
                currentConv.lastMessage = errorMessage.substring(0, 50);
                currentConv.updatedAt = Date.now();
                this.saveConversations();
                
                // 只在当前对话时显示错误消息
                if (currentConvId === this.currentConversationId) {
                    this.addMessage(errorMessage, 'bot');
                }
            }
        } finally {
            // 更新生成状态
            const currentConv = this.getConversation(currentConvId);
            if (currentConv) {
                currentConv.isGenerating = false;
                // 更新对话列表显示
                this.updateConversationsList();
                // 更新加载状态（仅当这是当前对话时才更新UI）
                this.showLoadingForConversation(currentConvId, false);
            }
        }
    }

    buildPromptFromMessages(messages) {
        let prompt = '';
        for (const message of messages) {
            if (message.role === 'system') {
                prompt += `System: ${message.content}\n\n`;
            } else if (message.role === 'user') {
                prompt += `User: ${message.content}\n\n`;
            } else if (message.role === 'assistant') {
                prompt += `Assistant: ${message.content}\n\n`;
            }
        }
        return prompt.trim();
    }

    /**
     * 调用Gemini API
     * @param {string} message - 用户消息
     * @param {string} conversationId - 可选的会话ID，如果提供则使用该会话，否则使用当前会话
     * @returns {Promise<string|Object>} API响应
     */
    async callGeminiAPI(message, conversationId = null) {
        // 使用传入的会话ID或当前会话ID，确保在整个异步操作期间使用同一个会话
        const targetConversationId = conversationId || this.currentConversationId;
        const conversation = this.getConversation(targetConversationId);
        if (!conversation) {
            throw new Error('没有活动的对话');
        }

        // 判断是否为图像创作对话
        const isImageGen = conversation.tabType === 'image';
        // 优先使用对话的默认模型，否则根据对话类型判断
        const modelToUse = conversation.defaultModel || (isImageGen ? 'gemini-3-pro-image-preview' : this.currentModel);

        // 如果是Jovida助手，根据模式使用对应的system prompt
        let systemPrompt = conversation.systemPrompt;
        if (conversation.title === 'Jovida后台日志提取助手') {
            const mode = conversation.jovidaMode || 'pure-dialog';
            systemPrompt = mode === 'pure-dialog' 
                ? (conversation.jovidaPromptPure || conversation.systemPrompt || '')
                : (conversation.jovidaPromptFull || conversation.systemPrompt || '');
        }

        if (conversation.title === 'Jovida虚拟用户模拟器') {
            systemPrompt = this.buildJovidaVirtualUserSystemPrompt(conversation);
        }

        // 用户消息已在 sendMessage 中添加到历史，这里不再重复添加
        // conversation.history.push({ role: 'user', content: message });

        // 构建消息数组
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversation.history
        ];

        const requestBody = {
            model: modelToUse,
            messages: messages,
            temperature: this.temperature,
            max_tokens: this.maxTokens
        };

        console.log('API Key长度:', this.apiKey.length);
        console.log('API Key前10位:', this.apiKey.substring(0, 10));
        console.log('请求URL:', `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey.substring(0, 10)}...`);
        const generationConfig = {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens,
            topP: this.topP,
            topK: this.topK,
            candidateCount: this.candidateCount,
            ...(this.stopSequences ? { stopSequences: this.stopSequences.split(',').map(s => s.trim()).filter(s => s) } : {})
        };
        
        console.log('请求体:', {
            contents: [{
                parts: [{
                    text: this.buildPromptFromMessages(messages)
                }]
            }],
            generationConfig: generationConfig
        });

        let botMessage;
        
        // 统一使用 Vertex AI（后端API），文字创作和图像创作都走这个路径
        // 构建请求内容
        let promptText;
        
        if (isImageGen && conversation.isImageEdit) {
            // 图生图会话：不带长上下文，只使用图生图系统提示词 + 当前这次指令
            // 这样更符合「文字走文字，图走图，一起投递」的 img2img 语义
            const basePrompt = (this.imageToImagePrompt || '').trim();
            if (basePrompt) {
                promptText = `${basePrompt}\n\nUser: ${message}`;
            } else {
                promptText = message;
            }
        } else {
            // 其他情况：正常对话流，带上下文窗口
            promptText = this.buildPromptFromMessages(messages);
        }
        
        // 构建配置对象
        const config = {
            temperature: this.temperature,
            max_output_tokens: parseInt(this.maxTokens) || 4096,  // 确保是整数
            top_p: this.topP,
            top_k: this.topK
        };
        
        // 调试日志：记录发送的配置
        console.log('发送到后端的配置:', {
            max_output_tokens: config.max_output_tokens,
            temperature: config.temperature,
            top_p: config.top_p,
            top_k: config.top_k,
            'this.maxTokens 原始值': this.maxTokens,
            'this.maxTokens 类型': typeof this.maxTokens
        });
        
        // 调用后端 Vertex AI API（文字创作和图像创作都使用这个端点）
        const payload = {
            model: modelToUse,
            contents: promptText,
            config: config
        };
        
        // 如果开启了 Skill 模式，且不是图像生成，添加 mode: 'skills'
        const isSkillMode = this.skillsEnabled && !isImageGen;
        if (isSkillMode) {
            payload.mode = 'skills';
        }

        // 如果是图生图会话：始终附带参考图片（文字走文字，图走图，支持多张图）
        if (isImageGen && conversation.isImageEdit) {
            let imageInputs = [];

            // 1）优先使用设置面板里上传的参考图片（支持多张）
            if (Array.isArray(this.imageToImageReference) && this.imageToImageReference.length > 0) {
                imageInputs = this.imageToImageReference.filter(img => img && img.mime_type && img.data);
            } else {
                // 2）否则使用当前对话里，最近一次由 Gemini 返回的图片
                if (Array.isArray(conversation.history) && conversation.history.length > 0) {
                    for (let i = conversation.history.length - 1; i >= 0; i--) {
                        const msg = conversation.history[i];
                        if (msg && msg.role === 'assistant' && msg.imageData && msg.mimeType) {
                            imageInputs = [{
                                mime_type: msg.mimeType,
                                data: msg.imageData
                            }];
                            break;
                        }
                    }
                }
            }

            if (imageInputs.length === 0) {
                throw new Error('图生图模式需要参考图片：请先在设置中上传图片，或先生成一张图片再进行编辑。');
            }

            // 将 image_input 添加到请求体（支持多张图，后端会处理数组）
            payload.image_input = imageInputs.length === 1 ? imageInputs[0] : imageInputs;
        }

        // Skill 模式：使用流式读取 SSE 事件
        if (isSkillMode) {
            return await this.handleSkillModeStream(payload, conversation, message);
        }

        const response = await fetch('http://localhost:5000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Vertex AI 响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('完整错误响应:', errorData);
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('Vertex AI 响应数据:', {
            success: data.success,
            hasText: !!data.text,
            hasImage: !!data.image,
            hasMimeType: !!data.mime_type,
            textLength: data.text ? data.text.length : 0,
            textPreview: data.text ? data.text.substring(0, 100) : null,
            fullData: data
        });
        
        if (!data.success) {
            throw new Error(data.error || 'Vertex AI 响应格式错误: ' + JSON.stringify(data));
        }
        
        // 如果是图像生成模式，检查是否有图片数据
        if (isImageGen) {
            // 后端直接返回图片数据
            if (data.image && data.mime_type) {
                return {
                    type: 'image',
                    mimeType: data.mime_type,
                    data: data.image
                };
            }
            
            // 如果没有图片数据，尝试从文本中提取
            if (data.text) {
                // 尝试提取base64图片数据（data:image/...格式）
                const base64Match = data.text.match(/data:image\/([^;]+);base64,([^\s"']+)/);
                if (base64Match) {
                    return {
                        type: 'image',
                        mimeType: base64Match[1],
                        data: base64Match[2]
                    };
                }
                
                // 尝试提取URL
                const urlMatch = data.text.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp)/i);
                if (urlMatch) {
                    return {
                        type: 'image_url',
                        url: urlMatch[0],
                        content: data.text
                    };
                }
                
                // 如果没有图片，返回文本
                return { type: 'text', content: data.text };
            }
            
            // 如果既没有图片也没有文本
            throw new Error('图像生成响应中未找到图片数据或文本');
        }
        
        // 文本生成模式：检查文本内容
        // 允许空字符串，但不允许 undefined 或 null
        if (data.text === undefined || data.text === null) {
            console.error('Vertex AI 响应缺少 text 字段:', data);
            throw new Error(`Vertex AI 响应格式错误: 缺少文本内容。响应数据: ${JSON.stringify(data).substring(0, 500)}`);
        }
        
        // 如果文本是空字符串，使用默认消息
        botMessage = data.text || '(模型返回了空响应)';
        
        // 保存 skills_used（如果有）
        const skillsUsed = data.skills_used || [];

        // 如果是"精炼总结助手"对话，恢复原始system prompt（因为我们在调用前临时修改了它）
        // 注意：originalSystemPrompt在sendMessage函数作用域中，我们需要从UI中恢复
        if (conversation.title === '精炼总结助手') {
            // 从UI输入框恢复原始system prompt（因为我们在调用前临时修改了conversation对象）
            conversation.systemPrompt = this.systemPromptInput.value.trim() || conversation.systemPrompt;
        }

        // 添加机器人回复到历史
        conversation.history.push({ role: 'assistant', content: botMessage });

        // 限制历史长度
        if (conversation.history.length > this.contextWindow) {
            conversation.history = conversation.history.slice(-this.contextWindow);
        }
        
        // 更新对话预览
        conversation.lastMessage = message.substring(0, 50);
        conversation.updatedAt = Date.now();
        
        // 保存对话
        this.saveConversations();
        this.updateConversationsList();

        return { text: botMessage, skills_used: skillsUsed };
    }

    addMessage(content, sender, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (!animate) {
            messageDiv.style.animation = 'none';
        }

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 处理Markdown格式
        const formattedContent = this.formatMessage(content);
        contentDiv.innerHTML = formattedContent;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * 添加图片消息
     * @param {string} imageData - Base64编码的图片数据
     * @param {string} mimeType - 图片MIME类型
     */
    addImageMessage(imageData, mimeType = 'image/png') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = `data:${mimeType};base64,${imageData}`;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.marginTop = '0.5rem';
        img.alt = '生成的图片';
        
        // 添加下载按钮
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-image-btn';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载图片';
        downloadBtn.style.marginTop = '0.5rem';
        downloadBtn.style.padding = '0.5rem 1rem';
        downloadBtn.style.background = '#4f46e5';
        downloadBtn.style.color = 'white';
        downloadBtn.style.border = 'none';
        downloadBtn.style.borderRadius = '6px';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = `data:${mimeType};base64,${imageData}`;
            link.download = `generated-image-${Date.now()}.${mimeType.split('/')[1] || 'png'}`;
            link.click();
        });
        
        contentDiv.appendChild(img);
        contentDiv.appendChild(downloadBtn);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * 格式化消息内容，支持完整的Markdown格式
     * @param {string} content - 原始消息内容
     * @returns {string} HTML格式的内容
     */
    formatMessage(content) {
        return this.formatMarkdown(content);
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    updateCharCount() {
        const charCount = this.messageInput.value.length;
        document.querySelector('.char-count').textContent = `${charCount}/800000`;
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    toggleSettings() {
        this.settingsPanel.classList.toggle('open');
        
        // 如果打开设置面板，检查是否需要显示专用输入框
        if (this.settingsPanel.classList.contains('open')) {
            const conversation = this.getCurrentConversation();
            if (conversation) {
                // 提示词专家对话
                if (conversation.title === '提示词专家') {
                    this.agentPromptGroup.style.display = 'block';
                    this.agentPromptInput.value = conversation.agentPrompt || '';
                } else {
                    this.agentPromptGroup.style.display = 'none';
                }
                
                // Jovida提示词专家对话
                if (conversation.title === 'Jovida提示词专家') {
                    this.jovidaPromptExpertGroup.style.display = 'block';
                    this.jovidaTargetAgentInput.value = conversation.jovidaTargetAgent || '';
                } else {
                    this.jovidaPromptExpertGroup.style.display = 'none';
                }
                
                // 精炼总结助手对话
                if (conversation.title === '精炼总结助手') {
                    this.summaryAssistantGroup.style.display = 'block';
                    this.lengthLimitInput.value = conversation.lengthLimit || '';
                    this.contentPurposeInput.value = conversation.contentPurpose || '';
                    this.outputFormatSelect.value = conversation.outputFormat || '';
                } else {
                    this.summaryAssistantGroup.style.display = 'none';
                }
                
                // 美国注册营养师对话
                if (conversation.title === '美国注册营养师') {
                    this.nutritionistGroup.style.display = 'block';
                    this.patientInfoInput.value = conversation.patientInfo || '';
                } else {
                    this.nutritionistGroup.style.display = 'none';
                }
                
                // jovida效果检查助手对话
                if (conversation.title === 'jovida效果检查助手') {
                    this.jovidaEffectCheckerGroup.style.display = 'block';
                    this.userPersonalInfoInput.value = conversation.userPersonalInfo || '';
                } else {
                    this.jovidaEffectCheckerGroup.style.display = 'none';
                }
                
                // Jovida后台日志提取助手对话
                if (conversation.title === 'Jovida后台日志提取助手') {
                    this.jovidaAssistantGroup.style.display = 'block';
                    this.jovidaModeSelect.value = conversation.jovidaMode || 'pure-dialog';
                    this.jovidaPromptPureInput.value = conversation.jovidaPromptPure || '';
                    this.jovidaPromptFullInput.value = conversation.jovidaPromptFull || '';
                    this.updateJovidaSystemPromptDisplay(conversation);
                } else {
                    this.jovidaAssistantGroup.style.display = 'none';
                }

                if (conversation.title === 'Jovida虚拟用户模拟器') {
                    this.jovidaVirtualUserGroup.style.display = 'block';
                    this.syncVirtualUserSelect(conversation);
                } else if (this.jovidaVirtualUserGroup) {
                    this.jovidaVirtualUserGroup.style.display = 'none';
                }
            }
        }
    }

    saveSettings() {
        // API Key 已移除，文字创作模式使用 Vertex AI
        this.temperature = parseFloat(this.temperatureSlider.value);
        this.maxTokens = parseInt(this.maxTokensInput.value);
        this.topP = parseFloat(this.topPSlider.value);
        this.topK = parseInt(this.topKInput.value);
        this.candidateCount = parseInt(this.candidateCountInput.value);
        this.stopSequences = this.stopSequencesInput.value.trim();
        this.contextWindow = parseInt(this.contextWindowInput.value);
        this.enableGrounding = this.enableGroundingInput ? this.enableGroundingInput.checked : false;
        this.enableImageToImage = this.enableImageToImageInput ? this.enableImageToImageInput.checked : false;
        
        // 保存当前对话的system prompt和agent prompt
        if (this.currentConversationId) {
            const conversation = this.getConversation(this.currentConversationId);
            if (conversation) {
                conversation.systemPrompt = this.systemPromptInput.value.trim() || 'You are a helpful assistant. Please answer in Chinese.';
                // 如果是"提示词专家"对话，保存agent prompt
                if (conversation.title === '提示词专家') {
                    conversation.agentPrompt = this.agentPromptInput.value.trim() || '';
                }
                // 如果是"Jovida提示词专家"对话，保存目标agent信息
                if (conversation.title === 'Jovida提示词专家') {
                    conversation.jovidaTargetAgent = this.jovidaTargetAgentInput.value.trim() || '';
                }
                // 如果是"精炼总结助手"对话，保存长度限制、内容用途和输出格式
                if (conversation.title === '精炼总结助手') {
                    conversation.lengthLimit = this.lengthLimitInput.value.trim() || '';
                    conversation.contentPurpose = this.contentPurposeInput.value.trim() || '';
                    conversation.outputFormat = this.outputFormatSelect.value || '';
                }
                // 如果是"美国注册营养师"对话，保存病人信息
                if (conversation.title === '美国注册营养师') {
                    conversation.patientInfo = this.patientInfoInput.value.trim() || '';
                }
                // 如果是"jovida效果检查助手"对话，保存用户个人信息
                if (conversation.title === 'jovida效果检查助手') {
                    conversation.userPersonalInfo = this.userPersonalInfoInput.value.trim() || '';
                }
                // 如果是"Jovida后台日志提取助手"对话，保存模式和prompt
                if (conversation.title === 'Jovida后台日志提取助手') {
                    conversation.jovidaMode = this.jovidaModeSelect.value || 'pure-dialog';
                    conversation.jovidaPromptPure = this.jovidaPromptPureInput.value.trim() || '';
                    conversation.jovidaPromptFull = this.jovidaPromptFullInput.value.trim() || '';
                    // 根据模式更新system prompt
                    conversation.systemPrompt = conversation.jovidaMode === 'pure-dialog' 
                        ? conversation.jovidaPromptPure 
                        : conversation.jovidaPromptFull;
                }
                this.saveConversations();
            }
        }

        // 保存海报制作系统提示词
        if (this.posterCommonPromptInput) {
            this.posterCommonPrompt = this.posterCommonPromptInput.value.trim();
        }
        if (this.posterImagePromptInput) {
            this.posterImagePrompt = this.posterImagePromptInput.value.trim() || this.posterImagePrompt;
        }
        if (this.imageToImagePromptInput) {
            const customImg2ImgPrompt = this.imageToImagePromptInput.value.trim();
            // 默认图生图系统提示词（高还原度，仅局部修改）
            this.imageToImagePrompt = customImg2ImgPrompt || 
                'You are an image editing assistant. Modify only the regions described by the user while keeping everything else identical to the input image. ' +
                'Do not change overall style, colors, lighting, or details that are not explicitly mentioned. ' +
                'Keep the exact layout and composition of the input image.';
        } else {
            // 确保有默认值
            if (!this.imageToImagePrompt) {
                this.imageToImagePrompt = 
                    'You are an image editing assistant. Modify only the regions described by the user while keeping everything else identical to the input image. ' +
                    'Do not change overall style, colors, lighting, or details that are not explicitly mentioned. ' +
                    'Keep the exact layout and composition of the input image.';
            }
        }
        if (this.posterTextPromptInput) {
            this.posterTextPrompt = this.posterTextPromptInput.value.trim() || this.posterTextPrompt;
        }
        if (this.posterWebPromptInput) {
            this.posterWebPrompt = this.posterWebPromptInput.value.trim() || this.posterWebPrompt;
        }
        if (this.instagramDesignerPromptInput) {
            const value = this.instagramDesignerPromptInput.value.trim();
            this.instagramPrompts.designer = value || this.defaultInstagramPrompts.designer;
        }
        if (this.instagramEngineerPromptInput) {
            const value = this.instagramEngineerPromptInput.value.trim();
            this.instagramPrompts.engineer = value || this.defaultInstagramPrompts.engineer;
        }
        if (this.instagramImagePromptSettingInput) {
            const value = this.instagramImagePromptSettingInput.value.trim();
            this.instagramPrompts.image = value || this.defaultInstagramPrompts.image;
        }
        if (this.instagramTextPromptSettingInput) {
            const value = this.instagramTextPromptSettingInput.value.trim();
            this.instagramPrompts.text = value || this.defaultInstagramPrompts.text;
        }
        this.saveInstagramPromptSettings();
        this.syncInstagramPromptInputs();
        
        // 保存到本地存储（全局设置）
        const settings = {
            apiKey: this.apiKey,
            temperature: this.temperature,
            enableImageToImage: this.enableImageToImage,
            maxTokens: this.maxTokens,
            topP: this.topP,
            topK: this.topK,
            candidateCount: this.candidateCount,
            stopSequences: this.stopSequences,
            contextWindow: this.contextWindow,
            enableGrounding: this.enableGrounding,
            posterCommonPrompt: this.posterCommonPrompt,
            posterImagePrompt: this.posterImagePrompt,
            posterTextPrompt: this.posterTextPrompt,
            posterWebPrompt: this.posterWebPrompt
        };
        this.safeSetItem('gemini-settings', settings);

        this.showNotification('设置已保存', 'success');
        this.settingsPanel.classList.remove('open');
    }

    loadSettings() {
        const saved = localStorage.getItem('gemini-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                // API Key 已移除，文字创作模式使用 Vertex AI
                // 保留 apiKey 变量以兼容图像生成模式（如果需要）
                this.apiKey = settings.apiKey || '';
                this.temperature = settings.temperature !== undefined ? settings.temperature : 0.7;
                // 默认值与构造函数保持一致：44444（实际由 Vertex 模型上限裁剪）
                this.maxTokens = settings.maxTokens !== undefined ? settings.maxTokens : 44444;
                this.topP = settings.topP !== undefined ? settings.topP : 0.95;
                this.topK = settings.topK !== undefined ? settings.topK : 40;
                this.candidateCount = settings.candidateCount !== undefined ? settings.candidateCount : 1;
                this.stopSequences = settings.stopSequences || '';
                this.contextWindow = settings.contextWindow !== undefined ? settings.contextWindow : 20;
                this.enableGrounding = settings.enableGrounding !== undefined ? settings.enableGrounding : false;
                this.enableImageToImage = settings.enableImageToImage !== undefined ? settings.enableImageToImage : false;
                
                // 更新图生图开关UI
                if (this.enableImageToImageInput) {
                    this.enableImageToImageInput.checked = this.enableImageToImage;
                    const uploadArea = document.getElementById('image-to-image-upload-area');
                    if (uploadArea) {
                        uploadArea.style.display = this.enableImageToImage ? 'block' : 'none';
                    }
                }
                
                // 加载海报制作系统提示词
                if (settings.posterCommonPrompt !== undefined) {
                    this.posterCommonPrompt = settings.posterCommonPrompt || '';
                }
                if (settings.posterImagePrompt) {
                    this.posterImagePrompt = settings.posterImagePrompt;
                }
                if (settings.posterTextPrompt) {
                    this.posterTextPrompt = settings.posterTextPrompt;
                }
                if (settings.posterWebPrompt) {
                    this.posterWebPrompt = settings.posterWebPrompt;
                }

                // 更新UI
                // API Key 已移除，检查 Vertex AI 状态
                this.checkVertexStatus();
                this.temperatureSlider.value = this.temperature;
                this.temperatureValue.textContent = this.temperature;
                this.maxTokensInput.value = this.maxTokens;
                this.topPSlider.value = this.topP;
                this.topPValue.textContent = this.topP;
                this.topKInput.value = this.topK;
                this.candidateCountInput.value = this.candidateCount;
                this.stopSequencesInput.value = this.stopSequences;
                this.contextWindowInput.value = this.contextWindow;
                if (this.enableGroundingInput) {
                    this.enableGroundingInput.checked = this.enableGrounding;
                }
                
                // 更新海报制作系统提示词UI
                if (this.posterCommonPromptInput) {
                    this.posterCommonPromptInput.value = this.posterCommonPrompt || '';
                }
                if (this.posterImagePromptInput) {
                    this.posterImagePromptInput.value = this.posterImagePrompt;
                }
                if (this.posterTextPromptInput) {
                    this.posterTextPromptInput.value = this.posterTextPrompt;
                }
                if (this.posterWebPromptInput) {
                    this.posterWebPromptInput.value = this.posterWebPrompt;
                }
            } catch (error) {
                console.error('加载设置失败:', error);
            }
        } else {
            // 如果没有保存的设置，使用默认值并更新UI
            if (this.posterCommonPromptInput) {
                this.posterCommonPromptInput.value = this.posterCommonPrompt || '';
            }
            if (this.posterImagePromptInput) {
                this.posterImagePromptInput.value = this.posterImagePrompt;
            }
            if (this.posterTextPromptInput) {
                this.posterTextPromptInput.value = this.posterTextPrompt;
            }
            if (this.posterWebPromptInput) {
                this.posterWebPromptInput.value = this.posterWebPrompt;
            }
        }
        this.syncInstagramPromptInputs();
    }

    clearChat() {
        if (this.currentConversationId) {
            const conversation = this.getConversation(this.currentConversationId);
            if (conversation) {
                conversation.history = [];
                this.saveConversations();
            }
        }
        this.attachedFiles = [];
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="message bot-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>👋 对话已清空，请选择模型后开始新的对话！</p>
                    </div>
                </div>
            </div>
        `;
        this.updateFileAttachments();
        this.showNotification('对话已清空', 'info');
    }

    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.add('show');
        } else {
            this.loadingIndicator.classList.remove('show');
        }
    }

    /**
     * 停止所有正在生成的对话
     */
    stopAllGenerating() {
        let stoppedCount = 0;
        this.conversations.forEach(conv => {
            if (conv.isGenerating) {
                conv.isGenerating = false;
                stoppedCount++;
            }
        });
        
        // 如果当前对话正在生成，也清除UI状态
        const currentConv = this.getCurrentConversation();
        if (currentConv && currentConv.isGenerating) {
            this.showLoading(false);
            this.sendButton.disabled = false;
        }
        
        this.updateConversationsList();
        this.saveConversations();
        
        if (stoppedCount > 0) {
            this.showNotification(`已停止 ${stoppedCount} 个正在生成的对话`, 'success');
        } else {
            this.showNotification('没有正在生成的对话', 'info');
        }
    }

    /**
     * 为特定对话显示/隐藏加载状态
     * @param {string} conversationId - 对话ID
     * @param {boolean} show - 是否显示
     */
    showLoadingForConversation(conversationId, show) {
        // 更新对话对象的生成状态
        const conversation = this.getConversation(conversationId);
        if (conversation) {
            conversation.isGenerating = show;
        }
        
        // 仅在当前对话时显示全局加载指示器和禁用发送按钮
        if (conversationId === this.currentConversationId) {
            this.showLoading(show);
            this.sendButton.disabled = show;
            // 显示/隐藏停止按钮
            if (this.stopButton) {
                this.stopButton.style.display = show ? 'flex' : 'none';
            }
        }
        
        // 更新对话列表中的加载状态
        this.updateConversationsList();
    }

    /**
     * 停止当前对话的生成
     */
    stopCurrentGeneration() {
        const conversation = this.getCurrentConversation();
        if (conversation && conversation.isGenerating) {
            conversation.isGenerating = false;
            this.showLoadingForConversation(conversation.id, false);
            this.showNotification('已停止当前对话的生成', 'info');
            this.saveConversations();
        } else {
            // 如果没有当前对话在生成，停止所有正在生成的对话
            this.stopAllGenerating();
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1002',
            animation: 'fadeInRight 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // 根据类型设置颜色
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        notification.style.background = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'fadeOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 文件上传处理
    async handleFileUpload(files) {
        let successCount = 0;
        let errorCount = 0;
        
        for (let file of files) {
            if (file.size > 10 * 1024 * 1024) { // 10MB 限制
                this.showNotification(`文件 ${file.name} 太大，请选择小于10MB的文件`, 'error');
                errorCount++;
                continue;
            }

            // 检查文件类型
            if (!this.isSupportedFileType(file)) {
                this.showNotification(`不支持的文件类型: ${file.name}`, 'error');
                errorCount++;
                continue;
            }

            try {
                this.showNotification(`正在读取文件: ${file.name}...`, 'info');
                const content = await this.readFileContent(file);
                
                this.attachedFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    content: content
                });
                successCount++;
            } catch (error) {
                console.error(`读取文件 ${file.name} 失败:`, error);
                this.showNotification(`读取文件 ${file.name} 失败: ${error.message}`, 'error');
                errorCount++;
            }
        }
        
        this.updateFileAttachments();
        
        // 保存附件到当前对话
        const conversation = this.getCurrentConversation();
        if (conversation) {
            conversation.attachedFiles = [...this.attachedFiles];
        }
        
        if (successCount > 0) {
            this.showNotification(`成功添加 ${successCount} 个文件${errorCount > 0 ? `，${errorCount} 个文件失败` : ''}`, 'success');
        }
    }

    isSupportedFileType(file) {
        const supportedExtensions = ['.txt', '.md', '.json', '.py', '.js', '.html', '.css', '.csv', '.docx', '.pdf'];
        const supportedMimeTypes = [
            'text/plain',
            'text/markdown',
            'application/json',
            'text/csv',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf'
        ];
        
        return supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext)) ||
               supportedMimeTypes.includes(file.type);
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            // 处理docx文件
            if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                reader.onload = async (e) => {
                    try {
                        // 检查mammoth库是否加载
                        if (typeof mammoth === 'undefined') {
                            reject(new Error('docx文件读取库未加载，请刷新页面重试'));
                            return;
                        }
                        
                        const arrayBuffer = e.target.result;
                        const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
                        
                        // 检查提取的文本是否为空
                        if (!result.value || result.value.trim().length === 0) {
                            reject(new Error('docx文件内容为空或无法提取文本'));
                            return;
                        }
                        
                        // 添加警告信息（如果有）
                        let content = result.value;
                        if (result.messages && result.messages.length > 0) {
                            const warnings = result.messages.filter(msg => msg.type === 'warning');
                            if (warnings.length > 0) {
                                content += `\n\n[注意: 文档解析时发现 ${warnings.length} 个警告]`;
                            }
                        }
                        
                        resolve(content);
                    } catch (error) {
                        console.error('docx文件读取错误:', error);
                        reject(new Error(`读取docx文件失败: ${error.message}`));
                    }
                };
                reader.readAsArrayBuffer(file);
            }
            // 处理PDF文件
            else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
                reader.onload = (e) => {
                    // PDF文件转换为Base64，让AI尝试解析
                    const base64 = e.target.result.split(',')[1];
                    resolve(`[PDF文件: ${file.name}]\n内容: ${base64}\n注意: 这是PDF文件的Base64编码，AI将尝试解析其内容。`);
                };
                reader.readAsDataURL(file);
            }
            // 处理文本文件
            else if (file.type.startsWith('text/') || 
                     file.name.endsWith('.md') || 
                     file.name.endsWith('.json') || 
                     file.name.endsWith('.py') || 
                     file.name.endsWith('.js') || 
                     file.name.endsWith('.html') || 
                     file.name.endsWith('.css') ||
                     file.name.endsWith('.txt') ||
                     file.name.endsWith('.csv')) {
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsText(file, 'UTF-8');
            }
            // 处理其他文件
            else {
                reader.onload = (e) => {
                    const base64 = e.target.result.split(',')[1];
                    resolve(`[文件: ${file.name}]\n类型: ${file.type}\n大小: ${this.formatFileSize(file.size)}\n内容(Base64): ${base64}`);
                };
                reader.readAsDataURL(file);
            }
            
            reader.onerror = (e) => reject(new Error('文件读取失败'));
        });
    }

    updateFileAttachments() {
        // 移除现有的文件附件显示
        const existingAttachments = document.querySelectorAll('.file-attachment');
        existingAttachments.forEach(el => el.remove());

        // 在输入框上方显示附件
        if (this.attachedFiles.length > 0) {
            const inputContainer = document.querySelector('.input-container');
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'attachments-container';
            attachmentsDiv.style.marginBottom = '1rem';

            this.attachedFiles.forEach((file, index) => {
                const attachmentDiv = document.createElement('div');
                attachmentDiv.className = 'file-attachment';
                attachmentDiv.innerHTML = `
                    <i class="fas fa-file"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                    <button class="remove-file" onclick="geminiClient.removeFile(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                attachmentsDiv.appendChild(attachmentDiv);
            });

            inputContainer.insertBefore(attachmentsDiv, inputContainer.firstChild);
        }
    }

    removeFile(index) {
        this.attachedFiles.splice(index, 1);
        // 保存到当前对话
        const conversation = this.getCurrentConversation();
        if (conversation) {
            conversation.attachedFiles = [...this.attachedFiles];
        }
        this.updateFileAttachments();
        this.showNotification('文件已移除', 'info');
    }

    clearAttachedFiles() {
        this.attachedFiles = [];
        this.updateFileAttachments();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 对话管理方法
    /**
     * 创建新对话
     * @param {string} title - 对话标题
     * @param {string} systemPrompt - 系统提示词
     */
    createNewConversation(title = '新对话', systemPrompt = 'You are a helpful assistant. Please answer in Chinese.') {
        const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const conversation = {
            id: id,
            title: title,
            systemPrompt: systemPrompt,
            agentPrompt: '', // Agent的prompt，仅用于"提示词专家"对话
            jovidaTargetAgent: '', // 目标agent信息，仅用于"Jovida提示词专家"对话
            lengthLimit: '', // 长度限制，仅用于"精炼总结助手"对话
            contentPurpose: '', // 内容用途，仅用于"精炼总结助手"对话
            outputFormat: '', // 输出格式，仅用于"精炼总结助手"对话
            patientInfo: '', // 病人已知信息，仅用于"美国注册营养师"对话
            userPersonalInfo: '', // 用户个人信息，仅用于"jovida效果检查助手"对话
            jovidaMode: 'pure-dialog', // 提取模式，仅用于"Jovida后台日志提取助手"对话
            jovidaPromptPure: '', // 纯对话内容模式system prompt
            jovidaPromptFull: '', // 全过程模式system prompt
            virtualUsers: [], // Jovida虚拟用户模拟器选择的虚拟用户
            defaultModel: null, // 对话默认模型
            autoEnableGrounding: false, // 是否自动启用grounding
            tabType: 'text', // 对话类型：text, image, search
            folderId: null, // 所属文件夹ID
            inputContent: '', // 输入框内容
            attachedFiles: [], // 附件列表
            isGenerating: false, // 是否正在生成
            history: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastMessage: ''
        };
        
        this.conversations.push(conversation);
        this.saveConversations();
        this.updateConversationsList();
        this.switchConversation(id);
        
        return id;
    }

    /**
     * 切换对话
     * @param {string} conversationId - 对话ID
     */
    switchConversation(conversationId) {
        const conversation = this.getConversation(conversationId);
        if (!conversation) {
            console.error('对话不存在:', conversationId);
            return;
        }

        // 保存当前对话的system prompt（如果正在编辑）
        if (this.currentConversationId) {
            const currentConv = this.getConversation(this.currentConversationId);
            if (currentConv) {
                currentConv.systemPrompt = this.systemPromptInput.value.trim() || currentConv.systemPrompt;
            }
        }

        // 保存当前对话的输入框内容
        if (this.currentConversationId) {
            const currentConv = this.getConversation(this.currentConversationId);
            if (currentConv) {
                currentConv.inputContent = this.messageInput.value;
                currentConv.attachedFiles = [...this.attachedFiles];
            }
        }

        this.currentConversationId = conversationId;
        
        // 恢复新对话的输入框内容
        if (conversation.inputContent !== undefined) {
            this.messageInput.value = conversation.inputContent || '';
        } else {
            this.messageInput.value = '';
        }
        
        // 恢复附件
        this.attachedFiles = conversation.attachedFiles ? [...conversation.attachedFiles] : [];
        this.updateFileAttachments();
        
        // 更新输入框
        this.autoResizeTextarea();
        this.updateCharCount();
        
        // 根据新对话的生成状态更新UI
        // 如果对话显示正在生成但已经超过30秒，可能是卡住了，自动清除状态
        if (conversation.isGenerating) {
            const now = Date.now();
            const timeSinceUpdate = now - (conversation.updatedAt || now);
            // 如果超过30秒还在生成，可能是卡住了，清除状态
            if (timeSinceUpdate > 30000) {
                conversation.isGenerating = false;
                this.showLoading(false);
                this.sendButton.disabled = false;
                if (this.stopButton) {
                    this.stopButton.style.display = 'none';
                }
                this.showNotification('检测到对话可能已卡住，已自动清除生成状态', 'info');
            } else {
                this.showLoading(true);
                this.sendButton.disabled = true;
                if (this.stopButton) {
                    this.stopButton.style.display = 'flex';
                }
            }
        } else {
            this.showLoading(false);
            this.sendButton.disabled = false;
            if (this.stopButton) {
                this.stopButton.style.display = 'none';
            }
        }
        
        // 更新对话列表中的加载状态显示
        this.updateConversationsList();
        
        // 更新UI
        // 如果是Jovida助手，根据模式使用对应的prompt
        if (conversation.title === 'Jovida后台日志提取助手') {
            const mode = conversation.jovidaMode || 'pure-dialog';
            const prompt = mode === 'pure-dialog' 
                ? (conversation.jovidaPromptPure || conversation.systemPrompt || '')
                : (conversation.jovidaPromptFull || conversation.systemPrompt || '');
            this.systemPromptInput.value = prompt;
        } else {
            this.systemPromptInput.value = conversation.systemPrompt;
        }
        
        // 如果是"提示词专家"对话，显示agent prompt输入框
        if (conversation.title === '提示词专家') {
            this.agentPromptGroup.style.display = 'block';
            this.agentPromptInput.value = conversation.agentPrompt || '';
        } else {
            this.agentPromptGroup.style.display = 'none';
        }
        
        // 如果是"Jovida提示词专家"对话，显示目标agent输入框
        if (conversation.title === 'Jovida提示词专家') {
            this.jovidaPromptExpertGroup.style.display = 'block';
            this.jovidaTargetAgentInput.value = conversation.jovidaTargetAgent || '';
        } else {
            this.jovidaPromptExpertGroup.style.display = 'none';
        }
        
        // 如果是"精炼总结助手"对话，显示长度限制和内容用途输入框
        if (conversation.title === '精炼总结助手') {
            this.summaryAssistantGroup.style.display = 'block';
            this.lengthLimitInput.value = conversation.lengthLimit || '';
            this.contentPurposeInput.value = conversation.contentPurpose || '';
            this.outputFormatSelect.value = conversation.outputFormat || '';
        } else {
            this.summaryAssistantGroup.style.display = 'none';
        }
        
        // 如果是"美国注册营养师"对话，显示病人信息输入框
        if (conversation.title === '美国注册营养师') {
            this.nutritionistGroup.style.display = 'block';
            this.patientInfoInput.value = conversation.patientInfo || '';
        } else {
            this.nutritionistGroup.style.display = 'none';
        }
        
        // 如果是"jovida效果检查助手"对话，显示用户个人信息输入框
        if (conversation.title === 'jovida效果检查助手') {
            this.jovidaEffectCheckerGroup.style.display = 'block';
            this.userPersonalInfoInput.value = conversation.userPersonalInfo || '';
        } else {
            this.jovidaEffectCheckerGroup.style.display = 'none';
        }
        
        // 如果是"Jovida后台日志提取助手"对话，显示模式选择和prompt输入框
        if (conversation.title === 'Jovida后台日志提取助手') {
            this.jovidaAssistantGroup.style.display = 'block';
            this.jovidaModeSelect.value = conversation.jovidaMode || 'pure-dialog';
            this.jovidaPromptPureInput.value = conversation.jovidaPromptPure || '';
            this.jovidaPromptFullInput.value = conversation.jovidaPromptFull || '';
            // 根据模式更新显示的system prompt
            this.updateJovidaSystemPromptDisplay(conversation);
        } else {
            this.jovidaAssistantGroup.style.display = 'none';
        }

        if (conversation.title === 'Jovida虚拟用户模拟器') {
            this.jovidaVirtualUserGroup.style.display = 'block';
            this.syncVirtualUserSelect(conversation);
        } else if (this.jovidaVirtualUserGroup) {
            this.jovidaVirtualUserGroup.style.display = 'none';
        }
        
        // 如果对话有默认模型，自动选中
        if (conversation.defaultModel && this.modelSelect) {
            this.modelSelect.value = conversation.defaultModel;
            this.currentModel = conversation.defaultModel;
        }
        
        // 注意：updateConversationsList已经在上面调用过了，这里不需要再调用
        this.displayConversationHistory(conversation);
        
        // 根据当前对话是否为图生图会话，控制简单图生图面板显示
        if (this.imageEditPanel) {
            if (conversation && conversation.tabType === 'image' && conversation.isImageEdit) {
                this.imageEditPanel.style.display = 'block';
            } else {
                this.imageEditPanel.style.display = 'none';
            }
        }
    }

    /**
     * 获取对话
     * @param {string} conversationId - 对话ID
     * @returns {Object|null} 对话对象
     */
    getConversation(conversationId) {
        return this.conversations.find(c => c.id === conversationId) || null;
    }

    /**
     * 获取当前对话
     * @returns {Object|null} 当前对话对象
     */
    getCurrentConversation() {
        if (!this.currentConversationId) return null;
        return this.getConversation(this.currentConversationId);
    }

    /**
     * 删除对话
     * @param {string} conversationId - 对话ID
     */
    deleteConversation(conversationId) {
        if (this.conversations.length <= 1) {
            this.showNotification('至少需要保留一个对话', 'warning');
            return;
        }

        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        this.saveConversations();
        
        // 如果删除的是当前对话，切换到第一个对话
        if (this.currentConversationId === conversationId) {
            if (this.conversations.length > 0) {
                this.switchConversation(this.conversations[0].id);
            }
        } else {
            this.updateConversationsList();
        }
        
        this.showNotification('对话已删除', 'info');
    }

    /**
     * 重命名对话
     * @param {string} conversationId - 对话ID
     * @param {string} newTitle - 新标题
     */
    renameConversation(conversationId, newTitle) {
        const conversation = this.getConversation(conversationId);
        if (conversation) {
            conversation.title = newTitle.trim() || '新对话';
            conversation.updatedAt = Date.now();
            this.saveConversations();
            this.updateConversationsList();
        }
    }

    /**
     * 创建文件夹
     * @param {string} name - 文件夹名称
     */
    createFolder(name = '新文件夹') {
        const id = 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const folder = {
            id: id,
            name: name,
            expanded: true,
            createdAt: Date.now()
        };
        
        this.folders.push(folder);
        this.saveFolders();
        this.updateConversationsList();
        return id;
    }

    /**
     * 删除文件夹
     * @param {string} folderId - 文件夹ID
     */
    deleteFolder(folderId) {
        // 将文件夹内的对话移到根目录
        this.conversations.forEach(conv => {
            if (conv.folderId === folderId) {
                conv.folderId = null;
            }
        });
        
        this.folders = this.folders.filter(f => f.id !== folderId);
        this.saveFolders();
        this.saveConversations();
        this.updateConversationsList();
        this.showNotification('文件夹已删除', 'info');
    }

    /**
     * 切换文件夹展开/折叠
     * @param {string} folderId - 文件夹ID
     */
    toggleFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
            folder.expanded = !folder.expanded;
            this.saveFolders();
            this.updateConversationsList();
        }
    }

    /**
     * 将对话移动到文件夹
     * @param {string} conversationId - 对话ID
     * @param {string|null} folderId - 目标文件夹ID，null表示移到根目录
     */
    moveConversationToFolder(conversationId, folderId) {
        const conversation = this.getConversation(conversationId);
        if (conversation) {
            conversation.folderId = folderId;
            this.saveConversations();
            this.updateConversationsList();
        }
    }

    /**
     * 显示新建文件夹对话框
     */
    showNewFolderDialog() {
        const name = prompt('请输入文件夹名称:', '新文件夹');
        if (!name) return;
        
        this.createFolder(name.trim() || '新文件夹');
        this.showNotification('文件夹已创建', 'success');
    }

    /**
     * 切换视图
     * @param {string} view - 视图：chat, tasks
     */
    switchView(view) {
        this.currentView = view;
        
        // 更新Tab样式
        if (this.headerTabChat && this.headerTabTasks) {
            this.headerTabChat.classList.toggle('active', view === 'chat');
            this.headerTabTasks.classList.toggle('active', view === 'tasks');
        }
        
        // 显示/隐藏视图
        if (this.viewChat && this.viewTasks) {
            if (view === 'chat') {
                this.viewChat.style.display = 'flex';
                this.viewTasks.style.display = 'none';
            } else {
                this.viewChat.style.display = 'none';
                this.viewTasks.style.display = 'flex';
            }
        }
        
        // 显示/隐藏header内容
        if (this.headerContentChat) {
            this.headerContentChat.style.display = view === 'chat' ? 'flex' : 'none';
        }
        
        // 如果是任务视图，更新任务列表
        if (view === 'tasks') {
            this.updateTasksList();
        }
        
        if (view === 'chat' && this.hasRunningInstagramJobs()) {
            const now = Date.now();
            if (now - this.lastBackgroundNoticeAt > 4000) {
                this.showNotification('Instagram 复杂任务正在后台运行，可稍后在任务面板查看。', 'info');
                this.lastBackgroundNoticeAt = now;
            }
        }
    }

    /**
     * 切换模式Tab
     * @param {string} mode - 模式：text, image, search
     */
    switchMode(mode) {
        this.currentMode = mode;
        
        // 更新Tab样式
        [this.tabText, this.tabImage, this.tabSearch].forEach(tab => {
            if (tab) {
                tab.classList.remove('active');
            }
        });
        
        if (mode === 'text' && this.tabText) {
            this.tabText.classList.add('active');
        } else if (mode === 'image' && this.tabImage) {
            this.tabImage.classList.add('active');
        } else if (mode === 'search' && this.tabSearch) {
            this.tabSearch.classList.add('active');
        }
        
        // 更新对话列表
        this.updateConversationsList();
    }

    /**
     * 根据当前模式创建新对话
     */
    createNewConversationByMode() {
        if (this.currentMode === 'text') {
            const title = prompt('请输入对话名称:', '新对话');
            if (!title) return;
            const systemPrompt = prompt('请输入系统提示词（可选，留空使用默认）:', 'You are a helpful assistant. Please answer in Chinese.');
            const conversationId = this.createNewConversation(title.trim() || '新对话', systemPrompt.trim() || 'You are a helpful assistant. Please answer in Chinese.');
            const conversation = this.getConversation(conversationId);
            if (conversation) {
                conversation.tabType = 'text';
                this.saveConversations();
            }
            this.showNotification('对话已创建', 'success');
        } else if (this.currentMode === 'image') {
            // 图像创作：让用户选择 文生图 or 图生图
            const choice = prompt('请选择图像创作类型：输入 1 = 文生图（从文字生成新图），输入 2 = 图生图（基于参考图编辑）', '1');
            if (!choice) return;
            const trimmed = choice.trim();
            if (trimmed === '2') {
                // 图生图对话
                const systemPrompt = 'You are an AI image editing assistant. You modify existing images based on user instructions. Please respond in Chinese.';
                const conversationId = this.createNewConversation('图生图', systemPrompt);
                const conversation = this.getConversation(conversationId);
                if (conversation) {
                    conversation.tabType = 'image';
                    conversation.defaultModel = 'gemini-3-pro-image-preview';
                    conversation.isImageEdit = true; // 标记为图生图会话
                    this.saveConversations();
                }
                this.switchConversation(conversationId);
                this.showNotification('图生图对话已创建', 'success');
            } else {
                // 默认：文生图对话（沿用之前逻辑）
                const systemPrompt = 'You are an AI image generation assistant. Generate images based on user descriptions. Please respond in Chinese.';
                const conversationId = this.createNewConversation('图像创作', systemPrompt);
                const conversation = this.getConversation(conversationId);
                if (conversation) {
                    conversation.tabType = 'image';
                    conversation.defaultModel = 'gemini-3-pro-image-preview';
                    this.saveConversations();
                }
                this.switchConversation(conversationId);
                this.showNotification('图像创作对话已创建', 'success');
            }
        } else if (this.currentMode === 'search') {
            const systemPrompt = 'You are a helpful assistant with access to Google Search. Use search to provide accurate and up-to-date information. Please respond in Chinese.';
            const conversationId = this.createNewConversation('联网搜索', systemPrompt);
            const conversation = this.getConversation(conversationId);
            if (conversation) {
                conversation.tabType = 'search';
                conversation.autoEnableGrounding = true;
                conversation.defaultModel = 'gemini-3-pro-preview';
                this.saveConversations();
            }
            this.switchConversation(conversationId);
            this.showNotification('联网搜索对话已创建', 'success');
        }
    }

    /**
     * 更新对话列表UI
     */
    updateConversationsList() {
        this.conversationsList.innerHTML = '';
        
        // 根据当前模式过滤对话
        const filteredConversations = this.conversations.filter(c => {
            // 如果没有tabType，默认为text（兼容旧数据）
            const tabType = c.tabType || 'text';
            return tabType === this.currentMode;
        });
        
        // 获取根目录的对话（没有folderId的）
        const rootConversations = filteredConversations.filter(c => !c.folderId);
        const sortedRootConversations = [...rootConversations].sort((a, b) => b.updatedAt - a.updatedAt);
        
        // 渲染根目录对话
        sortedRootConversations.forEach(conversation => {
            this.renderConversationItem(conversation, null);
        });
        
        // 渲染文件夹及其内容
        const sortedFolders = [...this.folders].sort((a, b) => a.name.localeCompare(b.name));
        sortedFolders.forEach(folder => {
            this.renderFolderItem(folder);
        });
        
    }

    /**
     * 渲染文件夹项
     * @param {Object} folder - 文件夹对象
     */
    renderFolderItem(folder) {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item';
        folderDiv.dataset.folderId = folder.id;
        
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.innerHTML = `
            <button class="folder-toggle" data-folder-id="${folder.id}">
                <i class="fas fa-chevron-${folder.expanded ? 'down' : 'right'}"></i>
            </button>
            <i class="fas fa-folder${folder.expanded ? '-open' : ''}"></i>
            <span class="folder-name">${this.escapeHtml(folder.name)}</span>
            <div class="folder-actions">
                <button class="folder-action-btn" data-action="delete-folder" data-folder-id="${folder.id}" title="删除文件夹">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // 文件夹展开/折叠
        folderHeader.querySelector('.folder-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFolder(folder.id);
        });
        
        // 删除文件夹
        folderHeader.querySelector('[data-action="delete-folder"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`确定要删除文件夹"${folder.name}"吗？文件夹内的对话将移到根目录。`)) {
                this.deleteFolder(folder.id);
            }
        });
        
        folderDiv.appendChild(folderHeader);
        
        // 文件夹内容
        const folderContent = document.createElement('div');
        folderContent.className = `folder-content ${folder.expanded ? 'expanded' : ''}`;
        
        // 获取该文件夹内的对话（根据当前模式过滤）
        const folderConversations = this.conversations
            .filter(c => {
                if (c.folderId !== folder.id) return false;
                const tabType = c.tabType || 'text';
                return tabType === this.currentMode;
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);
        
        if (folderConversations.length === 0) {
            folderContent.innerHTML = '<div class="folder-empty">文件夹为空，拖拽对话到这里</div>';
        } else {
            folderConversations.forEach(conversation => {
                this.renderConversationItem(conversation, folder.id, folderContent);
            });
        }
        
        folderDiv.appendChild(folderContent);
        
        // 文件夹拖拽功能
        folderHeader.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            folderHeader.classList.add('folder-drag-over');
        });
        
        folderHeader.addEventListener('dragleave', () => {
            folderHeader.classList.remove('folder-drag-over');
        });
        
        folderHeader.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            folderHeader.classList.remove('folder-drag-over');
            
            if (this.draggedElement) {
                const conversationId = this.draggedElement.dataset.conversationId;
                this.moveConversationToFolder(conversationId, folder.id);
            }
        });
        
        // 文件夹内容区域也可以接收拖拽
        folderContent.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (folder.expanded) {
                folderContent.classList.add('drag-over');
            }
        });
        
        folderContent.addEventListener('dragleave', () => {
            folderContent.classList.remove('drag-over');
        });
        
        folderContent.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            folderContent.classList.remove('drag-over');
            
            if (this.draggedElement) {
                const conversationId = this.draggedElement.dataset.conversationId;
                this.moveConversationToFolder(conversationId, folder.id);
            }
        });
        
        this.conversationsList.appendChild(folderDiv);
    }

    /**
     * 渲染对话项
     * @param {Object} conversation - 对话对象
     * @param {string|null} parentFolderId - 父文件夹ID
     * @param {HTMLElement} container - 容器元素，如果为null则添加到根列表
     */
    renderConversationItem(conversation, parentFolderId = null, container = null) {
        const item = document.createElement('div');
        item.className = `conversation-item ${conversation.id === this.currentConversationId ? 'active' : ''} ${parentFolderId ? 'in-folder' : ''} ${conversation.isGenerating ? 'generating' : ''}`;
        item.dataset.conversationId = conversation.id;
        item.draggable = true;
        
        const generatingIndicator = conversation.isGenerating ? '<i class="fas fa-spinner fa-spin generating-indicator"></i>' : '';
        item.innerHTML = `
                <div class="conversation-item-content">
                    <div class="conversation-item-title">
                        ${this.escapeHtml(conversation.title)}
                        ${generatingIndicator}
                    </div>
                    <div class="conversation-item-preview">${this.escapeHtml(conversation.lastMessage || '暂无消息')}</div>
                </div>
                <input type="text" class="conversation-item-edit" value="${this.escapeHtml(conversation.title)}">
                <div class="conversation-item-actions">
                    <button class="conversation-action-btn" data-action="edit" title="重命名">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="conversation-action-btn" data-action="delete" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // 点击切换对话
            item.querySelector('.conversation-item-content').addEventListener('click', (e) => {
                if (!item.classList.contains('editing')) {
                    this.switchConversation(conversation.id);
                    // 移动端自动收起侧边栏
                    if (window.innerWidth <= 768) {
                        this.toggleSidebar();
                    }
                }
            });
            
            // 编辑按钮
            const editBtn = item.querySelector('[data-action="edit"]');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startEditingConversation(item, conversation);
            });
            
            // 删除按钮
            const deleteBtn = item.querySelector('[data-action="delete"]');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除对话"${conversation.title}"吗？`)) {
                    this.deleteConversation(conversation.id);
                }
            });
            
        // 编辑输入框
        const editInput = item.querySelector('.conversation-item-edit');
        editInput.addEventListener('blur', () => {
            this.finishEditingConversation(item, conversation);
        });
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                editInput.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                editInput.value = conversation.title;
                editInput.blur();
            }
        });
        
        // 拖拽功能
        item.addEventListener('dragstart', (e) => {
            this.draggedElement = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', conversation.id);
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            this.draggedElement = null;
            // 移除所有拖拽相关的样式
            document.querySelectorAll('.drag-over, .folder-drag-over').forEach(el => {
                el.classList.remove('drag-over', 'folder-drag-over');
            });
        });
        
        // 添加到容器或根列表
        if (container) {
            container.appendChild(item);
        } else {
            this.conversationsList.appendChild(item);
        }
    }

    /**
     * 开始编辑对话标题
     * @param {HTMLElement} item - 对话项元素
     * @param {Object} conversation - 对话对象
     */
    startEditingConversation(item, conversation) {
        item.classList.add('editing');
        const editInput = item.querySelector('.conversation-item-edit');
        editInput.focus();
        editInput.select();
    }

    /**
     * 完成编辑对话标题
     * @param {HTMLElement} item - 对话项元素
     * @param {Object} conversation - 对话对象
     */
    finishEditingConversation(item, conversation) {
        const editInput = item.querySelector('.conversation-item-edit');
        const newTitle = editInput.value.trim();
        if (newTitle && newTitle !== conversation.title) {
            this.renameConversation(conversation.id, newTitle);
        }
        item.classList.remove('editing');
    }

    /**
     * 显示新建对话对话框
     */
    showNewConversationDialog() {
        const title = prompt('请输入对话名称:', '新对话');
        if (!title) return;
        
        const systemPrompt = prompt('请输入系统提示词（可选，留空使用默认）:', 'You are a helpful assistant. Please answer in Chinese.');
        this.createNewConversation(title.trim() || '新对话', systemPrompt.trim() || 'You are a helpful assistant. Please answer in Chinese.');
        this.showNotification('对话已创建', 'success');
    }


    /**
     * 切换侧边栏显示/隐藏
     */
    toggleSidebar() {
        this.conversationsSidebar.classList.toggle('collapsed');
    }

    /**
     * 显示侧边栏
     */
    showSidebar() {
        this.conversationsSidebar.classList.remove('collapsed');
    }

    /**
     * 安全保存到 localStorage（带自动清理和错误处理）
     * @param {string} key - localStorage 键名
     * @param {any} data - 要保存的数据
     * @param {Function} cleanupFn - 清理函数（可选），如果保存失败会调用此函数进行清理
     * @returns {boolean} 是否保存成功
     */
    safeSetItem(key, data, cleanupFn = null) {
        try {
            const dataStr = JSON.stringify(data);
            const dataSize = new Blob([dataStr]).size;
            const dataSizeMB = dataSize / 1024 / 1024;
            
            // 如果数据超过3MB，警告
            if (dataSizeMB > 3) {
                console.warn(`数据 ${key} 过大 (${dataSizeMB.toFixed(2)}MB)，建议清理`);
            }
            
            localStorage.setItem(key, dataStr);
            return true;
            
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.message.includes('quota') || error.message.includes('exceeded')) {
                console.error(`存储配额超限 (${key})，尝试清理...`);
                
                // 如果有清理函数，调用它
                if (cleanupFn && typeof cleanupFn === 'function') {
                    try {
                        const cleanedData = cleanupFn();
                        localStorage.setItem(key, JSON.stringify(cleanedData));
                        console.log(`清理后成功保存 ${key}`);
                        return true;
                    } catch (retryError) {
                        console.error(`清理后仍然无法保存 ${key}:`, retryError);
                        return false;
                    }
                } else {
                    // 没有清理函数，尝试通用清理
                    this.emergencyCleanup();
                    try {
                        localStorage.setItem(key, JSON.stringify(data));
                        return true;
                    } catch (finalError) {
                        console.error(`紧急清理后仍然无法保存 ${key}:`, finalError);
                        return false;
                    }
                }
            } else {
                console.error(`保存 ${key} 失败:`, error);
                return false;
            }
        }
    }

    /**
     * 紧急清理存储空间
     */
    emergencyCleanup() {
        try {
            // 清理对话（只保留最近10个）
            const savedConversations = localStorage.getItem('gemini-conversations');
            if (savedConversations) {
                try {
                    const conversations = JSON.parse(savedConversations);
                    if (conversations.length > 10) {
                        const cleaned = conversations
                            .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                            .slice(0, 10)
                            .map(conv => {
                                let history = (conv.history || []).slice(-5); // 只保留最近5条
                                history = history.map(msg => {
                                    if (msg.content && msg.content.length > 1000) {
                                        return { ...msg, content: msg.content.substring(0, 1000) + '... [已截断]' };
                                    }
                                    return msg;
                                });
                                return { ...conv, history };
                            });
                        this.safeSetItem('gemini-conversations', cleaned);
                        console.log('紧急清理：对话从', conversations.length, '减少到', cleaned.length);
                    }
                } catch (e) {
                    console.warn('紧急清理对话失败:', e);
                }
            }
            
            // 清理任务（只保留最近5个）
            const savedTasks = localStorage.getItem('gemini-tasks');
            if (savedTasks) {
                try {
                    const tasks = JSON.parse(savedTasks);
                    if (tasks.length > 5) {
                        const cleaned = tasks
                            .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                            .slice(0, 5);
                        this.safeSetItem('gemini-tasks', cleaned);
                        console.log('紧急清理：任务从', tasks.length, '减少到', cleaned.length);
                    }
                } catch (e) {
                    console.warn('紧急清理任务失败:', e);
                }
            }
        } catch (error) {
            console.error('紧急清理失败:', error);
        }
    }

    /**
     * 保存所有对话到本地存储（带自动清理和错误处理）
     */
    saveConversations() {
        try {
        // 过滤掉临时对话（不保存）
        let conversationsToSave = this.conversations.filter(c => !c.isTemporary);
        
            // 更激进的清理策略：只保留最近50个对话（从100减少到50）
            if (conversationsToSave.length > 50) {
            conversationsToSave = conversationsToSave
                .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                    .slice(0, 50);
                console.log('对话数量超过50，已清理旧对话，保留最近50个');
                // 更新内存中的对话列表
                this.conversations = this.conversations.filter(c => 
                    c.isTemporary || conversationsToSave.some(saved => saved.id === c.id)
                );
            }
            
            // 对于每个对话，限制历史消息数量（从50减少到30条，并限制每条消息长度）
        conversationsToSave = conversationsToSave.map(conv => {
                let history = conv.history || [];
                
                // 限制历史消息数量（只保留最近30条）
                if (history.length > 30) {
                    history = history.slice(-30);
                }
                
                // 限制每条消息的长度（最多5000字符，避免单条消息过大）
                history = history.map(msg => {
                    if (msg.content && msg.content.length > 5000) {
                        return {
                            ...msg,
                            content: msg.content.substring(0, 5000) + '... [内容过长已截断]'
                        };
                    }
                    return msg;
                });
                
                return {
                    ...conv,
                    history: history
                };
            });
            
            // 尝试保存，如果失败则进一步清理
            const dataToSave = JSON.stringify(conversationsToSave);
            const dataSize = new Blob([dataToSave]).size;
            const dataSizeMB = dataSize / 1024 / 1024;
            
            // 如果数据超过2MB，先进行更激进的清理
            if (dataSizeMB > 2) {
                console.warn(`对话数据过大 (${dataSizeMB.toFixed(2)}MB)，进行更激进的清理...`);
                
                // 只保留最近30个对话
                conversationsToSave = conversationsToSave
                    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                    .slice(0, 30);
                
                // 每个对话只保留最近20条消息
                conversationsToSave = conversationsToSave.map(conv => {
                    let history = (conv.history || []).slice(-20);
                    // 进一步限制消息长度（最多3000字符）
                    history = history.map(msg => {
                        if (msg.content && msg.content.length > 3000) {
                            return {
                                ...msg,
                                content: msg.content.substring(0, 3000) + '... [内容过长已截断]'
                            };
                        }
                        return msg;
                    });
                    return { ...conv, history };
                });
                
                // 更新内存中的对话列表
                this.conversations = this.conversations.filter(c => 
                    c.isTemporary || conversationsToSave.some(saved => saved.id === c.id)
                );
            }
            
            // 尝试保存（使用安全保存函数）
            if (!this.safeSetItem('gemini-conversations', conversationsToSave, () => {
                // 清理函数：如果保存失败，返回更少的数据
                return conversationsToSave
                    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                    .slice(0, 20)
                    .map(conv => {
                        let history = (conv.history || []).slice(-10);
                        history = history.map(msg => {
                            if (msg.content && msg.content.length > 2000) {
                                return { ...msg, content: msg.content.substring(0, 2000) + '... [已截断]' };
                            }
                            return msg;
                        });
                        return { ...conv, history };
                    });
            })) {
                // 如果安全保存失败，说明存储空间严重不足
                this.showNotification(
                    '存储空间严重不足，请手动清理：设置 → 释放空间（保留对话）',
                    'error'
                );
            }
            
        } catch (error) {
            // 如果保存失败（通常是配额超限），进行紧急清理
            if (error.name === 'QuotaExceededError' || error.message.includes('quota') || error.message.includes('exceeded')) {
                console.error('存储配额超限，执行紧急清理...');
                
                try {
                    // 紧急清理：只保留最近20个对话，每个对话只保留最近10条消息
                    let conversationsToSave = this.conversations
                        .filter(c => !c.isTemporary)
                        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                        .slice(0, 20)
                        .map(conv => {
                            let history = (conv.history || []).slice(-10);
                            // 限制消息长度（最多2000字符）
                            history = history.map(msg => {
                                if (msg.content && msg.content.length > 2000) {
                                    return {
                                        ...msg,
                                        content: msg.content.substring(0, 2000) + '... [内容过长已截断]'
                                    };
                                }
                                return msg;
                            });
                            return { ...conv, history };
                        });
                    
                    // 更新内存中的对话列表
                    this.conversations = this.conversations.filter(c => 
                        c.isTemporary || conversationsToSave.some(saved => saved.id === c.id)
                    );
                    
                    // 再次尝试保存（使用安全保存函数）
                    if (!this.safeSetItem('gemini-conversations', conversationsToSave)) {
                        throw new Error('清理后仍然无法保存');
                    }
                    
                    this.showNotification(
                        '存储空间不足，已自动清理旧对话（保留最近20个对话，每个对话保留最近10条消息）',
                        'warning'
                    );
                    
                } catch (retryError) {
                    console.error('紧急清理后仍然无法保存:', retryError);
                    this.showNotification(
                        '存储空间严重不足，请手动清理：设置 → 释放空间（保留对话）或 危险操作：清空所有数据',
                        'error'
                    );
                }
            } else {
                // 其他错误
                console.error('保存对话失败:', error);
                this.showNotification('保存对话失败: ' + error.message, 'error');
            }
        }
    }

    /**
     * 保存所有文件夹到本地存储（带错误处理）
     */
    saveFolders() {
        this.safeSetItem('gemini-folders', this.folders);
    }

    /**
     * 从本地存储加载所有对话
     */
    loadConversations() {
        const saved = localStorage.getItem('gemini-conversations');
        if (saved) {
            try {
                this.conversations = JSON.parse(saved);
                // 确保所有对话都有必要字段（兼容旧数据）
                this.conversations.forEach(conv => {
                    if (conv.folderId === undefined) {
                        conv.folderId = null;
                    }
                    // 迁移tabType：旧对话默认为text
                    if (!conv.tabType) {
                        // 根据标题判断类型
                        if (conv.title === 'AI生图' || conv.title === '图像创作') {
                            conv.tabType = 'image';
                        } else if (conv.title === 'Gemini 3 Pro + Search' || conv.title === '联网搜索') {
                            conv.tabType = 'search';
                        } else {
                            conv.tabType = 'text';
                        }
                    }
                    if (!Array.isArray(conv.virtualUsers)) {
                        conv.virtualUsers = [];
                    }
                    // 初始化输入内容和附件（兼容旧数据）
                    if (conv.inputContent === undefined) {
                        conv.inputContent = '';
                    }
                    if (!Array.isArray(conv.attachedFiles)) {
                        conv.attachedFiles = [];
                    }
                    if (conv.isGenerating === undefined) {
                        conv.isGenerating = false;
                    }
                    // 如果对话显示正在生成但已经超过30秒，清除卡住的状态
                    if (conv.isGenerating) {
                        const now = Date.now();
                        const timeSinceUpdate = now - (conv.updatedAt || now);
                        if (timeSinceUpdate > 30000) {
                            conv.isGenerating = false;
                        }
                    }
                });
            } catch (error) {
                console.error('加载对话列表失败:', error);
                this.conversations = [];
            }
        }
        
        // 加载文件夹
        const savedFolders = localStorage.getItem('gemini-folders');
        if (savedFolders) {
            try {
                this.folders = JSON.parse(savedFolders);
            } catch (error) {
                console.error('加载文件夹列表失败:', error);
                this.folders = [];
            }
        }
        
        this.updateConversationsList();
    }

    /**
     * 迁移旧版本数据到新格式
     */
    migrateOldData() {
        // 检查是否已经迁移过（通过检查localStorage中的标记）
        const migrationFlag = localStorage.getItem('gemini-migration-completed');
        if (migrationFlag === 'true') {
            return; // 已经迁移过，不再重复迁移
        }
        
        // 检查是否有旧的对话历史
        const oldConversation = localStorage.getItem('gemini-conversation');
        const oldSettings = localStorage.getItem('gemini-settings');
        
        let oldHistory = [];
        let oldSystemPrompt = 'You are a helpful assistant. Please answer in Chinese.';
        
        // 读取旧的对话历史
        if (oldConversation) {
            try {
                const data = JSON.parse(oldConversation);
                oldHistory = data.conversationHistory || [];
            } catch (error) {
                console.error('读取旧对话历史失败:', error);
            }
        }
        
        // 读取旧的system prompt
        if (oldSettings) {
            try {
                const settings = JSON.parse(oldSettings);
                if (settings.systemPrompt) {
                    oldSystemPrompt = settings.systemPrompt;
                }
            } catch (error) {
                console.error('读取旧设置失败:', error);
            }
        }
        
        // 如果有旧数据，创建"文案助手"对话并迁移数据
        if (oldHistory.length > 0 || oldSystemPrompt !== 'You are a helpful assistant. Please answer in Chinese.') {
            // 检查是否已经存在"文案助手"对话
            const existingWenAn = this.conversations.find(c => c.title === '文案助手');
            if (!existingWenAn) {
                const conversationId = this.createNewConversation('文案助手', oldSystemPrompt);
                const conversation = this.getConversation(conversationId);
                if (conversation && oldHistory.length > 0) {
                    conversation.history = oldHistory;
                    conversation.lastMessage = oldHistory.length > 0 ? 
                        (oldHistory[oldHistory.length - 1].content || '').substring(0, 50) : '';
                    this.saveConversations();
                    this.updateConversationsList();
                }
            }
            
            // 标记迁移已完成
            this.safeSetItem('gemini-migration-completed', 'true');
            
            // 清理旧数据（可选，保留注释以便调试）
            // localStorage.removeItem('gemini-conversation');
            
            console.log('已迁移旧数据到"文案助手"对话');
        } else {
            // 即使没有旧数据，也标记迁移已完成，避免重复检查
            this.safeSetItem('gemini-migration-completed', 'true');
        }
    }

    /**
     * 显示对话历史
     * @param {Object} conversation - 对话对象
     */
    displayConversationHistory(conversation) {
        // 清空当前显示
        this.chatMessages.innerHTML = '';
        
        if (!conversation || !conversation.history || conversation.history.length === 0) {
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="message bot-message">
                        <div class="message-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">
                            <p>👋 您好！我是Gemini AI助手，请选择模型后开始对话吧！</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // 显示历史对话
        conversation.history.forEach(message => {
            // 检查是否为图片消息
            if (message.imageData && message.mimeType) {
                this.addImageMessage(message.imageData, message.mimeType);
            } else {
                this.addMessage(message.content, message.role === 'user' ? 'user' : 'bot', false);
            }
        });
    }

    /**
     * HTML转义
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 在显示时屏蔽超长的base64内容，避免页面卡顿
     * @param {string} text
     * @returns {string}
     */
    maskBase64Blobs(text) {
        if (!text) return '';
        return text.replace(/data:([a-z0-9.+/-]+);base64,([a-z0-9+/=\r\n]+)/gi, (match, mime = 'binary', data = '') => {
            const length = data.replace(/\s+/g, '').length;
            return `data:${mime};base64,[BASE64_${length}_CHARS_REMOVED]`;
        });
    }

    // 系统提示词自动保存
    autoSaveSystemPrompt() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation) {
            // 如果是Jovida助手，根据模式保存到对应的prompt字段
            if (conversation.title === 'Jovida后台日志提取助手') {
                const mode = conversation.jovidaMode || 'pure-dialog';
                const promptValue = this.systemPromptInput.value.trim();
                if (mode === 'pure-dialog') {
                    conversation.jovidaPromptPure = promptValue;
                } else {
                    conversation.jovidaPromptFull = promptValue;
                }
                conversation.systemPrompt = promptValue;
            } else {
                conversation.systemPrompt = this.systemPromptInput.value.trim() || 'You are a helpful assistant. Please answer in Chinese.';
            }
            
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    // Agent prompt自动保存
    autoSaveAgentPrompt() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation && conversation.title === '提示词专家') {
            conversation.agentPrompt = this.agentPromptInput.value.trim() || '';
            
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveAgentPromptTimeout);
            this.autoSaveAgentPromptTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    // Jovida提示词专家参数自动保存
    autoSaveJovidaPromptExpertParams() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation && conversation.title === 'Jovida提示词专家') {
            conversation.jovidaTargetAgent = this.jovidaTargetAgentInput.value.trim() || '';
            
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveJovidaPromptExpertTimeout);
            this.autoSaveJovidaPromptExpertTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    // 精炼总结助手参数自动保存
    autoSaveSummaryAssistantParams() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation && conversation.title === '精炼总结助手') {
            conversation.lengthLimit = this.lengthLimitInput.value.trim() || '';
            conversation.contentPurpose = this.contentPurposeInput.value.trim() || '';
            conversation.outputFormat = this.outputFormatSelect.value || '';
            
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveSummaryAssistantTimeout);
            this.autoSaveSummaryAssistantTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    // 营养师病人信息自动保存
    autoSaveNutritionistParams() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation && conversation.title === '美国注册营养师') {
            conversation.patientInfo = this.patientInfoInput.value.trim() || '';
            
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveNutritionistTimeout);
            this.autoSaveNutritionistTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    // jovida效果检查助手用户信息自动保存
    autoSaveJovidaEffectCheckerParams() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation && conversation.title === 'jovida效果检查助手') {
            conversation.userPersonalInfo = this.userPersonalInfoInput.value.trim() || '';
            
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveJovidaEffectCheckerTimeout);
            this.autoSaveJovidaEffectCheckerTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    // Jovida助手参数自动保存
    autoSaveJovidaParams() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation && conversation.title === 'Jovida后台日志提取助手') {
            conversation.jovidaMode = this.jovidaModeSelect.value || 'pure-dialog';
            conversation.jovidaPromptPure = this.jovidaPromptPureInput.value.trim() || '';
            conversation.jovidaPromptFull = this.jovidaPromptFullInput.value.trim() || '';
            
            // 根据模式更新system prompt
            conversation.systemPrompt = conversation.jovidaMode === 'pure-dialog' 
                ? conversation.jovidaPromptPure 
                : conversation.jovidaPromptFull;
            
            // 更新显示的system prompt
            this.updateJovidaSystemPromptDisplay(conversation);
            
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveJovidaTimeout);
            this.autoSaveJovidaTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    /**
     * 更新Jovida助手的system prompt显示
     * @param {Object} conversation - 对话对象
     */
    updateJovidaSystemPromptDisplay(conversation) {
        if (conversation.title === 'Jovida后台日志提取助手') {
            const mode = conversation.jovidaMode || 'pure-dialog';
            const prompt = mode === 'pure-dialog' 
                ? conversation.jovidaPromptPure 
                : conversation.jovidaPromptFull;
            this.systemPromptInput.value = prompt || '';
        }
    }

    /**
     * 自动保存输入框内容
     */
    autoSaveInputContent() {
        if (!this.currentConversationId) return;
        
        const conversation = this.getCurrentConversation();
        if (conversation) {
            conversation.inputContent = this.messageInput.value;
            // 延迟保存，避免频繁操作
            clearTimeout(this.autoSaveInputTimeout);
            this.autoSaveInputTimeout = setTimeout(() => {
                this.saveConversations();
            }, 1000);
        }
    }

    /**
     * 显示添加任务对话框
     */
    showAddTaskDialog() {
        const taskTypes = [
            { id: 'poster', name: '海报制作', icon: 'fa-image' },
            { id: 'instagram', name: 'instagram帖子制作', icon: 'fa-instagram' },
            { id: 'health-report', name: '健康报告方案', icon: 'fa-file-medical' },
            { id: 'ui-design', name: '界面设计', icon: 'fa-palette' },
            { id: 'prompt-comparator', name: '提示词对比器', icon: 'fa-balance-scale' },
            { id: 'placeholder-merge', name: '占位符文档整合', icon: 'fa-file-code' },
            // 可以在这里添加更多任务类型
        ];
        
        // 创建任务选择对话框
        const dialog = document.createElement('div');
        dialog.className = 'task-dialog';
        dialog.innerHTML = `
            <div class="task-dialog-content">
                <h3>选择任务类型</h3>
                <div class="task-types">
                    ${taskTypes.map(task => `
                        <button class="task-type-btn" data-task-id="${task.id}">
                            <i class="fas ${task.icon}"></i>
                            <span>${task.name}</span>
                        </button>
                    `).join('')}
                </div>
                <button class="task-dialog-close">取消</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 绑定事件
        dialog.querySelectorAll('.task-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.dataset.taskId;
                const taskType = taskTypes.find(t => t.id === taskId);
                if (taskType) {
                    this.createTask(taskType.name, taskType.id);
                }
                document.body.removeChild(dialog);
            });
        });
        
        dialog.querySelector('.task-dialog-close').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    /**
     * 创建新任务
     * @param {string} name - 任务名称
     * @param {string} type - 任务类型
     */
    createTask(name, type) {
        const id = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const task = {
            id: id,
            name: name,
            type: type,
            data: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.updateTasksList();
        this.showNotification(`任务"${name}"已创建`, 'success');
    }

    /**
     * 更新任务列表
     */
    updateTasksList() {
        if (!this.tasksList) return;
        
        this.tasksList.innerHTML = '';
        
        if (this.tasks.length === 0) {
            this.tasksList.innerHTML = `
                <div class="tasks-empty">
                    <i class="fas fa-tasks"></i>
                    <p>还没有任务，点击"添加任务"开始</p>
                </div>
            `;
            return;
        }
        
        // 按更新时间排序
        const sortedTasks = [...this.tasks].sort((a, b) => b.updatedAt - a.updatedAt);
        
        sortedTasks.forEach(task => {
            this.renderTaskItem(task);
        });
    }

    /**
     * 渲染任务项
     * @param {Object} task - 任务对象
     */
    renderTaskItem(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        taskDiv.dataset.taskId = task.id;
        
        const taskIcon = task.type === 'poster' ? 'fa-image' : (task.type === 'instagram' ? 'fa-instagram' : (task.type === 'health-report' ? 'fa-file-medical' : (task.type === 'ui-design' ? 'fa-palette' : (task.type === 'placeholder-merge' ? 'fa-file-code' : 'fa-tasks'))));
        
        taskDiv.innerHTML = `
            <div class="task-item-content">
                <div class="task-item-icon">
                    <i class="fas ${taskIcon}"></i>
                </div>
                <div class="task-item-info">
                    <div class="task-item-name">${this.escapeHtml(task.name)}</div>
                    <div class="task-item-meta">创建于 ${new Date(task.createdAt).toLocaleString('zh-CN')}</div>
                </div>
            </div>
            <div class="task-item-actions">
                <button class="task-action-btn" data-action="open" title="打开">
                    <i class="fas fa-arrow-right"></i>
                </button>
                <button class="task-action-btn" data-action="delete" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // 绑定事件
        taskDiv.querySelector('[data-action="open"]').addEventListener('click', () => {
            this.openTask(task.id);
        });
        
        taskDiv.querySelector('[data-action="delete"]').addEventListener('click', () => {
            if (confirm(`确定要删除任务"${task.name}"吗？`)) {
                this.deleteTask(task.id);
            }
        });
        
        this.tasksList.appendChild(taskDiv);
    }

    /**
     * 打开任务
     * @param {string} taskId - 任务ID
     */
    openTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // 根据任务类型打开不同的界面
        if (task.type === 'poster') {
            this.openPosterTask(task);
        } else if (task.type === 'instagram') {
            this.openInstagramTask(task);
        } else if (task.type === 'health-report') {
            this.openHealthReportTask(task);
        } else if (task.type === 'ui-design') {
            this.openUIDesignTask(task);
        } else if (task.type === 'prompt-comparator') {
            this.openPromptComparatorTask(task);
        } else if (task.type === 'placeholder-merge') {
            this.openPlaceholderMergeTask(task);
        } else {
            this.showNotification('该任务类型尚未实现', 'info');
        }
    }

    /**
     * 打开海报制作任务
     * @param {Object} task - 任务对象
     */
    /**
     * 打开海报制作任务
     * @param {Object} task - 任务对象
     */
    openPosterTask(task) {
        // 初始化海报数据存储
        if (!task.data) {
            task.data = {
                images: [], // 存储生成的图片
                texts: [], // 存储生成的文字
                webpages: [] // 存储生成的网页
            };
            this.saveTasks();
        }
        
        const taskView = document.createElement('div');
        taskView.className = 'task-view';
        taskView.innerHTML = `
            <div class="task-view-header">
                <button class="task-view-back">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h2>${this.escapeHtml(task.name)}</h2>
            </div>
            <div class="poster-workspace">
                <div class="poster-inputs">
                    <!-- 图片内容生成 -->
                    <div class="poster-input-section">
                        <div class="section-header">
                            <h3><i class="fas fa-image"></i> 图片内容</h3>
                            <p class="section-description">输入提示词，使用 Gemini 3 Pro Preview 模型生成图片</p>
                        </div>
                        <div class="image-inputs-container" id="image-inputs-container-${task.id}">
                            <!-- 动态添加的图片输入框 -->
                        </div>
                        <button class="add-image-btn" data-task-id="${task.id}">
                            <i class="fas fa-plus"></i> 添加图片框
                        </button>
                        <div class="result-display" id="image-result-${task.id}">
                            <div class="result-label">生成结果：</div>
                            <div class="result-content" id="image-result-content-${task.id}"></div>
                        </div>
                    </div>
                    
                    <!-- 文字内容生成 -->
                    <div class="poster-input-section">
                        <div class="section-header">
                            <h3><i class="fas fa-file-alt"></i> 文字内容</h3>
                            <p class="section-description">输入提示词，使用 Gemini 3 Pro Preview 模型联网查询文献并生成文字内容</p>
                        </div>
                        <div class="text-input-wrapper">
                            <textarea class="poster-prompt-input" id="text-prompt-${task.id}" 
                                placeholder="输入文字生成提示词..."></textarea>
                            <button class="generate-btn" data-type="text" data-task-id="${task.id}">
                                <i class="fas fa-magic"></i> 生成文字
                            </button>
                        </div>
                        <div class="result-display" id="text-result-${task.id}">
                            <div class="result-label">生成结果：</div>
                            <div class="result-content" id="text-result-content-${task.id}"></div>
                        </div>
                    </div>
                    
                    <!-- 排版生成 -->
                    <div class="poster-input-section">
                        <div class="section-header">
                            <h3><i class="fas fa-align-center"></i> 排版生成</h3>
                            <p class="section-description">输入排版提示词，使用 Gemini 生成 Markdown 格式的排版，整合文字和图片</p>
                        </div>
                        <div class="text-input-wrapper">
                            <textarea class="poster-prompt-input" id="web-prompt-${task.id}" 
                                placeholder="输入排版提示词，例如：创建一个垂直布局的海报，顶部放图片，中间放标题文字，底部放描述文字..."></textarea>
                            <button class="generate-btn" data-type="web" data-task-id="${task.id}">
                                <i class="fas fa-magic"></i> 生成排版
                            </button>
                        </div>
                        <div class="result-display" id="web-result-${task.id}">
                            <div class="result-label">生成结果：</div>
                            <div class="result-content" id="web-result-content-${task.id}"></div>
                        </div>
                    </div>
                </div>
                
                <!-- 右侧存储容器 -->
                <div class="poster-storage">
                    <div class="storage-header">
                        <h3><i class="fas fa-archive"></i> 存储容器</h3>
                        <button class="clear-all-storage-btn" data-task-id="${task.id}" title="一键清除所有已保存内容">
                            <i class="fas fa-trash-alt"></i> 清除全部
                        </button>
                    </div>
                    <div class="storage-tabs">
                        <button class="storage-tab active" data-storage-type="images" data-task-id="${task.id}">
                            <i class="fas fa-image"></i> 图片
                        </button>
                        <button class="storage-tab" data-storage-type="texts" data-task-id="${task.id}">
                            <i class="fas fa-file-alt"></i> 文字
                        </button>
                        <button class="storage-tab" data-storage-type="webpages" data-task-id="${task.id}">
                            <i class="fas fa-align-center"></i> 排版
                        </button>
                    </div>
                    <div class="storage-content" id="storage-content-${task.id}">
                        <!-- 存储内容将在这里显示 -->
                    </div>
                </div>
            </div>
        `;
        taskView.insertAdjacentHTML('beforeend', this.renderStyleBatchModal(task));
        
        // 替换任务列表显示
        this.tasksList.innerHTML = '';
        this.tasksList.appendChild(taskView);
        
        // 添加类名以改变布局，避免grid布局限制宽度
        this.tasksList.classList.add('showing-task-view');
        
        // 初始化界面
        this.initPosterTask(task);
        
        // 返回按钮
        taskView.querySelector('.task-view-back').addEventListener('click', () => {
            this.tasksList.classList.remove('showing-task-view');
            this.updateTasksList();
        });
    }

    /**
     * 打开instagram帖子制作任务
     * @param {Object} task - 任务对象
     */
    openInstagramTask(task) {
        // 初始化instagram数据存储
        if (!task.data) {
            task.data = {
                images: [], // 存储生成的图片
                texts: [] // 存储生成的文字
            };
            this.saveTasks();
        }
        if (!task.data.styleBatchInputs) {
            task.data.styleBatchInputs = {};
        }
        if (!task.data.styleBatchResults) {
            task.data.styleBatchResults = [];
        }
        if (!task.data.styleBatchThumbnails) {
            task.data.styleBatchThumbnails = [];
        }
        this.ensureTaskModelSelections(task);
        
        const taskView = document.createElement('div');
        taskView.className = 'task-view';
        taskView.innerHTML = `
            <div class="task-view-header">
                <button class="task-view-back">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h2>${this.escapeHtml(task.name)}</h2>
            </div>
            <div class="instagram-workspace">
                <div class="instagram-input-section">
                    <div class="instagram-style-section">
                        <div class="section-header">
                            <div class="section-title">
                                <h3><i class="fas fa-palette"></i> 风格化配置</h3>
                            </div>
                            <p class="section-description">为当前项目选择或新增一个风格，可复制到任意输入框中辅助描述（默认不再自动附加）。</p>
                        </div>
                        <div class="style-card-list" id="style-card-list-${task.id}">
                            <!-- 风格卡片 -->
                        </div>
                        <button class="add-style-btn" data-task-id="${task.id}">
                            <i class="fas fa-plus"></i> 新增风格
                        </button>
                        <small class="style-hint">提示：可以为风格设置标题与内容，例如画面感、语气、配色等要求。</small>
                    </div>
                    <div class="style-batch-entry">
                        <button class="open-style-batch-btn" data-task-id="${task.id}">
                            <i class="fas fa-layer-group"></i> 风格批量任务
                        </button>
                        <p class="style-batch-note">在5个风格框输入 JSON（键名“主题1/主题2...”），可并行生成多套方案。</p>
                    </div>
                    <div class="instagram-designer-section">
                        <div class="section-header">
                            <div class="section-title">
                                <h3><i class="fas fa-pencil-ruler"></i> ${DESIGNER_LABEL}</h3>
                                <button class="prompt-settings-btn" data-task-id="${task.id}" data-prompt-type="instagram-designer" title="查看并编辑系统提示词">
                                    <i class="fas fa-sliders-h"></i>
                                </button>
                            </div>
                            <p class="section-description">输入一个主题或活动目标，${DESIGNER_LABEL} 会制定整套执行方案。</p>
                            ${this.renderModelSelect('designer', task)}
                        </div>
                        <div class="designer-theme-inputs">
                            <textarea class="instagram-json-input instagram-designer-theme" id="instagram-designer-theme-${task.id}" placeholder="例如：春季彩妆上新，突出柔雾质感、少女心色彩，并结合限时折扣信息..."></textarea>
                            <div class="designer-pages-field">
                                <label for="instagram-designer-pages-${task.id}">图片张数</label>
                                <input type="number" min="1" step="1" inputmode="numeric" id="instagram-designer-pages-${task.id}" placeholder="可选">
                                <small class="designer-pages-hint">留空则由设计师自行决定</small>
                            </div>
                        </div>
                        <div class="designer-actions">
                            <button class="run-instagram-designer-btn" data-task-id="${task.id}">
                                <i class="fas fa-wand-magic-sparkles"></i> 生成设计方案
                            </button>
                            <button class="use-designer-plan-btn" data-task-id="${task.id}" disabled>
                                <i class="fas fa-share-from-square"></i> 推送到 ${ENGINEER_LABEL}
                            </button>
                        </div>
                        <div class="instagram-designer-result" id="instagram-designer-result-${task.id}">
                            <small class="json-hint">提示：设计方案会说明各图片、文案及网页的方向，可一键推送到 ${ENGINEER_LABEL} 继续细化。</small>
                        </div>
                        <div class="process-log" id="process-log-designer-${task.id}">
                            <div class="process-log-header"><i class="fas fa-terminal"></i> 运行状态</div>
                            <div class="process-log-body"></div>
                        </div>
                    </div>
                    <div class="instagram-prompt-engineer-section">
                        <div class="section-header">
                            <div class="section-title">
                                <h3><i class="fas fa-user-cog"></i> ${ENGINEER_LABEL}</h3>
                                <button class="prompt-settings-btn" data-task-id="${task.id}" data-prompt-type="instagram-engineer" title="查看并编辑系统提示词">
                                    <i class="fas fa-sliders-h"></i>
                                </button>
                            </div>
                            <p class="section-description">描述每张图片与底部文案的主题，AI 会自动生成 JSON 提示词</p>
                            ${this.renderModelSelect('engineer', task)}
                        </div>
                        <textarea class="instagram-json-input" id="instagram-prompt-engineer-${task.id}" placeholder="例如：图片1：粉色渐变背景的新品手机特写；图片2：夜景城市街拍；底部文字：介绍新品卖点与限时活动..."></textarea>
                        <button class="refine-instagram-prompt-btn" data-task-id="${task.id}">
                            <i class="fas fa-wand-magic-sparkles"></i> 细化并生成JSON提示词
                        </button>
                        <small class="json-hint">提示：写下每张图片与底部文字想表达的主题，AI 会生成完整JSON提示词并自动应用。</small>
                        <div class="process-log" id="process-log-engineer-${task.id}">
                            <div class="process-log-header"><i class="fas fa-terminal"></i> 运行状态</div>
                            <div class="process-log-body"></div>
                        </div>
                    </div>
                    <div class="instagram-json-section">
                        <div class="section-header">
                            <div class="section-title">
                                <h3><i class="fas fa-code"></i> Prompt JSON 配置</h3>
                            </div>
                            <p class="section-description">粘贴包含“图片1/图片2/.../底部文字”键的JSON，自动填充并生成</p>
                        </div>
                        <textarea class="instagram-json-input" id="instagram-json-prompt-${task.id}" placeholder='例如：{"图片1":"......","图片2":"......","底部文字":"......"}'></textarea>
                        <button class="apply-instagram-json-btn" data-task-id="${task.id}">
                            <i class="fas fa-play"></i> 应用JSON提示词并自动生成
                        </button>
                        <small class="json-hint">提示：key需严格匹配“图片1”“图片2”...，“底部文字”；value为对应提示词。</small>
                    </div>
                    <div class="section-header">
                        <div class="section-title">
                            <h3><i class="fas fa-instagram"></i> Instagram 帖子制作</h3>
                            <button class="prompt-settings-btn" data-task-id="${task.id}" data-prompt-type="instagram-image" title="查看并编辑系统提示词">
                                <i class="fas fa-sliders-h"></i>
                            </button>
                        </div>
                        <p class="section-description">为每张图片单独编写提示词，点击加号可添加更多图片框</p>
                    </div>
                    <div class="instagram-model-selector" style="margin-bottom: 1rem; padding: 0.75rem; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem;">
                            <i class="fas fa-cog"></i>
                            <span>选择模型（所有功能将使用此模型）：</span>
                        </label>
                        <select class="instagram-task-model-select" data-task-id="${task.id}" style="width: 100%; padding: 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; font-size: 0.9rem;">
                            <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image Preview（图片生成）</option>
                            <option value="gemini-3-pro-preview">Gemini 3 Pro Preview（文字生成）</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        </select>
                    </div>
                    <div class="instagram-image-inputs" id="instagram-image-inputs-${task.id}">
                        <!-- 动态添加的Instagram图片输入框 -->
                    </div>
                    <button class="add-instagram-image-btn" data-task-id="${task.id}">
                        <i class="fas fa-plus"></i> 添加图片框
                    </button>
                    
                    <!-- 底部文字生成 -->
                    <div class="instagram-text-section">
                        <div class="section-header">
                            <div class="section-title">
                                <h3><i class="fas fa-file-alt"></i> 底部文字</h3>
                            </div>
                            <p class="section-description">直接粘贴或输入底部原文，点击提交后即可用于网页生成</p>
                        </div>
                        <div class="instagram-text-input-wrapper">
                            <textarea class="instagram-prompt-input" id="instagram-text-prompt-${task.id}" 
                                placeholder="粘贴或输入最终底部文案（支持 Markdown），不会再经过模型改写"></textarea>
                            <button class="generate-instagram-text-btn" data-task-id="${task.id}">
                                <i class="fas fa-check"></i> 提交文案
                            </button>
                        </div>
                        <div class="result-display" id="instagram-text-result-${task.id}">
                            <div class="result-label">生成结果：</div>
                            <div class="result-content" id="instagram-text-result-content-${task.id}"></div>
                        </div>
                        <div class="process-log" id="process-log-text-${task.id}">
                            <div class="process-log-header"><i class="fas fa-terminal"></i> 运行状态</div>
                            <div class="process-log-body"></div>
                        </div>
                        
                        <div class="instagram-web-section">
                            <div class="section-subheader">
                                <div class="section-title">
                                    <h4><i class="fas fa-globe"></i> 网页生成</h4>
                                    <button class="prompt-settings-btn" data-task-id="${task.id}" data-prompt-type="instagram-web" title="查看并编辑系统提示词">
                                        <i class="fas fa-sliders-h"></i>
                                    </button>
                                </div>
                                ${this.renderModelSelect('web', task)}
                            </div>
                            <button class="generate-instagram-web-btn" data-task-id="${task.id}">
                                <i class="fas fa-globe"></i> 根据图片与文案生成网页
                            </button>
                            <div class="instagram-web-result" id="instagram-web-result-${task.id}"></div>
                            <div class="process-log" id="process-log-web-${task.id}">
                                <div class="process-log-header"><i class="fas fa-terminal"></i> 运行状态</div>
                                <div class="process-log-body"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 右侧存储容器 -->
                <div class="instagram-storage">
                    <div class="storage-header">
                        <h3><i class="fas fa-archive"></i> 存储容器</h3>
                        <button class="clear-all-storage-btn" data-task-id="${task.id}" title="一键清除所有已保存内容">
                            <i class="fas fa-trash-alt"></i> 清除全部
                        </button>
                    </div>
                    <div class="storage-content" id="instagram-storage-content-${task.id}">
                        <!-- 存储内容将在这里显示 -->
                    </div>
                </div>
            </div>
        `;
        taskView.insertAdjacentHTML('beforeend', this.renderStyleBatchModal(task));
        
        // 替换任务列表显示
        this.tasksList.innerHTML = '';
        this.tasksList.appendChild(taskView);
        
        // 添加类名以改变布局
        this.tasksList.classList.add('showing-task-view');
        
        // 初始化界面
        this.initInstagramTask(task);
        this.initStyleBatchPanel(task);
        
        // 返回按钮
        taskView.querySelector('.task-view-back').addEventListener('click', () => {
            this.tasksList.classList.remove('showing-task-view');
            this.updateTasksList();
        });
    }

    /**
     * 初始化instagram帖子制作任务界面
     * @param {Object} task - 任务对象
     */
    initInstagramTask(task) {
        if (!task.data) {
            task.data = {};
        }
        if (!task.data.designer) {
            task.data.designer = {
                theme: '',
                plan: ''
            };
            this.saveTasks();
        }
        if (!task.data.styleBatchInputs) {
            task.data.styleBatchInputs = {};
        }
        if (!task.data.styleBatchResults) {
            task.data.styleBatchResults = [];
        }
        this.renderStyleSelector(task);
        const addStyleBtn = document.querySelector(`.add-style-btn[data-task-id="${task.id}"]`);
        if (addStyleBtn) {
            addStyleBtn.addEventListener('click', () => {
                this.addStylePreset();
                this.renderStyleSelector(task);
            });
        }
        this.bindModelSelects(task);
        
        // 初始化 Instagram 任务模型选择器
        const instagramModelSelect = document.querySelector(`.instagram-task-model-select[data-task-id="${task.id}"]`);
        if (instagramModelSelect) {
            // 加载保存的模型选择，默认为 gemini-3-pro-image-preview
            const savedModel = this.getInstagramTaskModel(task) || 'gemini-3-pro-image-preview';
            instagramModelSelect.value = savedModel;
            
            // 绑定模型选择变化事件
            instagramModelSelect.addEventListener('change', () => {
                this.setInstagramTaskModel(task, instagramModelSelect.value);
                this.showNotification(`已切换模型为：${instagramModelSelect.options[instagramModelSelect.selectedIndex].text}`, 'success');
            });
        }
        
        // 添加第一个图片输入框
        this.addInstagramImageInput(task.id);
        this.initStyleBatchPanel(task);
        
        const designerThemeInput = document.getElementById(`instagram-designer-theme-${task.id}`);
        if (designerThemeInput) {
            designerThemeInput.value = task.data.designer?.theme || '';
            designerThemeInput.addEventListener('input', () => {
                if (!task.data.designer) {
                    task.data.designer = {};
                }
                task.data.designer.theme = designerThemeInput.value;
                task.updatedAt = Date.now();
                this.saveTasks();
            });
        }
        const designerPagesInput = document.getElementById(`instagram-designer-pages-${task.id}`);
        if (designerPagesInput) {
            const savedPages = this.normalizePositiveInteger(task.data.designer?.imagePages || '');
            designerPagesInput.value = savedPages;
            designerPagesInput.addEventListener('input', () => {
                if (!task.data.designer) {
                    task.data.designer = {};
                }
                const normalized = this.normalizePositiveInteger(designerPagesInput.value);
                designerPagesInput.value = normalized;
                task.data.designer.imagePages = normalized;
                task.updatedAt = Date.now();
                this.saveTasks();
            });
        }
        const designerResult = document.getElementById(`instagram-designer-result-${task.id}`);
        if (designerResult && task.data.designer?.plan) {
            designerResult.innerHTML = `<div class="designer-plan">${this.formatMarkdown(task.data.designer.plan)}</div>`;
        }
        const runDesignerBtn = document.querySelector(`.run-instagram-designer-btn[data-task-id="${task.id}"]`);
        if (runDesignerBtn) {
            runDesignerBtn.addEventListener('click', () => {
                this.runInstagramDesigner(task);
            });
        }
        const pushDesignerBtn = document.querySelector(`.use-designer-plan-btn[data-task-id="${task.id}"]`);
        if (pushDesignerBtn) {
            pushDesignerBtn.disabled = !(task.data.designer?.plan);
            pushDesignerBtn.addEventListener('click', () => {
                this.applyDesignerPlanToEngineer(task);
            });
        }
        
        // 绑定提示词工程师按钮
        const refineBtn = document.querySelector(`.refine-instagram-prompt-btn[data-task-id="${task.id}"]`);
        if (refineBtn) {
            refineBtn.addEventListener('click', () => {
                this.refineInstagramPrompts(task);
            });
        }
        
        // 绑定JSON提示词按钮
        const applyJsonBtn = document.querySelector(`.apply-instagram-json-btn[data-task-id="${task.id}"]`);
        if (applyJsonBtn) {
            applyJsonBtn.addEventListener('click', () => {
                this.applyInstagramJsonPrompt(task);
            });
        }
        
        // 绑定添加图片框按钮
        const addBtn = document.querySelector(`.add-instagram-image-btn[data-task-id="${task.id}"]`);
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addInstagramImageInput(task.id);
            });
        }
        
        // 绑定生成文案按钮
        const generateTextBtn = document.querySelector(`.generate-instagram-text-btn[data-task-id="${task.id}"]`);
        if (generateTextBtn) {
            generateTextBtn.addEventListener('click', () => {
                this.generateInstagramText(task);
            });
        }
        
        const generateWebBtn = document.querySelector(`.generate-instagram-web-btn[data-task-id="${task.id}"]`);
        if (generateWebBtn) {
            generateWebBtn.addEventListener('click', () => {
                this.generateInstagramWebpage(task);
            });
        }
        // 绑定一键清除按钮
        const clearAllBtn = document.querySelector(`.clear-all-storage-btn[data-task-id="${task.id}"]`);
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (confirm('确定要清除所有已保存的内容吗？此操作不可恢复。')) {
                    this.clearInstagramStorage(task.id);
                }
            });
        }
        
        // 初始化显示存储内容
        this.showInstagramStorage(task.id);
        this.loadInstagramStoredContent(task);
        this.renderStoredInstagramWebResult(task);
        this.renderProcessLogsForTask(task.id);
        
        // 绑定提示词编辑按钮
        this.bindPromptSettingsButtons(task.id);
    }
    
    bindPromptSettingsButtons(taskId) {
        document.querySelectorAll(`.prompt-settings-btn[data-task-id="${taskId}"]`).forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.promptType;
                this.openPromptEditor(type);
            });
        });
    }

    /**
     * 添加Instagram图片输入框
     * @param {string} taskId - 任务ID
     */
    addInstagramImageInput(taskId) {
        const container = document.getElementById(`instagram-image-inputs-${taskId}`);
        if (!container) return;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const imageIndex = container.children.length + 1;
        const imageInputDiv = document.createElement('div');
        imageInputDiv.className = 'instagram-image-input-item';
        imageInputDiv.dataset.imageIndex = imageIndex;
        imageInputDiv.innerHTML = `
            <div class="image-input-header">
                <span class="image-label">图片 ${imageIndex}</span>
                <div class="image-input-actions">
                    <button class="generate-instagram-image-btn" data-task-id="${taskId}" data-image-index="${imageIndex}">
                        <i class="fas fa-magic"></i> 生成图片
                    </button>
                    <button class="remove-instagram-image-btn" data-task-id="${taskId}" title="删除此图片框">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <textarea class="instagram-prompt-input instagram-image-prompt" 
                placeholder="输入图片生成提示词..."></textarea>
            <div class="instagram-image-result" id="instagram-image-result-${taskId}-${imageIndex}"></div>
        `;
        
        container.appendChild(imageInputDiv);
        
        // 绑定生成按钮
        const generateBtn = imageInputDiv.querySelector('.generate-instagram-image-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const prompt = imageInputDiv.querySelector('.instagram-image-prompt')?.value.trim() || '';
                if (!prompt) {
                    this.showNotification('请输入图片生成提示词', 'error');
                    return;
                }
                const taskObj = this.tasks.find(t => t.id === taskId);
                if (!taskObj) return;
                const resultContent = imageInputDiv.querySelector('.instagram-image-result');
                this.generateInstagramImage(taskObj, parseInt(generateBtn.dataset.imageIndex, 10), prompt, resultContent);
            });
        }
        
        // 绑定删除按钮
        const removeBtn = imageInputDiv.querySelector('.remove-instagram-image-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                imageInputDiv.remove();
                this.reindexInstagramImageInputs(taskId);
            });
        }
    }
    
    /**
     * 重新编号Instagram图片输入框
     * @param {string} taskId - 任务ID
     */
    reindexInstagramImageInputs(taskId) {
        const container = document.getElementById(`instagram-image-inputs-${taskId}`);
        if (!container) return;
        
        container.querySelectorAll('.instagram-image-input-item').forEach((item, index) => {
            const newIndex = index + 1;
            item.dataset.imageIndex = newIndex;
            const label = item.querySelector('.image-label');
            if (label) {
                label.textContent = `图片 ${newIndex}`;
            }
            const resultDiv = item.querySelector('.instagram-image-result');
            if (resultDiv) {
                resultDiv.id = `instagram-image-result-${taskId}-${newIndex}`;
            }
            const generateBtn = item.querySelector('.generate-instagram-image-btn');
            if (generateBtn) {
                generateBtn.dataset.imageIndex = newIndex;
            }
        });
    }

    /**
     * 确保Instagram图片输入框数量
     * @param {string} taskId - 任务ID
     * @param {number} count - 目标数量
     */
    ensureInstagramImageInputs(taskId, count) {
        const container = document.getElementById(`instagram-image-inputs-${taskId}`);
        if (!container) return;
        while (container.children.length < count) {
            this.addInstagramImageInput(taskId);
        }
        this.reindexInstagramImageInputs(taskId);
    }

    /**
     * 为某个图片框生成instagram图片
     * @param {Object} task - 任务对象
     * @param {number} imageIndex - 图片索引
     * @param {string} prompt - 提示词
     * @param {HTMLElement} resultElement - 结果展示容器
     */
    async generateInstagramImage(task, imageIndex, prompt, resultElement) {
        // 使用 Vertex AI，不需要 API Key
        
        if (resultElement) {
            resultElement.innerHTML = `<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在生成图片...</div>`;
        }
        
        try {
            const imageData = await this.generateSingleInstagramImage(task, prompt, imageIndex);
            if (resultElement) {
                resultElement.innerHTML = this.renderInstagramImageItem(imageData, imageIndex, task.id);
                this.bindInstagramImageActions(task.id, resultElement);
            }
            this.showNotification(`图片 ${imageIndex} 生成完成`, 'success');
            this.scheduleAutoWebGeneration(task);
            return imageData;
        } catch (error) {
            console.error('生成图片错误:', error);
            if (resultElement) {
                resultElement.innerHTML = `<div class="error-text">生成失败：${this.escapeHtml(error.message)}</div>`;
            }
            this.showNotification('生成图片失败：' + error.message, 'error');
            throw error;
        }
    }

    /**
     * 生成单张instagram图片
     * @param {Object} task - 任务对象
     * @param {string} prompt - 提示词
     * @param {number} imageIndex - 图片索引
     */
    async generateSingleInstagramImage(task, prompt, imageIndex, options = {}) {
        try {
            // 图片生成必须使用图片模型，强制使用 gemini-3-pro-image-preview
            const modelToUse = 'gemini-3-pro-image-preview';
            
            // 对于图片生成模型，直接使用用户提示词，不要添加系统提示词
            // 系统提示词会让模型返回文字而不是生成图片
            // 图片生成模型会根据提示词直接生成图片
            const fullPrompt = prompt;
            
            console.log('图片生成请求:', {
                model: modelToUse,
                prompt: fullPrompt.substring(0, 100) + '...'
            });
            
            // 构建配置对象
            const config = {
                temperature: 0.9,
                max_output_tokens: parseInt(this.maxTokens) || 44444  // 使用全局默认值
            };
            
            // 调用后端 Vertex AI API
            const response = await fetch('http://localhost:5000/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelToUse,
                    contents: fullPrompt,
                    config: config
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            console.log('图片生成响应:', {
                success: data.success,
                hasImage: !!data.image,
                hasMimeType: !!data.mime_type,
                hasText: !!data.text,
                model: data.model
            });
            
            if (!data.success) {
                throw new Error(data.error || 'Vertex AI 响应格式错误: ' + JSON.stringify(data));
            }
            
            // 检查后端是否直接返回了图片数据（图片生成必须返回图片）
            let imageBase64 = null;
            let imageMimeType = null;
            let imageUrl = null;
            
            if (data.image && data.mime_type) {
                // 后端直接返回了图片数据（base64字符串）
                imageBase64 = data.image;
                imageMimeType = data.mime_type;
                console.log('成功获取图片数据:', {
                    mimeType: imageMimeType,
                    base64Length: imageBase64 ? imageBase64.length : 0
                });
            } else {
                // 如果没有图片数据，这是错误
                console.error('图片生成失败：未返回图片数据', data);
                throw new Error(`图片生成失败：模型返回的是文字而不是图片。请确保使用图片生成模型（gemini-3-pro-image-preview）。响应：${JSON.stringify(data).substring(0, 200)}`);
            }
            
            // 确保有图片数据
            if (!imageBase64) {
                throw new Error('图片生成失败：未获取到图片数据');
            }
            
            // 构建图片数据
            const imageData = {
                id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + imageIndex,
                prompt: prompt,
                imageIndex: imageIndex,
                createdAt: Date.now(),
                imageBase64: imageBase64,
                imageMimeType: imageMimeType,
                imageUrl: imageBase64 ? `data:${imageMimeType};base64,${imageBase64}` : null,
                textMessage: '', // 图片生成不需要文本消息
                saved: false // 默认未保存到存储
            };
            
            await this.ensureInstagramImageDimensions(imageData);
            
            // 保存到任务数据
            if (!options.skipSave) {
                if (!task.data.images) {
                    task.data.images = [];
                }
                task.data.images.push(imageData);
                this.saveTasks();
            }
            
            return imageData;
        } catch (error) {
            console.error(`生成第 ${imageIndex} 张图片失败:`, error);
            throw error;
        }
    }

    /**
     * 渲染单张instagram图片项
     * @param {Object} imageData - 图片数据
     * @param {number} index - 索引
     * @param {string} taskId - 任务ID
     */
    renderInstagramImageItem(imageData, index, taskId = '') {
        let imageHtml = '';
        let imageUrlLink = '';
        
        if (imageData.imageBase64) {
            const imageDataUrl = imageData.imageUrl;
            imageHtml = `
                <div class="instagram-image-preview">
                    <img src="${imageDataUrl}" alt="生成的图片 ${index}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
            `;
            const urlToShow = imageDataUrl && imageDataUrl.startsWith('http') ? imageDataUrl : (imageData.textMessage ? (imageData.textMessage.match(/https?:\/\/[^\s]+/) || [])[0] : null);
            if (urlToShow) {
                imageUrlLink = `
                    <div class="image-url-link-container" style="margin-top: 0.5rem;">
                        ${this.formatMarkdown(`[查看原图](${urlToShow})`)}
                    </div>
                `;
            } else if (imageDataUrl && imageDataUrl.startsWith('data:')) {
                imageUrlLink = `
                    <div class="image-url-link-container" style="margin-top: 0.5rem;">
                        ${this.formatMarkdown(`[在新窗口查看原图](${imageDataUrl})`)}
                    </div>
                `;
            }
        } else if (imageData.imageUrl && imageData.imageUrl.startsWith('http')) {
            imageHtml = `
                <div class="instagram-image-preview">
                    ${this.formatMarkdown(`[点击查看生成的图片](${imageData.imageUrl})`)}
                </div>
            `;
            imageUrlLink = `
                <div class="image-url-link-container" style="margin-top: 0.5rem;">
                    ${this.formatMarkdown(`[查看原图](${imageData.imageUrl})`)}
                </div>
            `;
        } else if (imageData.textMessage) {
            imageHtml = `
                <div class="result-text-content">
                    ${this.formatMarkdown(imageData.textMessage)}
                </div>
            `;
            const urlMatch = imageData.textMessage.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                imageUrlLink = `
                    <div class="image-url-link-container" style="margin-top: 0.5rem;">
                        ${this.formatMarkdown(`[查看原图](${urlMatch[0]})`)}
                    </div>
                `;
            }
        } else {
            imageHtml = `
                <div class="result-note">
                    未生成图片数据。请检查提示词或API配置。
                </div>
            `;
        }
        
        return `
            <div class="instagram-image-item" data-image-id="${imageData.id}">
                <div class="image-item-header">
                    <span class="image-item-title">图片 ${index}</span>
                    <div class="image-item-actions">
                        <button class="save-instagram-image-btn" data-image-id="${imageData.id}" data-task-id="${taskId}" title="保存到存储">
                            <i class="fas fa-save"></i> 保存
                        </button>
                        <button class="download-instagram-image-btn" data-image-id="${imageData.id}" title="下载图片">
                            <i class="fas fa-download"></i> 下载
                        </button>
                    </div>
                </div>
                <div class="image-item-content">
                    <div class="result-prompt"><strong>提示词：</strong>${this.escapeHtml(imageData.prompt)}</div>
                    ${imageHtml}
                    ${imageUrlLink}
                </div>
            </div>
        `;
    }

    /**
     * 保存手动输入的Instagram底部文案
     * @param {Object} task - 任务对象
     */
    async generateInstagramText(task) {
        const promptInput = document.getElementById(`instagram-text-prompt-${task.id}`);
        if (!promptInput) return;
        
        const content = promptInput.value.trim();
        if (!content) {
            this.showNotification('请输入或粘贴底部文案', 'error');
            this.appendProcessLog(task.id, 'text', '未输入底部文案，无法提交。', 'warning');
            return;
        }
        
        const resultContent = document.getElementById(`instagram-text-result-content-${task.id}`);
        const textData = {
            id: 'text_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            prompt: '手动输入',
            content,
            createdAt: Date.now(),
            saved: false
        };
        
        if (!task.data.texts) {
            task.data.texts = [];
        }
        task.data.texts.push(textData);
        task.updatedAt = Date.now();
        this.saveTasks();
        promptInput.value = '';
        
        if (resultContent) {
            resultContent.innerHTML = `
                <div class="text-result-item">
                    <div class="result-note">以下内容会被原样写入网页，不再经过模型改写。</div>
                    <div class="result-text-content">${this.formatMarkdown(content)}</div>
                    <button class="save-instagram-text-btn" data-text-id="${textData.id}" data-task-id="${task.id}">
                        <i class="fas fa-save"></i> 保存到存储容器
                    </button>
                </div>
            `;
            
            const saveBtn = resultContent.querySelector('.save-instagram-text-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    textData.saved = true;
                    textData.manualSaved = true;
                    this.saveTasks();
                    this.showInstagramStorage(task.id);
                    this.showNotification('已保存到存储容器', 'success');
                });
            }
        }
        
        this.showInstagramStorage(task.id);
        this.showNotification('文案已提交', 'success');
        this.appendProcessLog(task.id, 'text', `底部文案已提交，字数：${content.length}`, 'info');
        this.scheduleAutoWebGeneration(task);
        return textData;
    }

    /**
     * 根据任务数据渲染已生成的网页结果
     * @param {Object} task
     */
    renderStoredInstagramWebResult(task) {
        if (!task || !task.id) return;
        const resultContainer = document.getElementById(`instagram-web-result-${task.id}`);
        if (!resultContainer) return;
        const result = task.data?.instagramWebResult;
        if (!result || !result.htmlContent) {
            resultContainer.innerHTML = '';
            return;
        }
        this.renderInstagramWebResult(task, resultContainer, result);
    }
    
    /**
     * 渲染网页结果到指定容器
     * @param {Object} task
     * @param {HTMLElement} container
     * @param {Object} result
     */
    renderInstagramWebResult(task, container, result) {
        if (!container || !result || !result.htmlContent) return;
        if (container.dataset.url) {
            URL.revokeObjectURL(container.dataset.url);
        }
        const blob = new Blob([result.htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        container.dataset.url = url;
        const filename = `${task.name || 'instagram'}-网页-${new Date(result.createdAt || Date.now()).toISOString().slice(0,19).replace(/[:T]/g, '-')}.html`;
        const statusText = result.usedFallback ? '（默认排版）' : '（AI 排版）';
        const rawSource = result.rawResponse || result.htmlContent || '';
        const sourceToShow = this.maskBase64Blobs(rawSource);
        const requestPayloadText = result.requestPayload
            ? (typeof result.requestPayload === 'string'
                ? result.requestPayload
                : JSON.stringify(result.requestPayload, null, 2))
            : '（当前记录缺少请求体，请重新生成以查看完整 Query）';
        container.innerHTML = `
            <a class="instagram-web-link" href="${url}" target="_blank" download="${filename}">
                <i class="fas fa-external-link-alt"></i> 点击预览 / 下载网页 ${statusText}
            </a>
            <div class="instagram-web-panels" style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                <div class="instagram-web-source" style="flex: 1 1 320px; background: #0f172a; border-radius: 10px; border: 1px solid #1e293b; padding: 1rem; min-width: 0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; color:#93c5fd; font-weight:600; margin-bottom:0.5rem;">
                        <i class="fas fa-code"></i>
                        <span>模型返回</span>
                    </div>
                    <pre style="margin:0; max-height:600px; overflow:auto; color:#e2e8f0; font-size:0.85rem; line-height:1.5; white-space: pre-wrap; word-break: break-word;"><code>${this.escapeHtml(sourceToShow)}</code></pre>
                </div>
                <div class="instagram-web-request" style="flex: 1 1 320px; background: #111827; border-radius: 10px; border: 1px solid #1f2937; padding: 1rem; min-width: 0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; color:#a5b4fc; font-weight:600; margin-bottom:0.5rem;">
                        <i class="fas fa-terminal"></i>
                        <span>请求模型</span>
                    </div>
                    <pre style="margin:0; max-height:360px; overflow:auto; color:#e0e7ff; font-size:0.85rem; line-height:1.5; white-space: pre-wrap; word-break: break-word;"><code>${this.escapeHtml(requestPayloadText)}</code></pre>
                </div>
            </div>
        `;
    }

    /**
     * 生成Instagram网页
     * @param {Object} task - 任务对象
     */
    async generateInstagramWebpage(task) {
        const resultContainer = document.getElementById(`instagram-web-result-${task.id}`) || null;
        this.appendProcessLog(task.id, 'web', '开始生成网页。', 'info');
        
        let images = (task.data.images || []).filter(img => img.saved !== false);
        if (images.length === 0) {
            images = [...(task.data.images || [])];
        }
        if (images.length === 0) {
            if (resultContainer) {
                resultContainer.innerHTML = '<div class="error-text">请先生成图片</div>';
            }
            this.showNotification('请先生成图片', 'error');
            this.appendProcessLog(task.id, 'web', '缺少图片，无法生成网页。', 'warning');
            return;
        }
        
        let texts = (task.data.texts || []).filter(txt => txt.saved !== false);
        if (texts.length === 0) {
            texts = [...(task.data.texts || [])];
        }
        if (texts.length === 0) {
            if (resultContainer) {
                resultContainer.innerHTML = '<div class="error-text">请先生成底部文字</div>';
            }
            this.showNotification('请先生成底部文字', 'error');
            this.appendProcessLog(task.id, 'web', '缺少文字内容，无法生成网页。', 'warning');
            return;
        }
        
        const sortedImages = [...images].sort((a, b) => {
            if (a.imageIndex && b.imageIndex) {
                return a.imageIndex - b.imageIndex;
            }
            return (a.createdAt || 0) - (b.createdAt || 0);
        });
        const sortedTexts = [...texts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        if (resultContainer) {
            resultContainer.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在生成网页...</div>';
        }
        
        const bottomTextMarkdown = sortedTexts[0]?.content || '';
        const webResult = await this.createInstagramWebHtml(task, sortedImages, bottomTextMarkdown);
        if (!webResult || !webResult.htmlContent) {
            if (resultContainer) {
                resultContainer.innerHTML = '<div class="error-text">生成网页失败，请稍后重试</div>';
            }
            this.showNotification('生成网页失败，请稍后重试', 'error');
            this.appendProcessLog(task.id, 'web', '生成网页失败，未获得 HTML。', 'error');
            return;
        }
        
        const { htmlContent, usedFallback, rawResponse, requestPayload } = webResult;
        if (!task.data) {
            task.data = {};
        }
        task.data.instagramWebResult = {
            id: 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            htmlContent,
            rawResponse,
            requestPayload,
            usedFallback,
            createdAt: Date.now()
        };
        this.saveTasks();
        
        if (resultContainer) {
            this.renderInstagramWebResult(task, resultContainer, task.data.instagramWebResult);
            if (!usedFallback) {
                this.showNotification('网页生成完成', 'success');
            }
        } else if (!usedFallback) {
            this.showNotification('网页已在后台生成，可稍后在任务面板查看', 'success');
        } else {
            this.showNotification('网页已生成（默认排版），可稍后在任务面板查看', 'warning');
        }
        
        this.appendProcessLog(task.id, 'web', usedFallback ? '网页生成完成（默认排版）。' : '网页生成完成（AI 排版）。', 'info');
    }

    /**
     * 获取Instagram图片可用的Data URL
     * @param {Object} img - 图片数据
     * @returns {string} data URL或HTTP URL
     */
    getInstagramImageDataUrl(img) {
        if (!img) return '';
        if (img.imageUrl) {
            return img.imageUrl;
        }
        if (img.imageBase64 && img.imageMimeType) {
            return `data:${img.imageMimeType};base64,${img.imageBase64}`;
        }
        if (img.textMessage) {
            const urlMatch = img.textMessage.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                return urlMatch[0];
            }
        }
        return '';
    }

    /**
     * 校验模型返回的Instagram网页HTML是否符合要求
     * @param {string} html
     * @returns {{valid: boolean, reason?: string}}
     */
    validateInstagramHtml(html, placeholders = []) {
        if (!html || !html.trim()) {
            return { valid: false, reason: 'HTML 内容为空' };
        }
        if (!/<html[\s\S]*<\/html>/i.test(html)) {
            return { valid: false, reason: '缺少完整 <html> 结构' };
        }
        if (!/<head[\s\S]*<\/head>/i.test(html)) {
            return { valid: false, reason: '缺少完整 <head> 结构' };
        }
        if (!/<body[\s\S]*<\/body>/i.test(html)) {
            return { valid: false, reason: '缺少完整 <body> 结构' };
        }
        const expectedPlaceholders = Array.isArray(placeholders) && placeholders.length > 0
            ? placeholders
            : null;
        if (expectedPlaceholders) {
            const missing = expectedPlaceholders.find(placeholder => placeholder && !html.includes(placeholder));
            if (missing) {
                return { valid: false, reason: `未使用图片占位符 ${missing}` };
            }
        } else if (!/{{\s*图片\d+\s*}}/i.test(html)) {
            return { valid: false, reason: '未使用图片占位符 {{图片X}}' };
        }
        if (!/<img[^>]+src=/i.test(html)) {
            return { valid: false, reason: '缺少图片标签' };
        }
        if (!/(slider|carousel|swiper|glide|marquee)/i.test(html)) {
            return { valid: false, reason: '缺少轮播/滑动结构' };
        }
        if (!/(progress|indicator|dots|btn-prev|btn-next)/i.test(html)) {
            return { valid: false, reason: '缺少轮播控制或指示元素' };
        }
        return { valid: true };
    }
    
    /**
     * 从原始响应中提取纯HTML
     * @param {string} raw
     * @returns {string}
     */
    extractPureHtml(raw) {
        if (!raw) return '';
        let content = raw;
        const codeBlock = content.match(/```(?:html|htm)?\s*([\s\S]*?)```/i);
        if (codeBlock && codeBlock[1]) {
            content = codeBlock[1];
        }
        content = content.trim();
        const lower = content.toLowerCase();
        let startIdx = lower.indexOf('<!doctype');
        if (startIdx === -1) {
            startIdx = lower.indexOf('<html');
        }
        if (startIdx > 0) {
            content = content.slice(startIdx);
        } else if (startIdx === -1) {
            return '';
        }
        return content.trim();
    }
    
    /**
     * 确保HTML包含<!DOCTYPE html>
     * @param {string} html
     * @returns {string}
     */
    ensureHtmlDoctype(html) {
        if (!html) return '';
        let content = html.trim();
        const hasDoctype = /^<!DOCTYPE/i.test(content);
        let hasHtmlOpen = /<html\b/i.test(content);
        let hasHtmlClose = /<\/html\s*>/i.test(content);
        let hasBodyOpen = /<body\b/i.test(content);
        let hasBodyClose = /<\/body\s*>/i.test(content);
        
        if (!hasHtmlOpen) {
            content = `<html lang="zh-CN">\n${content}`;
            hasHtmlOpen = true;
        }
        if (!hasHtmlClose) {
            content = `${content}\n</html>`;
            hasHtmlClose = true;
        }
        if (hasHtmlOpen && !hasBodyOpen) {
            content = content.replace(/<html([^>]*)>/i, '<html$1>\n<body>');
            hasBodyOpen = true;
            hasBodyClose = /<\/body\s*>/i.test(content);
        }
        if (hasBodyOpen && !hasBodyClose) {
            content = content.replace(/<\/html\s*>/i, '</body>\n</html>');
            hasBodyClose = true;
        }
        if (!hasDoctype) {
            content = `<!DOCTYPE html>\n${content}`;
        }
        return content;
    }

    /**
     * 确保生成的HTML中包含指定的图片占位符
     * @param {string} html - 模型返回的HTML
     * @param {string[]} placeholders - 需要出现的占位符列表
     * @returns {string} 处理后的HTML
     */
    injectImagePlaceholders(html, placeholders = []) {
        if (!html || !Array.isArray(placeholders) || placeholders.length === 0) {
            return html;
        }
        const missingPlaceholder = placeholders.some(placeholder => placeholder && !html.includes(placeholder));
        if (!missingPlaceholder) {
            return html;
        }
        let replaceIndex = 0;
        return html.replace(/<img\b[^>]*?>/gi, (tag) => {
            const placeholder = placeholders[replaceIndex];
            if (!placeholder) {
                return tag;
            }
            if (tag.includes(placeholder)) {
                replaceIndex += 1;
                return tag;
            }
            const replacedTag = tag.replace(/src\s*=\s*(['"])([^'"]*?)\1/i, (match, quote) => {
                replaceIndex += 1;
                return `src=${quote}${placeholder}${quote}`;
            });
            if (replacedTag !== tag) {
                return replacedTag;
            }
            replaceIndex += 1;
            return tag.replace(/<img/i, `<img src="${placeholder}"`);
        });
    }

    /**
     * 通过创建 Image 对象测量图片尺寸
     * @param {string} src - 图片地址（data URL 或 网络 URL）
     * @param {number} timeout - 超时时长（毫秒）
     * @returns {Promise<{width: number, height: number}>}
     */
    measureImageDimensions(src, timeout = 4000) {
        return new Promise((resolve, reject) => {
            if (!src) {
                reject(new Error('缺少图片地址'));
                return;
            }
            const img = new Image();
            let timer = null;
            img.crossOrigin = 'Anonymous';
            img.decoding = 'async';
            img.onload = () => {
                if (timer) clearTimeout(timer);
                resolve({
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                });
            };
            img.onerror = (err) => {
                if (timer) clearTimeout(timer);
                reject(err || new Error('加载图片失败'));
            };
            if (timeout > 0) {
                timer = setTimeout(() => {
                    img.onload = null;
                    img.onerror = null;
                    reject(new Error('获取图片尺寸超时'));
                }, timeout);
            }
            img.src = src;
        });
    }

    /**
     * 确保图片对象上记录了尺寸信息，若无则尝试测量
     * @param {Object} imageData - 图片数据对象
     * @returns {Promise<{width: number|null, height: number|null}>}
     */
    async ensureInstagramImageDimensions(imageData) {
        if (!imageData) {
            return { width: null, height: null };
        }
        if (imageData.imageWidth && imageData.imageHeight) {
            return { width: imageData.imageWidth, height: imageData.imageHeight };
        }
        const src = this.getInstagramImageDataUrl(imageData);
        if (!src) {
            return { width: null, height: null };
        }
        try {
            const { width, height } = await this.measureImageDimensions(src);
            if (width && height) {
                imageData.imageWidth = width;
                imageData.imageHeight = height;
                return { width, height };
            }
        } catch (error) {
            console.warn('获取图片尺寸失败:', error);
        }
        return {
            width: imageData.imageWidth || null,
            height: imageData.imageHeight || null
        };
    }

    /**
     * 将输入值规范化为正整数（字符串格式）。无效或<=0则返回空串
     * @param {string|number} value
     * @returns {string}
     */
    normalizePositiveInteger(value) {
        if (value === undefined || value === null) return '';
        const parsed = parseInt(String(value).trim(), 10);
        return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '';
    }

    /**
     * 将宽高转换为最简比例字符串，例如 1024x1280 -> 4:5
     * @param {number} width
     * @param {number} height
     * @returns {string}
     */
    formatAspectRatio(width, height) {
        if (!width || !height) return '';
        const roundWidth = Math.round(width);
        const roundHeight = Math.round(height);
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(roundWidth, roundHeight) || 1;
        const simplifiedW = Math.round(roundWidth / divisor);
        const simplifiedH = Math.round(roundHeight / divisor);
        if (!simplifiedW || !simplifiedH) return '';
        return `${simplifiedW}:${simplifiedH}`;
    }

    /**
     * 构建一个包含占位符的基础轮播结构
     * @param {string[]} placeholders
     * @returns {string}
     */
    buildPlaceholderSlider(placeholders = []) {
        if (!Array.isArray(placeholders) || placeholders.length === 0) {
            return '';
        }
        const slides = placeholders.map((placeholder, idx) => `
                <div class="auto-ig-slide" data-auto-index="${idx}">
                    <img src="${placeholder}" alt="Instagram 图片 ${idx + 1}">
                </div>`).join('');
        const dots = placeholders.map((_, idx) => `
                <button class="auto-ig-dot${idx === 0 ? ' active' : ''}" data-auto-index="${idx}" aria-label="切换到第 ${idx + 1} 张"></button>`).join('');
        return `
        <section class="auto-ig-slider">
            <style>
                .auto-ig-slider {
                    position: relative;
                    overflow: hidden;
                    border-radius: 28px;
                    margin: 20px 16px 0;
                    background: linear-gradient(135deg, #151b27, #202836);
                    box-shadow: 0 15px 35px rgba(0,0,0,0.25);
                }
                .auto-ig-slider-track {
                    display: flex;
                    width: 100%;
                    transition: transform 0.4s ease;
                }
                .auto-ig-slide {
                    min-width: 100%;
                    aspect-ratio: 4 / 5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #0f172a;
                }
                .auto-ig-slide img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .auto-ig-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255,255,255,0.35);
                    color: #0f172a;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    backdrop-filter: blur(8px);
                }
                .auto-ig-nav-left { left: 14px; }
                .auto-ig-nav-right { right: 14px; }
                .auto-ig-dots {
                    position: absolute;
                    bottom: 14px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 6px;
                }
                .auto-ig-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255,255,255,0.5);
                    cursor: pointer;
                }
                .auto-ig-dot.active {
                    background: #ffffff;
                    transform: scale(1.2);
                }
                @media (max-width: 480px) {
                    .auto-ig-slider {
                        margin: 0;
                        border-radius: 0;
                    }
                }
            </style>
            <div class="auto-ig-slider-track">
                ${slides}
            </div>
            <button class="auto-ig-nav auto-ig-nav-left" aria-label="上一张">‹</button>
            <button class="auto-ig-nav auto-ig-nav-right" aria-label="下一张">›</button>
            <div class="auto-ig-dots">
                ${dots}
            </div>
            <script>
                (function() {
                    const container = document.currentScript.parentElement;
                    if (!container || !container.classList.contains('auto-ig-slider')) return;
                    const slider = container.querySelector('.auto-ig-slider-track');
                    if (!slider) return;
                    const slides = slider.querySelectorAll('.auto-ig-slide');
                    const dots = container.querySelectorAll('.auto-ig-dot');
                    const prevBtn = container.querySelector('.auto-ig-nav-left');
                    const nextBtn = container.querySelector('.auto-ig-nav-right');
                    let idx = 0;
                    const update = target => {
                        idx = (target + slides.length) % slides.length;
                        slider.style.transform = 'translateX(' + (-idx * 100) + '%)';
                        dots.forEach(dot => dot.classList.remove('active'));
                        if (dots[idx]) dots[idx].classList.add('active');
                    };
                    prevBtn?.addEventListener('click', () => update(idx - 1));
                    nextBtn?.addEventListener('click', () => update(idx + 1));
                    dots.forEach(dot => dot.addEventListener('click', () => {
                        const targetIdx = parseInt(dot.dataset.autoIndex, 10);
                        if (!Number.isNaN(targetIdx)) {
                            update(targetIdx);
                        }
                    }));
                })();
            </script>
        </section>`;
    }

    /**
     * 如果仍缺少占位符，插入自动轮播结构保证校验通过
     * @param {string} html
     * @param {string[]} placeholders
     * @returns {string}
     */
    ensurePlaceholderGallery(html, placeholders = []) {
        if (!html || !Array.isArray(placeholders) || placeholders.length === 0) {
            return html;
        }
        const missing = placeholders.some(placeholder => placeholder && !html.includes(placeholder));
        if (!missing) {
            return html;
        }
        const sliderMarkup = this.buildPlaceholderSlider(placeholders);
        if (!sliderMarkup) {
            return html;
        }
        if (/<body[^>]*>/i.test(html)) {
            return html.replace(/<body([^>]*)>/i, `<body$1>\n${sliderMarkup}`);
        }
        return `${sliderMarkup}\n${html}`;
    }

    /**
     * 归一化模型输出的图片占位符（消除多余空格或大小写差异）
     * @param {string} html
     * @param {string[]} placeholders
     * @returns {string}
     */
    normalizeInstagramPlaceholders(html, placeholders = []) {
        if (!html || !Array.isArray(placeholders) || placeholders.length === 0) {
            return html;
        }
        let normalized = html;
        placeholders.forEach(placeholder => {
            if (!placeholder) return;
            const match = placeholder.match(/^\s*\{\{\s*(.+?)\s*\}\}\s*$/);
            const inner = match ? match[1] : placeholder;
            if (!inner) return;
            const regex = new RegExp(`\\{\\{\\s*${this.escapeRegex(inner)}\\s*\\}\\}`, 'gi');
            normalized = normalized.replace(regex, placeholder);
        });
        return normalized;
    }

    /**
     * 确保HTML里存在底部文字占位符，方便后续替换
     * @param {string} html
     * @param {string} placeholder
     * @returns {string}
     */
    ensureBottomTextPlaceholder(html, placeholder = '{{底部文字}}') {
        if (!html || !placeholder) {
            return html;
        }
        if (html.includes(placeholder)) {
            return html;
        }
        const fallbackSection = `
        <section class="auto-bottom-text" style="padding: 1.5rem; background: #fff; border-top: 1px solid rgba(15,23,42,0.08); font-size: 0.95rem; line-height: 1.6;">
            ${placeholder}
        </section>`;
        if (/<body[^>]*>/i.test(html)) {
            return html.replace(/<\/body\s*>/i, `${fallbackSection}\n</body>`);
        }
        return `${html}\n${fallbackSection}`;
    }

    /**
     * 将底部文字占位符替换成真实HTML内容；若缺失则在页面底部追加
     * @param {string} html
     * @param {string} bottomTextHtml
     * @param {string} placeholder
     * @returns {string}
     */
    injectBottomTextHtml(html, bottomTextHtml, placeholder = '{{底部文字}}') {
        if (!html || !bottomTextHtml || !bottomTextHtml.trim()) {
            return html;
        }
        let content = html;
        if (placeholder && content.includes(placeholder)) {
            const regex = new RegExp(this.escapeRegex(placeholder), 'g');
            return content.replace(regex, bottomTextHtml);
        }
        const fallbackSection = `
        <section class="auto-bottom-text" style="padding: 1.5rem; background: #fff; border-top: 1px solid rgba(15,23,42,0.08); font-size: 0.95rem; line-height: 1.6;">
            ${bottomTextHtml}
        </section>`;
        if (/<body[^>]*>/i.test(content)) {
            return content.replace(/<\/body\s*>/i, `${fallbackSection}\n</body>`);
        }
        return `${content}\n${fallbackSection}`;
    }

    /**
     * 检查当前任务所有图片是否都已生成
     * @param {string} taskId
     * @returns {boolean}
     */
    areAllInstagramImagesReady(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;
        const container = document.getElementById(`instagram-image-inputs-${taskId}`);
        if (!container) {
            const bgState = this.instagramBackgroundState?.[taskId];
            if (bgState && bgState.totalImages > 0) {
                return (bgState.completedImages || 0) >= bgState.totalImages;
            }
            return false;
        }
        const items = Array.from(container.querySelectorAll('.instagram-image-input-item'));
        if (items.length === 0) return false;
        const actionableItems = items.filter(item => {
            const promptInput = item.querySelector('.instagram-image-prompt');
            const hasPrompt = !!promptInput && promptInput.value.trim().length > 0;
            const hasResult = !!item.querySelector('.instagram-image-result .instagram-image-item');
            return hasPrompt || hasResult;
        });
        if (actionableItems.length === 0) {
            const bgState = this.instagramBackgroundState?.[taskId];
            if (bgState && bgState.totalImages > 0) {
                return (bgState.completedImages || 0) >= bgState.totalImages;
            }
            return false;
        }
        return actionableItems.every(item => item.querySelector('.instagram-image-result .instagram-image-item'));
    }

    /**
     * 检查是否有底部文字可用
     * @param {Object} task
     * @returns {boolean}
     */
    hasSubmittedBottomText(task) {
        return Array.isArray(task?.data?.texts) && task.data.texts.length > 0;
    }

    /**
     * 如果图片和文案都准备好了，自动触发网页生成
     * @param {Object} task
     */
    scheduleAutoWebGeneration(task) {
        if (!task || !task.id) return;
        if (!this.hasSubmittedBottomText(task)) return;
        if (!this.areAllInstagramImagesReady(task.id)) return;
        
        if (!this.autoWebTimers) {
            this.autoWebTimers = {};
        }
        if (this.autoWebTimers[task.id]) {
            clearTimeout(this.autoWebTimers[task.id]);
        }
        this.autoWebTimers[task.id] = setTimeout(() => {
            delete this.autoWebTimers[task.id];
            const generateBtn = document.querySelector(`.generate-instagram-web-btn[data-task-id="${task.id}"]`);
            if (generateBtn) {
                generateBtn.classList.add('auto-generating');
                setTimeout(() => generateBtn.classList.remove('auto-generating'), 1200);
            }
            this.appendProcessLog(task.id, 'web', '检测到图片与文案已就绪，自动开始网页生成。', 'info');
            if (generateBtn && typeof generateBtn.click === 'function') {
                generateBtn.click();
            } else {
            this.generateInstagramWebpage(task);
            }
        }, 800);
    }

    buildInstagramFallbackPage(task, images, bottomTextHtml) {
        const sliderItems = images.map((img, idx) => {
            const src = img.imageUrl || (img.textMessage?.match(/https?:\/\/[^\s]+/) || [])[0] || '';
            return `
                <div class="ig-slide" data-index="${idx}">
                    <img src="${src}" alt="Instagram 图片 ${idx + 1}">
                </div>
            `;
        }).join('');
        
        const dots = images.map((_, idx) => `<span class="ig-dot${idx === 0 ? ' active' : ''}" data-index="${idx}"></span>`).join('');
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(task.name)} - Instagram 风格页面</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #111827, #1f2937);
            color: #0f172a;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            min-height: 100vh;
        }
        .ig-container {
            width: min(430px, 100%);
            min-height: 100vh;
            background: rgba(255,255,255,0.96);
            border-radius: 30px;
            margin: 0;
            overflow: hidden;
            box-shadow: 0 24px 60px rgba(15,23,42,0.35);
            display: flex;
            flex-direction: column;
        }
        .ig-slider-wrapper {
            position: relative;
            overflow: hidden;
            flex: 0 0 65vh;
            min-height: 320px;
            max-height: 65vh;
            background: linear-gradient(180deg, #0f172a, #1f2937);
            border-bottom-left-radius: 32px;
            border-bottom-right-radius: 32px;
        }
        .ig-slider {
            display: flex;
            transition: transform 0.4s ease;
            width: 100%;
        }
        .ig-slide {
            min-width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0f172a;
        }
        .ig-slide img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .ig-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(255,255,255,0.35);
            color: #0f172a;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            backdrop-filter: blur(6px);
        }
        .ig-nav-left { left: 12px; }
        .ig-nav-right { right: 12px; }
        .ig-dots {
            display: flex;
            justify-content: center;
            gap: 6px;
            padding: 0.9rem 0 0.8rem;
        }
        .ig-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(148,163,184,0.6);
        }
        .ig-dot.active { background: #2563eb; transform: scale(1.2); }
        .ig-content {
            flex: 1;
            min-height: 30vh;
            padding: 1.25rem 1.5rem 2.5rem;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            overflow-y: auto;
        }
        .ig-caption {
            font-size: 1rem;
            line-height: 1.6;
            word-break: break-word;
        }
        .ig-caption p {
            margin: 0 0 0.75rem 0;
        }
        @media (max-width: 640px) {
            .ig-container { border-radius: 0; }
            .ig-slider-wrapper { border-radius: 0; }
            .ig-nav { width: 34px; height: 34px; }
            .ig-dot { width: 5px; height: 5px; }
        }
    </style>
</head>
<body>
    <div class="ig-container">
        <div class="ig-slider-wrapper">
            <div class="ig-slider">
                ${sliderItems}
            </div>
            <button class="ig-nav ig-nav-left" aria-label="上一张">‹</button>
            <button class="ig-nav ig-nav-right" aria-label="下一张">›</button>
        </div>
        <div class="ig-dots">
            ${dots}
        </div>
        <div class="ig-content">
            <div class="ig-caption">
                ${bottomTextHtml}
            </div>
        </div>
    </div>
    <script>
        const slider = document.querySelector('.ig-slider');
        const slides = document.querySelectorAll('.ig-slide');
        const prevBtn = document.querySelector('.ig-nav-left');
        const nextBtn = document.querySelector('.ig-nav-right');
        const dots = document.querySelectorAll('.ig-dot');
        let currentIndex = 0;
        
        function updateSlider(index) {
            currentIndex = (index + slides.length) % slides.length;
            slider.style.transform = 'translateX(' + (-currentIndex * 100) + '%)';
            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[currentIndex]) dots[currentIndex].classList.add('active');
        }
        
        prevBtn.addEventListener('click', () => updateSlider(currentIndex - 1));
        nextBtn.addEventListener('click', () => updateSlider(currentIndex + 1));
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.dataset.index, 10) || 0;
                updateSlider(idx);
            });
        });
    </script>
</body>
</html>`;
    }
    
    async createInstagramWebHtml(task, images = [], bottomTextMarkdown = '', options = {}) {
        const logTaskId = options.logTaskId || task?.id;
        // 使用 Vertex AI，不需要 API Key
        const sortedImages = [...images];
        const bottomText = bottomTextMarkdown ? [{
            id: `bottom_text_${task?.id || Date.now()}`,
            prompt: '底部文字（保持原文）',
            content: bottomTextMarkdown
        }] : [];
        
        const systemPrompt = this.buildInstagramWebSystemPrompt(task);
        const userPrompt = [
            `任务名称：${task?.name || '海报制作任务'}`,
            '请将已生成的图片与底部文字排成一份完整的网页，沿用海报制作体系的结构与逻辑。',
            '无需额外的 Instagram 风格限制，如需特殊风格会通过提示词选项自行补充。'
        ].join('\n\n');
        
        // 使用 Vertex AI，优先使用 Instagram 任务选择的模型，否则使用任务模型选择，默认 gemini-3-pro-preview
        const modelToUse = this.getInstagramTaskModel(task) || this.getTaskModelSelection(task, 'web') || 'gemini-3-pro-preview';
        if (logTaskId) {
            this.appendProcessLog(logTaskId, 'web', `调用 ${modelToUse} 生成 HTML。`, 'info');
        }
        
        const { finalHtmlContent, rawResponse, requestPayload } = await this.buildHtmlWithPlaceholderEngine({
            prompt: userPrompt,
            images: sortedImages,
            texts: bottomText,
            systemPrompt,
            modelToUse
        });
        
        if (logTaskId) {
            this.appendProcessLog(logTaskId, 'web', '模型返回有效 HTML。', 'info');
        }
        
        return {
            htmlContent: finalHtmlContent,
            usedFallback: false,
            rawResponse,
            requestPayload,
            createdAt: Date.now()
        };
    }

    /**
     * 绑定instagram图片操作按钮
     * @param {string} taskId - 任务ID
     */
    bindInstagramImageActions(taskId, scopeElement = null) {
        const root = scopeElement && typeof scopeElement.querySelectorAll === 'function' ? scopeElement : document;
        
        // 绑定保存按钮
        root.querySelectorAll('.save-instagram-image-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const imageId = btn.dataset.imageId;
                const task = this.tasks.find(t => t.id === taskId);
                if (task && task.data && task.data.images) {
                    const image = task.data.images.find(img => img.id === imageId);
                    if (image) {
                        image.saved = true;
                        image.manualSaved = true;
                        this.saveTasks();
                        this.showInstagramStorage(taskId);
                        this.showNotification('已保存到存储容器', 'success');
                    }
                }
            });
        });
        
        // 绑定下载按钮
        root.querySelectorAll('.download-instagram-image-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const imageId = btn.dataset.imageId;
                const task = this.tasks.find(t => t.id === taskId);
                if (task && task.data && task.data.images) {
                    const image = task.data.images.find(img => img.id === imageId);
                    if (image) {
                        this.downloadInstagramImage(image);
                    }
                }
            });
        });
    }

    /**
     * 下载instagram图片
     * @param {Object} imageData - 图片数据
     */
    async downloadInstagramImage(imageData) {
        try {
            let blob;
            let filename;
            
            if (imageData.imageBase64) {
                // 从base64创建blob
                const byteCharacters = atob(imageData.imageBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const mimeType = imageData.imageMimeType || 'image/png';
                blob = new Blob([byteArray], { type: mimeType });
                const extension = mimeType.split('/')[1] || 'png';
                filename = `instagram-image-${Date.now()}.${extension}`;
            } else if (imageData.imageUrl && imageData.imageUrl.startsWith('http')) {
                // 从URL下载
                const response = await fetch(imageData.imageUrl);
                if (!response.ok) {
                    throw new Error('下载图片失败');
                }
                blob = await response.blob();
                const urlParts = imageData.imageUrl.split('/');
                filename = urlParts[urlParts.length - 1] || `instagram-image-${Date.now()}.png`;
            } else {
                this.showNotification('无法下载：图片数据不可用', 'error');
                return;
            }
            
            // 下载文件
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification(`图片已下载：${filename}`, 'success');
        } catch (error) {
            console.error('下载图片失败:', error);
            this.showNotification('下载失败：' + error.message, 'error');
        }
    }

    /**
     * 清理已保存的单次查询结果，确保仅手动保存的内容会显示
     */
    resetInstagramStorageState() {
        if (!Array.isArray(this.tasks) || this.tasks.length === 0) {
            return;
        }
        let updated = false;
        this.tasks.forEach(task => {
            if (!task || task.type !== 'instagram' || !task.data) {
                return;
            }
            ['images', 'texts'].forEach(key => {
                if (Array.isArray(task.data[key])) {
                    task.data[key].forEach(item => {
                        if (item && item.saved !== false && !item.manualSaved) {
                            item.saved = false;
                            updated = true;
                        }
                    });
                }
            });
        });
        if (updated) {
            this.saveTasks();
        }
    }

    /**
     * 显示instagram存储内容
     * @param {string} taskId - 任务ID
     */
    showInstagramStorage(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.data) return;
        
        const storageContent = document.getElementById(`instagram-storage-content-${taskId}`);
        if (!storageContent) return;
        
        const images = (task.data.images || []).filter(img => img.saved !== false);
        const texts = (task.data.texts || []).filter(txt => txt.saved !== false);
        
        if (images.length === 0 && texts.length === 0) {
            storageContent.innerHTML = '<div class="storage-empty">还没有保存的内容</div>';
            return;
        }
        
        let content = '';
        
        // 显示图片
        if (images.length > 0) {
            // 按创建时间排序（最新的在前）
            const sortedImages = [...images].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            content += sortedImages.map((img, idx) => {
                let imageHtml = '';
                let imageUrlLink = '';
                
                if (img.imageUrl && img.imageUrl.startsWith('http')) {
                    imageHtml = `<div class="storage-image-preview" style="margin-top: 0.75rem;">${this.formatMarkdown(`[点击查看图片](${img.imageUrl})`)}</div>`;
                    imageUrlLink = `
                        <div class="image-url-link-container" style="margin-top: 0.75rem;">
                            ${this.formatMarkdown(`[查看原图](${img.imageUrl})`)}
                        </div>
                    `;
                } else if (img.imageUrl && img.imageUrl.startsWith('data:')) {
                    imageHtml = `<div class="storage-image-preview" style="margin-top: 0.75rem;"><img src="${img.imageUrl}" alt="生成的图片" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>`;
                    imageUrlLink = `
                        <div class="image-url-link-container" style="margin-top: 0.75rem;">
                            ${this.formatMarkdown(`[在新窗口查看原图](${img.imageUrl})`)}
                        </div>
                    `;
                } else if (img.textMessage) {
                    imageHtml = `<div class="storage-text-content" style="margin-top: 0.75rem;">${this.formatMarkdown(img.textMessage)}</div>`;
                    const urlMatch = img.textMessage.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                        imageUrlLink = `
                            <div class="image-url-link-container" style="margin-top: 0.75rem;">
                                ${this.formatMarkdown(`[查看原图](${urlMatch[0]})`)}
                            </div>
                        `;
                    }
                } else {
                    imageHtml = '<div class="storage-note" style="margin-top: 0.75rem; padding: 0.5rem; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; color: #92400e; font-size: 0.85rem;">图片数据未保存（为节省存储空间，base64图片数据不会保存到本地）</div>';
                }
                
                return `
                    <div class="storage-item" data-item-id="${img.id}" data-item-type="images">
                        <div class="storage-item-header">
                            <span class="storage-item-title">图片 ${idx + 1}</span>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="storage-item-time">${new Date(img.createdAt).toLocaleString('zh-CN')}</span>
                                <button class="download-storage-image-btn" data-image-id="${img.id}" data-task-id="${taskId}" title="下载图片">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="delete-storage-item-btn" data-item-id="${img.id}" data-item-type="images" data-task-id="${taskId}" title="删除此项">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="storage-item-content">
                            <div class="storage-prompt"><strong>提示词：</strong>${this.escapeHtml(img.prompt)}</div>
                            ${imageHtml}
                            ${imageUrlLink}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // 显示文字
        if (texts.length > 0) {
            const sortedTexts = [...texts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            content += sortedTexts.map((txt, idx) => `
                <div class="storage-item" data-item-id="${txt.id}" data-item-type="texts">
                    <div class="storage-item-header">
                        <span class="storage-item-title">文案 ${idx + 1}</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="storage-item-time">${new Date(txt.createdAt).toLocaleString('zh-CN')}</span>
                            <button class="delete-storage-item-btn" data-item-id="${txt.id}" data-item-type="texts" data-task-id="${taskId}" title="删除此项">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="storage-item-content">
                        <div class="storage-prompt"><strong>提示词：</strong>${this.escapeHtml(txt.prompt)}</div>
                        <div class="storage-text-content">${this.formatMarkdown(txt.content)}</div>
                    </div>
                </div>
            `).join('');
        }
        
        storageContent.innerHTML = content;
        
        // 绑定删除和下载按钮
        storageContent.querySelectorAll('.delete-storage-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.itemId;
                const itemType = btn.dataset.itemType;
                if (confirm('确定要删除此项吗？')) {
                    this.deleteInstagramStorageItem(taskId, itemId, itemType);
                }
            });
        });
        
        storageContent.querySelectorAll('.download-storage-image-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const imageId = btn.dataset.imageId;
                const task = this.tasks.find(t => t.id === taskId);
                if (task && task.data && task.data.images) {
                    const image = task.data.images.find(img => img.id === imageId);
                    if (image) {
                        this.downloadInstagramImage(image);
                    }
                }
            });
        });
    }

    /**
     * 加载已存储的instagram内容
     * @param {Object} task - 任务对象
     */
    loadInstagramStoredContent(task) {
        // 具体实现在showInstagramStorage中
        this.showInstagramStorage(task.id);
    }

    /**
     * 清空instagram存储内容
     * @param {string} taskId - 任务ID
     */
    clearInstagramStorage(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        if (task.data.images) {
            task.data.images = task.data.images.filter(img => img.saved === false);
        }
        if (task.data.texts) {
            task.data.texts = task.data.texts.filter(txt => txt.saved === false);
        }
        
        this.saveTasks();
        this.showInstagramStorage(taskId);
        this.showNotification('已清空所有存储内容', 'success');
    }

    /**
     * 删除单个instagram存储项
     * @param {string} taskId - 任务ID
     * @param {string} itemId - 项ID
     * @param {string} itemType - 项类型：images 或 texts
     */
    deleteInstagramStorageItem(taskId, itemId, itemType = 'images') {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        if (itemType === 'images' && task.data.images) {
            const item = task.data.images.find(img => img.id === itemId);
            if (item) {
                item.saved = false;
            }
        } else if (itemType === 'texts' && task.data.texts) {
            const item = task.data.texts.find(txt => txt.id === itemId);
            if (item) {
                item.saved = false;
            }
        } else if (itemType === 'batchThumbnails' && task.data.styleBatchThumbnails) {
            task.data.styleBatchThumbnails = task.data.styleBatchThumbnails.filter(thumb => thumb.id !== itemId);
        }
        
        this.saveTasks();
        this.showInstagramStorage(taskId);
        this.showNotification('已删除', 'success');
    }

    /**
     * 初始化提示词编辑器
     */
    initPromptEditor() {
        if (this.promptEditorInitialized) return;
        const overlay = document.createElement('div');
        overlay.id = 'prompt-editor-overlay';
        overlay.innerHTML = `
            <div class="prompt-editor-backdrop">
                <div class="prompt-editor-modal">
                    <div class="prompt-editor-header">
                        <h4 class="prompt-editor-title">编辑提示词</h4>
                        <button class="prompt-editor-close" title="关闭">&times;</button>
                    </div>
                    <textarea class="prompt-editor-textarea" placeholder="输入系统提示词..."></textarea>
                    <div class="prompt-editor-actions">
                        <button class="prompt-editor-cancel">取消</button>
                        <button class="prompt-editor-save">保存</button>
                    </div>
                </div>
            </div>
        `;
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        
        this.promptEditorOverlay = overlay;
        this.promptEditorTextarea = overlay.querySelector('.prompt-editor-textarea');
        this.promptEditorTitle = overlay.querySelector('.prompt-editor-title');
        overlay.querySelector('.prompt-editor-close').addEventListener('click', () => this.closePromptEditor());
        overlay.querySelector('.prompt-editor-cancel').addEventListener('click', () => this.closePromptEditor());
        overlay.querySelector('.prompt-editor-save').addEventListener('click', () => this.savePromptEditor());
        this.promptEditorInitialized = true;
    }
    
    /**
     * 打开提示词编辑器
     * @param {string} type
     */
    openPromptEditor(type) {
        if (!type) return;
        this.initPromptEditor();
        const map = {
            'instagram-designer': { key: 'designer', label: `${DESIGNER_LABEL} 系统提示词` },
            'instagram-image': { key: 'image', label: '图片生成系统提示词' },
            'instagram-text': { key: 'text', label: '底部文字系统提示词' },
            'instagram-web': { key: 'web', label: '网页生成系统提示词' },
            'instagram-engineer': { key: 'engineer', label: `${ENGINEER_LABEL} 系统提示词` }
        };
        const config = map[type];
        if (!config) return;
        this.currentPromptEditingType = config.key;
        if (this.promptEditorTitle) {
            this.promptEditorTitle.textContent = config.label;
        }
        if (this.promptEditorTextarea) {
            this.promptEditorTextarea.value = this.getInstagramPromptValue(config.key);
        }
        if (this.promptEditorOverlay) {
            this.promptEditorOverlay.style.display = 'block';
        }
    }
    
    /**
     * 关闭提示词编辑器
     */
    closePromptEditor() {
        if (this.promptEditorOverlay) {
            this.promptEditorOverlay.style.display = 'none';
        }
        this.currentPromptEditingType = null;
    }
    
    /**
     * 保存提示词编辑内容
     */
    savePromptEditor() {
        if (!this.currentPromptEditingType || !this.promptEditorTextarea) {
            this.closePromptEditor();
            return;
        }
        const newValue = this.promptEditorTextarea.value || '';
        this.instagramPrompts[this.currentPromptEditingType] = newValue.trim();
        this.saveInstagramPromptSettings();
        this.syncInstagramPromptInputs();
        this.closePromptEditor();
        this.showNotification('提示词已更新', 'success');
    }
    
    /**
     * 读取已保存的提示词
     */
    loadInstagramPromptSettings() {
        try {
            const saved = localStorage.getItem('gemini-instagram-prompts');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    this.instagramPrompts = {
                        ...this.instagramPrompts,
                        ...parsed
                    };
                }
            }
        } catch (error) {
            console.warn('加载Instagram提示词失败:', error);
        }
    }

    /**
     * 从后端读取文件化 Instagram 工作流提示词（优先级最高）
     */
    async loadInstagramPromptFiles() {
        try {
            const response = await fetch('/api/instagram-prompts');
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            if (!data?.success || !data?.prompts || typeof data.prompts !== 'object') {
                return;
            }
            const normalized = {};
            ['designer', 'engineer', 'image', 'text', 'web'].forEach(key => {
                const value = data.prompts[key];
                if (typeof value === 'string' && value.trim()) {
                    normalized[key] = value.trim();
                }
            });
            const visualRules = typeof data.visual_rules === 'string' ? data.visual_rules.trim() : '';
            if (visualRules) {
                this.instagramVisualRules = visualRules;
                ['designer', 'engineer', 'image'].forEach(key => {
                    const base = normalized[key] || this.instagramPrompts[key] || '';
                    if (base && !base.includes('[视觉规则]')) {
                        normalized[key] = `${base}\n\n[视觉规则]\n${visualRules}`.trim();
                    }
                });
            }
            if (Object.keys(normalized).length > 0) {
                this.instagramPrompts = {
                    ...this.instagramPrompts,
                    ...normalized
                };
                this.syncInstagramPromptInputs();
                console.info('Instagram workflow prompts loaded from files.');
            }
            if (Array.isArray(data.style_presets) && data.style_presets.length > 0) {
                this.stylePresets = data.style_presets;
                this.saveStylePresets();
                console.info('Instagram style presets loaded from files.');
            }
        } catch (error) {
            console.warn('读取 Instagram 文件提示词失败:', error);
        }
    }
    
    /**
     * 保存提示词
     */
    saveInstagramPromptSettings() {
        try {
            this.safeSetItem('gemini-instagram-prompts', this.instagramPrompts);
        } catch (error) {
            console.warn('保存Instagram提示词失败:', error);
        }
    }

    /**
     * 将 Instagram 提示词与设置面板保持同步
     */
    syncInstagramPromptInputs() {
        const mapping = [
            { element: this.instagramDesignerPromptInput, key: 'designer' },
            { element: this.instagramEngineerPromptInput, key: 'engineer' },
            { element: this.instagramImagePromptSettingInput, key: 'image' },
            { element: this.instagramTextPromptSettingInput, key: 'text' }
        ];
        mapping.forEach(({ element, key }) => {
            if (element) {
                element.value = this.getInstagramPromptValue(key);
            }
        });
    }
    
    /**
     * 获取提示词（带默认值）
     * @param {string} key
     * @returns {string}
     */
    getInstagramPromptValue(key) {
        return (this.instagramPrompts && this.instagramPrompts[key]) || this.defaultInstagramPrompts[key] || '';
    }

    /**
     * 从Gemini响应候选中提取首个非空文本
     * @param {Object} responseData - Gemini API响应数据
     * @returns {string} 文本内容
     */
    extractTextFromCandidates(responseData) {
        if (!responseData || !Array.isArray(responseData.candidates)) {
            if (responseData?.promptFeedback?.blockReason) {
                console.warn('Gemini prompt blocked:', responseData.promptFeedback);
            }
            console.warn('extractTextFromCandidates: 无效的响应数据', {
                hasResponseData: !!responseData,
                hasCandidates: !!responseData?.candidates,
                candidatesIsArray: Array.isArray(responseData?.candidates),
                responseData
            });
            return '';
        }
        for (const candidate of responseData.candidates) {
            // 检查finishReason
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                console.warn('extractTextFromCandidates: finishReason不是STOP', {
                    finishReason: candidate.finishReason,
                    candidate
                });
            }
            
            const parts = candidate?.content?.parts;
            if (!Array.isArray(parts) || parts.length === 0) {
                console.warn('extractTextFromCandidates: parts无效', {
                    hasContent: !!candidate?.content,
                    hasParts: !!candidate?.content?.parts,
                    partsIsArray: Array.isArray(candidate?.content?.parts),
                    partsLength: candidate?.content?.parts?.length,
                    candidate
                });
                continue;
            }
            const buffer = parts.map(part => {
                if (typeof part.text === 'string' && part.text.trim()) {
                    return part.text.trim();
                }
                if (part.functionCall) {
                    try {
                        return `[functionCall:${part.functionCall.name}] ${JSON.stringify(part.functionCall.args || {}, null, 2)}`;
                    } catch (err) {
                        return `[functionCall:${part.functionCall.name}]`;
                    }
                }
                if (part.inlineData && part.inlineData.mimeType) {
                    return `[inlineData:${part.inlineData.mimeType}]`;
                }
                if (part.executableCode) {
                    return `[code:${part.executableCode.language}] ${part.executableCode.code || ''}`;
                }
                if (typeof part === 'string' && part.trim()) {
                    return part.trim();
                }
                return '';
            }).filter(Boolean);
            const text = buffer.join('\n').trim();
            if (text) {
                console.log('extractTextFromCandidates: 成功提取文本', {
                    textLength: text.length,
                    textPreview: text.substring(0, 100)
                });
                return text;
            } else {
                console.warn('extractTextFromCandidates: 提取的文本为空', {
                    partsCount: parts.length,
                    parts: parts.map(p => ({
                        hasText: typeof p.text === 'string',
                        textLength: typeof p.text === 'string' ? p.text.length : 0,
                        hasFunctionCall: !!p.functionCall,
                        hasInlineData: !!p.inlineData,
                        partType: Object.keys(p)
                    }))
                });
            }
        }
        console.warn('extractTextFromCandidates: 所有candidates都未提取到文本', {
            candidatesCount: responseData.candidates.length,
            candidates: responseData.candidates.map(c => ({
                hasContent: !!c.content,
                hasParts: !!c.content?.parts,
                partsCount: c.content?.parts?.length || 0,
                finishReason: c.finishReason
            }))
        });
        return '';
    }

    /**
     * 格式化Gemini拦截原因，便于展示给用户
     * @param {Object} promptFeedback
     * @returns {string}
     */
    formatPromptBlockMessage(promptFeedback) {
        if (!promptFeedback) {
            return '';
        }
        const parts = [];
        if (promptFeedback.blockReason) {
            const reasonMap = {
                SAFETY: '安全策略限制',
                OTHER: '其它策略限制',
                BLOCKLIST: '词表拦截'
            };
            parts.push(reasonMap[promptFeedback.blockReason] || promptFeedback.blockReason);
        }
        if (Array.isArray(promptFeedback.safetyRatings) && promptFeedback.safetyRatings.length) {
            const triggered = promptFeedback.safetyRatings
                .filter(rating => {
                    const probability = typeof rating.probability === 'string' ? rating.probability.toUpperCase() : '';
                    const criticalProbabilities = ['MEDIUM', 'HIGH', 'VERY_HIGH', 'VERY_LIKELY'];
                    return rating.blocked || (probability && criticalProbabilities.includes(probability));
                })
                .map(rating => {
                    const readableCategory = this.translateSafetyCategory(rating.category);
                    if (rating.probability) {
                        return `${readableCategory}(${rating.probability})`;
                    }
                    return readableCategory;
                });
            if (triggered.length) {
                parts.push(`触发分类：${triggered.join('、')}`);
            }
        }
        return parts.join('，');
    }

    /**
     * 将Safety分类码转换为可读中文
     * @param {string} category
     * @returns {string}
     */
    translateSafetyCategory(category) {
        if (!category) {
            return '';
        }
        const map = {
            HARM_CATEGORY_HARASSMENT: '骚扰/辱骂',
            HARM_CATEGORY_HATE_SPEECH: '仇恨言论',
            HARM_CATEGORY_SEXUAL: '敏感性描述',
            HARM_CATEGORY_DANGEROUS_CONTENT: '危险内容',
            HARM_CATEGORY_VIOLENCE: '暴力内容',
            HARM_CATEGORY_CIVIC_INTEGRITY: '公民完整性',
            HARM_CATEGORY_MEDICAL: '医疗建议',
            HARM_CATEGORY_ILLEGAL_ACTIVITY: '违法活动',
            HARM_CATEGORY_PII: '个人隐私',
            HARM_CATEGORY_TERRORISM: '恐怖主义',
            HARM_CATEGORY_SELF_HARM: '自残/自杀'
        };
        return map[category] || category;
    }

    /**
     * 加载风格预设
     */
    loadStylePresets() {
        try {
            const saved = localStorage.getItem('gemini-style-presets');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    this.stylePresets = parsed;
                }
            }
        } catch (error) {
            console.warn('加载风格预设失败:', error);
        }
        
        if (!Array.isArray(this.stylePresets) || this.stylePresets.length === 0) {
            this.stylePresets = [...this.defaultStylePresets];
            this.saveStylePresets();
        }
    }
    
    /**
     * 保存风格预设
     */
    saveStylePresets() {
        try {
            this.safeSetItem('gemini-style-presets', this.stylePresets);
        } catch (error) {
            console.warn('保存风格预设失败:', error);
        }
    }
    
    /**
     * 新增一个风格
     */
    addStylePreset() {
        const newStyle = {
            id: 'style_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: '自定义风格',
            content: '在这里描述该风格的视觉、语气或排版要求。'
        };
        this.stylePresets.push(newStyle);
        this.saveStylePresets();
        this.showNotification('已新增风格，可在列表中编辑。', 'success');
        return newStyle.id;
    }
    
    /**
     * 更新风格
     */
    updateStylePreset(styleId, updates = {}) {
        const index = this.stylePresets.findIndex(style => style.id === styleId);
        if (index === -1) return;
        this.stylePresets[index] = {
            ...this.stylePresets[index],
            ...updates
        };
        this.saveStylePresets();
    }
    
    /**
     * 删除风格
     */
    deleteStylePreset(styleId) {
        this.stylePresets = this.stylePresets.filter(style => style.id !== styleId);
        this.saveStylePresets();
    }
    
    /**
     * 渲染风格选择器
     * @param {Object} task
     */
    renderStyleSelector(task) {
        const container = document.getElementById(`style-card-list-${task.id}`);
        if (!container) return;
        if (!Array.isArray(this.stylePresets) || this.stylePresets.length === 0) {
            this.stylePresets = [...this.defaultStylePresets];
            this.saveStylePresets();
        }
        
        container.innerHTML = this.stylePresets.map(style => {
            const selected = task.data?.selectedStyleId === style.id;
            const summary = (style.content || '').slice(0, 80) + ((style.content || '').length > 80 ? '...' : '');
            return `
                <div class="style-card ${selected ? 'selected' : ''}" data-style-id="${style.id}">
                    <div class="style-card-header">
                        <div class="style-card-title">
                            <span class="style-title-text">${this.escapeHtml(style.title || '未命名风格')}</span>
                            ${selected ? '<span class="style-selected-tag">已应用</span>' : ''}
                        </div>
                        <div class="style-card-actions">
                            <button class="style-select-btn" data-style-id="${style.id}" title="应用此风格">
                                <i class="fas fa-check-circle"></i> 选择
                            </button>
                            <button class="style-expand-btn" data-style-id="${style.id}" title="展开编辑">
                                <i class="fas fa-pen"></i>
                            </button>
                        </div>
                    </div>
                    <div class="style-card-body">
                        <p class="style-preview">${this.escapeHtml(summary || '尚未填写内容')}</p>
                        <div class="style-editor" data-style-id="${style.id}">
                            <label>风格标题</label>
                            <input type="text" class="style-title-input" data-style-id="${style.id}" value="${this.escapeHtml(style.title || '')}">
                            <label>风格内容</label>
                            <textarea class="style-content-input" data-style-id="${style.id}" rows="4">${this.escapeHtml(style.content || '')}</textarea>
                            <div class="style-editor-actions">
                                <button class="style-save-btn" data-style-id="${style.id}">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                                <button class="style-delete-btn" data-style-id="${style.id}">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.style-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const styleId = btn.dataset.styleId;
                this.selectStyleForTask(task, styleId);
            });
        });
        
        container.querySelectorAll('.style-expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.style-card');
                if (card) {
                    card.classList.toggle('expanded');
                }
            });
        });
        
        container.querySelectorAll('.style-save-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const styleId = btn.dataset.styleId;
                const titleInput = container.querySelector(`.style-title-input[data-style-id="${styleId}"]`);
                const contentInput = container.querySelector(`.style-content-input[data-style-id="${styleId}"]`);
                this.updateStylePreset(styleId, {
                    title: titleInput ? titleInput.value.trim() : '',
                    content: contentInput ? contentInput.value.trim() : ''
                });
                this.renderStyleSelector(task);
                this.showNotification('风格已保存', 'success');
            });
        });
        
        container.querySelectorAll('.style-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const styleId = btn.dataset.styleId;
                if (confirm('确定删除该风格吗？')) {
                    this.deleteStylePreset(styleId);
                    if (task.data && task.data.selectedStyleId === styleId) {
                        task.data.selectedStyleId = null;
                        this.saveTasks();
                    }
                    this.renderStyleSelector(task);
                    this.showNotification('风格已删除', 'info');
                }
            });
        });
    }
    
    /**
     * 为任务选择风格
     */
    selectStyleForTask(task, styleId) {
        if (!task.data) {
            task.data = {};
        }
        task.data.selectedStyleId = styleId;
        task.updatedAt = Date.now();
        this.saveTasks();
        this.renderStyleSelector(task);
        const style = this.stylePresets.find(s => s.id === styleId);
        this.showNotification(`已应用风格：${style?.title || '未命名'}`, 'success');
    }

    /**
     * 取前N个主打风格
     * @param {number} limit
     * @returns {Array}
     */
    getPrimaryStylePresets(limit = null) {
        const source = (this.stylePresets && this.stylePresets.length > 0) ? this.stylePresets : this.defaultStylePresets;
        if (typeof limit === 'number' && limit > 0) {
            return source.slice(0, limit);
        }
        return source;
    }
    
    /**
     * 渲染风格批量任务弹窗
     */
    renderStyleBatchModal(task) {
        const presets = this.getPrimaryStylePresets();
        if (!presets.length) {
            return '';
        }
        const inputsHtml = presets.map(style => this.renderStyleBatchInput(task, style)).join('');
        const resultsHtml = this.renderStyleBatchResultsHtml(task);
        return `
        <div class="style-batch-modal" id="style-batch-modal-${task.id}">
            <div class="style-batch-modal-content">
                <div class="style-batch-modal-header">
                    <div>
                        <h4><i class="fas fa-layer-group"></i> 风格批量任务</h4>
                        <p>为 5 种风格分别粘贴 JSON（键名需为“主题1/主题2/... ...”），即可一次性生成多套方案。</p>
                    </div>
                    <button class="close-style-batch-btn" data-task-id="${task.id}" title="关闭">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="style-batch-inputs">
                    ${inputsHtml}
                </div>
                <div class="style-batch-actions">
                    <div class="style-batch-hint">格式示例：{"主题1":"展示星空连衣裙的氛围感大片","主题2":"突出工艺细节的局部特写"}</div>
                    <button class="run-style-batch-btn" data-task-id="${task.id}">
                        <i class="fas fa-play"></i> 并行生成设计方案
                    </button>
                    <button class="stop-style-batch-btn" data-task-id="${task.id}" style="display: none;">
                        <i class="fas fa-stop"></i> 停止批量运行
                    </button>
                    <button class="download-style-batch-html-btn" data-task-id="${task.id}">
                        <i class="fas fa-file-download"></i> 下载本次HTML
                    </button>
                    <button class="clear-style-batch-history-btn" data-task-id="${task.id}">
                        <i class="fas fa-trash-alt"></i> 清空历史记录
                    </button>
                    <div class="style-batch-status" id="style-batch-status-${task.id}"></div>
                </div>
                <div class="style-batch-progress" id="style-batch-progress-${task.id}">
                    ${this.renderStyleBatchProgressHtml(task.id)}
                </div>
                <div class="style-batch-results" id="style-batch-results-${task.id}">
                    ${resultsHtml}
                </div>
            </div>
        </div>`;
    }
    
    /**
     * 渲染单个风格批量输入块
     * @param {Object} task
     * @param {Object} style
     */
    renderStyleBatchInput(task, style) {
        const value = (task?.data?.styleBatchInputs?.[style.id] || '').trim();
        const isCurrent = task?.data?.selectedStyleId === style.id;
        return `
        <div class="style-batch-item" data-style-id="${style.id}">
            <div class="style-batch-item-header">
                <div class="style-batch-item-title">
                    <strong>${this.escapeHtml(style.title || '未命名风格')}</strong>
                    ${isCurrent ? '<span class="style-batch-current">当前默认</span>' : ''}
                </div>
                <small>${this.escapeHtml(style.content || '')}</small>
            </div>
            <textarea class="style-batch-textarea" data-style-batch-input="${style.id}" placeholder='{"主题1":"...","主题2":"..."}'>${this.escapeHtml(value)}</textarea>
        </div>
        `;
    }
    
    /**
     * 渲染批量结果列表
     * @param {Object} task
     * @returns {string}
     */
    renderStyleBatchResultsHtml(task) {
        const allEntries = task?.data?.styleBatchResults || [];
        const latestRunId = task?.data?.styleBatchLastRunId || '';
        const buildActions = (entry, previewUrl) => {
            if (!task?.id) {
                return '';
            }
            const hasHtml = !!(entry?.htmlContent && entry.htmlContent.trim());
            const hasImages = !!(entry?.imageResults && entry.imageResults.length > 0);
            const actions = [];
            if (hasHtml) {
                actions.push(`<button class="style-batch-download-entry-btn" data-task-id="${task.id}" data-entry-id="${entry.id}" type="button"><i class="fas fa-file-download"></i> 下载HTML</button>`);
            }
            if (hasImages) {
                actions.push(`<button class="style-batch-download-images-btn" data-task-id="${task.id}" data-entry-id="${entry.id}" data-theme-key="${this.escapeHtml(entry.themeKey || '')}" type="button"><i class="fas fa-images"></i> 下载所有图片</button>`);
            }
            if (previewUrl) {
                actions.push(`<a class="style-batch-preview-link" href="${previewUrl}" target="_blank" rel="noopener">打开预览</a>`);
            }
            if (!actions.length) {
                return '';
            }
            return `<div class="style-batch-result-actions">${actions.join('')}</div>`;
        };
        let latestEntries = allEntries;
        let historyEntries = [];
        if (latestRunId) {
            latestEntries = allEntries.filter(entry => entry.runId === latestRunId);
            historyEntries = allEntries.filter(entry => entry.runId !== latestRunId);
            if (!latestEntries.length && allEntries.length) {
                // 如果找不到对应runId，回退为全部展示
                latestEntries = allEntries;
                historyEntries = [];
            }
        }
        const entries = latestEntries.slice(0, 12);
        if (!entries.length) {
            return '<div class="style-batch-result-empty">还没有批量生成记录</div>';
        }
        const renderItems = entries.map(entry => {
            const primaryTitle = entry.styleTitle || entry.themeKey || entry.themeText || '';
            const previewUrl = this.getStyleBatchResultPreviewUrl(task.id, entry);
            const detailsId = `style-batch-details-${entry.id}`;
            const hasDetails = !!(entry.themeText || entry.styleTitle || entry.designerPrompt || entry.engineerPrompt);
            return `
            <div class="style-batch-result-item">
                <div class="style-batch-result-meta">
                    <span>${this.escapeHtml(primaryTitle)}</span>
                    <span>${this.escapeHtml(entry.themeKey || '')}</span>
                    <span>${new Date(entry.createdAt || Date.now()).toLocaleString('zh-CN')}</span>
                    ${hasDetails ? `<button class="style-batch-details-toggle" data-details-id="${detailsId}" type="button" title="查看详细信息"><i class="fas fa-info-circle"></i></button>` : ''}
                </div>
                ${hasDetails ? `
                <div class="style-batch-result-details" id="${detailsId}" style="display: none;">
                    <div class="style-batch-detail-section">
                        <strong>来源指令：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.themeText || '无')}</div>
                    </div>
                    <div class="style-batch-detail-section">
                        <strong>使用风格：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.styleTitle || entry.styleId || '无')}</div>
                    </div>
                    ${entry.styleAppend ? `
                    <div class="style-batch-detail-section">
                        <strong>风格追加内容：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.styleAppend)}</div>
                    </div>
                    ` : ''}
                    <div class="style-batch-detail-section">
                        <strong>设计师 Prompt：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.designerPrompt || '无')}</div>
                        ${entry.designerModel ? `<small>模型：${this.escapeHtml(entry.designerModel)}</small>` : ''}
                    </div>
                    <div class="style-batch-detail-section">
                        <strong>工程师 Prompt：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.engineerPrompt || '无')}</div>
                        ${entry.engineerModel ? `<small>模型：${this.escapeHtml(entry.engineerModel)}</small>` : ''}
                    </div>
                </div>
                ` : ''}
                <div class="style-batch-result-body">${this.formatMarkdown(entry.plan || '')}</div>
                ${buildActions(entry, previewUrl)}
            </div>
        `;
        }).join('');
        if (!historyEntries.length) {
            return renderItems;
        }
        const historyHtml = historyEntries.slice(0, 8).map(entry => {
            const primaryTitle = entry.styleTitle || entry.themeKey || entry.themeText || '';
            const previewUrl = this.getStyleBatchResultPreviewUrl(task.id, entry);
            const detailsId = `style-batch-details-${entry.id}`;
            const hasDetails = !!(entry.themeText || entry.styleTitle || entry.designerPrompt || entry.engineerPrompt);
            return `
            <div class="style-batch-result-item history">
                <div class="style-batch-result-meta">
                    <span>${this.escapeHtml(primaryTitle)}</span>
                    <span>${this.escapeHtml(entry.themeKey || '')}</span>
                    <span>${new Date(entry.createdAt || Date.now()).toLocaleString('zh-CN')}</span>
                    ${hasDetails ? `<button class="style-batch-details-toggle" data-details-id="${detailsId}" type="button" title="查看详细信息"><i class="fas fa-info-circle"></i></button>` : ''}
                </div>
                ${buildActions(entry, previewUrl)}
                ${hasDetails ? `
                <div class="style-batch-result-details" id="${detailsId}" style="display: none;">
                    <div class="style-batch-detail-section">
                        <strong>来源指令：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.themeText || '无')}</div>
                    </div>
                    <div class="style-batch-detail-section">
                        <strong>使用风格：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.styleTitle || entry.styleId || '无')}</div>
                    </div>
                    ${entry.styleAppend ? `
                    <div class="style-batch-detail-section">
                        <strong>风格追加内容：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.styleAppend)}</div>
                    </div>
                    ` : ''}
                    <div class="style-batch-detail-section">
                        <strong>设计师 Prompt：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.designerPrompt || '无')}</div>
                        ${entry.designerModel ? `<small>模型：${this.escapeHtml(entry.designerModel)}</small>` : ''}
                    </div>
                    <div class="style-batch-detail-section">
                        <strong>工程师 Prompt：</strong>
                        <div class="style-batch-detail-content">${this.escapeHtml(entry.engineerPrompt || '无')}</div>
                        ${entry.engineerModel ? `<small>模型：${this.escapeHtml(entry.engineerModel)}</small>` : ''}
                    </div>
                </div>
                ` : ''}
                <div class="style-batch-result-body">${this.formatMarkdown(entry.plan || '')}</div>
                ${buildActions(entry, previewUrl)}
            </div>
        `;
        }).join('');
        return `
            ${renderItems}
            <details class="style-batch-history">
                <summary>展开历史记录（${historyEntries.length} 条）</summary>
                ${historyHtml}
            </details>
        `;
    }
    
    renderStyleBatchProgressHtml(taskId) {
        const entries = Object.values(this.styleBatchProgress?.[taskId] || {});
        if (!entries.length) {
            return '<div class="style-batch-progress-empty">暂无进行中的任务</div>';
        }
        return entries.map(entry => {
            const progressCacheKey = this.getStyleBatchProgressCacheKey(taskId, entry.jobId);
            const previewUrl = entry.htmlContent
                ? this.getCachedHtmlPreviewUrl(progressCacheKey, entry.htmlContent)
                : (entry.previewUrl || '');
            const primaryTitle = entry.styleTitle || entry.themeKey || entry.themeText || '';
            return `
            <div class="style-batch-progress-card" data-status="${entry.status || 'pending'}">
                <div class="style-batch-progress-meta">
                    <span>${this.escapeHtml(primaryTitle)}</span>
                    <span>${this.escapeHtml(entry.themeKey || '')}</span>
                </div>
                <div class="style-batch-progress-step">${this.escapeHtml(entry.step || '等待中')}</div>
                ${previewUrl ? `<a class="style-batch-preview-link" href="${previewUrl}" target="_blank" rel="noopener">打开预览</a>` : ''}
            </div>
        `;
        }).join('');
    }
    
    refreshStyleBatchProgress(taskId) {
        const container = document.getElementById(`style-batch-progress-${taskId}`);
        if (!container) return;
        container.innerHTML = this.renderStyleBatchProgressHtml(taskId);
    }
    
    refreshStyleBatchResults(task) {
        const container = document.getElementById(`style-batch-results-${task.id}`);
        if (!container) return;
        container.innerHTML = this.renderStyleBatchResultsHtml(task);
    }
    
    clearStyleBatchHistory(task) {
        if (!task) return;
        if (!task.data) {
            task.data = {};
        }
        const hasHistory = Array.isArray(task.data.styleBatchResults) && task.data.styleBatchResults.length > 0;
        if (!hasHistory) {
            this.showNotification('当前没有批量历史记录', 'info');
            return;
        }
        if (!confirm('确定清空全部风格批量历史记录吗？此操作不可恢复。')) {
            return;
        }
        task.data.styleBatchResults = [];
        task.data.styleBatchLastRunId = '';
        task.data.styleBatchLastRunStartedAt = 0;
        if (this.styleBatchCurrentRunIds) {
            delete this.styleBatchCurrentRunIds[task.id];
        }
        this.clearCachedHtmlPreviewUrlsByPrefix(`style-result:${task.id}:`);
        this.saveTasks();
        this.refreshStyleBatchResults(task);
        this.showNotification('风格批量历史已清空', 'success');
    }
    
    ensureStyleBatchProgress(taskId) {
        if (!this.styleBatchProgress) {
            this.styleBatchProgress = {};
        }
        if (!this.styleBatchProgress[taskId]) {
            this.styleBatchProgress[taskId] = {};
        }
    }
    
    resetStyleBatchProgress(taskId, jobs = []) {
        this.ensureStyleBatchProgress(taskId);
        const buffer = {};
        if (taskId) {
            this.clearCachedHtmlPreviewUrlsByPrefix(`style-progress:${taskId}:`);
        }
        jobs.forEach(job => {
            const primaryTitle = job.styleTitle || job.style?.title || job.themeKey || job.themeText || '';
            buffer[job.jobId] = {
                jobId: job.jobId,
                styleTitle: primaryTitle,
                styleId: job.style?.id || '',
                themeKey: job.themeKey,
                themeText: job.themeText,
                status: 'pending',
                step: '排队中',
                previewUrl: ''
            };
        });
        this.styleBatchProgress[taskId] = buffer;
        this.refreshStyleBatchProgress(taskId);
    }
    
    updateStyleBatchProgress(taskId, jobId, updates = {}) {
        this.ensureStyleBatchProgress(taskId);
        if (!this.styleBatchProgress[taskId][jobId]) {
            this.styleBatchProgress[taskId][jobId] = {};
        }
        this.styleBatchProgress[taskId][jobId] = {
            jobId,
            ...this.styleBatchProgress[taskId][jobId],
            ...updates
        };
        this.refreshStyleBatchProgress(taskId);
    }
    
    buildStyleBatchPreviewHtml(job, planText) {
        const title = this.escapeHtml(`${job.styleTitle || job.style?.title || '风格'} · ${job.themeKey || ''}`);
        const meta = this.escapeHtml(job.themeText || '');
        const planHtml = this.formatMarkdown(planText || '');
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;background:#f8fafc;margin:0;padding:0;color:#0f172a;}
.page{max-width:860px;margin:0 auto;padding:2.5rem 1.5rem;}
.card{background:#fff;border-radius:20px;box-shadow:0 20px 45px rgba(15,23,42,0.12);padding:2rem;}
.card h1{margin-top:0;color:#111827;font-size:1.75rem;}
.meta{color:#6b7280;margin-bottom:1.5rem;font-size:0.95rem;}
.plan{line-height:1.7;font-size:1rem;color:#0f172a;}
.plan h1,.plan h2,.plan h3{color:#1d4ed8;}
.plan ul{padding-left:1.25rem;}
code,pre{background:#f3f4f6;border-radius:8px;padding:0.25rem 0.4rem;font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;}
pre{padding:0.9rem;overflow:auto;}
a{color:#2563eb;}
</style>
</head>
<body>
    <div class="page">
        <div class="card">
            <h1>${title}</h1>
            <div class="meta">${meta}</div>
            <div class="plan">${planHtml}</div>
        </div>
    </div>
</body>
</html>`;
    }
    
    createStyleBatchPreviewUrl(job, planText) {
        try {
            const html = this.buildStyleBatchPreviewHtml(job, planText);
            return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        } catch (error) {
            console.warn('构建批量预览链接失败:', error);
            return '';
        }
    }
    
    createHtmlDataUrl(htmlContent) {
        if (!htmlContent) return '';
        try {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            return URL.createObjectURL(blob);
        } catch (error) {
            console.warn('生成 HTML 预览链接失败:', error);
            return '';
        }
    }
    
    /**
     * 复用或创建缓存的HTML预览链接
     * @param {string} cacheKey
     * @param {string} htmlContent
     * @returns {string}
     */
    getCachedHtmlPreviewUrl(cacheKey, htmlContent) {
        if (!cacheKey || !htmlContent) {
            return '';
        }
        if (!this.cachedHtmlPreviewUrls) {
            this.cachedHtmlPreviewUrls = {};
        }
        const cached = this.cachedHtmlPreviewUrls[cacheKey];
        if (cached && cached.html === htmlContent && cached.url) {
            return cached.url;
        }
        if (cached?.url) {
            try {
                URL.revokeObjectURL(cached.url);
            } catch (error) {
                console.warn('释放旧的 HTML 预览链接失败:', error);
            }
        }
        try {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const objectUrl = URL.createObjectURL(blob);
            this.cachedHtmlPreviewUrls[cacheKey] = {
                url: objectUrl,
                html: htmlContent
            };
            return objectUrl;
        } catch (error) {
            console.warn('缓存 HTML 预览链接失败:', error);
            return '';
        }
    }
    
    /**
     * 根据键清理缓存的HTML预览链接
     * @param {string} cacheKey
     */
    clearCachedHtmlPreviewUrl(cacheKey) {
        if (!cacheKey || !this.cachedHtmlPreviewUrls) return;
        const cached = this.cachedHtmlPreviewUrls[cacheKey];
        if (cached?.url) {
            try {
                URL.revokeObjectURL(cached.url);
            } catch (error) {
                console.warn('释放 HTML 预览链接失败:', error);
            }
        }
        delete this.cachedHtmlPreviewUrls[cacheKey];
    }
    
    /**
     * 批量清除带有前缀的缓存
     * @param {string} prefix
     */
    clearCachedHtmlPreviewUrlsByPrefix(prefix) {
        if (!prefix || !this.cachedHtmlPreviewUrls) return;
        Object.keys(this.cachedHtmlPreviewUrls)
            .filter(key => key.startsWith(prefix))
            .forEach(key => this.clearCachedHtmlPreviewUrl(key));
    }
    
    /**
     * 生成批量结果缓存键
     * @param {string} taskId
     * @param {string} resultId
     * @returns {string}
     */
    getStyleBatchResultCacheKey(taskId, resultId) {
        if (!taskId || !resultId) return '';
        return `style-result:${taskId}:${resultId}`;
    }
    
    /**
     * 生成批量进度缓存键
     * @param {string} taskId
     * @param {string} jobId
     * @returns {string}
     */
    getStyleBatchProgressCacheKey(taskId, jobId) {
        if (!taskId || !jobId) return '';
        return `style-progress:${taskId}:${jobId}`;
    }
    
    /**
     * 返回批量结果可用的预览链接
     * @param {string} taskId
     * @param {Object} entry
     * @returns {string}
     */
    getStyleBatchResultPreviewUrl(taskId, entry) {
        if (!entry) return '';
        if (entry.htmlContent) {
            const cacheKey = this.getStyleBatchResultCacheKey(taskId, entry.id);
            return this.getCachedHtmlPreviewUrl(cacheKey, entry.htmlContent);
        }
        return entry.previewUrl || '';
    }
    
    /**
     * 将data URL压缩为缩略图
     * @param {string} dataUrl
     * @param {number} maxSize
     * @returns {Promise<string>}
     */
    async createThumbnailFromDataUrl(dataUrl, maxSize = 280) {
        if (!dataUrl || !dataUrl.startsWith('data:')) {
            return '';
        }
        if (typeof document === 'undefined' || typeof Image === 'undefined') {
            return '';
        }
        return new Promise((resolve) => {
            const imageElement = new Image();
            imageElement.onload = () => {
                try {
                    const width = imageElement.width || 1;
                    const height = imageElement.height || 1;
                    const scale = Math.min(maxSize / width, maxSize / height, 1) || 1;
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve('');
                        return;
                    }
                    canvas.width = Math.max(1, Math.round(width * scale));
                    canvas.height = Math.max(1, Math.round(height * scale));
                    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
                    const thumbnail = canvas.toDataURL('image/jpeg', 0.75);
                    resolve(thumbnail);
                } catch (error) {
                    console.warn('生成缩略图失败:', error);
                    resolve('');
                }
            };
            imageElement.onerror = () => resolve('');
            imageElement.src = dataUrl;
        });
    }
    
    /**
     * 保存批量任务产生的图片缩略图
     * @param {Object} task
     * @param {Object} job
     * @param {Array<Object>} imageResults
     */
    async storeStyleBatchThumbnails(task, job, imageResults = []) {
        if (!task || !task.id || !Array.isArray(imageResults) || !imageResults.length) {
            return;
        }
        if (!task.data) {
            task.data = {};
        }
        if (!Array.isArray(task.data.styleBatchThumbnails)) {
            task.data.styleBatchThumbnails = [];
        }
        const timestamp = Date.now();
        const newEntries = [];
        for (let idx = 0; idx < imageResults.length; idx += 1) {
            const imageData = imageResults[idx];
            const dataUrl = imageData?.imageUrl;
            if (!dataUrl || !dataUrl.startsWith('data:')) {
                continue;
            }
            const thumbnailUrl = await this.createThumbnailFromDataUrl(dataUrl);
            if (!thumbnailUrl) {
                continue;
            }
            newEntries.push({
                id: `style_thumb_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
                jobId: job?.jobId || '',
                styleId: job?.style?.id || '',
                styleTitle: job?.styleTitle || job?.style?.title || job?.themeKey || job?.themeText || '批量主题',
                themeKey: job?.themeKey || '',
                themeText: job?.themeText || '',
                imageIndex: imageData?.imageIndex || idx + 1,
                prompt: imageData?.prompt || '',
                thumbnailUrl,
                createdAt: Date.now()
            });
        }
        if (!newEntries.length) {
            return;
        }
        task.data.styleBatchThumbnails = [
            ...newEntries,
            ...(task.data.styleBatchThumbnails || [])
        ];
        const MAX_STYLE_BATCH_THUMBNAILS = 120;
        if (task.data.styleBatchThumbnails.length > MAX_STYLE_BATCH_THUMBNAILS) {
            task.data.styleBatchThumbnails = task.data.styleBatchThumbnails.slice(0, MAX_STYLE_BATCH_THUMBNAILS);
        }
        const activeTab = document.querySelector(`.storage-tab.active[data-task-id="${task.id}"]`);
        if (activeTab && activeTab.dataset.storageType === 'images') {
            this.showStorageContent(task.id, 'images');
        }
    }
    
    async generateEngineerJsonFromPlan(task, planText) {
        if (!planText || !planText.trim()) {
            throw new Error('设计方案为空，无法生成 JSON');
        }
        // 使用 Vertex AI，优先使用 Instagram 任务选择的模型，否则使用任务模型选择，默认 gemini-3-pro-preview
        const modelToUse = this.getInstagramTaskModel(task) || this.getTaskModelSelection(task, 'engineer') || 'gemini-3-pro-preview';
        const systemPrompt = this.getInstagramPromptValue('engineer')?.trim();
        const payloadText = this.buildStyledSystemUserPrompt(task, systemPrompt, planText);
        
        // 构建配置对象
        const config = {
            temperature: this.temperature || 0.7,
            max_output_tokens: 32768, // 使用最大token限制，确保不会因为token限制而截断
            top_p: this.topP || 0.95,
            top_k: this.topK || 40
        };
        
        // 调用后端 Vertex AI API
        const response = await fetch('http://localhost:5000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelToUse,
                contents: payloadText,
                config: config
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.text) {
            throw new Error(data.error || 'Vertex AI 响应格式错误: ' + JSON.stringify(data));
        }
        
        const rawText = data.text;
        if (!rawText) {
            throw new Error('模型未返回任何文本');
        }
        const jsonString = this.extractJsonString(rawText);
        if (!jsonString) {
            throw new Error('返回内容中未找到有效 JSON');
        }
        return jsonString;
    }
    
    parseStyleBatchPromptJson(jsonString) {
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (error) {
            throw new Error('JSON 格式解析失败');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('JSON 内容不符合要求');
        }
        const imageEntries = [];
        let bottomText = '';
        Object.entries(parsed).forEach(([key, value]) => {
            if (typeof value !== 'string' || !value.trim()) {
                return;
            }
            const match = key.match(/^图片(\d+)$/);
            if (match) {
                imageEntries.push({
                    key,
                    index: parseInt(match[1], 10),
                    prompt: value.trim()
                });
                return;
            }
            if (key === '底部文字') {
                bottomText = this.normalizeBottomCaption(value);
            }
        });
        imageEntries.sort((a, b) => a.index - b.index);
        return {
            imageEntries,
            bottomText
        };
    }

    /**
     * 将工程师返回的“策略说明”压缩成可直接发布的一句底部文案
     * @param {string} text
     * @returns {string}
     */
    normalizeBottomCaption(text) {
        if (!text || typeof text !== 'string') return '';
        let cleaned = text
            .replace(/\r/g, '\n')
            .replace(/^\s*(卖点说明|语气结构)\s*[:：]\s*$/gmi, '')
            .replace(/^\s*\d+\.\s+/gm, '')
            .replace(/^\s*[-*]\s+/gm, '')
            .replace(/\n{2,}/g, '\n')
            .trim();

        // 若仍是多行说明，优先提取首句可发布文案
        const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) return '';

        // 过滤掉明显的说明性标题行
        const contentLines = lines.filter(line => !/^(开篇|中段|结尾|value|cta|hook)\b/i.test(line));
        const firstLine = (contentLines[0] || lines[0]).trim();

        // 超长时只截到第一句，避免网页底部出现策略文档
        const sentence = firstLine.split(/(?<=[.!?。！？])/)[0].trim();
        const result = (sentence || firstLine).trim();
        return result.length > 160 ? result.slice(0, 160).trim() : result;
    }
    
    async runStyleBatchPipeline(task, job, batchRunId = '') {
        const setStep = (step, extra = {}) => {
            this.updateStyleBatchProgress(task.id, job.jobId, {
                status: 'running',
                step,
                ...extra
            });
        };
        
        // 获取使用的prompt信息
        const designerPrompt = this.getInstagramPromptValue('designer')?.trim() || '';
        const engineerPrompt = this.getInstagramPromptValue('engineer')?.trim() || '';
        const designerModel = this.getTaskModelSelection(task, 'designer');
        const engineerModel = this.getTaskModelSelection(task, 'engineer');
        
        setStep('设计师：生成方案');
        const planText = await this.generateDesignerPlan(task, job.themeText, { styleAppendOverride: job.styleAppend });
        
        setStep('工程师：生成提示词');
        const jsonString = await this.generateEngineerJsonFromPlan(task, planText);
        
        setStep('工程师：解析 JSON');
        const parsed = this.parseStyleBatchPromptJson(jsonString);
        if (!parsed.imageEntries.length) {
            throw new Error('JSON 中没有图片提示词');
        }
        if (!parsed.bottomText) {
            throw new Error('JSON 中缺少底部文字');
        }
        
        const imageResults = [];
        for (const entry of parsed.imageEntries) {
            setStep(`图片：生成 ${entry.key}`);
            const imageData = await this.generateSingleInstagramImage(task, entry.prompt, entry.index, { skipSave: true });
            if (!imageData || !imageData.imageUrl) {
                throw new Error(`图片 ${entry.key} 生成失败`);
            }
            // 保存图片到任务数据（用于批量下载）
            if (!task.data.images) {
                task.data.images = [];
            }
            // 标记为批量任务生成的图片，并关联到job信息
            const savedImageData = {
                ...imageData,
                saved: true,
                source: 'style-batch',
                batchJobId: job.jobId,
                batchRunId: batchRunId,
                batchThemeKey: job.themeKey,
                batchThemeText: job.themeText,
                batchStyleTitle: job.styleTitle || job.style?.title || ''
            };
            task.data.images.push(savedImageData);
            imageResults.push(imageData);
        }
        // 保存图片数据
        this.saveTasks();
        
        setStep('网页：生成 HTML');
        const webResult = await this.createInstagramWebHtml(task, imageResults, parsed.bottomText, {
            suppressNotifications: true,
            logTaskId: task.id
        });
        if (!webResult || !webResult.htmlContent) {
            throw new Error('网页生成失败');
        }
        const progressCacheKey = this.getStyleBatchProgressCacheKey(task.id, job.jobId);
        const previewUrl = this.getCachedHtmlPreviewUrl(progressCacheKey, webResult.htmlContent);
        if (!previewUrl) {
            throw new Error('无法生成网页链接');
        }
        
        this.updateStyleBatchProgress(task.id, job.jobId, {
            status: 'success',
            step: '完成',
            previewUrl,
            htmlContent: webResult.htmlContent,
            runId: batchRunId
        });
        
        // 检查是否已存在相同的网页（基于主题键、主题文本和运行ID）
        const existingWebpageKey = `${job.themeKey}__${job.themeText}__${batchRunId}`.toLowerCase().trim();
        if (!task.data) {
            task.data = {};
        }
        if (!Array.isArray(task.data.webpages)) {
            task.data.webpages = [];
        }
        
        // 检查是否已存在相同的网页
        const existingWebpage = task.data.webpages.find(web => {
            const webKey = `${web.themeKey || ''}__${web.themeText || ''}__${web.runId || ''}`.toLowerCase().trim();
            return webKey === existingWebpageKey && web.source === 'style-batch';
        });
        
        if (existingWebpage) {
            console.log(`跳过重复网页保存：${job.themeKey} - ${job.themeText} (已存在)`);
        } else {
            const webpageEntry = {
                id: 'webpage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                prompt: `${job.themeKey || '主题'}｜${job.themeText}`,
                themeKey: job.themeKey,
                themeText: job.themeText,
                styleTitle: job.styleTitle || job.style?.title || '',
                htmlContent: webResult.htmlContent,
                rawResponse: webResult.rawResponse || '',
                webpageUrl: previewUrl,
                createdAt: Date.now(),
                saved: true,
                source: 'style-batch',
                runId: batchRunId
            };
            task.data.webpages.push(webpageEntry);
        }
        await this.storeStyleBatchThumbnails(task, job, imageResults);
        this.saveTasks();
        const activeStorageTab = document.querySelector(`.storage-tab.active[data-task-id="${task.id}"]`);
        if (activeStorageTab && activeStorageTab.dataset.storageType === 'webpages') {
            this.showStorageContent(task.id, 'webpages');
        }
        
        return {
            ...job,
            plan: planText,
            previewUrl,
            createdAt: Date.now(),
            bottomText: parsed.bottomText,
            webHtml: webResult.htmlContent,
            runId: batchRunId,
            designerPrompt,
            engineerPrompt,
            designerModel,
            engineerModel,
            styleAppend: job.styleAppend || '',
            imageResults: imageResults.map(img => ({
                id: img.id,
                imageIndex: img.imageIndex,
                prompt: img.prompt,
                imageUrl: img.imageUrl,
                imageBase64: img.imageBase64,
                imageMimeType: img.imageMimeType
            }))
        };
    }
    
    /**
     * 初始化批量任务面板
     * @param {Object} task
     */
    initStyleBatchPanel(task) {
        if (!task || !task.id) return;
        if (!task.data) {
            task.data = {};
        }
        if (!task.data.styleBatchInputs) {
            task.data.styleBatchInputs = {};
        }
        const openBtn = document.querySelector(`.open-style-batch-btn[data-task-id="${task.id}"]`);
        const modal = document.getElementById(`style-batch-modal-${task.id}`);
        if (!openBtn || !modal) return;
        openBtn.addEventListener('click', () => this.toggleStyleBatchModal(task.id, true));
        const closeBtn = modal.querySelector('.close-style-batch-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleStyleBatchModal(task.id, false));
        }
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.toggleStyleBatchModal(task.id, false);
            }
        });
        modal.querySelectorAll('[data-style-batch-input]').forEach(textarea => {
            const styleId = textarea.dataset.styleBatchInput;
            textarea.value = task.data.styleBatchInputs?.[styleId] || '';
            textarea.addEventListener('input', (event) => {
                this.saveStyleBatchInput(task.id, styleId, event.target.value);
            });
        });
        const runBtn = modal.querySelector('.run-style-batch-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runInstagramDesignerBatch(task));
        }
        const stopBtn = modal.querySelector('.stop-style-batch-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopStyleBatch(task.id));
        }
        const downloadBtn = modal.querySelector('.download-style-batch-html-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.exportStyleBatchHtmlFiles(task.id));
        }
        const clearBtn = modal.querySelector('.clear-style-batch-history-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearStyleBatchHistory(task));
        }
        const resultsContainer = modal.querySelector('.style-batch-results');
        if (resultsContainer) {
            resultsContainer.addEventListener('click', (event) => {
                const downloadHtmlBtn = event.target.closest('.style-batch-download-entry-btn');
                if (downloadHtmlBtn) {
                    event.preventDefault();
                    const entryId = downloadHtmlBtn.dataset.entryId;
                    if (!entryId) {
                        this.showNotification('未找到需要下载的批量结果', 'warning');
                        return;
                    }
                    this.downloadStyleBatchHtmlEntry(task.id, entryId);
                    return;
                }
                const downloadImagesBtn = event.target.closest('.style-batch-download-images-btn');
                if (downloadImagesBtn) {
                    event.preventDefault();
                    const entryId = downloadImagesBtn.dataset.entryId;
                    const themeKey = downloadImagesBtn.dataset.themeKey;
                    if (!entryId) {
                        this.showNotification('未找到需要下载的图片', 'warning');
                        return;
                    }
                    this.downloadStyleBatchImages(task.id, entryId, themeKey);
                    return;
                }
                const detailsBtn = event.target.closest('.style-batch-details-toggle');
                if (detailsBtn) {
                    event.preventDefault();
                    const detailsId = detailsBtn.dataset.detailsId;
                    if (!detailsId) {
                        return;
                    }
                    const detailsEl = document.getElementById(detailsId);
                    if (!detailsEl) {
                        return;
                    }
                    const isHidden = detailsEl.style.display === 'none';
                    detailsEl.style.display = isHidden ? 'block' : 'none';
                    const icon = detailsBtn.querySelector('i');
                    if (icon) {
                        icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-info-circle';
                    }
                }
            });
        }
        this.refreshStyleBatchProgress(task.id);
    }
    
    /**
     * 打开/关闭批量弹窗
     * @param {string} taskId
     * @param {boolean} show
     */
    toggleStyleBatchModal(taskId, show) {
        const modal = document.getElementById(`style-batch-modal-${taskId}`);
        if (!modal) return;
        modal.classList.toggle('visible', !!show);
        if (!show) {
            this.updateStyleBatchStatus(taskId, '');
        }
    }
    
    /**
     * 保存批量输入
     */
    saveStyleBatchInput(taskId, styleId, value) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        if (!task.data) {
            task.data = {};
        }
        if (!task.data.styleBatchInputs) {
            task.data.styleBatchInputs = {};
        }
        task.data.styleBatchInputs[styleId] = value;
        task.updatedAt = Date.now();
        this.saveTasks();
    }
    
    /**
     * 更新批量状态文本
     * @param {string} taskId
     * @param {string} message
     * @param {'info'|'success'|'warning'|'error'} level
     */
    updateStyleBatchStatus(taskId, message, level = 'info') {
        const statusEl = document.getElementById(`style-batch-status-${taskId}`);
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.dataset.status = level || 'info';
    }
    
    /**
     * 根据风格预设生成追加文本
     * @param {Object} style
     * @returns {string}
     */
    getStyleAppendixFromPreset(style) {
        if (!style || (!style.title && !style.content)) {
            return '';
        }
        const title = style.title || '风格设定';
        const body = (style.content || '').trim();
        if (!body) {
            return `[风格：${title}]`;
        }
        return `[风格：${title}]\n${body}`;
    }
    
    /**
     * 获取当前选中的风格追加内容
     */
    getSelectedStyleAppendix(task) {
        if (!task || !task.data || !task.data.selectedStyleId) {
            return '';
        }
        const style = this.stylePresets.find(s => s.id === task.data.selectedStyleId);
        return this.getStyleAppendixFromPreset(style);
    }

    /**
     * 构建附带风格要求的 System/User 格式文本
     * @param {Object} task
     * @param {string} systemPrompt
     * @param {string} userText
     * @returns {string}
     */
    buildStyledSystemUserPrompt(task, systemPrompt, userText, styleAppendOverride = null) {
        const styleAppend = typeof styleAppendOverride === 'string' && styleAppendOverride.trim().length > 0
            ? styleAppendOverride.trim()
            : this.getSelectedStyleAppendix(task);
        const combinedSystem = [systemPrompt?.trim(), styleAppend].filter(Boolean).join('\n\n').trim();
        if (combinedSystem) {
            return `System: ${combinedSystem}\n\nUser: ${userText}`;
        }
        return userText;
    }

    /**
     * 在运行状态面板中追加日志
     * @param {string} taskId
     * @param {'designer'|'engineer'|'text'|'web'} type
     * @param {string} message
     * @param {'info'|'warning'|'error'} level
     */
    appendProcessLog(taskId, type, message, level = 'info') {
        const entryData = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            message,
            level,
            timestamp: Date.now()
        };
        this.cacheProcessLogEntry(taskId, type, entryData);
        const body = document.querySelector(`#process-log-${type}-${taskId} .process-log-body`);
        if (!body) return;
        body.prepend(this.buildProcessLogElement(entryData));
        while (body.children.length > 20) {
            body.removeChild(body.lastChild);
        }
    }
    
    /**
     * 缓存运行日志，便于后台运行时重放
     * @param {string} taskId
     * @param {string} type
     * @param {{id:string,message:string,level:string,timestamp:number}} entry
     */
    cacheProcessLogEntry(taskId, type, entry) {
        if (!this.processLogBuffers[taskId]) {
            this.processLogBuffers[taskId] = {};
        }
        if (!this.processLogBuffers[taskId][type]) {
            this.processLogBuffers[taskId][type] = [];
        }
        this.processLogBuffers[taskId][type].unshift(entry);
        if (this.processLogBuffers[taskId][type].length > 50) {
            this.processLogBuffers[taskId][type] = this.processLogBuffers[taskId][type].slice(0, 50);
        }
    }
    
    /**
     * 构建日志DOM节点
     * @param {{message:string,level:string,timestamp:number}} entry
     * @returns {HTMLElement}
     */
    buildProcessLogElement(entry) {
        const node = document.createElement('div');
        node.className = `process-log-entry ${entry.level || 'info'}`;
        const time = new Date(entry.timestamp || Date.now()).toLocaleTimeString('zh-CN', { hour12: false });
        node.innerHTML = `<span class="process-log-time">${time}</span>${this.escapeHtml(entry.message || '')}`;
        return node;
    }
    
    /**
     * 重新渲染指定任务的所有运行日志
     * @param {string} taskId
     */
    renderProcessLogsForTask(taskId) {
        ['designer', 'engineer', 'text', 'web'].forEach(type => {
            this.renderProcessLogBuffer(taskId, type);
        });
    }
    
    /**
     * 渲染某类运行日志
     * @param {string} taskId
     * @param {string} type
     */
    renderProcessLogBuffer(taskId, type) {
        const body = document.querySelector(`#process-log-${type}-${taskId} .process-log-body`);
        if (!body) return;
        body.innerHTML = '';
        const entries = (this.processLogBuffers?.[taskId]?.[type] || []).slice(0, 20);
        for (let i = entries.length - 1; i >= 0; i--) {
            body.prepend(this.buildProcessLogElement(entries[i]));
        }
    }

    /**
     * 更新Instagram后台任务状态
     * @param {string} taskId
     * @param {Object} updates
     */
    updateInstagramBackgroundState(taskId, updates) {
        if (!updates) return;
        if (!this.instagramBackgroundState) {
            this.instagramBackgroundState = {};
        }
        if (updates.status === 'idle' || updates.status === 'done' || updates.status === 'clear') {
            delete this.instagramBackgroundState[taskId];
            return;
        }
        const prev = this.instagramBackgroundState[taskId] || {};
        this.instagramBackgroundState[taskId] = {
            ...prev,
            ...updates,
            updatedAt: Date.now()
        };
    }
    
    /**
     * 增量更新后台任务计数
     * @param {string} taskId
     * @param {string} key
     */
    incrementInstagramBackgroundCounter(taskId, key) {
        if (!this.instagramBackgroundState || !this.instagramBackgroundState[taskId]) return;
        const prev = this.instagramBackgroundState[taskId][key] || 0;
        this.instagramBackgroundState[taskId][key] = prev + 1;
        this.instagramBackgroundState[taskId].updatedAt = Date.now();
    }
    
    /**
     * 是否存在运行中的Instagram后台任务
     * @returns {boolean}
     */
    hasRunningInstagramJobs() {
        return Object.values(this.instagramBackgroundState || {}).some(job => job?.status === 'running');
    }
    
    /**
     * 截断文本以便在日志中展示
     */
    truncateForLog(text, maxLen = 120) {
        if (!text) return '';
        return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
    }

    /**
     * 确保任务拥有模型选择配置
     * @param {Object} task
     */
    ensureTaskModelSelections(task) {
        if (!task.data) {
            task.data = {};
        }
        if (!task.data.modelSelections) {
            task.data.modelSelections = {};
        }
        ['designer', 'engineer', 'text', 'web'].forEach(key => {
            if (!task.data.modelSelections[key]) {
                task.data.modelSelections[key] = 'gemini-3-pro-preview';
            }
        });
    }
    
    /**
     * 获取任务模型设置
     */
    getTaskModelSelection(task, type) {
        if (!task || !task.data || !task.data.modelSelections) {
            return 'gemini-3-pro-preview';
        }
        return task.data.modelSelections[type] || 'gemini-3-pro-preview';
    }
    
    /**
     * 获取 Instagram 任务选择的模型
     * @param {Object} task - 任务对象
     * @returns {string} 模型名称
     */
    getInstagramTaskModel(task) {
        if (!task || !task.data) {
            return null;
        }
        return task.data.instagramModel || null;
    }
    
    /**
     * 设置 Instagram 任务选择的模型
     * @param {Object} task - 任务对象
     * @param {string} model - 模型名称
     */
    setInstagramTaskModel(task, model) {
        if (!task.data) {
            task.data = {};
        }
        task.data.instagramModel = model;
        task.updatedAt = Date.now();
        this.saveTasks();
    }
    
    /**
     * 设置任务模型选择
     */
    setTaskModelSelection(task, type, value) {
        this.ensureTaskModelSelections(task);
        task.data.modelSelections[type] = value;
        task.updatedAt = Date.now();
        this.saveTasks();
    }
    
    /**
     * 生成模型选择器HTML
     */
    renderModelSelect(type, task) {
        const currentValue = this.getTaskModelSelection(task, type);
        const options = MODEL_CHOICES.map(choice => `
            <option value="${choice.value}" ${choice.value === currentValue ? 'selected' : ''}>
                ${choice.label}
            </option>
        `).join('');
        return `
            <div class="model-select-group">
                <label>选择模型:</label>
                <select class="model-select" data-task-id="${task.id}" data-model-type="${type}">
                    ${options}
                </select>
            </div>
        `;
    }
    
    /**
     * 绑定模型选择器事件
     */
    bindModelSelects(task) {
        const selector = `.model-select[data-task-id="${task.id}"]`;
        document.querySelectorAll(selector).forEach(select => {
            select.addEventListener('change', () => {
                const type = select.dataset.modelType;
                this.setTaskModelSelection(task, type, select.value);
            });
        });
    }
    
    /**
     * 初始化海报制作任务界面
     * @param {Object} task - 任务对象
     */
    initPosterTask(task) {
        // 添加第一个图片输入框
        this.addImageInput(task.id);
        
        // 绑定添加图片框按钮
        const addImageBtn = document.querySelector(`.add-image-btn[data-task-id="${task.id}"]`);
        if (addImageBtn) {
            addImageBtn.addEventListener('click', () => {
                this.addImageInput(task.id);
            });
        }
        
        // 绑定生成按钮
        document.querySelectorAll(`.generate-btn[data-task-id="${task.id}"]`).forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                if (type === 'text') {
                    this.generateText(task);
                } else if (type === 'web') {
                    this.generateWebpage(task);
                }
            });
        });
        
        // 绑定存储标签页切换
        document.querySelectorAll(`.storage-tab[data-task-id="${task.id}"]`).forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll(`.storage-tab[data-task-id="${task.id}"]`).forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.showStorageContent(task.id, tab.dataset.storageType);
            });
        });
        
        // 绑定一键清除按钮
        const clearAllBtn = document.querySelector(`.clear-all-storage-btn[data-task-id="${task.id}"]`);
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (confirm('确定要清除所有已保存的内容吗？此操作不可恢复。')) {
                    this.clearAllStorage(task.id);
                }
            });
        }
        
        // 初始化显示存储内容
        this.showStorageContent(task.id, 'images');
        this.loadStoredContent(task);
    }
    
    /**
     * 添加图片输入框
     * @param {string} taskId - 任务ID
     */
    addImageInput(taskId) {
        const container = document.getElementById(`image-inputs-container-${taskId}`);
        if (!container) return;
        
        const imageIndex = container.children.length + 1;
        const imageInputDiv = document.createElement('div');
        imageInputDiv.className = 'image-input-item';
        imageInputDiv.innerHTML = `
            <div class="image-input-header">
                <span class="image-label">图片 ${imageIndex}</span>
                <button class="remove-image-btn" data-task-id="${taskId}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <textarea class="poster-prompt-input image-prompt" 
                placeholder="输入图片生成提示词..."></textarea>
            <button class="generate-btn" data-type="image" data-task-id="${taskId}" data-image-index="${imageIndex}">
                <i class="fas fa-magic"></i> 生成图片
            </button>
        `;
        
        container.appendChild(imageInputDiv);
        
        // 绑定生成按钮
        const generateBtn = imageInputDiv.querySelector('.generate-btn');
        generateBtn.addEventListener('click', () => {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                this.generateImage(task, imageIndex, imageInputDiv.querySelector('.image-prompt').value);
            }
        });
        
        // 绑定删除按钮
        const removeBtn = imageInputDiv.querySelector('.remove-image-btn');
        removeBtn.addEventListener('click', () => {
            imageInputDiv.remove();
            // 重新编号
            container.querySelectorAll('.image-input-item').forEach((item, index) => {
                item.querySelector('.image-label').textContent = `图片 ${index + 1}`;
            });
        });
    }
    
    /**
     * 从当前对话中获取最新一张由 Gemini 返回的图片
     * 用于图生图模式下在未上传参考图片时作为默认 reference
     * @returns {{mime_type: string, data: string}|null}
     */
    getLatestImageFromConversation() {
        const conversation = this.getCurrentConversation();
        if (!conversation || !Array.isArray(conversation.history) || conversation.history.length === 0) {
            return null;
        }
        
        // 从后往前查找最近一条包含图片数据的助手消息
        for (let i = conversation.history.length - 1; i >= 0; i--) {
            const msg = conversation.history[i];
            if (msg && msg.role === 'assistant' && msg.imageData && msg.mimeType) {
                return {
                    mime_type: msg.mimeType,
                    data: msg.imageData
                };
            }
        }
        
        return null;
    }

    /**
     * 生成图片
     * @param {Object} task - 任务对象
     * @param {number} imageIndex - 图片索引
     * @param {string} prompt - 提示词
     */
    async generateImage(task, imageIndex, prompt) {
        if (!prompt.trim()) {
            this.showNotification('请输入图片生成提示词', 'error');
            return;
        }
        
        const resultContent = document.getElementById(`image-result-content-${task.id}`);
        if (resultContent) {
            resultContent.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在生成 3 张图片...</div>';
        }
        
        try {
            // 每次生成 3 张图片，方便用户挑选
            const imageCount = 3;
            const generatedImages = [];
            
            if (resultContent) {
                // 清空loading，准备逐条显示
                resultContent.innerHTML = '';
            }
            
            for (let i = 0; i < imageCount; i++) {
                // 显示当前生成进度
                if (resultContent && i === 0) {
                    resultContent.innerHTML = `<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在生成第 1/${imageCount} 张图片...</div>`;
                } else if (resultContent) {
                    const loadingDiv = resultContent.querySelector('.loading-text');
                    if (loadingDiv) {
                        loadingDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在生成第 ${i + 1}/${imageCount} 张图片...`;
                    }
                }
                
                // 使用 Vertex AI（后端API）
                const modelToUse = 'gemini-3-pro-image-preview';
                
                // 构建配置对象
                const config = {
                    temperature: 0.9,
                    max_output_tokens: parseInt(this.maxTokens) || 44444  // 使用全局默认值
                };
                
                // 构建请求体
                const requestBody = {
                    model: modelToUse,
                    // 文生图分支：只传本次提示词；图生图通过 thoughtSignature 维持连续性
                    contents: prompt,
                    config: config
                };
                
                // 调用后端 Vertex AI API
                const response = await fetch('http://localhost:5000/api/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('完整错误响应:', errorData);
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                // 响应处理
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Vertex AI 响应格式错误: ' + JSON.stringify(data));
                }
                
                // 检查后端是否直接返回了图片数据
                let imageBase64 = null;
                let imageMimeType = null;
                let imageUrl = null;
                let textMessage = '';
                
                if (data.image && data.mime_type) {
                    // 后端直接返回了图片数据
                    imageBase64 = data.image;
                    imageMimeType = data.mime_type;
                } else if (data.text) {
                    // 后端返回了文本，尝试从中提取图片数据
                    textMessage = data.text;
                    
                    // 尝试提取base64图片数据（data:image/...格式）
                    const base64Match = data.text.match(/data:image\/([^;]+);base64,([^\s"']+)/);
                    if (base64Match) {
                        imageMimeType = base64Match[1];
                        imageBase64 = base64Match[2];
                    }
                    
                    // 如果没有base64，尝试提取URL
                    if (!imageBase64) {
                        const urlMatch = data.text.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp)/i);
                        if (urlMatch) {
                            imageUrl = urlMatch[0];
                        }
                    }
                }
                
                // 如果既没有图片也没有URL，记录警告
                if (!imageBase64 && !imageUrl) {
                    console.warn('图片生成响应：未找到图片数据', {
                        hasImage: !!data.image,
                        hasText: !!data.text,
                        textPreview: textMessage ? textMessage.substring(0, 100) : null
                    });
                }
                
                // 构建图片数据
                // 注意：imageBase64 只在内存中使用，保存时会移除以节省存储空间
                const imageData = {
                    id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    prompt: prompt,
                    imageIndex: imageIndex,
                    createdAt: Date.now(),
                    imageBase64: imageBase64, // 只在内存中，保存时会移除
                    imageMimeType: imageMimeType,
                    imageUrl: imageBase64 ? `data:${imageMimeType};base64,${imageBase64}` : imageUrl,
                    textMessage: textMessage
                };
                
                generatedImages.push(imageData);
                
                // 保存到任务数据
                if (!task.data.images) {
                    task.data.images = [];
                }
                task.data.images.push(imageData);
                this.saveTasks();
                
                // 构建当前图片的展示HTML
                let imageHtml = '';
                let imageUrlLink = '';
                
                if (imageData.imageBase64) {
                    // 如果有base64图片，直接显示，并在下方添加URL链接
                    const imageDataUrl = imageData.imageUrl;
                    imageHtml = `
                        <div class="generated-image-preview">
                            <img src="${imageDataUrl}" alt="生成的图片" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        </div>
                    `;
                    // 添加URL链接（使用data URL或提取的URL）
                    const urlToShow = imageDataUrl && imageDataUrl.startsWith('http') ? imageDataUrl : (imageData.textMessage ? (imageData.textMessage.match(/https?:\/\/[^\s]+/) || [])[0] : null);
                    if (urlToShow) {
                        // 使用 markdown 格式显示超链接
                        imageUrlLink = `
                            <div class="image-url-link-container" style="margin-top: 0.75rem;">
                                ${this.formatMarkdown(`[查看原图](${urlToShow})`)}
                            </div>
                        `;
                    } else if (imageDataUrl && imageDataUrl.startsWith('data:')) {
                        // 如果是data URL，使用 markdown 格式
                        imageUrlLink = `
                            <div class="image-url-link-container" style="margin-top: 0.75rem;">
                                ${this.formatMarkdown(`[在新窗口查看原图](${imageDataUrl})`)}
                            </div>
                        `;
                    }
                } else if (imageData.imageUrl && imageData.imageUrl.startsWith('http')) {
                    // 如果是HTTP URL，使用 markdown 格式显示链接
                    imageHtml = `
                        <div class="generated-image-preview">
                            ${this.formatMarkdown(`[点击查看生成的图片](${imageData.imageUrl})`)}
                        </div>
                    `;
                    // 也添加一个单独的URL链接（markdown格式）
                    imageUrlLink = `
                        <div class="image-url-link-container" style="margin-top: 0.75rem;">
                            ${this.formatMarkdown(`[查看原图](${imageData.imageUrl})`)}
                        </div>
                    `;
                } else if (imageData.textMessage) {
                    // 如果只有文本消息，显示文本，并尝试提取URL
                    imageHtml = `
                        <div class="result-text-content">
                            ${this.formatMarkdown(imageData.textMessage)}
                        </div>
                    `;
                    // 尝试从文本中提取URL，使用 markdown 格式
                    const urlMatch = imageData.textMessage.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                        imageUrlLink = `
                            <div class="image-url-link-container" style="margin-top: 0.75rem;">
                                ${this.formatMarkdown(`[查看原图](${urlMatch[0]})`)}
                            </div>
                        `;
                    }
                } else {
                    imageHtml = `
                        <div class="result-note">
                            未生成图片数据。请检查提示词或API配置。
                        </div>
                    `;
                }
                
                // 立即渲染当前图片（作为独立消息）
                if (resultContent) {
                    // 移除loading提示
                    const loadingDiv = resultContent.querySelector('.loading-text');
                    if (loadingDiv) {
                        loadingDiv.remove();
                    }
                    
                    // 创建新的消息容器
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'image-result-item';
                    messageDiv.innerHTML = `
                        <div class="result-prompt"><strong>提示词：</strong>${this.escapeHtml(prompt)}（第 ${i + 1} 张）</div>
                        ${imageHtml}
                        ${imageUrlLink}
                        <button class="save-to-storage-btn" data-type="image" data-item-id="${imageData.id}" data-task-id="${task.id}">
                            <i class="fas fa-save"></i> 保存到存储容器
                        </button>
                    `;
                    
                    // 追加到结果容器
                    resultContent.appendChild(messageDiv);
                    
                    // 绑定保存按钮
                    const saveBtn = messageDiv.querySelector('.save-to-storage-btn');
                    if (saveBtn) {
                        saveBtn.addEventListener('click', () => {
                            imageData.saved = true;
                            imageData.manualSaved = true;
                            this.saveTasks();
                            this.showStorageContent(task.id, 'images');
                            this.showNotification('已保存到存储容器', 'success');
                        });
                    }
                }
            }
            
            this.showNotification('图片提示词生成完成', 'success');
        } catch (error) {
            console.error('生成图片错误:', error);
            if (resultContent) {
                resultContent.innerHTML = `<div class="error-text">生成失败：${this.escapeHtml(error.message)}</div>`;
            }
            this.showNotification('生成图片失败：' + error.message, 'error');
        }
    }
    
    /**
     * 生成文字内容
     * @param {Object} task - 任务对象
     */
    async generateText(task) {
        const promptInput = document.getElementById(`text-prompt-${task.id}`);
        if (!promptInput) return;
        
        const prompt = promptInput.value.trim();
        if (!prompt) {
            this.showNotification('请输入文字生成提示词', 'error');
            return;
        }
        
        if (!this.apiKey) {
            this.showNotification('请先在设置中配置 API Key', 'error');
            return;
        }
        
        const resultContent = document.getElementById(`text-result-content-${task.id}`);
        if (resultContent) {
            resultContent.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在生成文字内容...</div>';
        }
        
        try {
            const modelToUse = 'gemini-3-pro-preview';
            const systemPrompt = this.getInstagramPromptValue('text');
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\n用户需求：${prompt}\n\n请根据系统提示词的要求，联网查询相关文献，然后生成详细的文字内容。`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 2048
                    },
                    tools: [
                        { google_search: {} }
                    ]
                })
            });
            
            if (!response.ok) {
                throw new Error(`API调用失败: ${response.status}`);
            }
            
            const data = await response.json();
            const generatedText = data.candidates[0].content.parts[0].text;
            
            const textData = {
                id: 'text_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                prompt: prompt,
                content: generatedText,
                createdAt: Date.now()
            };
            
            // 保存到任务数据
            if (!task.data.texts) {
                task.data.texts = [];
            }
            task.data.texts.push(textData);
            this.saveTasks();
            
            // 显示结果
            if (resultContent) {
                resultContent.innerHTML = `
                    <div class="text-result-item">
                        <div class="result-prompt"><strong>提示词：</strong>${this.escapeHtml(prompt)}</div>
                        <div class="result-text-content">${this.formatMarkdown(generatedText)}</div>
                        <button class="save-to-storage-btn" data-type="text" data-item-id="${textData.id}" data-task-id="${task.id}">
                            <i class="fas fa-save"></i> 保存到存储容器
                        </button>
                    </div>
                `;
                
                // 绑定保存按钮
                const saveBtn = resultContent.querySelector('.save-to-storage-btn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        textData.saved = true;
                        textData.manualSaved = true;
                        this.saveTasks();
                        this.showStorageContent(task.id, 'texts');
                        this.showNotification('已保存到存储容器', 'success');
                    });
                }
            }
            
            this.showNotification('文字内容生成完成', 'success');
        } catch (error) {
            console.error('生成文字错误:', error);
            if (resultContent) {
                resultContent.innerHTML = `<div class="error-text">生成失败：${this.escapeHtml(error.message)}</div>`;
            }
            this.showNotification('生成文字失败：' + error.message, 'error');
        }
    }
    
    /**
     * 从图片URL下载并转换为base64
     * @param {string} url - 图片URL
     * @returns {Promise<{base64: string, mimeType: string}|null>} 返回base64数据和MIME类型，失败返回null
     */
    async downloadImageAsBase64(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn('下载图片失败:', url, response.status);
                return null;
            }
            const blob = await response.blob();
            const mimeType = blob.type || 'image/png';
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1]; // 移除 data:image/xxx;base64, 前缀
                    resolve({ base64, mimeType });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('转换图片为base64失败:', url, error);
            return null;
        }
    }

    /**
     * 从data URL提取base64数据
     * @param {string} dataUrl - data URL字符串
     * @returns {{base64: string, mimeType: string}|null} 返回base64数据和MIME类型，失败返回null
     */
    extractBase64FromDataUrl(dataUrl) {
        try {
            const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                return {
                    mimeType: match[1],
                    base64: match[2]
                };
            }
            return null;
        } catch (error) {
            console.warn('从data URL提取base64失败:', error);
            return null;
        }
    }

    /**
     * 转义正则表达式特殊字符
     * @param {string} str - 需要转义的字符串
     * @returns {string} 转义后的字符串
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 导出任务中所有排版生成的HTML源代码
     * @param {string} taskId - 任务ID
     */
    async exportAllHtmlSources(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.data || !task.data.webpages) {
            this.showNotification('没有找到排版生成记录', 'error');
            return;
        }
        
        const webpages = task.data.webpages || [];
        if (webpages.length === 0) {
            this.showNotification('没有可导出的HTML源代码', 'error');
            return;
        }
        
        try {
            // 按创建时间排序（最新的在前）
            const sortedWebpages = [...webpages].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            
            // 生成导出内容
            let exportContent = `# 排版生成HTML源代码导出\n\n`;
            exportContent += `任务名称：${task.name}\n`;
            exportContent += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
            exportContent += `共 ${sortedWebpages.length} 个HTML文件\n\n`;
            exportContent += `${'='.repeat(80)}\n\n`;
            
            sortedWebpages.forEach((web, index) => {
                const timestamp = new Date(web.createdAt).toLocaleString('zh-CN');
                exportContent += `## HTML文件 ${index + 1} / ${sortedWebpages.length}\n\n`;
                exportContent += `**提示词：** ${web.prompt || '无'}\n`;
                exportContent += `**生成时间：** ${timestamp}\n`;
                exportContent += `**文件名：** ${web.filename || `webpage-${index + 1}.html`}\n`;
                exportContent += `**文件ID：** ${web.id}\n\n`;
                exportContent += `### HTML源代码（原始返回）\n\n`;
                exportContent += `\`\`\`html\n`;
                exportContent += `${web.rawResponse || web.htmlContent || ''}\n`;
                exportContent += `\`\`\`\n\n`;
                exportContent += `### HTML源代码（处理后，占位符已替换）\n\n`;
                exportContent += `\`\`\`html\n`;
                exportContent += `${web.htmlContent || ''}\n`;
                exportContent += `\`\`\`\n\n`;
                exportContent += `${'='.repeat(80)}\n\n`;
            });
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `${task.name || '排版生成'}-所有HTML源代码-${timestamp}.md`;
            
            // 下载文件
            const blob = new Blob([exportContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification(`已导出 ${sortedWebpages.length} 个HTML源代码`, 'success');
        } catch (error) {
            console.error('导出HTML源代码失败:', error);
            this.showNotification('导出失败：' + error.message, 'error');
        }
    }

    /**
     * 保存HTML文件到本地文件夹
     * @param {string} htmlContent - HTML内容
     * @param {string} filename - 文件名（可选）
     * @returns {Promise<string|null>} 返回文件路径或null
     */
    async saveHtmlToLocalFile(htmlContent, filename = null) {
        try {
            // 生成默认文件名
            if (!filename) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                filename = `generated-webpage-${timestamp}.html`;
            }
            
            // 检查是否支持 File System Access API
            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'HTML文件',
                            accept: {
                                'text/html': ['.html']
                            }
                        }]
                    });
                    
                    const writable = await fileHandle.createWritable();
                    await writable.write(htmlContent);
                    await writable.close();
                    
                    // 返回文件句柄的路径（如果可用）
                    return fileHandle.name;
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.warn('File System Access API失败，使用下载方式:', error);
                        // 如果用户取消或API失败，回退到下载方式
                        return await this.downloadHtmlFile(htmlContent, filename);
                    }
                    return null; // 用户取消了
                }
            } else {
                // 不支持 File System Access API，使用下载方式
                return await this.downloadHtmlFile(htmlContent, filename);
            }
        } catch (error) {
            console.error('保存HTML文件失败:', error);
            this.showNotification('保存文件失败：' + error.message, 'error');
            return null;
        }
    }

    /**
     * 下载HTML文件
     * @param {string} htmlContent - HTML内容
     * @param {string} filename - 文件名
     * @returns {Promise<string>} 返回文件名
     */
    async downloadHtmlFile(htmlContent, filename, options = {}) {
        const { silent = false } = options || {};
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (!silent) {
            this.showNotification(`文件已下载：${filename}`, 'success');
        }
        return filename;
    }

    /**
     * 下载单个批量条目的HTML
     * @param {string} taskId 任务ID
     * @param {string} entryId 批量结果ID
     */
    async downloadStyleBatchHtmlEntry(taskId, entryId) {
        if (!taskId || !entryId) {
            this.showNotification('缺少必要参数，无法下载批量HTML', 'error');
            return;
        }
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            this.showNotification('未找到任务，无法下载', 'error');
            return;
        }
        const allEntries = Array.isArray(task.data?.styleBatchResults) ? task.data.styleBatchResults : [];
        const targetEntry = allEntries.find(entry => entry.id === entryId);
        if (!targetEntry) {
            this.showNotification('未找到对应的批量结果', 'warning');
            return;
        }
        if (!targetEntry.htmlContent || !targetEntry.htmlContent.trim()) {
            this.showNotification('该批量结果没有可下载的HTML', 'warning');
            return;
        }
        const sanitize = (name) => name ? name.replace(/[\\/:*?"<>|]/g, '_').trim() : '';
        const baseName = sanitize(targetEntry.themeKey || targetEntry.themeText || targetEntry.styleTitle || 'batch_result') || 'batch_result';
        const filename = `${baseName}.html`;
        await this.downloadHtmlFile(targetEntry.htmlContent, filename);
    }

    /**
     * 下载批量任务中某个主题的所有图片
     * @param {string} taskId 任务ID
     * @param {string} entryId 批量结果ID
     * @param {string} themeKey 主题键（用于文件名）
     */
    async downloadStyleBatchImages(taskId, entryId, themeKey = '') {
        if (!taskId || !entryId) {
            this.showNotification('缺少必要参数，无法下载图片', 'error');
            return;
        }
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            this.showNotification('未找到任务，无法下载', 'error');
            return;
        }
        
        // 首先尝试从entry的imageResults获取
        const allEntries = Array.isArray(task.data?.styleBatchResults) ? task.data.styleBatchResults : [];
        const targetEntry = allEntries.find(entry => entry.id === entryId);
        
        let imagesToDownload = [];
        if (targetEntry && Array.isArray(targetEntry.imageResults) && targetEntry.imageResults.length > 0) {
            // 从entry中获取图片
            imagesToDownload = targetEntry.imageResults;
        } else {
            // 从任务数据中根据runId和themeKey查找图片
            const runId = targetEntry?.runId || '';
            const allImages = Array.isArray(task.data?.images) ? task.data.images : [];
            imagesToDownload = allImages.filter(img => {
                return img.source === 'style-batch' && 
                       img.batchRunId === runId && 
                       img.batchThemeKey === themeKey;
            });
        }
        
        if (!imagesToDownload.length) {
            this.showNotification('该主题没有可下载的图片', 'warning');
            return;
        }
        
        const sanitize = (name) => name ? name.replace(/[\\/:*?"<>|]/g, '_').trim() : '';
        const baseName = sanitize(themeKey || targetEntry?.themeKey || targetEntry?.themeText || 'images') || 'images';
        
        // 下载所有图片
        let successCount = 0;
        for (let idx = 0; idx < imagesToDownload.length; idx++) {
            const imageData = imagesToDownload[idx];
            try {
                let blob;
                let filename;
                
                if (imageData.imageBase64) {
                    // 从base64创建blob
                    const byteCharacters = atob(imageData.imageBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const mimeType = imageData.imageMimeType || 'image/png';
                    blob = new Blob([byteArray], { type: mimeType });
                    const extension = mimeType.split('/')[1] || 'png';
                    const imageIndex = imageData.imageIndex || idx + 1;
                    filename = `${baseName}_${String(imageIndex).padStart(2, '0')}.${extension}`;
                } else if (imageData.imageUrl && imageData.imageUrl.startsWith('data:')) {
                    // 从data URL提取
                    const base64Match = imageData.imageUrl.match(/data:([^;]+);base64,(.+)/);
                    if (base64Match) {
                        const mimeType = base64Match[1];
                        const base64Data = base64Match[2];
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        blob = new Blob([byteArray], { type: mimeType });
                        const extension = mimeType.split('/')[1] || 'png';
                        const imageIndex = imageData.imageIndex || idx + 1;
                        filename = `${baseName}_${String(imageIndex).padStart(2, '0')}.${extension}`;
                    } else {
                        continue;
                    }
                } else if (imageData.imageUrl && imageData.imageUrl.startsWith('http')) {
                    // 从URL下载
                    const response = await fetch(imageData.imageUrl);
                    if (!response.ok) {
                        continue;
                    }
                    blob = await response.blob();
                    const imageIndex = imageData.imageIndex || idx + 1;
                    const extension = blob.type.split('/')[1] || 'png';
                    filename = `${baseName}_${String(imageIndex).padStart(2, '0')}.${extension}`;
                } else {
                    continue;
                }
                
                // 下载文件
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // 添加延迟，避免浏览器阻止多个下载
                if (idx < imagesToDownload.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                successCount++;
            } catch (error) {
                console.error(`下载图片 ${idx + 1} 失败:`, error);
            }
        }
        
        if (successCount > 0) {
            this.showNotification(`已下载 ${successCount} 张图片`, 'success');
        } else {
            this.showNotification('下载图片失败', 'error');
        }
    }

    /**
     * 下载指定的批量结果条目HTML
     * @param {Array} entries - 要下载的结果条目数组（pipelineResult对象，有webHtml属性）
     */
    async downloadStyleBatchEntriesHtml(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return;
        }
        // 支持 webHtml 和 htmlContent 两种属性名
        const validEntries = entries.filter(entry => {
            const html = entry?.webHtml || entry?.htmlContent;
            return html && html.trim();
        });
        if (!validEntries.length) {
            return;
        }
        const sanitize = (name) => {
            if (!name) return '';
            return name.replace(/[\\/:*?"<>|]/g, '_').trim();
        };
        for (let idx = 0; idx < validEntries.length; idx += 1) {
            const entry = validEntries[idx];
            const htmlContent = entry.webHtml || entry.htmlContent || '';
            const baseName = sanitize(entry.themeKey || entry.themeText || entry.styleTitle || `batch_${idx + 1}`) || `batch_${idx + 1}`;
            const filename = `${baseName}_${idx + 1}.html`;
            await this.downloadHtmlFile(htmlContent, filename, { silent: true });
        }
    }

    /**
     * 下载最新批量任务的所有HTML
     * @param {string} taskId
     */
    async exportStyleBatchHtmlFiles(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            this.showNotification('未找到任务，无法下载', 'error');
            return;
        }
        const allResults = Array.isArray(task.data?.styleBatchResults) ? task.data.styleBatchResults : [];
        if (!allResults.length) {
            this.showNotification('当前没有批量生成的HTML可下载', 'warning');
            return;
        }
        const latestRunId = task.data?.styleBatchLastRunId || '';
        let targetEntries = latestRunId
            ? allResults.filter(entry => entry.runId === latestRunId)
            : allResults;
        targetEntries = targetEntries.filter(entry => entry?.htmlContent && entry.htmlContent.trim());
        if (!targetEntries.length) {
            this.showNotification('最新批量没有可用的HTML内容', 'warning');
            return;
        }
        const sanitize = (name) => {
            if (!name) return '';
            return name.replace(/[\\/:*?"<>|]/g, '_').trim();
        };
        for (let idx = 0; idx < targetEntries.length; idx += 1) {
            const entry = targetEntries[idx];
            const baseName = sanitize(entry.themeKey || entry.themeText || entry.styleTitle || `batch_${idx + 1}`) || `batch_${idx + 1}`;
            const filename = `${baseName}_${idx + 1}.html`;
            await this.downloadHtmlFile(entry.htmlContent, filename, { silent: true });
        }
        this.showNotification(`已下载 ${targetEntries.length} 个 HTML 文件`, 'success');
    }

    /**
     * 使用占位符引擎生成完整HTML（复用海报制作流程）
     * @param {Object} options
     * @returns {Promise<{finalHtmlContent: string, rawResponse: string, requestPayload: string}>}
     */
    async buildHtmlWithPlaceholderEngine({
        prompt,
        images = [],
        texts = [],
        systemPrompt = '',
        resultContainer = null,
        modelToUse = 'gemini-3-pro-preview'
    }) {
        if (!prompt || !prompt.trim()) {
            throw new Error('缺少排版提示词');
        }
        // 使用 Vertex AI，不需要 API Key，默认模型 gemini-3-pro-preview
        if (!modelToUse) {
            modelToUse = 'gemini-3-pro-preview';
        }
        
        const processedImages = [];
        const imagePlaceholders = {};
        let userPrompt = prompt.trim();
        
        if (images.length > 0) {
            userPrompt += `\n\n【已生成的图片内容】\n`;
            userPrompt += `以下是可用的图片列表，请在HTML代码中使用占位符格式（{{IMG_主题_序号}}）来引用这些图片：\n\n`;
            
        for (let idx = 0; idx < images.length; idx++) {
            const img = images[idx];
            const imageIndex = idx + 1;
            let imageBase64 = img.imageBase64;
            let imageMimeType = img.imageMimeType;
            
            if (!imageBase64) {
                if (img.imageUrl && img.imageUrl.startsWith('data:')) {
                    const extracted = this.extractBase64FromDataUrl(img.imageUrl);
                    if (extracted) {
                        imageBase64 = extracted.base64;
                        imageMimeType = extracted.mimeType;
                    }
                } else if (img.imageUrl && img.imageUrl.startsWith('http')) {
                    if (resultContainer) {
                        resultContainer.innerHTML = `<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在处理图片 ${imageIndex}/${images.length}...</div>`;
                    }
                    const downloaded = await this.downloadImageAsBase64(img.imageUrl);
                    if (downloaded) {
                        imageBase64 = downloaded.base64;
                        imageMimeType = downloaded.mimeType;
                    }
                }
            }
            
            const { width, height } = await this.ensureInstagramImageDimensions(img);
            const simplifiedRatio = width && height ? this.formatAspectRatio(width, height) : '';
            const ratioDisplay = width && height
                ? `${simplifiedRatio || `${width}:${height}`}（${width}px × ${height}px）`
                : '暂无尺寸数据（按图片实际比例排版）';
            
            let placeholder = '';
            const promptText = img.prompt || img.generatedPrompt || '';
            let theme = 'IMG';
            if (promptText) {
                const chineseKeywords = promptText.match(/[\u4e00-\u9fa5]{2,4}/g);
                if (chineseKeywords && chineseKeywords.length > 0) {
                    theme = chineseKeywords[0].toUpperCase();
                } else {
                    const englishKeywords = promptText.split(/[\s，,。.、]+/)
                        .filter(k => k.length > 2 && /^[a-zA-Z]+$/.test(k))
                        .slice(0, 2);
                    if (englishKeywords.length > 0) {
                        theme = englishKeywords.map(k => k.toUpperCase()).join('_');
                    }
                }
            }
            placeholder = `{{IMG_${theme}_${String(imageIndex).padStart(2, '0')}}}`;
            
            processedImages.push({
                ...img,
                imageBase64,
                imageMimeType,
                placeholder
            });
            imagePlaceholders[placeholder] = {
                imageBase64,
                imageMimeType,
                prompt: promptText
            };
            
            userPrompt += `图片${imageIndex}：\n`;
            userPrompt += `- 主题/描述：${promptText || '图片' + imageIndex}\n`;
            userPrompt += `- 推荐展示比例：${ratioDisplay}\n`;
            userPrompt += `- 占位符：${placeholder}\n`;
            userPrompt += `- 在HTML中使用：<img src="${placeholder}" alt="${promptText || '图片' + imageIndex}" style="max-width: 100%; height: auto;">\n\n`;
        }
        
        userPrompt += `**重要**：请在HTML代码中使用上述占位符（格式：{{IMG_主题_序号}}），不要使用完整的base64 data URL。系统会自动将占位符替换为对应的图片。同时务必参考“推荐展示比例”为每张图片设计对应的容器（如设置 aspect-ratio 或固定高度），避免裁切或拉伸。\n`;
        }
        
        if (texts.length > 0) {
            userPrompt += `\n\n【底部文案原文】\n`;
            texts.forEach((txt, idx) => {
                const content = (txt && typeof txt.content === 'string') ? txt.content : '';
                userPrompt += `--- 文案${idx + 1} 开始 ---\n${content}\n--- 文案${idx + 1} 结束 ---\n\n`;
            });
            userPrompt += '请将上述文案原样渲染（包括段落、换行、Markdown 结构），字体/字号/颜色等全部遵循系统提示词中的规范，禁止改写文案内容。\n';
        }
        
        const carouselReferenceSnippet = `
【轮播结构参考】（理解其交互逻辑，可重写样式/类名，但需保证相同功能）
\`\`\`html
<section class="ref-carousel">
  <div class="ref-carousel-track">
    <!-- 每张图片 -->
    <figure class="ref-slide">
      <img src="{{IMG_SAMPLE_01}}" alt="示例图片">
    </figure>
  </div>
  <button class="ref-nav ref-prev" aria-label="上一张">‹</button>
  <button class="ref-nav ref-next" aria-label="下一张">›</button>
  <div class="ref-dots">
    <button class="ref-dot active" aria-label="第 1 张"></button>
    <button class="ref-dot" aria-label="第 2 张"></button>
  </div>
</section>
<script>
  (function(){
    const track = document.querySelector('.ref-carousel-track');
    const slides = Array.from(track.children);
    const dots = Array.from(document.querySelectorAll('.ref-dot'));
    let index = 0;
    function goTo(idx){
      index = (idx + slides.length) % slides.length;
      track.style.transform = \`translateX(-\${index * 100}%)\`;
      dots.forEach((dot,i)=>dot.classList.toggle('active', i===index));
    }
    document.querySelector('.ref-prev').onclick = () => goTo(index - 1);
    document.querySelector('.ref-next').onclick = () => goTo(index + 1);
    dots.forEach((dot,i)=>dot.onclick = () => goTo(i));
  })();
</script>
\`\`\`
`;
        
        userPrompt += `\n\n【重要说明】\n- 每张图片都附带精确尺寸与宽高比，请严格依据该比例设计容器或轮播布局。\n- 底部文案必须完全保留原文，并按系统提示词中的字体/排版规范呈现，禁止增删或改写。\n${carouselReferenceSnippet}\n`;
        
        userPrompt += `\n\n请根据以上图片和文字内容，结合我的排版需求，生成一个完整的、美观的、有定制主题的HTML网页。

**具体要求：**
1. 输出完整的HTML代码（包含DOCTYPE、html、head、body等完整结构）
2. 设计美观的定制主题（颜色、字体、布局、样式等）
3. **在HTML中使用<img>标签显示图片时，src属性必须使用占位符格式**（格式：<img src="{{IMG_主题_序号}}" alt="描述">）
4. 将文字内容合理排版到网页中，使用适当的HTML标签
5. 确保网页美观、现代化、响应式设计
6. 图片和文字要合理穿插，排版清晰美观

**重要**：请直接输出完整的HTML网页代码，使用占位符表示图片（{{IMG_主题_序号}}），不要输出Markdown格式。系统会自动将占位符替换为base64 data URL。`;
        
        // 构建完整的提示词（包含图片的 data URL 引用）
        let fullPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}用户需求：${userPrompt}`;
        
        // 如果有图片，在提示词中引用图片的 data URL（用于模型理解图片内容）
        if (processedImages.length > 0) {
            fullPrompt += '\n\n【图片数据引用】\n';
            processedImages.forEach((img, idx) => {
                if (img.imageBase64 && img.imageMimeType) {
                    const dataUrl = `data:${img.imageMimeType};base64,${img.imageBase64}`;
                    fullPrompt += `图片${idx + 1}数据URL：${dataUrl.substring(0, 100)}...（完整数据已在上文占位符中提供）\n`;
                }
            });
        }
        
        const requestPayload = fullPrompt;
        
        // 构建配置对象
        const config = {
            temperature: 0.7,
            max_output_tokens: 8192
        };
        
        // 调用后端 Vertex AI API（使用 gemini-3-pro-preview 默认模型）
        const response = await fetch('http://localhost:5000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelToUse,
                contents: fullPrompt,
                config: config
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.text) {
            throw new Error(data.error || 'Vertex AI 响应格式错误: ' + JSON.stringify(data));
        }
        
        const rawResponse = data.text;
        let htmlContent = rawResponse;
        const htmlCodeBlockMatch = htmlContent.match(/```(?:html|htm)?\s*([\s\S]+)```/);
        if (htmlCodeBlockMatch) {
            htmlContent = htmlCodeBlockMatch[1].trim();
        } else {
            const htmlFullMatch = htmlContent.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
            if (htmlFullMatch) {
                htmlContent = htmlFullMatch[1];
            } else {
                const htmlStartMatch = htmlContent.match(/(<!DOCTYPE[\s\S]*|<\s*html[\s\S]*)/i);
                if (htmlStartMatch) {
                    htmlContent = htmlStartMatch[1];
                }
            }
        }
        
        const hasDoctype = htmlContent.trim().match(/^\s*<!DOCTYPE/i);
        const hasHtmlTag = htmlContent.includes('<html');
        const hasHeadTag = htmlContent.includes('<head');
        const hasBodyTag = htmlContent.includes('<body');
        const hasCloseHtml = htmlContent.includes('</html>');
        const hasCloseBody = htmlContent.includes('</body>');
        const hasCloseHead = htmlContent.includes('</head>');
        
        if (!hasCloseHtml || !hasCloseBody) {
            if (hasBodyTag && !hasCloseBody) {
                htmlContent += '\n</body>';
            }
            if (hasHtmlTag && !hasCloseHtml) {
                htmlContent += '\n</html>';
            }
        }
        
        if (!hasDoctype && !hasHtmlTag) {
            if (htmlContent.includes('<') && htmlContent.includes('>')) {
                htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>生成的网页</title>
</head>
<body>
${htmlContent}
</body>
</html>`;
            }
        }
        
        let finalHtmlContent = htmlContent;
        if (processedImages.length > 0) {
            processedImages.forEach((img) => {
                if (img.placeholder && img.imageBase64 && img.imageMimeType) {
                    const dataUrl = `data:${img.imageMimeType};base64,${img.imageBase64}`;
                    const placeholderRegex = new RegExp(this.escapeRegex(img.placeholder), 'g');
                    finalHtmlContent = finalHtmlContent.replace(placeholderRegex, dataUrl);
                }
            });
        }
        
        return {
            finalHtmlContent,
            rawResponse,
            requestPayload
        };
    }

    buildInstagramWebSystemPrompt(task) {
        const segments = [];
        if (this.posterCommonPrompt) {
            segments.push(this.posterCommonPrompt);
        }
        if (this.posterWebPrompt) {
            segments.push(this.posterWebPrompt);
        }
        const instagramPrompt = this.getInstagramPromptValue('web');
        if (instagramPrompt) {
            segments.push(instagramPrompt);
        }
        return segments.join('\n\n');
    }

    /**
     * 生成网页
     * @param {Object} task - 任务对象
     */
    async generateWebpage(task) {
        const promptInput = document.getElementById(`web-prompt-${task.id}`);
        if (!promptInput) return;
        
        const prompt = promptInput.value.trim();
        if (!prompt) {
            this.showNotification('请输入排版提示词', 'error');
            return;
        }
        
        if (!this.apiKey) {
            this.showNotification('请先在设置中配置 API Key', 'error');
            return;
        }
        
        const resultContent = document.getElementById(`web-result-content-${task.id}`);
        if (resultContent) {
            resultContent.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在生成排版...</div>';
        }
        
        try {
            // 获取已保存的图片和文字（自动投递，不显示给用户）
            // 确保获取所有已保存的内容（saved !== false 包括 saved === true 和 saved === undefined）
            const images = (task.data.images || []).filter(img => img.saved !== false);
            const texts = (task.data.texts || []).filter(txt => txt.saved !== false);
            
            console.log('排版生成 - 从存储容器获取的数据:', {
                图片数量: images.length,
                文字数量: texts.length,
                图片详情: images.map(img => ({
                    id: img.id,
                    prompt: img.prompt,
                    有base64: !!img.imageBase64,
                    有imageUrl: !!img.imageUrl,
                    saved: img.saved
                })),
                文字详情: texts.map(txt => ({
                    id: txt.id,
                    prompt: txt.prompt,
                    内容长度: txt.content?.length || 0,
                    saved: txt.saved
                }))
            });
            
            const modelToUse = 'gemini-3-pro-preview';
            // 组合通用提示词和排版生成提示词
            const baseWebPrompt = this.posterWebPrompt || `你是一个专业的网页设计师和前端开发工程师。你的任务是根据用户的需求，将提供的图片和文字内容整合成一个完整的、美观的、有定制主题的HTML网页。

**核心要求：**

1. **输出完整的HTML代码**：
   - 必须输出完整的HTML文档，包含<!DOCTYPE html>、<html>、<head>、<body>等完整结构
   - 不要输出Markdown格式，只输出HTML代码
   - 可以直接在浏览器中打开运行

2. **定制主题和样式**：
   - 根据用户需求设计美观的主题（颜色、字体、布局等）
   - 使用内联CSS或<style>标签定义样式
   - 确保网页美观、现代化、响应式设计
   - 可以添加渐变背景、阴影效果、动画等现代设计元素

3. **图片处理（关键 - 使用占位符）**：
   - 用户会告诉你有哪些图片，分别是什么主题（比如"金毛狗"、"小柴犬"等）
   - **重要**：在HTML代码中，不要使用完整的base64 data URL（因为太长了）
   - **必须使用占位符格式**：{{IMG_主题_序号}}
   - 占位符格式说明：
     * 格式：{{IMG_描述_序号}}，例如：{{IMG_DOG_01}}、{{IMG_FOOD_02}}
     * 占位符要表意清晰，能明确表示图片的主题和用途
     * 例如："金毛狗" → {{IMG_DOG_01}}，"小柴犬" → {{IMG_DOG_02}}，"美食图片" → {{IMG_FOOD_01}}
   - 在HTML中使用格式：<img src="{{IMG_DOG_01}}" alt="金毛狗" style="max-width: 100%; height: auto;">
   - 系统会自动将占位符替换为对应的base64 data URL
   - 图片会通过API的parts参数传递给你，但你只需要在HTML中使用占位符即可

4. **文字内容整合**：
   - 将提供的文字内容合理排版到网页中
   - 使用适当的HTML标签（h1-h6、p、div、section等）
   - 保持内容的可读性和层次结构
   - 文字和图片要合理穿插，排版美观

5. **网页结构**：
   - 设计清晰的页面结构（头部、主体、尾部等）
   - 确保内容组织有序、层次分明
   - 可以添加导航栏、卡片式布局等现代网页元素

6. **输出格式**：
   - 直接输出HTML代码，不要用代码块包裹
   - 如果必须用代码块，使用\`\`\`html标记
   - 确保输出的HTML代码完整、可运行

**重要**：请直接输出完整的HTML网页代码，使用占位符表示图片（格式：{{IMG_主题_序号}}），系统会自动替换为base64 data URL。确保包含所有样式、图片占位符和文字内容，能够直接在浏览器中打开查看。`;
            const systemPrompt = (this.posterCommonPrompt ? this.posterCommonPrompt + '\n\n' : '') + baseWebPrompt;
            
            // 构建用户提示词，自动整合图片和文字内容
            let userPrompt = prompt;
            
            // 处理图片：准备base64数据用于API传递，但在提示词中只提供主题信息
            const processedImages = [];
            const imagePlaceholders = {}; // 存储占位符到图片的映射
            
            if (images.length > 0) {
                userPrompt += `\n\n【已生成的图片内容】\n`;
                userPrompt += `以下是可用的图片列表，请在HTML代码中使用占位符格式（{{IMG_主题_序号}}）来引用这些图片：\n\n`;
                
                for (let idx = 0; idx < images.length; idx++) {
                    const img = images[idx];
                    const imageIndex = idx + 1;
                    let imageBase64 = img.imageBase64;
                    let imageMimeType = img.imageMimeType;
                    
                    // 如果没有base64数据，尝试从其他来源获取
                    if (!imageBase64) {
                        if (img.imageUrl && img.imageUrl.startsWith('data:')) {
                            // 从data URL提取base64
                            const extracted = this.extractBase64FromDataUrl(img.imageUrl);
                            if (extracted) {
                                imageBase64 = extracted.base64;
                                imageMimeType = extracted.mimeType;
                            }
                        } else if (img.imageUrl && img.imageUrl.startsWith('http')) {
                            // 从HTTP URL下载并转换为base64
                            if (resultContent) {
                                resultContent.innerHTML = `<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> 正在处理图片 ${imageIndex}/${images.length}...</div>`;
                            }
                            const downloaded = await this.downloadImageAsBase64(img.imageUrl);
                            if (downloaded) {
                                imageBase64 = downloaded.base64;
                                imageMimeType = downloaded.mimeType;
                            }
                        }
                    }
                    
                    // 生成占位符：从提示词中提取主题关键词
                    let placeholder = '';
                    const promptText = img.prompt || img.generatedPrompt || '';
                    
                    // 提取关键词作为占位符主题
                    // 优先提取中文关键词，如果没有则使用英文
                    let theme = 'IMG';
                    if (promptText) {
                        // 提取中文关键词（2-4个字符的词）
                        const chineseKeywords = promptText.match(/[\u4e00-\u9fa5]{2,4}/g);
                        if (chineseKeywords && chineseKeywords.length > 0) {
                            // 使用第一个关键词，转换为拼音或直接使用
                            theme = chineseKeywords[0].toUpperCase();
                        } else {
                            // 如果没有中文，提取英文关键词
                            const englishKeywords = promptText.split(/[\s，,。.、]+/)
                                .filter(k => k.length > 2 && /^[a-zA-Z]+$/.test(k))
                                .slice(0, 2);
                            if (englishKeywords.length > 0) {
                                theme = englishKeywords.map(k => k.toUpperCase()).join('_');
                            }
                        }
                    }
                    
                    // 生成占位符，确保表意清晰
                    placeholder = `{{IMG_${theme}_${String(imageIndex).padStart(2, '0')}}}`;
                    
                    // 添加到处理后的图片列表（用于API传递）
                    processedImages.push({
                        ...img,
                        imageBase64,
                        imageMimeType,
                        placeholder: placeholder // 保存占位符
                    });
                    
                    // 存储占位符映射
                    imagePlaceholders[placeholder] = {
                        imageBase64,
                        imageMimeType,
                        prompt: promptText
                    };
                    
                    // 添加到用户提示词（只提供主题信息，不提供完整base64）
                    userPrompt += `图片${imageIndex}：\n`;
                    userPrompt += `- 主题/描述：${promptText || '图片' + imageIndex}\n`;
                    userPrompt += `- 占位符：${placeholder}\n`;
                    userPrompt += `- 在HTML中使用：<img src="${placeholder}" alt="${promptText || '图片' + imageIndex}" style="max-width: 100%; height: auto;">\n\n`;
                }
                
                userPrompt += `**重要**：请在HTML代码中使用上述占位符（格式：{{IMG_主题_序号}}），不要使用完整的base64 data URL。系统会自动将占位符替换为对应的图片。\n`;
            }
            
            // 自动添加文字内容到用户提示词（确保完整发送）
            if (texts.length > 0) {
                userPrompt += `\n\n【已生成的文字内容】\n`;
                texts.forEach((txt, idx) => {
                    userPrompt += `文字${idx + 1}：\n`;
                    userPrompt += `- 原始提示词：${txt.prompt}\n`;
                    // 限制文字内容长度，只取前2000字符（避免请求过大）
                    const contentPreview = txt.content && txt.content.length > 2000 ? txt.content.substring(0, 2000) + '...（内容已截断）' : (txt.content || '');
                    userPrompt += `- 生成的内容：${contentPreview}\n\n`;
                });
            }
            
            userPrompt += `\n\n请根据以上图片和文字内容，结合我的排版需求，生成一个完整的、美观的、有定制主题的HTML网页。

**具体要求：**
1. 输出完整的HTML代码（包含DOCTYPE、html、head、body等完整结构）
2. 设计美观的定制主题（颜色、字体、布局、样式等）
3. **在HTML中使用<img>标签显示图片时，src属性必须使用占位符格式**（格式：<img src="{{IMG_主题_序号}}" alt="描述">）
4. 将文字内容合理排版到网页中，使用适当的HTML标签
5. 确保网页美观、现代化、响应式设计
6. 图片和文字要合理穿插，排版清晰美观

**重要**：请直接输出完整的HTML网页代码，使用占位符表示图片（{{IMG_主题_序号}}），不要输出Markdown格式。系统会自动将占位符替换为base64 data URL。`;
            
            // 构建 parts 数组，包含文本和图片
            const parts = [];
            
            // 添加文本部分
            parts.push({
                text: `${systemPrompt}\n\n用户需求：${userPrompt}`
            });
            
            // 添加图片作为 inlineData（使用处理后的图片数据）
            if (processedImages.length > 0) {
                for (const img of processedImages) {
                    if (img.imageBase64 && img.imageMimeType) {
                        parts.push({
                            inlineData: {
                                mimeType: img.imageMimeType,
                                data: img.imageBase64
                            }
                        });
                    }
                }
            }
            
            console.log('排版生成 - 准备发送的数据:', {
                图片数量: processedImages.length,
                文字数量: texts.length,
                parts数量: parts.length,
                包含图片的parts: parts.filter(p => p.inlineData).length
            });
            
            // 构建请求体
            const requestBody = {
                contents: [{
                    parts: parts
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192  // 增加到8192，确保能生成完整的HTML网页
                    }
            };
            
            console.log('排版生成 - 请求URL:', `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`);
            console.log('排版生成 - 请求体长度:', JSON.stringify(requestBody).length);
            console.log('排版生成 - 请求体预览:', JSON.stringify(requestBody).substring(0, 500));
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('排版生成 - 响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: { message: errorText } };
                }
                console.error('排版生成 - 完整错误响应:', errorData);
                const errorMessage = errorData.error?.message || errorData.error?.status || `API调用失败: ${response.status}`;
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('排版生成 - 响应数据:', data);
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                console.error('排版生成 - 响应格式错误:', data);
                throw new Error('API响应格式错误: ' + JSON.stringify(data));
            }
            
            // 保存模型返回的原始内容（不做任何处理）
            const rawResponse = data.candidates[0].content.parts[0].text;
            
            console.log('排版生成 - 原始响应内容长度:', rawResponse.length);
            console.log('排版生成 - 原始响应内容预览（前500字符）:', rawResponse.substring(0, 500));
            console.log('排版生成 - 原始响应内容预览（后500字符）:', rawResponse.substring(Math.max(0, rawResponse.length - 500)));
            
            // 从原始响应中提取HTML内容用于处理
            let htmlContent = rawResponse;
            
            // 提取HTML代码（如果被代码块包裹）
            // 尝试匹配 html、htm、代码块等，使用贪婪匹配确保获取完整内容
            const htmlCodeBlockMatch = htmlContent.match(/```(?:html|htm)?\s*([\s\S]+)```/);
            if (htmlCodeBlockMatch) {
                htmlContent = htmlCodeBlockMatch[1].trim();
            } else {
                // 如果没有代码块，尝试提取 <!DOCTYPE 或 <html 开头到 </html> 结尾的完整内容
                const htmlFullMatch = htmlContent.match(/(<!DOCTYPE[\s\S]*?<\/html>)/i);
                if (htmlFullMatch) {
                    htmlContent = htmlFullMatch[1];
                } else {
                    // 如果没有 </html>，尝试提取从 <!DOCTYPE 或 <html 开始的所有内容
                    const htmlStartMatch = htmlContent.match(/(<!DOCTYPE[\s\S]*|<\s*html[\s\S]*)/i);
                    if (htmlStartMatch) {
                        htmlContent = htmlStartMatch[1];
                    }
                }
            }
            
            // 检查HTML是否完整
            const hasDoctype = htmlContent.trim().match(/^\s*<!DOCTYPE/i);
            const hasHtmlTag = htmlContent.includes('<html');
            const hasHeadTag = htmlContent.includes('<head');
            const hasBodyTag = htmlContent.includes('<body');
            const hasCloseHtml = htmlContent.includes('</html>');
            const hasCloseBody = htmlContent.includes('</body>');
            const hasCloseHead = htmlContent.includes('</head>');
            
            console.log('排版生成 - HTML完整性检查:', {
                hasDoctype,
                hasHtmlTag,
                hasHeadTag,
                hasBodyTag,
                hasCloseHtml,
                hasCloseBody,
                hasCloseHead,
                内容长度: htmlContent.length
            });
            
            // 如果HTML不完整，尝试修复
            if (!hasCloseHtml || !hasCloseBody) {
                console.warn('排版生成 - HTML代码不完整，尝试修复...');
                
                // 如果缺少闭合标签，尝试添加
                if (hasBodyTag && !hasCloseBody) {
                    // 查找最后一个未闭合的标签
                    const lastOpenTag = htmlContent.lastIndexOf('<');
                    if (lastOpenTag > 0) {
                        htmlContent += '\n</body>';
                    }
                }
                
                if (hasHtmlTag && !hasCloseHtml) {
                    htmlContent += '\n</html>';
                }
            }
            
            // 如果HTML结构不完整，包装成完整HTML
            if (!hasDoctype && !hasHtmlTag) {
                // 如果看起来像是HTML片段，包装成完整HTML
                if (htmlContent.includes('<') && htmlContent.includes('>')) {
                    htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>生成的网页</title>
</head>
<body>
${htmlContent}
</body>
</html>`;
                }
            }
            
            console.log('排版生成 - 最终HTML内容长度:', htmlContent.length);
            
            // 替换占位符为base64 data URL
            let finalHtmlContent = htmlContent;
            if (processedImages.length > 0) {
                console.log('排版生成 - 开始替换占位符...');
                processedImages.forEach((img, idx) => {
                    if (img.placeholder && img.imageBase64 && img.imageMimeType) {
                        const dataUrl = `data:${img.imageMimeType};base64,${img.imageBase64}`;
                        // 替换所有占位符
                        const placeholderRegex = new RegExp(this.escapeRegex(img.placeholder), 'g');
                        finalHtmlContent = finalHtmlContent.replace(placeholderRegex, dataUrl);
                        console.log(`排版生成 - 替换占位符: ${img.placeholder} -> [base64 data URL]`);
                    }
                });
                console.log('排版生成 - 占位符替换完成');
            }
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `generated-webpage-${timestamp}.html`;
            
            // 保存HTML文件到本地（使用替换后的HTML）
            const savedFilePath = await this.saveHtmlToLocalFile(finalHtmlContent, filename);
            
            // 创建Blob URL作为备用（如果文件保存失败，使用替换后的HTML）
            const blob = new Blob([finalHtmlContent], { type: 'text/html;charset=utf-8' });
            const webpageUrl = URL.createObjectURL(blob);
            
            const webpageData = {
                id: 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                prompt: prompt,
                rawResponse: rawResponse,  // 保存模型返回的原始内容（包含占位符）
                htmlContent: finalHtmlContent,  // 保存处理后的HTML内容（占位符已替换为base64）
                filename: filename,
                filePath: savedFilePath,
                webpageUrl: webpageUrl,
                createdAt: Date.now()
            };
            
            // 保存到任务数据
            if (!task.data.webpages) {
                task.data.webpages = [];
            }
            task.data.webpages.push(webpageData);
            this.saveTasks();
            
            // 显示结果
            if (resultContent) {
                // 构建文件路径显示
                let filePathDisplay = '';
                if (savedFilePath) {
                    filePathDisplay = `
                        <div style="margin-top: 0.75rem; padding: 0.75rem; background: #ecfdf5; border-radius: 6px; border: 1px solid #10b981;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-folder-open" style="color: #10b981;"></i>
                                <span style="font-weight: 600; color: #065f46;">本地文件路径</span>
                            </div>
                            <div style="color: #047857; font-size: 0.9rem; word-break: break-all;">
                                <i class="fas fa-file-code"></i> ${savedFilePath || filename}
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #059669;">
                                <i class="fas fa-info-circle"></i> 文件已保存到本地，可以直接打开查看
                            </div>
                        </div>
                    `;
                }
                
                resultContent.innerHTML = `
                    <div class="web-result-item">
                        <div class="result-prompt"><strong>提示词：</strong>${this.escapeHtml(prompt)}</div>
                        <div style="margin-top: 1rem; padding: 1rem; background: #f0f9ff; border-radius: 8px; border: 2px solid #0ea5e9;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                                <i class="fas fa-globe" style="color: #0ea5e9; font-size: 1.2rem;"></i>
                                <div style="font-weight: 600; color: #0c4a6e;">网页预览链接</div>
                            </div>
                            <div style="padding: 0.75rem; background: white; border-radius: 6px; border: 1px solid #bae6fd;">
                                <a href="${webpageUrl}" target="_blank" style="color: #0284c7; text-decoration: none; font-size: 1rem; word-break: break-all; display: inline-flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-external-link-alt"></i>
                                    <span>${savedFilePath ? '点击打开网页（临时预览）' : '点击打开网页'}</span>
                                </a>
                            </div>
                            ${filePathDisplay}
                            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #64748b;">
                                <i class="fas fa-info-circle"></i> ${savedFilePath ? '文件已保存到本地文件夹，建议直接打开本地文件查看' : '点击链接在新窗口中查看生成的网页（临时预览）'}
                            </div>
                        </div>
                        <div style="margin-top: 1rem; padding: 1rem; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                            <div style="color: #e2e8f0; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">
                                <i class="fas fa-code"></i> HTML 源代码（模型原始返回）
                            </div>
                            <pre style="margin: 0; padding: 0; background: transparent; color: #cbd5e1; font-size: 0.85rem; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto;"><code>${this.escapeHtml(rawResponse)}</code></pre>
                        </div>
                        <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                            <button class="save-to-storage-btn" data-type="web" data-item-id="${webpageData.id}" data-task-id="${task.id}">
                                <i class="fas fa-save"></i> 保存到存储容器
                            </button>
                            <button class="export-all-html-btn" data-task-id="${task.id}" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease;">
                                <i class="fas fa-download"></i> 导出所有HTML源代码
                            </button>
                        </div>
                    </div>
                `;
                
                // 绑定保存按钮
                const saveBtn = resultContent.querySelector('.save-to-storage-btn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', () => {
                        webpageData.saved = true;
                        webpageData.manualSaved = true;
                        this.saveTasks();
                        this.showStorageContent(task.id, 'webpages');
                        this.showNotification('已保存到存储容器', 'success');
                    });
                }
                
                // 绑定导出所有HTML按钮
                const exportBtn = resultContent.querySelector('.export-all-html-btn');
                if (exportBtn) {
                    exportBtn.addEventListener('click', () => {
                        this.exportAllHtmlSources(task.id);
                    });
                }
            }
            
            this.showNotification('排版生成完成', 'success');
        } catch (error) {
            console.error('生成网页错误:', error);
            if (resultContent) {
                resultContent.innerHTML = `<div class="error-text">生成失败：${this.escapeHtml(error.message)}</div>`;
            }
            this.showNotification('生成网页失败：' + error.message, 'error');
        }
    }
    
    /**
     * 显示存储内容
     * @param {string} taskId - 任务ID
     * @param {string} type - 存储类型：images, texts, webpages
     */
    showStorageContent(taskId, type) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.data) return;
        
        const storageContent = document.getElementById(`storage-content-${taskId}`);
        if (!storageContent) return;
        
        let content = '';
        
        if (type === 'images') {
            const images = (task.data.images || []).filter(img => img.saved !== false);
            const thumbnails = (task.data.styleBatchThumbnails || []).filter(thumb => thumb?.thumbnailUrl);
            if (images.length === 0 && thumbnails.length === 0) {
                content = '<div class="storage-empty">还没有保存的图片</div>';
            } else {
                const savedImagesSection = images.length ? images.map((img, idx) => {
                    let imageHtml = '';
                    let imageUrlLink = '';
                    
                    // 检查是否有图片URL（可能是HTTP URL或data URL）
                    if (img.imageUrl && img.imageUrl.startsWith('http')) {
                        // HTTP URL，使用 markdown 格式显示链接
                        imageHtml = `<div class="storage-image-preview" style="margin-top: 0.75rem;">${this.formatMarkdown(`[点击查看图片](${img.imageUrl})`)}</div>`;
                        // 添加URL链接（markdown格式）
                        imageUrlLink = `
                            <div class="image-url-link-container" style="margin-top: 0.75rem;">
                                ${this.formatMarkdown(`[查看原图](${img.imageUrl})`)}
                            </div>
                        `;
                    } else if (img.imageUrl && img.imageUrl.startsWith('data:')) {
                        // data URL（base64），直接显示（这种情况在保存后不会存在）
                        imageHtml = `<div class="storage-image-preview" style="margin-top: 0.75rem;"><img src="${img.imageUrl}" alt="生成的图片" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>`;
                        // 添加URL链接（在新窗口打开，markdown格式）
                        imageUrlLink = `
                            <div class="image-url-link-container" style="margin-top: 0.75rem;">
                                ${this.formatMarkdown(`[在新窗口查看原图](${img.imageUrl})`)}
                            </div>
                        `;
                    } else if (img.textMessage) {
                        // 如果没有图片但有文本消息，显示文本
                        imageHtml = `<div class="storage-text-content" style="margin-top: 0.75rem;">${this.formatMarkdown(img.textMessage)}</div>`;
                        // 尝试从文本中提取URL，使用 markdown 格式
                        const urlMatch = img.textMessage.match(/https?:\/\/[^\s]+/);
                        if (urlMatch) {
                            imageUrlLink = `
                                <div class="image-url-link-container" style="margin-top: 0.75rem;">
                                    ${this.formatMarkdown(`[查看原图](${urlMatch[0]})`)}
                                </div>
                            `;
                        }
                    } else {
                        // 没有图片数据（base64数据已移除以节省存储空间）
                        imageHtml = '<div class="storage-note" style="margin-top: 0.75rem; padding: 0.5rem; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; color: #92400e; font-size: 0.85rem;">图片数据未保存（为节省存储空间，base64图片数据不会保存到本地）</div>';
                    }
                    
                    return `
                    <div class="storage-item" data-item-id="${img.id}" data-item-type="images">
                        <div class="storage-item-header">
                            <span class="storage-item-title">图片 ${idx + 1}</span>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="storage-item-time">${new Date(img.createdAt).toLocaleString('zh-CN')}</span>
                                <button class="delete-storage-item-btn" data-item-id="${img.id}" data-item-type="images" data-task-id="${taskId}" title="删除此项">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="storage-item-content">
                            <div class="storage-prompt"><strong>提示词：</strong>${this.escapeHtml(img.prompt)}</div>
                            ${img.generatedPrompt ? `<div class="storage-text"><strong>生成的提示词：</strong>${this.escapeHtml(img.generatedPrompt)}</div>` : ''}
                            ${imageHtml}
                            ${imageUrlLink}
                        </div>
                    </div>
                `;
                }).join('') : '';
                
                const thumbnailSection = thumbnails.length ? `
                    ${savedImagesSection ? '<div class="storage-section-divider"></div>' : ''}
                    <div class="storage-section-title">
                        <i class="fas fa-th-large"></i>
                        <span>批量缩略图</span>
                    </div>
                    ${thumbnails.map((thumb, idx) => `
                        <div class="storage-item storage-item-thumb" data-item-id="${thumb.id}" data-item-type="batchThumbnails">
                            <div class="storage-item-header">
                                <span class="storage-item-title">${this.escapeHtml((thumb.styleTitle || '风格') + '｜' + (thumb.themeKey || `图片${thumb.imageIndex || idx + 1}`))}</span>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span class="storage-item-time">${new Date(thumb.createdAt || Date.now()).toLocaleString('zh-CN')}</span>
                                    <button class="delete-storage-item-btn" data-item-id="${thumb.id}" data-item-type="batchThumbnails" data-task-id="${taskId}" title="删除此项">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="storage-item-content">
                                <div class="storage-prompt">
                                    <strong>提示词：</strong>${this.escapeHtml(thumb.prompt || '（暂无提示词）')}
                                </div>
                                <div class="style-batch-thumb-preview">
                                    <img src="${thumb.thumbnailUrl}" alt="批量缩略图" loading="lazy">
                                </div>
                                <div class="style-batch-thumb-meta">
                                    <span>${this.escapeHtml(`图片 ${thumb.imageIndex || idx + 1}`)}</span>
                                    ${thumb.themeText ? `<span>｜${this.escapeHtml(thumb.themeText)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                ` : '';
                
                content = [savedImagesSection, thumbnailSection].filter(Boolean).join('');
            }
        } else if (type === 'texts') {
            const texts = (task.data.texts || []).filter(txt => txt.saved !== false);
            if (texts.length === 0) {
                content = '<div class="storage-empty">还没有保存的文字内容</div>';
            } else {
                content = texts.map((txt, idx) => `
                    <div class="storage-item" data-item-id="${txt.id}" data-item-type="texts">
                        <div class="storage-item-header">
                            <span class="storage-item-title">文字 ${idx + 1}</span>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="storage-item-time">${new Date(txt.createdAt).toLocaleString('zh-CN')}</span>
                                <button class="delete-storage-item-btn" data-item-id="${txt.id}" data-item-type="texts" data-task-id="${taskId}" title="删除此项">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="storage-item-content">
                            <div class="storage-prompt"><strong>提示词：</strong>${this.escapeHtml(txt.prompt)}</div>
                            <div class="storage-text-content">${this.formatMarkdown(txt.content)}</div>
                        </div>
                    </div>
                `).join('');
            }
        } else if (type === 'webpages') {
            const webpages = (task.data.webpages || []).filter(web => web.saved !== false);
            if (webpages.length === 0) {
                content = '<div class="storage-empty">还没有保存的排版</div>';
            } else {
                content = webpages.map((web, idx) => {
                    const titleText = web.themeKey
                        ? `${web.themeKey}${web.themeText ? '｜' + web.themeText : ''}`
                        : `排版 ${idx + 1}`;
                    // 如果网页URL不存在，尝试从HTML内容重新生成
                    let webpageUrl = web.webpageUrl;
                    if (!webpageUrl && web.htmlContent) {
                        const blob = new Blob([web.htmlContent], { type: 'text/html;charset=utf-8' });
                        webpageUrl = URL.createObjectURL(blob);
                        // 更新数据中的URL
                        web.webpageUrl = webpageUrl;
                    }
                    
                    // 优先显示原始响应，如果没有则显示处理后的内容
                    const displayContent = web.rawResponse || web.htmlContent || web.markdownContent || web.htmlCode || '';
                    const htmlContent = web.htmlContent || web.markdownContent || web.htmlCode || '';
                    const filePath = web.filePath || web.filename || '';
                    
                    // 重新保存按钮
                    const resaveButton = htmlContent ? `
                        <button class="resave-webpage-btn" data-web-id="${web.id}" data-task-id="${taskId}" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                            <i class="fas fa-download"></i> 重新保存到本地
                        </button>
                    ` : '';
                    
                    return `
                    <div class="storage-item" data-item-id="${web.id}" data-item-type="webpages">
                        <div class="storage-item-header">
                            <span class="storage-item-title">${this.escapeHtml(titleText)}</span>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="storage-item-time">${new Date(web.createdAt).toLocaleString('zh-CN')}</span>
                                <button class="delete-storage-item-btn" data-item-id="${web.id}" data-item-type="webpages" data-task-id="${taskId}" title="删除此项">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="storage-item-content">
                            <div class="storage-prompt"><strong>提示词：</strong>${this.escapeHtml(web.prompt)}</div>
                            ${filePath ? `
                            <div style="margin-top: 0.75rem; padding: 0.75rem; background: #ecfdf5; border-radius: 6px; border: 1px solid #10b981;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <i class="fas fa-folder-open" style="color: #10b981;"></i>
                                    <span style="font-weight: 600; color: #065f46;">本地文件</span>
                                </div>
                                <div style="color: #047857; font-size: 0.9rem; word-break: break-all;">
                                    <i class="fas fa-file-code"></i> ${filePath}
                                </div>
                            </div>
                            ` : ''}
                            ${webpageUrl ? `
                            <div style="margin-top: 0.75rem; padding: 0.75rem; background: #f0f9ff; border-radius: 6px; border: 1px solid #0ea5e9;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <i class="fas fa-globe" style="color: #0ea5e9;"></i>
                                    <span style="font-weight: 600; color: #0c4a6e;">网页预览链接</span>
                                </div>
                                <a href="${webpageUrl}" target="_blank" style="color: #0284c7; text-decoration: none; word-break: break-all; display: inline-flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-external-link-alt"></i>
                                    <span>点击打开网页</span>
                                </a>
                            </div>
                            ` : ''}
                            ${displayContent ? `
                            <div style="margin-top: 0.75rem; padding: 0.75rem; background: #1e293b; border-radius: 6px; border: 1px solid #334155;">
                                <div style="color: #e2e8f0; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem;">
                                    <i class="fas fa-code"></i> HTML 源代码${web.rawResponse ? '（模型原始返回）' : ''}
                                </div>
                                <pre style="margin: 0; padding: 0; background: transparent; color: #cbd5e1; font-size: 0.8rem; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; max-height: 200px; overflow-y: auto;"><code>${this.escapeHtml(displayContent.substring(0, 1000))}${displayContent.length > 1000 ? '...' : ''}</code></pre>
                            </div>
                            ${resaveButton}
                            ` : ''}
                        </div>
                    </div>
                `;
                }).join('');
            }
        }
        
        storageContent.innerHTML = content;
        
        // 绑定删除按钮事件
        storageContent.querySelectorAll('.delete-storage-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.itemId;
                const itemType = btn.dataset.itemType;
                const taskId = btn.dataset.taskId;
                if (confirm('确定要删除此项吗？')) {
                    this.deleteStorageItem(taskId, itemType, itemId);
                }
            });
        });
        
        // 绑定重新保存网页按钮事件
        storageContent.querySelectorAll('.resave-webpage-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const webId = btn.dataset.webId;
                const taskId = btn.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (!task || !task.data || !task.data.webpages) return;
                
                const webpage = task.data.webpages.find(w => w.id === webId);
                if (!webpage || !webpage.htmlContent) {
                    this.showNotification('未找到网页内容', 'error');
                    return;
                }
                
                const filename = webpage.filename || `generated-webpage-${Date.now()}.html`;
                const savedFilePath = await this.saveHtmlToLocalFile(webpage.htmlContent, filename);
                
                if (savedFilePath) {
                    webpage.filePath = savedFilePath;
                    webpage.filename = filename;
                    this.saveTasks();
                    // 刷新存储容器显示
                    const activeTab = document.querySelector(`.storage-tab.active[data-task-id="${taskId}"]`);
                    if (activeTab) {
                        this.showStorageContent(taskId, activeTab.dataset.storageType);
                    }
                }
            });
        });
    }
    
    /**
     * 清空所有存储内容
     * @param {string} taskId - 任务ID
     */
    clearAllStorage(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // 清空所有已保存的内容
        if (task.data.images) {
            task.data.images = task.data.images.filter(img => img.saved === false);
        }
        if (task.data.texts) {
            task.data.texts = task.data.texts.filter(txt => txt.saved === false);
        }
        if (task.data.webpages) {
            task.data.webpages = task.data.webpages.filter(web => web.saved === false);
        }
        if (task.data.styleBatchThumbnails) {
            task.data.styleBatchThumbnails = [];
        }
        
        // 保存任务
        this.saveTasks();
        
        // 刷新存储容器显示
        const activeTab = document.querySelector(`.storage-tab.active[data-task-id="${taskId}"]`);
        if (activeTab) {
            this.showStorageContent(taskId, activeTab.dataset.storageType);
        } else {
            this.showStorageContent(taskId, 'images');
        }
        
        this.showNotification('已清空所有存储内容', 'success');
    }
    
    /**
     * 删除单个存储项
     * @param {string} taskId - 任务ID
     * @param {string} itemType - 项类型：images, texts, webpages
     * @param {string} itemId - 项ID
     */
    deleteStorageItem(taskId, itemType, itemId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        if (itemType === 'images' && task.data.images) {
            const item = task.data.images.find(img => img.id === itemId);
            if (item) {
                item.saved = false;
            }
        } else if (itemType === 'texts' && task.data.texts) {
            const item = task.data.texts.find(txt => txt.id === itemId);
            if (item) {
                item.saved = false;
            }
        } else if (itemType === 'webpages' && task.data.webpages) {
            const item = task.data.webpages.find(web => web.id === itemId);
            if (item) {
                item.saved = false;
            }
        }
        
        // 保存任务
        this.saveTasks();
        
        // 刷新存储容器显示
        const activeTab = document.querySelector(`.storage-tab.active[data-task-id="${taskId}"]`);
        if (activeTab) {
            this.showStorageContent(taskId, activeTab.dataset.storageType);
        } else {
            this.showStorageContent(taskId, itemType);
        }
        
        this.showNotification('已删除', 'success');
    }
    
    /**
     * 加载已存储的内容
     * @param {Object} task - 任务对象
     */
    loadStoredContent(task) {
        // 这个方法在初始化时调用，确保存储容器显示最新内容
        // 具体实现在showStorageContent中
    }
    
    // formatMarkdown 和 formatMarkdownWithImages 方法已移至 script-ui-utils.js

    /**
     * 删除任务
     * @param {string} taskId - 任务ID
     */
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasks();
        this.updateTasksList();
        this.showNotification('任务已删除', 'info');
    }

    /**
     * 保存所有任务
     * 注意：对于已保存到存储容器的图片，保留 base64 数据以便排版生成时使用
     */
    saveTasks() {
        try {
            // 保存任务的基本信息、已保存的图片，以及健康报告任务的数据
            const tasksToSave = this.tasks.map(task => {
                const {
                    data,
                    ...taskMeta
                } = task;
                const taskCopy = { ...taskMeta };
                
                // 处理图片数据（海报和Instagram任务）
                const savedImages = Array.isArray(data?.images)
                    ? data.images
                        .filter(img => img && img.saved !== false)
                        .map(img => ({ ...img }))
                    : [];
                
                // 处理健康报告任务的数据
                if (task.type === 'health-report' && data) {
                    taskCopy.data = {
                        onboardingInfo: data.onboardingInfo || '',
                        conversationRecord: data.conversationRecord || '',
                        systemPrompt: data.systemPrompt || '',
                        htmlOutput: data.htmlOutput || '',
                        modelSelection: data.modelSelection || 'gemini-3-pro-preview',
                        modelSelections: data.modelSelections || {}
                    };
                } else if (task.type === 'ui-design' && data) {
                    // 界面设计任务：保存所有数据，包括聊天记录
                    taskCopy.data = {
                        lastInput: data.lastInput || '',
                        generatedHtml: data.generatedHtml || '',
                        conversationHistory: data.conversationHistory || [],
                        systemPrompt: data.systemPrompt || '',
                        model: data.model || '',
                        config: data.config || {},
                        elementCounter: data.elementCounter || 0,
                        selectedElementId: data.selectedElementId || null,
                        updatedAt: data.updatedAt || Date.now()
                    };
                } else if (savedImages.length > 0) {
                    // 其他任务类型只保存图片
                    taskCopy.data = { images: savedImages };
                } else {
                    // 如果有其他数据需要保存，也保存
                    if (data && Object.keys(data).length > 0) {
                        taskCopy.data = { ...data };
                    } else {
                        delete taskCopy.data;
                    }
                }
                return taskCopy;
            });
            
            const dataToSave = JSON.stringify(tasksToSave);
            const dataSize = new Blob([dataToSave]).size;
            
            // 检查数据大小（localStorage 通常限制为 5-10MB）
            const dataSizeMB = dataSize / 1024 / 1024;
            if (dataSizeMB > 3) { // 3MB 警告阈值
                console.warn('任务数据较大，可能接近存储限制:', dataSizeMB.toFixed(2), 'MB');
                // 如果超过 3MB，自动清理旧任务
                if (tasksToSave.length > 10) {
                    const sorted = tasksToSave
                        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                        .slice(0, 10);
                    const cleanedData = JSON.stringify(sorted);
                    const cleanedSize = new Blob([cleanedData]).size / 1024 / 1024;
                    console.log(`已自动清理任务，从 ${tasksToSave.length} 个减少到 10 个，大小从 ${dataSizeMB.toFixed(2)}MB 减少到 ${cleanedSize.toFixed(2)}MB`);
                    this.safeSetItem('gemini-tasks', sorted);
                    this.tasks = sorted;
                    return;
                }
            }
            
            this.safeSetItem('gemini-tasks', JSON.parse(dataToSave));
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                console.error('存储配额超限，尝试清理旧数据');
                // 尝试清理：只保留最近的任务
                const recentTasks = this.tasks
                    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
                    .slice(0, 5); // 只保留最近5个任务
                
                this.tasks = recentTasks;
                this.showNotification('存储空间不足，已清理旧任务，只保留最近5个任务', 'warning');
                
                // 再次尝试保存
                try {
                    const tasksToSave = recentTasks.map(task => {
                        const { data, ...taskMeta } = task;
                        const taskCopy = { ...taskMeta };
                        
                        // 处理图片数据
                        const savedImages = Array.isArray(data?.images)
                            ? data.images
                                .filter(img => img && img.saved !== false)
                                .map(img => ({ ...img }))
                            : [];
                        
                        // 处理健康报告任务的数据
                        if (task.type === 'health-report' && data) {
                            taskCopy.data = {
                                onboardingInfo: data.onboardingInfo || '',
                                conversationRecord: data.conversationRecord || '',
                                systemPrompt: data.systemPrompt || '',
                                htmlOutput: data.htmlOutput || '',
                                modelSelection: data.modelSelection || 'gemini-3-pro-preview',
                                modelSelections: data.modelSelections || {}
                            };
                        } else if (savedImages.length > 0) {
                            taskCopy.data = { images: savedImages };
                        } else if (data && Object.keys(data).length > 0) {
                            taskCopy.data = { ...data };
                        }
                        return taskCopy;
                    });
                    this.safeSetItem('gemini-tasks', tasksToSave);
                } catch (retryError) {
                    console.error('保存失败:', retryError);
                    this.showNotification('保存失败：存储空间不足，请删除一些任务', 'error');
                }
            } else {
                console.error('保存任务失败:', error);
                this.showNotification('保存任务失败：' + error.message, 'error');
            }
        }
    }

    /**
     * 加载所有任务
     */
    loadTasks() {
        const saved = localStorage.getItem('gemini-tasks');
        if (saved) {
            try {
                this.tasks = JSON.parse(saved);
                
                // 为每个网页重新生成Blob URL（因为Blob URL在页面刷新后会失效）
                this.tasks.forEach(task => {
                    if (task.data && task.data.webpages) {
                        task.data.webpages.forEach(web => {
                            // 如果htmlContent存在但webpageUrl不存在或无效，重新生成
                            if (web.htmlContent && (!web.webpageUrl || !web.webpageUrl.startsWith('blob:'))) {
                                try {
                                    const blob = new Blob([web.htmlContent], { type: 'text/html;charset=utf-8' });
                                    web.webpageUrl = URL.createObjectURL(blob);
                                } catch (error) {
                                    console.warn('重新生成网页URL失败:', error);
                                }
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('加载任务列表失败:', error);
                this.tasks = [];
            }
        }
    }

    /**
     * 检查并清理存储空间
     */
    checkAndCleanStorage() {
        try {
            // 计算当前存储使用量
            let totalSize = 0;
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('gemini-')) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        totalSize += new Blob([value]).size;
                    }
                }
            });
            
            const totalSizeMB = totalSize / 1024 / 1024;
            console.log('当前存储使用量:', totalSizeMB.toFixed(2), 'MB');
            
            // 如果超过 4MB，自动清理
            if (totalSizeMB > 4) {
                console.warn('存储使用量超过 4MB，开始自动清理...');
                
                // 清理旧对话（只保留最近50个）
                const savedConversations = localStorage.getItem('gemini-conversations');
                if (savedConversations) {
                    try {
                        const conversations = JSON.parse(savedConversations);
                        if (conversations.length > 50) {
                            const sorted = conversations
                                .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                                .slice(0, 50);
                            this.safeSetItem('gemini-conversations', sorted);
                            console.log(`已清理对话，从 ${conversations.length} 个减少到 50 个`);
                        }
                    } catch (e) {
                        console.warn('清理对话失败:', e);
                    }
                }
                
                // 清理旧任务（只保留最近10个）
                const savedTasks = localStorage.getItem('gemini-tasks');
                if (savedTasks) {
                    try {
                        const tasks = JSON.parse(savedTasks);
                        if (tasks.length > 10) {
                            const sorted = tasks
                                .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                                .slice(0, 10);
                            this.safeSetItem('gemini-tasks', sorted);
                            console.log(`已清理任务，从 ${tasks.length} 个减少到 10 个`);
                        }
                    } catch (e) {
                        console.warn('清理任务失败:', e);
                    }
                }
            }
        } catch (error) {
            console.warn('检查存储空间失败:', error);
        }
    }

    /**
     * 释放空间：只清理非对话类本地存储，保留对话历史
     */
    clearNonConversationStorage() {
        try {
            const keys = Object.keys(localStorage);
            let removedCount = 0;
            keys.forEach(key => {
                // 保留对话数据
                if (key === 'gemini-conversations') return;
                // 其他所有 gemini-* 相关键都清理掉，用来释放空间
                if (key.startsWith('gemini-')) {
                    localStorage.removeItem(key);
                    removedCount++;
                }
            });
            this.showNotification(`已清理非对话数据，共移除 ${removedCount} 个项目，对话历史已保留。`, 'success');
        } catch (error) {
            console.error('释放空间失败:', error);
            this.showNotification('释放空间失败：' + error.message, 'error');
        }
    }

    /**
     * 一键清空所有本地存储（用户手动触发，包含对话）
     */
    clearAllStorage() {
        try {
            const confirmed = window.confirm('⚠️ 警告：此操作将清空所有对话、任务和设置，且无法恢复。\n\n确定要继续吗？');
            if (!confirmed) {
                return;
            }
            localStorage.clear();
            this.showNotification('已清空所有本地存储（对话、任务、设置等），页面即将刷新。', 'success');
            // 直接刷新页面，避免依赖任何实例方法
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('清空本地存储失败:', error);
            this.showNotification('清空本地存储失败：' + error.message, 'error');
        }
    }

    /**
     * 自动保存Grounding设置
     */
    autoSaveGroundingSetting() {
        const settings = {
            apiKey: this.apiKey,
            temperature: this.temperature,
            maxTokens: this.maxTokens,
            topP: this.topP,
            topK: this.topK,
            candidateCount: this.candidateCount,
            stopSequences: this.stopSequences,
            contextWindow: this.contextWindow,
            enableGrounding: this.enableGrounding
        };
        
        // 延迟保存，避免频繁操作
        clearTimeout(this.autoSaveGroundingTimeout);
        this.autoSaveGroundingTimeout = setTimeout(() => {
            this.safeSetItem('gemini-settings', settings);
        }, 500);
    }

    /**
     * 渲染虚拟用户多选选项
     */
    populateVirtualUserOptions() {
        if (!this.jovidaVirtualUserSelect) {
            return;
        }
        this.jovidaVirtualUserSelect.innerHTML = '';
        JOVIDA_VIRTUAL_USERS.forEach((user) => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.persona})`;
            this.jovidaVirtualUserSelect.appendChild(option);
        });
        this.renderVirtualUserPrompts();
    }

    /**
     * 处理虚拟用户选择变更
     */
    handleVirtualUserSelection() {
        if (!this.currentConversationId) return;
        const conversation = this.getCurrentConversation();
        if (!conversation || conversation.title !== 'Jovida虚拟用户模拟器') {
            return;
        }
        const selectedValues = Array.from(this.jovidaVirtualUserSelect.selectedOptions).map(option => option.value);
        conversation.virtualUsers = selectedValues;
        clearTimeout(this.autoSaveVirtualUsersTimeout);
        this.autoSaveVirtualUsersTimeout = setTimeout(() => {
            this.saveConversations();
        }, 500);
    }

    /**
     * 同步虚拟用户多选框选中状态
     * @param {Object} conversation - 当前对话
     */
    syncVirtualUserSelect(conversation) {
        if (!this.jovidaVirtualUserSelect) {
            return;
        }
        const selectedSet = new Set(conversation.virtualUsers || []);
        Array.from(this.jovidaVirtualUserSelect.options).forEach((option) => {
            option.selected = selectedSet.has(option.value);
        });
    }

    /**
     * 构建Jovida虚拟用户模拟器的系统提示词
     * @param {Object} conversation - 当前对话
     * @returns {string} 拼接后的系统提示词
     */
    buildJovidaVirtualUserSystemPrompt(conversation) {
        const basePrompt = (conversation.systemPrompt && conversation.systemPrompt.trim().length > 0)
            ? conversation.systemPrompt.trim()
            : 'You are a helpful assistant. Please answer in Chinese.';
        const selectedUsers = (conversation.virtualUsers || [])
            .map((userId) => this.getVirtualUserMeta(userId))
            .filter((user) => !!user);

        const selectedUserText = selectedUsers.length > 0
            ? selectedUsers.map((user, index) => `${index + 1}. 【${user.name}】${user.persona}，关注点：${user.focus}`).join('\n')
            : '当前未选择虚拟用户，请先提醒用户在设置面板中勾选需要模拟的虚拟用户。';

        const multiSelectRule = selectedUsers.length > 1
            ? '当勾选多名虚拟用户时，需要按照选择顺序逐一模拟。每段回答以“【虚拟用户姓名】”开头，分别输出，避免混写。'
            : '当只勾选一名虚拟用户时，全程保持该角色的语气和关注点。';

        return `${basePrompt}

[虚拟用户模拟原理]
1. 你是Jovida虚拟用户模拟器，用来扮演预先定义的5名虚拟用户。
2. 只能在设置面板选中的虚拟用户范围内进行模拟，禁止创造未被选中的角色。
3. 当前需要模拟的虚拟用户如下：
${selectedUserText}
4. 你必须完全沉浸为所选虚拟用户，以第一人称视角表达，语气习惯、需求和关注点都要与该角色一致。
5. ${multiSelectRule}
6. 每一个回答都要按照角色真正的需求和痛点去思考解决方案，解释“为什么这能满足我”，不要给出通用AI语气。
7. 严格使用第一人称（例如“我需要”、“我担心”），不要改用第三人称。
8. 如果未选择任何虚拟用户，只需礼貌地提醒用户去设置里多选需要模拟的角色后再继续。`;
    }

    /**
     * 根据ID获取虚拟用户元信息
     * @param {string} userId - 虚拟用户ID
     * @returns {{id: string, name: string, persona: string, focus: string}|undefined} 虚拟用户信息
     */
    getVirtualUserMeta(userId) {
        return JOVIDA_VIRTUAL_USERS.find((user) => user.id === userId);
    }

    /**
     * 渲染虚拟用户提示词列表
     */
    renderVirtualUserPrompts() {
        if (!this.jovidaVirtualUserPromptList) {
            return;
        }
        this.jovidaVirtualUserPromptList.innerHTML = '';
        JOVIDA_VIRTUAL_USERS.forEach((user) => {
            const details = document.createElement('details');
            details.className = 'virtual-user-prompt';

            const summary = document.createElement('summary');
            summary.textContent = `${user.name} · ${user.persona}`;
            details.appendChild(summary);

            const promptParagraph = document.createElement('p');
            promptParagraph.innerHTML = this.escapeHtml(user.prompt).replace(/\n/g, '<br>');
            details.appendChild(promptParagraph);

            this.jovidaVirtualUserPromptList.appendChild(details);
        });
    }

    /**
     * 打开健康报告方案任务
     * @param {Object} task - 任务对象
     */
    openHealthReportTask(task) {
        // 初始化任务数据
        if (!task.data) {
            task.data = {
                onboardingInfo: '',
                conversationRecord: '',
                systemPrompt: '',
                htmlOutput: '',
                modelSelection: 'gemini-3-pro-preview'
            };
            this.saveTasks();
        }

        // 创建任务视图
        const taskView = document.createElement('div');
        taskView.className = 'task-view';
        taskView.innerHTML = `
            <div class="task-view-header">
                <button class="task-view-back">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h2>${this.escapeHtml(task.name)}</h2>
            </div>
            <div class="health-report-workspace">
                <div class="health-report-inputs">
                    <div class="health-report-section">
                        <div class="section-header">
                            <h3><i class="fas fa-info-circle"></i> Onboarding信息</h3>
                            <p class="section-description">输入onboarding信息</p>
                        </div>
                        <textarea 
                            id="health-report-onboarding-${task.id}" 
                            class="health-report-textarea"
                            placeholder="请输入onboarding信息..."
                            rows="8"
                        >${this.escapeHtml(task.data.onboardingInfo || '')}</textarea>
                    </div>

                    <div class="health-report-section">
                        <div class="section-header">
                            <h3><i class="fas fa-comments"></i> Onboarding交互对话记录</h3>
                            <p class="section-description">输入onboarding交互对话记录</p>
                        </div>
                        <textarea 
                            id="health-report-conversation-${task.id}" 
                            class="health-report-textarea"
                            placeholder="请输入onboarding交互对话记录..."
                            rows="8"
                        >${this.escapeHtml(task.data.conversationRecord || '')}</textarea>
                    </div>

                    <div class="health-report-section">
                        <div class="section-header">
                            <h3><i class="fas fa-cog"></i> 系统提示词（隐藏）</h3>
                            <p class="section-description">系统提示词，用于控制AI的行为</p>
                        </div>
                        <textarea 
                            id="health-report-system-prompt-${task.id}" 
                            class="health-report-textarea"
                            placeholder="请输入系统提示词..."
                            rows="6"
                        >${this.escapeHtml(task.data.systemPrompt || '')}</textarea>
                    </div>

                    <div class="health-report-section">
                        <div class="section-header">
                            <h3><i class="fas fa-robot"></i> 模型选择</h3>
                        </div>
                        ${this.renderModelSelect('health-report', task)}
                    </div>

                    <div class="health-report-actions">
                        <button class="health-report-generate-btn" data-task-id="${task.id}">
                            <i class="fas fa-magic"></i> 生成健康报告
                        </button>
                        <button class="health-report-batch-btn" data-task-id="${task.id}">
                            <i class="fas fa-layer-group"></i> 批量运行
                        </button>
                    </div>
                </div>

                <div class="health-report-output">
                    <div class="section-header">
                        <h3><i class="fas fa-code"></i> 输出结果（HTML代码）</h3>
                    </div>
                    <textarea 
                        id="health-report-output-${task.id}" 
                        class="health-report-textarea output-textarea"
                        placeholder="生成的HTML代码将显示在这里..."
                        rows="15"
                        readonly
                    >${this.escapeHtml(task.data.htmlOutput || '')}</textarea>
                    
                    <div class="health-report-preview" id="health-report-preview-${task.id}">
                        <div class="section-header">
                            <h3><i class="fas fa-eye"></i> 预览</h3>
                        </div>
                        <div class="preview-container" id="preview-container-${task.id}">
                            ${task.data.htmlOutput ? '<iframe srcdoc="' + this.escapeHtml(task.data.htmlOutput).replace(/"/g, '&quot;') + '" style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 8px;"></iframe>' : '<p style="color: #999; text-align: center; padding: 2rem;">暂无预览内容</p>'}
                        </div>
                    </div>

                    <div class="health-report-download">
                        <button class="health-report-download-btn" data-task-id="${task.id}" ${!task.data.htmlOutput ? 'disabled' : ''}>
                            <i class="fas fa-download"></i> 下载网页
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 替换当前视图
        if (this.viewTasks) {
            this.viewTasks.innerHTML = '';
            this.viewTasks.appendChild(taskView);
        }

        // 绑定返回按钮
        const backBtn = taskView.querySelector('.task-view-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.updateTasksList();
            });
        }

        // 绑定输入框自动保存（使用防抖函数，避免频繁保存）
        const saveHealthReportData = (() => {
            let saveTimer = null;
            return () => {
                if (saveTimer) clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    const onboardingInput = document.getElementById(`health-report-onboarding-${task.id}`);
                    const conversationInput = document.getElementById(`health-report-conversation-${task.id}`);
                    const systemPromptInput = document.getElementById(`health-report-system-prompt-${task.id}`);
                    
                    if (onboardingInput) {
                        task.data.onboardingInfo = onboardingInput.value;
                    }
                    if (conversationInput) {
                        task.data.conversationRecord = conversationInput.value;
                    }
                    if (systemPromptInput) {
                        task.data.systemPrompt = systemPromptInput.value;
                    }
                    
                    task.updatedAt = Date.now();
                    this.saveTasks();
                }, 500); // 500ms防抖
            };
        })();

        const onboardingInput = document.getElementById(`health-report-onboarding-${task.id}`);
        const conversationInput = document.getElementById(`health-report-conversation-${task.id}`);
        const systemPromptInput = document.getElementById(`health-report-system-prompt-${task.id}`);

        if (onboardingInput) {
            onboardingInput.addEventListener('input', saveHealthReportData);
            onboardingInput.addEventListener('blur', saveHealthReportData);
        }

        if (conversationInput) {
            conversationInput.addEventListener('input', saveHealthReportData);
            conversationInput.addEventListener('blur', saveHealthReportData);
        }

        if (systemPromptInput) {
            systemPromptInput.addEventListener('input', saveHealthReportData);
            systemPromptInput.addEventListener('blur', saveHealthReportData);
        }

        // 绑定模型选择器
        this.bindModelSelects(task);

        // 绑定生成按钮
        const generateBtn = taskView.querySelector(`.health-report-generate-btn[data-task-id="${task.id}"]`);
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateHealthReport(task);
            });
        }

        // 绑定下载按钮
        const downloadBtn = taskView.querySelector(`.health-report-download-btn[data-task-id="${task.id}"]`);
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadHealthReportHtml(task);
            });
        }

        // 绑定批量运行按钮
        const batchBtn = taskView.querySelector(`.health-report-batch-btn[data-task-id="${task.id}"]`);
        if (batchBtn) {
            batchBtn.addEventListener('click', () => {
                this.openHealthReportBatchModal(task);
            });
        }

        // 初始化批量弹窗（如果还没有创建）
        this.initHealthReportBatchModal(task);
    }

    /**
     * 生成健康报告
     * @param {Object} task - 任务对象
     */
    async generateHealthReport(task) {
        if (!this.apiKey) {
            this.showNotification('请先在设置中配置API Key', 'error');
            return;
        }

        const onboardingInfo = document.getElementById(`health-report-onboarding-${task.id}`)?.value.trim() || '';
        const conversationRecord = document.getElementById(`health-report-conversation-${task.id}`)?.value.trim() || '';
        const systemPrompt = document.getElementById(`health-report-system-prompt-${task.id}`)?.value.trim() || '';
        const outputTextarea = document.getElementById(`health-report-output-${task.id}`);
        const generateBtn = document.querySelector(`.health-report-generate-btn[data-task-id="${task.id}"]`);
        const previewContainer = document.getElementById(`preview-container-${task.id}`);

        if (!onboardingInfo && !conversationRecord) {
            this.showNotification('请至少填写onboarding信息或对话记录', 'warning');
            return;
        }

        // 保存输入内容
        task.data.onboardingInfo = onboardingInfo;
        task.data.conversationRecord = conversationRecord;
        task.data.systemPrompt = systemPrompt;
        task.updatedAt = Date.now();
        this.saveTasks();

        // 禁用生成按钮
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        }

        try {
            // 构建用户查询
            const userQuery = [];
            if (onboardingInfo) {
                userQuery.push(`Onboarding信息：\n${onboardingInfo}`);
            }
            if (conversationRecord) {
                userQuery.push(`Onboarding交互对话记录：\n${conversationRecord}`);
            }
            const userMessage = userQuery.join('\n\n');

            // 构建消息
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            messages.push({ role: 'user', content: userMessage });

            // 获取模型选择
            const modelToUse = this.getTaskModelSelection(task, 'health-report');

            // 调用API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: this.buildPromptFromMessages(messages)
                        }]
                    }],
                    generationConfig: {
                        temperature: this.temperature,
                        maxOutputTokens: this.maxTokens,
                        topP: this.topP,
                        topK: this.topK
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                throw new Error('API响应格式错误: ' + JSON.stringify(data));
            }

            const htmlContent = data.candidates[0].content.parts[0].text;

            // 保存输出
            task.data.htmlOutput = htmlContent;
            task.updatedAt = Date.now();
            this.saveTasks();

            // 更新输出框
            if (outputTextarea) {
                outputTextarea.value = htmlContent;
            }

            // 更新预览
            if (previewContainer) {
                previewContainer.innerHTML = `<iframe srcdoc="${this.escapeHtml(htmlContent).replace(/"/g, '&quot;')}" style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 8px;"></iframe>`;
            }

            // 启用下载按钮
            const downloadBtn = document.querySelector(`.health-report-download-btn[data-task-id="${task.id}"]`);
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }

            this.showNotification('健康报告生成成功', 'success');
        } catch (error) {
            console.error('生成健康报告失败:', error);
            this.showNotification('生成失败: ' + error.message, 'error');
        } finally {
            // 恢复生成按钮
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> 生成健康报告';
            }
        }
    }

    /**
     * 下载健康报告HTML
     * @param {Object} task - 任务对象
     */
    async downloadHealthReportHtml(task) {
        if (!task.data || !task.data.htmlOutput) {
            this.showNotification('没有可下载的内容', 'warning');
            return;
        }

        try {
            const htmlContent = task.data.htmlOutput;
            const filename = `健康报告_${task.name}_${new Date().toISOString().slice(0, 10)}.html`;
            await this.downloadHtmlFile(htmlContent, filename);
        } catch (error) {
            console.error('下载失败:', error);
            this.showNotification('下载失败: ' + error.message, 'error');
        }
    }

    /**
     * 初始化健康报告批量弹窗
     * @param {Object} task - 任务对象
     */
    initHealthReportBatchModal(task) {
        // 初始化批量数据
        if (!task.data.healthReportBatchInputs) {
            task.data.healthReportBatchInputs = Array(5).fill(null).map(() => ({
                onboardingInfo: '',
                conversationRecord: '',
                systemPrompt: task.data.systemPrompt || '', // 默认使用任务的系统提示词
                modelSelection: task.data.modelSelection || 'gemini-3-pro-preview'
            }));
            this.saveTasks();
        }

        // 创建弹窗（如果不存在）
        let modal = document.getElementById(`health-report-batch-modal-${task.id}`);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = `health-report-batch-modal-${task.id}`;
            modal.className = 'health-report-batch-modal';
            document.body.appendChild(modal);
        }
        modal.innerHTML = this.renderHealthReportBatchModal(task);
        this.bindHealthReportBatchEvents(task);
    }

    /**
     * 渲染健康报告批量弹窗
     * @param {Object} task - 任务对象
     */
    renderHealthReportBatchModal(task) {
        const inputs = task.data.healthReportBatchInputs || Array(5).fill(null).map(() => ({
            onboardingInfo: '',
            conversationRecord: '',
            systemPrompt: task.data.systemPrompt || '',
            modelSelection: task.data.modelSelection || 'gemini-3-pro-preview'
        }));

        const defaultSystemPrompt = task.data.systemPrompt || '';

        const userInputsHtml = inputs.map((input, index) => {
            const userNum = index + 1;
            const currentSystemPrompt = input.systemPrompt || defaultSystemPrompt;
            const currentModel = input.modelSelection || 'gemini-3-pro-preview';
            
            const modelOptions = MODEL_CHOICES.map(choice => `
                <option value="${choice.value}" ${choice.value === currentModel ? 'selected' : ''}>
                    ${choice.label}
                </option>
            `).join('');

            return `
                <div class="health-report-batch-user-item" data-user-index="${index}">
                    <div class="health-report-batch-user-header">
                        <h4><i class="fas fa-user"></i> 用户 ${userNum}</h4>
                        <button class="health-report-batch-single-generate-btn" data-task-id="${task.id}" data-user-index="${index}" title="单独生成该用户的健康报告">
                            <i class="fas fa-magic"></i> 单独生成
                        </button>
                    </div>
                    <div class="health-report-batch-user-content">
                        <div class="health-report-batch-field">
                            <label>Onboarding信息:</label>
                            <textarea 
                                class="health-report-batch-textarea" 
                                data-user-index="${index}" 
                                data-field="onboardingInfo"
                                placeholder="请输入onboarding信息..."
                                rows="4"
                            >${this.escapeHtml(input.onboardingInfo || '')}</textarea>
                        </div>
                        <div class="health-report-batch-field">
                            <label>Onboarding交互对话记录:</label>
                            <textarea 
                                class="health-report-batch-textarea" 
                                data-user-index="${index}" 
                                data-field="conversationRecord"
                                placeholder="请输入onboarding交互对话记录..."
                                rows="4"
                            >${this.escapeHtml(input.conversationRecord || '')}</textarea>
                        </div>
                        <div class="health-report-batch-field">
                            <label>系统提示词（隐藏）:</label>
                            <textarea 
                                class="health-report-batch-textarea" 
                                data-user-index="${index}" 
                                data-field="systemPrompt"
                                placeholder="请输入系统提示词（留空使用默认）..."
                                rows="3"
                            >${this.escapeHtml(currentSystemPrompt)}</textarea>
                            <small>留空将使用任务默认的系统提示词</small>
                        </div>
                        <div class="health-report-batch-field">
                            <label>模型选择:</label>
                            <select 
                                class="health-report-batch-model-select" 
                                data-user-index="${index}"
                            >
                                ${modelOptions}
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const resultsHtml = this.renderHealthReportBatchResults(task);

        return `
            <div class="health-report-batch-modal-content">
                <div class="health-report-batch-modal-header">
                    <div>
                        <h4><i class="fas fa-layer-group"></i> 健康报告批量生成</h4>
                        <p>可以录入5个用户的onboarding和交互记录，一键并行生成健康报告（每次同时处理3个）</p>
                    </div>
                    <button class="close-health-report-batch-btn" data-task-id="${task.id}" title="关闭">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="health-report-batch-inputs">
                    ${userInputsHtml}
                </div>
                <div class="health-report-batch-actions">
                    <button class="run-health-report-batch-btn" data-task-id="${task.id}">
                        <i class="fas fa-play"></i> 一键并行生成（每次3个）
                    </button>
                    <button class="stop-health-report-batch-btn" data-task-id="${task.id}" style="display: none;">
                        <i class="fas fa-stop"></i> 停止批量运行
                    </button>
                    <button class="download-health-report-batch-btn" data-task-id="${task.id}">
                        <i class="fas fa-file-download"></i> 下载所有报告
                    </button>
                    <button class="clear-health-report-batch-btn" data-task-id="${task.id}">
                        <i class="fas fa-trash-alt"></i> 清空结果
                    </button>
                    <div class="health-report-batch-status" id="health-report-batch-status-${task.id}"></div>
                </div>
                <div class="health-report-batch-results" id="health-report-batch-results-${task.id}">
                    ${resultsHtml}
                </div>
            </div>
        `;
    }

    /**
     * 渲染批量结果列表
     * @param {Object} task - 任务对象
     */
    renderHealthReportBatchResults(task) {
        const results = task.data.healthReportBatchResults || [];
        if (!results.length) {
            return '<div class="health-report-batch-result-empty">还没有批量生成记录</div>';
        }

        return results.map((result, index) => {
            const userNum = index + 1;
            const hasHtml = !!(result.htmlOutput && result.htmlOutput.trim());
            return `
                <div class="health-report-batch-result-item">
                    <div class="health-report-batch-result-header">
                        <h5>用户 ${userNum} - ${new Date(result.createdAt || Date.now()).toLocaleString('zh-CN')}</h5>
                        ${hasHtml ? `
                            <button class="health-report-batch-download-btn" data-task-id="${task.id}" data-result-index="${index}">
                                <i class="fas fa-download"></i> 下载
                            </button>
                        ` : ''}
                    </div>
                    ${hasHtml ? `
                        <div class="health-report-batch-result-preview">
                            <iframe srcdoc="${this.escapeHtml(result.htmlOutput).replace(/"/g, '&quot;')}" 
                                style="width: 100%; height: 400px; border: 1px solid #ddd; border-radius: 4px;"></iframe>
                        </div>
                    ` : '<p style="color: #999; padding: 1rem;">暂无内容</p>'}
                </div>
            `;
        }).join('');
    }

    /**
     * 绑定批量弹窗事件
     * @param {Object} task - 任务对象
     */
    bindHealthReportBatchEvents(task) {
        // 关闭按钮
        const closeBtn = document.querySelector(`.close-health-report-batch-btn[data-task-id="${task.id}"]`);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleHealthReportBatchModal(task.id, false);
            });
        }

        // 输入框自动保存
        const saveBatchInput = (() => {
            let saveTimer = null;
            return (userIndex, field, value) => {
                if (saveTimer) clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    if (!task.data.healthReportBatchInputs) {
                        task.data.healthReportBatchInputs = Array(5).fill(null).map(() => ({}));
                    }
                    if (!task.data.healthReportBatchInputs[userIndex]) {
                        task.data.healthReportBatchInputs[userIndex] = {};
                    }
                    task.data.healthReportBatchInputs[userIndex][field] = value;
                    task.updatedAt = Date.now();
                    this.saveTasks();
                }, 500);
            };
        })();

        // 绑定所有输入框
        const modal = document.getElementById(`health-report-batch-modal-${task.id}`);
        if (modal) {
            modal.querySelectorAll('.health-report-batch-textarea').forEach(textarea => {
                const userIndex = parseInt(textarea.dataset.userIndex);
                const field = textarea.dataset.field;
                textarea.addEventListener('input', () => {
                    saveBatchInput(userIndex, field, textarea.value);
                });
            });
        }

        // 绑定模型选择器
        if (modal) {
            modal.querySelectorAll('.health-report-batch-model-select[data-user-index]').forEach(select => {
                const userIndex = parseInt(select.dataset.userIndex);
                select.addEventListener('change', () => {
                    if (!task.data.healthReportBatchInputs) {
                        task.data.healthReportBatchInputs = Array(5).fill(null).map(() => ({}));
                    }
                    if (!task.data.healthReportBatchInputs[userIndex]) {
                        task.data.healthReportBatchInputs[userIndex] = {};
                    }
                    task.data.healthReportBatchInputs[userIndex].modelSelection = select.value;
                    task.updatedAt = Date.now();
                    this.saveTasks();
                });
            });
        }

        // 开始批量生成按钮
        const runBtn = document.querySelector(`.run-health-report-batch-btn[data-task-id="${task.id}"]`);
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.runHealthReportBatch(task);
            });
        }

        // 停止批量生成按钮
        const stopBtn = document.querySelector(`.stop-health-report-batch-btn[data-task-id="${task.id}"]`);
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopHealthReportBatch(task.id);
            });
        }

        // 下载所有报告按钮
        const downloadAllBtn = document.querySelector(`.download-health-report-batch-btn[data-task-id="${task.id}"]`);
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => {
                this.downloadAllHealthReportBatch(task);
            });
        }

        // 清空结果按钮
        const clearBtn = document.querySelector(`.clear-health-report-batch-btn[data-task-id="${task.id}"]`);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearHealthReportBatchResults(task);
            });
        }

        // 单独生成按钮
        if (modal) {
            modal.querySelectorAll(`.health-report-batch-single-generate-btn[data-task-id="${task.id}"]`).forEach(btn => {
                btn.addEventListener('click', () => {
                    const userIndex = parseInt(btn.dataset.userIndex);
                    this.generateSingleHealthReportBatch(task, userIndex);
                });
            });
        }

        // 下载单个报告按钮
        if (modal) {
            modal.querySelectorAll(`.health-report-batch-download-btn[data-task-id="${task.id}"]`).forEach(btn => {
                btn.addEventListener('click', () => {
                    const resultIndex = parseInt(btn.dataset.resultIndex);
                    this.downloadHealthReportBatchItem(task, resultIndex);
                });
            });
        }
    }

    /**
     * 打开/关闭批量弹窗
     * @param {string} taskId - 任务ID
     * @param {boolean} show - 是否显示
     */
    toggleHealthReportBatchModal(taskId, show) {
        const modal = document.getElementById(`health-report-batch-modal-${taskId}`);
        if (!modal) return;
        modal.classList.toggle('visible', !!show);
    }

    /**
     * 打开批量弹窗
     * @param {Object} task - 任务对象
     */
    openHealthReportBatchModal(task) {
        this.initHealthReportBatchModal(task);
        this.toggleHealthReportBatchModal(task.id, true);
    }

    /**
     * 运行批量生成
     * @param {Object} task - 任务对象
     */
    async runHealthReportBatch(task) {
        if (!this.apiKey) {
            this.showNotification('请先在设置中配置API Key', 'error');
            return;
        }

        // 先从输入框读取最新数据
        const modal = document.getElementById(`health-report-batch-modal-${task.id}`);
        if (modal) {
            modal.querySelectorAll('.health-report-batch-textarea').forEach(textarea => {
                const userIndex = parseInt(textarea.dataset.userIndex);
                const field = textarea.dataset.field;
                if (!task.data.healthReportBatchInputs) {
                    task.data.healthReportBatchInputs = Array(5).fill(null).map(() => ({}));
                }
                if (!task.data.healthReportBatchInputs[userIndex]) {
                    task.data.healthReportBatchInputs[userIndex] = {};
                }
                task.data.healthReportBatchInputs[userIndex][field] = textarea.value;
            });
            modal.querySelectorAll('.health-report-batch-model-select').forEach(select => {
                const userIndex = parseInt(select.dataset.userIndex);
                if (!task.data.healthReportBatchInputs) {
                    task.data.healthReportBatchInputs = Array(5).fill(null).map(() => ({}));
                }
                if (!task.data.healthReportBatchInputs[userIndex]) {
                    task.data.healthReportBatchInputs[userIndex] = {};
                }
                task.data.healthReportBatchInputs[userIndex].modelSelection = select.value;
            });
            this.saveTasks();
        }

        const inputs = task.data.healthReportBatchInputs || [];
        // 创建带索引的有效输入列表，确保每个用户只处理一次
        const validInputsWithIndex = [];
        inputs.forEach((input, index) => {
            const hasOnboarding = input.onboardingInfo && input.onboardingInfo.trim();
            const hasConversation = input.conversationRecord && input.conversationRecord.trim();
            if (hasOnboarding || hasConversation) {
                validInputsWithIndex.push({ input, userIndex: index });
            }
        });

        if (!validInputsWithIndex.length) {
            this.showNotification('请至少填写一个用户的onboarding信息或对话记录', 'warning');
            return;
        }

        // 设置停止标志
        if (!this.healthReportBatchStopFlags) {
            this.healthReportBatchStopFlags = {};
        }
        this.healthReportBatchStopFlags[task.id] = false;

        // 初始化批量结果
        if (!task.data.healthReportBatchResults) {
            task.data.healthReportBatchResults = [];
        }
        const runId = 'batch_' + Date.now();
        const defaultSystemPrompt = task.data.systemPrompt || '';

        // 更新UI
        const runBtn = document.querySelector(`.run-health-report-batch-btn[data-task-id="${task.id}"]`);
        const stopBtn = document.querySelector(`.stop-health-report-batch-btn[data-task-id="${task.id}"]`);
        const statusEl = document.getElementById(`health-report-batch-status-${task.id}`);

        if (runBtn) runBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (statusEl) {
            statusEl.textContent = `开始批量生成 ${validInputsWithIndex.length} 个用户的健康报告（每次并行3个）...`;
            statusEl.dataset.status = 'info';
        }

        let successCount = 0;
        let failCount = 0;

        // 将用户列表分成批次，每批3个
        const batchSize = 3;
        const batches = [];
        for (let i = 0; i < validInputsWithIndex.length; i += batchSize) {
            batches.push(validInputsWithIndex.slice(i, i + batchSize));
        }

        // 批次之间串行处理，批次内并行处理
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            if (this.healthReportBatchStopFlags[task.id]) {
                if (statusEl) {
                    statusEl.textContent = `批量运行已停止（已完成 ${successCount}/${validInputsWithIndex.length}）`;
                    statusEl.dataset.status = 'warning';
                }
                break;
            }

            const batch = batches[batchIndex];
            const batchNumber = batchIndex + 1;
            const totalBatches = batches.length;

            if (statusEl) {
                statusEl.textContent = `正在处理第 ${batchNumber}/${totalBatches} 批（${batch.length}个用户并行）...`;
                statusEl.dataset.status = 'info';
            }

            // 并行处理当前批次的所有用户（每个用户只处理一次）
            const batchPromises = batch.map(async ({ input, userIndex }) => {
                
                try {
                    const onboardingInfo = input.onboardingInfo?.trim() || '';
                    const conversationRecord = input.conversationRecord?.trim() || '';
                    const systemPrompt = (input.systemPrompt?.trim() || defaultSystemPrompt).trim();
                    const modelToUse = input.modelSelection || 'gemini-3-pro-preview';

                    // 构建用户查询
                    const userQuery = [];
                    if (onboardingInfo) {
                        userQuery.push(`Onboarding信息：\n${onboardingInfo}`);
                    }
                    if (conversationRecord) {
                        userQuery.push(`Onboarding交互对话记录：\n${conversationRecord}`);
                    }
                    const userMessage = userQuery.join('\n\n');

                    // 构建消息
                    const messages = [];
                    if (systemPrompt) {
                        messages.push({ role: 'system', content: systemPrompt });
                    }
                    messages.push({ role: 'user', content: userMessage });

                    // 调用API
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: this.buildPromptFromMessages(messages)
                                }]
                            }],
                            generationConfig: {
                                temperature: this.temperature,
                                maxOutputTokens: this.maxTokens,
                                topP: this.topP,
                                topK: this.topK
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    
                    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                        throw new Error('API响应格式错误: ' + JSON.stringify(data));
                    }

                    const htmlContent = data.candidates[0].content.parts[0].text;

                    // 保存结果
                    const result = {
                        id: 'result_' + Date.now() + '_' + userIndex + '_' + Math.random().toString(36).substr(2, 5),
                        runId: runId,
                        userIndex: userIndex,
                        onboardingInfo: onboardingInfo,
                        conversationRecord: conversationRecord,
                        systemPrompt: systemPrompt,
                        modelSelection: modelToUse,
                        htmlOutput: htmlContent,
                        createdAt: Date.now()
                    };

                    return { success: true, result, userIndex };
                } catch (error) {
                    console.error(`生成用户 ${userIndex + 1} 的健康报告失败:`, error);
                    return { success: false, error, userIndex };
                }
            });

            // 等待当前批次完成
            const batchResults = await Promise.all(batchPromises);

            // 处理批次结果
            for (const batchResult of batchResults) {
                if (batchResult.success) {
                    task.data.healthReportBatchResults.push(batchResult.result);
                    successCount++;
                } else {
                    failCount++;
                }
            }

            // 保存任务数据
            task.updatedAt = Date.now();
            this.saveTasks();

            // 更新结果列表
            const resultsContainer = document.getElementById(`health-report-batch-results-${task.id}`);
            if (resultsContainer) {
                resultsContainer.innerHTML = this.renderHealthReportBatchResults(task);
                this.bindHealthReportBatchEvents(task); // 重新绑定事件
            }

            if (statusEl) {
                statusEl.textContent = `第 ${batchNumber}/${totalBatches} 批完成（已完成 ${successCount}/${validInputsWithIndex.length}）`;
                statusEl.dataset.status = 'info';
            }
        }

        // 恢复UI
        if (runBtn) runBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        if (statusEl) {
            if (successCount === validInputsWithIndex.length) {
                statusEl.textContent = `批量生成完成（${successCount}/${validInputsWithIndex.length}）`;
                statusEl.dataset.status = 'success';
                this.showNotification(`批量生成完成（${successCount}/${validInputsWithIndex.length}）`, 'success');
            } else if (this.healthReportBatchStopFlags[task.id]) {
                statusEl.textContent = `批量运行已停止（已完成 ${successCount}/${validInputsWithIndex.length}）`;
                statusEl.dataset.status = 'warning';
            } else {
                statusEl.textContent = `批量生成完成（成功 ${successCount}，失败 ${failCount}/${validInputsWithIndex.length}）`;
                statusEl.dataset.status = failCount === validInputsWithIndex.length ? 'error' : 'warning';
                this.showNotification(`批量生成完成（成功 ${successCount}，失败 ${failCount}）`, failCount === validInputsWithIndex.length ? 'error' : 'warning');
            }
        }

        // 清除停止标志
        delete this.healthReportBatchStopFlags[task.id];
    }

    /**
     * 停止批量生成
     * @param {string} taskId - 任务ID
     */
    stopHealthReportBatch(taskId) {
        if (!this.healthReportBatchStopFlags) {
            this.healthReportBatchStopFlags = {};
        }
        this.healthReportBatchStopFlags[taskId] = true;
        const statusEl = document.getElementById(`health-report-batch-status-${taskId}`);
        if (statusEl) {
            statusEl.textContent = '正在停止批量运行...';
            statusEl.dataset.status = 'warning';
        }
    }

    /**
     * 下载所有批量报告
     * @param {Object} task - 任务对象
     */
    async downloadAllHealthReportBatch(task) {
        const results = task.data.healthReportBatchResults || [];
        const validResults = results.filter(r => r.htmlOutput && r.htmlOutput.trim());

        if (!validResults.length) {
            this.showNotification('没有可下载的报告', 'warning');
            return;
        }

        for (const result of validResults) {
            try {
                const filename = `健康报告_用户${result.userIndex + 1}_${new Date(result.createdAt || Date.now()).toISOString().slice(0, 10)}.html`;
                await this.downloadHtmlFile(result.htmlOutput, filename);
                // 稍微延迟，避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`下载用户 ${result.userIndex + 1} 的报告失败:`, error);
            }
        }

        this.showNotification(`已下载 ${validResults.length} 个报告`, 'success');
    }

    /**
     * 下载单个批量报告
     * @param {Object} task - 任务对象
     * @param {number} resultIndex - 结果索引
     */
    async downloadHealthReportBatchItem(task, resultIndex) {
        const results = task.data.healthReportBatchResults || [];
        const result = results[resultIndex];

        if (!result || !result.htmlOutput) {
            this.showNotification('没有可下载的内容', 'warning');
            return;
        }

        try {
            const filename = `健康报告_用户${result.userIndex + 1}_${new Date(result.createdAt || Date.now()).toISOString().slice(0, 10)}.html`;
            await this.downloadHtmlFile(result.htmlOutput, filename);
            this.showNotification('下载成功', 'success');
        } catch (error) {
            console.error('下载失败:', error);
            this.showNotification('下载失败: ' + error.message, 'error');
        }
    }

    /**
     * 清空批量结果
     * @param {Object} task - 任务对象
     */
    clearHealthReportBatchResults(task) {
        if (!task.data.healthReportBatchResults || task.data.healthReportBatchResults.length === 0) {
            this.showNotification('当前没有批量结果可清空', 'info');
            return;
        }

        if (!confirm('确定清空所有批量生成结果吗？此操作不可恢复。')) {
            return;
        }

        task.data.healthReportBatchResults = [];
        task.updatedAt = Date.now();
        this.saveTasks();

        // 更新结果列表
        const resultsContainer = document.getElementById(`health-report-batch-results-${task.id}`);
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="health-report-batch-result-empty">还没有批量生成记录</div>';
        }

        this.showNotification('批量结果已清空', 'success');
    }

    /**
     * 单独生成单个用户的健康报告
     * @param {Object} task - 任务对象
     * @param {number} userIndex - 用户索引
     */
    async generateSingleHealthReportBatch(task, userIndex) {
        if (!this.apiKey) {
            this.showNotification('请先在设置中配置API Key', 'error');
            return;
        }

        // 先从输入框读取最新数据
        const modal = document.getElementById(`health-report-batch-modal-${task.id}`);
        let input = null;
        if (modal) {
            // 读取该用户的输入数据
            const onboardingInput = modal.querySelector(`.health-report-batch-textarea[data-user-index="${userIndex}"][data-field="onboardingInfo"]`);
            const conversationInput = modal.querySelector(`.health-report-batch-textarea[data-user-index="${userIndex}"][data-field="conversationRecord"]`);
            const systemPromptInput = modal.querySelector(`.health-report-batch-textarea[data-user-index="${userIndex}"][data-field="systemPrompt"]`);
            const modelSelect = modal.querySelector(`.health-report-batch-model-select[data-user-index="${userIndex}"]`);

            input = {
                onboardingInfo: onboardingInput?.value || '',
                conversationRecord: conversationInput?.value || '',
                systemPrompt: systemPromptInput?.value || '',
                modelSelection: modelSelect?.value || 'gemini-3-pro-preview'
            };

            // 保存到任务数据
            if (!task.data.healthReportBatchInputs) {
                task.data.healthReportBatchInputs = Array(5).fill(null).map(() => ({}));
            }
            if (!task.data.healthReportBatchInputs[userIndex]) {
                task.data.healthReportBatchInputs[userIndex] = {};
            }
            task.data.healthReportBatchInputs[userIndex] = { ...input };
            this.saveTasks();
        } else {
            // 从任务数据读取
            input = task.data.healthReportBatchInputs?.[userIndex] || {};
        }

        const onboardingInfo = input.onboardingInfo?.trim() || '';
        const conversationRecord = input.conversationRecord?.trim() || '';

        if (!onboardingInfo && !conversationRecord) {
            this.showNotification('请填写该用户的onboarding信息或对话记录', 'warning');
            return;
        }

        // 更新按钮状态
        const generateBtn = modal?.querySelector(`.health-report-batch-single-generate-btn[data-user-index="${userIndex}"]`);
        const originalHtml = generateBtn?.innerHTML;
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        }

        const statusEl = document.getElementById(`health-report-batch-status-${task.id}`);
        if (statusEl) {
            statusEl.textContent = `正在生成用户 ${userIndex + 1} 的健康报告...`;
            statusEl.dataset.status = 'info';
        }

        try {
            const defaultSystemPrompt = task.data.systemPrompt || '';
            const systemPrompt = (input.systemPrompt?.trim() || defaultSystemPrompt).trim();
            const modelToUse = input.modelSelection || 'gemini-3-pro-preview';

            // 构建用户查询
            const userQuery = [];
            if (onboardingInfo) {
                userQuery.push(`Onboarding信息：\n${onboardingInfo}`);
            }
            if (conversationRecord) {
                userQuery.push(`Onboarding交互对话记录：\n${conversationRecord}`);
            }
            const userMessage = userQuery.join('\n\n');

            // 构建消息
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            messages.push({ role: 'user', content: userMessage });

            // 调用API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: this.buildPromptFromMessages(messages)
                        }]
                    }],
                    generationConfig: {
                        temperature: this.temperature,
                        maxOutputTokens: this.maxTokens,
                        topP: this.topP,
                        topK: this.topK
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                throw new Error('API响应格式错误: ' + JSON.stringify(data));
            }

            const htmlContent = data.candidates[0].content.parts[0].text;

            // 保存结果
            if (!task.data.healthReportBatchResults) {
                task.data.healthReportBatchResults = [];
            }

            // 检查是否已存在该用户的结果，如果存在则更新，否则添加
            const existingIndex = task.data.healthReportBatchResults.findIndex(r => r.userIndex === userIndex);
            const result = {
                id: 'result_' + Date.now() + '_' + userIndex + '_' + Math.random().toString(36).substr(2, 5),
                runId: 'single_' + Date.now(),
                userIndex: userIndex,
                onboardingInfo: onboardingInfo,
                conversationRecord: conversationRecord,
                systemPrompt: systemPrompt,
                modelSelection: modelToUse,
                htmlOutput: htmlContent,
                createdAt: Date.now()
            };

            if (existingIndex >= 0) {
                task.data.healthReportBatchResults[existingIndex] = result;
            } else {
                task.data.healthReportBatchResults.push(result);
            }

            task.updatedAt = Date.now();
            this.saveTasks();

            // 更新结果列表
            const resultsContainer = document.getElementById(`health-report-batch-results-${task.id}`);
            if (resultsContainer) {
                resultsContainer.innerHTML = this.renderHealthReportBatchResults(task);
                this.bindHealthReportBatchEvents(task); // 重新绑定事件
            }

            if (statusEl) {
                statusEl.textContent = `用户 ${userIndex + 1} 的健康报告生成成功`;
                statusEl.dataset.status = 'success';
            }

            this.showNotification(`用户 ${userIndex + 1} 的健康报告生成成功`, 'success');
        } catch (error) {
            console.error(`生成用户 ${userIndex + 1} 的健康报告失败:`, error);
            if (statusEl) {
                statusEl.textContent = `用户 ${userIndex + 1} 的健康报告生成失败: ${error.message}`;
                statusEl.dataset.status = 'error';
            }
            this.showNotification(`生成失败: ${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalHtml || '<i class="fas fa-magic"></i> 单独生成';
            }
        }
    }

    /**
     * 打开界面设计任务
     * @param {Object} task - 任务对象
     */
    openUIDesignTask(task) {
        // 初始化任务数据
        if (!task.data) {
            task.data = {
                systemPrompt: '你是一个专业的UI/UX设计师和前端开发专家。你的任务是根据用户的文字描述，生成完整的、可直接使用的HTML代码。\n\n要求：\n1. 生成完整的HTML文档（包含<!DOCTYPE html>、<html>、<head>、<body>等）\n2. 使用现代化的CSS样式，确保界面美观、专业\n3. 使用响应式设计，适配不同屏幕尺寸\n4. 代码要清晰、规范，包含必要的注释\n5. 确保所有元素都有合适的样式和布局\n6. 只返回HTML代码，不要包含任何解释文字\n7. 使用内联样式或<style>标签，确保代码可以直接运行',
                model: 'gemini-3-pro-preview',
                config: {
                    temperature: 0.7,
                    max_output_tokens: 8000,
                    top_p: 0.95,
                    top_k: 40
                },
                generatedHtml: ''
            };
            this.saveTasks();
        }

        const taskView = document.createElement('div');
        taskView.className = 'task-view';
        taskView.innerHTML = `
            <div class="task-view-header">
                <button class="task-view-back">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h2>${this.escapeHtml(task.name)}</h2>
            </div>
            <div class="ui-design-workspace">
                <div class="ui-design-input-section">
                    <div class="section-header">
                        <h3><i class="fas fa-palette"></i> 界面设计描述</h3>
                        <button class="ui-design-prompt-settings-btn" data-task-id="${task.id}" title="设置系统提示词">
                            <i class="fas fa-cog"></i> 设置
                        </button>
                    </div>
                    <p class="section-description">输入您对页面设计的文字描述，AI将生成对应的HTML代码并实时渲染</p>
                    <textarea 
                        class="ui-design-input" 
                        id="ui-design-input-${task.id}" 
                        placeholder="例如：创建一个健康管理页面，顶部有导航栏，中间是主要内容区域，包含用户信息卡片、健康数据图表、功能按钮等，底部是页脚。整体风格要专业、现代、简洁..."
                        rows="3"
                    ></textarea>
                    <button class="ui-design-generate-btn" data-task-id="${task.id}">
                        <i class="fas fa-magic"></i> 生成界面
                    </button>
                </div>
                
                <div class="ui-design-preview-section">
                    <div class="section-header">
                        <h3><i class="fas fa-eye"></i> 界面预览</h3>
                        <div class="preview-actions">
                            <button class="ui-design-fullscreen-btn" data-task-id="${task.id}" title="全屏预览">
                                <i class="fas fa-expand"></i> 全屏
                            </button>
                            <button class="ui-design-download-btn" data-task-id="${task.id}" title="下载HTML文件">
                                <i class="fas fa-download"></i> 下载
                            </button>
                            <button class="ui-design-copy-btn" data-task-id="${task.id}" title="复制HTML代码">
                                <i class="fas fa-copy"></i> 复制
                            </button>
                        </div>
                    </div>
                    <div class="preview-controls">
                        <label>预览尺寸：</label>
                        <select class="preview-size-select" data-task-id="${task.id}">
                            <option value="100">100%</option>
                            <option value="75">75%</option>
                            <option value="50" selected>50%</option>
                            <option value="25">25%</option>
                        </select>
                        <button class="preview-refresh-btn" data-task-id="${task.id}" title="刷新预览">
                            <i class="fas fa-sync-alt"></i> 刷新
                        </button>
                    </div>
                    <div class="canvas-toolbar" id="canvas-toolbar-${task.id}">
                        <span class="toolbar-label">添加元素：</span>
                        <button class="toolbar-btn add-element-btn" data-task-id="${task.id}" data-element-type="card">
                            <i class="fas fa-square"></i> Add Card
                        </button>
                        <button class="toolbar-btn add-element-btn" data-task-id="${task.id}" data-element-type="block">
                            <i class="fas fa-th"></i> Add Block
                        </button>
                        <button class="toolbar-btn add-element-btn" data-task-id="${task.id}" data-element-type="circle">
                            <i class="fas fa-circle"></i> Add Circle
                        </button>
                        <button class="toolbar-btn add-element-btn" data-task-id="${task.id}" data-element-type="text">
                            <i class="fas fa-font"></i> Add Text
                        </button>
                        <div class="toolbar-divider"></div>
                        <button class="toolbar-btn upload-image-btn" data-task-id="${task.id}" title="上传图片">
                            <i class="fas fa-upload"></i> 上传图片
                        </button>
                        <input type="file" accept="image/*" class="image-upload-input" id="image-upload-input-${task.id}" style="display: none;">
                        <button class="toolbar-btn save-canvas-btn" data-task-id="${task.id}" title="保存画布为图片">
                            <i class="fas fa-image"></i> 保存为图片
                        </button>
                        <button class="toolbar-btn clear-canvas-btn" data-task-id="${task.id}" title="清空画布">
                            <i class="fas fa-trash-alt"></i> 清空
                        </button>
                    </div>
                    <div class="ui-design-preview-wrapper" id="ui-design-preview-wrapper-${task.id}">
                        <div class="ui-design-preview-container ui-design-canvas" id="ui-design-preview-${task.id}">
                            <!-- 画布内容将通过 initUIDesignCanvas 初始化 -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 替换任务视图
        const tasksContainer = document.getElementById('view-tasks');
        if (tasksContainer) {
            tasksContainer.style.display = 'none';
        }
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(taskView);
        }

        // 绑定事件
        const backBtn = taskView.querySelector('.task-view-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (mainContent) {
                    mainContent.removeChild(taskView);
                }
                if (tasksContainer) {
                    tasksContainer.style.display = 'block';
                }
                this.updateTasksList();
            });
        }

        // 加载已保存的数据
        const inputEl = taskView.querySelector(`#ui-design-input-${task.id}`);
        if (inputEl && task.data.lastInput) {
            inputEl.value = task.data.lastInput;
        }

        // 初始化画布（如果没有已生成的HTML，显示占位内容）
        if (task.data.generatedHtml) {
            this.renderUIDesignPreview(task.id, task.data.generatedHtml);
        } else {
            this.initUIDesignCanvas(task.id);
        }

        // 生成按钮事件
        const generateBtn = taskView.querySelector('.ui-design-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateUIDesign(task);
            });
        }

        // 设置按钮事件
        const settingsBtn = taskView.querySelector('.ui-design-prompt-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showUIDesignPromptSettings(task);
            });
        }

        // 复制按钮事件
        const copyBtn = taskView.querySelector('.ui-design-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyUIDesignHtml(task);
            });
        }

        // 下载按钮事件
        const downloadBtn = taskView.querySelector('.ui-design-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadUIDesignHtml(task);
            });
        }

        // 全屏按钮事件
        const fullscreenBtn = taskView.querySelector('.ui-design-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleUIDesignFullscreen(task);
            });
        }

        // 预览尺寸选择事件
        const sizeSelect = taskView.querySelector('.preview-size-select');
        if (sizeSelect) {
            sizeSelect.addEventListener('change', (e) => {
                this.changeUIDesignPreviewSize(task.id, e.target.value);
            });
        }

        // 刷新预览按钮事件
        const refreshBtn = taskView.querySelector('.preview-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (task.data && task.data.generatedHtml) {
                    this.renderUIDesignPreview(task.id, task.data.generatedHtml);
                    this.showNotification('预览已刷新', 'success');
                } else {
                    this.initUIDesignCanvas(task.id);
                    this.showNotification('已重置为初始画布', 'success');
                }
            });
        }

        // 绑定元素工具栏事件（事件委托）
        const toolbar = taskView.querySelector(`#canvas-toolbar-${task.id}`);
        if (toolbar) {
            toolbar.addEventListener('click', (e) => {
                const addBtn = e.target.closest('.add-element-btn');
                if (addBtn) {
                    const elementType = addBtn.getAttribute('data-element-type');
                    this.addCanvasElement(task.id, elementType);
                    return;
                }

                const uploadBtn = e.target.closest('.upload-image-btn');
                if (uploadBtn) {
                    const fileInput = document.getElementById(`image-upload-input-${task.id}`);
                    if (fileInput) {
                        fileInput.click();
                    }
                    return;
                }

                const saveBtn = e.target.closest('.save-canvas-btn');
                if (saveBtn) {
                    this.saveCanvasAsImage(task.id);
                    return;
                }

                const clearBtn = e.target.closest('.clear-canvas-btn');
                if (clearBtn) {
                    if (confirm('确定要清空画布吗？此操作不可撤销。')) {
                        this.clearCanvas(task.id);
                    }
                    return;
                }
            });
        }

        // 绑定图片上传事件
        const imageUploadInput = document.getElementById(`image-upload-input-${task.id}`);
        if (imageUploadInput) {
            imageUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.uploadImageAsElement(task.id, file);
                } else {
                    this.showNotification('请选择有效的图片文件', 'warning');
                }
                // 清空input，允许重复上传同一文件
                e.target.value = '';
            });
        }

        // 绑定画布元素选中事件（事件委托）
        const canvasContainer = document.getElementById(`ui-design-preview-${task.id}`);
        if (canvasContainer) {
            // 点击选中（排除拖动过程中的点击）
            let isDragging = false;
            let dragStartTime = 0;
            
            canvasContainer.addEventListener('mousedown', (e) => {
                const element = e.target.closest('.canvas-item');
                if (element) {
                    dragStartTime = Date.now();
                }
            });

            canvasContainer.addEventListener('click', (e) => {
                // 如果点击发生在拖动后（时间间隔很短），不处理点击选中
                const timeSinceDrag = Date.now() - dragStartTime;
                if (timeSinceDrag < 200) {
                    return;
                }
                
                // 如果点击的是画布元素，选中它
                const element = e.target.closest('.canvas-item');
                if (element) {
                    this.selectCanvasElement(task.id, element);
                } else {
                    // 点击空白区域，取消选中
                    this.deselectCanvasElement(task.id);
                }
            });

            // 绑定拖动排序事件（只在初始化时绑定一次）
            if (!canvasContainer.hasAttribute('data-drag-setup')) {
                this.setupCanvasDragAndDrop(task.id, canvasContainer);
                canvasContainer.setAttribute('data-drag-setup', 'true');
            }
        }
    }

    /**
     * 生成界面设计
     * @param {Object} task - 任务对象
     */
    async generateUIDesign(task) {
        const inputEl = document.getElementById(`ui-design-input-${task.id}`);
        if (!inputEl) return;

        const description = inputEl.value.trim();
        if (!description) {
            this.showNotification('请输入界面设计描述', 'warning');
            return;
        }

        // 保存输入
        if (!task.data) task.data = {};
        task.data.lastInput = description;
        
        // 初始化聊天记录（如果不存在）
        if (!task.data.conversationHistory) {
            task.data.conversationHistory = [];
        }
        
        // 添加用户消息到聊天记录
        task.data.conversationHistory.push({
            role: 'user',
            content: description,
            timestamp: Date.now()
        });
        
        this.saveTasks();

        // 获取系统提示词
        const systemPrompt = task.data.systemPrompt || '你是一个专业的UI/UX设计师和前端开发专家。你的任务是根据用户的文字描述，生成完整的、可直接使用的HTML代码。';

        // 更新按钮状态
        const generateBtn = document.querySelector(`.ui-design-generate-btn[data-task-id="${task.id}"]`);
        const originalHtml = generateBtn?.innerHTML;
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        }

        // 显示加载状态
        const previewContainer = document.getElementById(`ui-design-preview-${task.id}`);
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="ui-design-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>正在生成界面...</p>
                </div>
            `;
        }

        try {
            // 构建提示词
            const prompt = `${systemPrompt}\n\n用户需求：\n${description}\n\n请生成完整的HTML代码：`;

            // 获取模型和配置（从任务数据中读取，如果没有则使用默认值）
            const model = task.data.model || 'gemini-3-pro-preview';
            const config = task.data.config || {
                temperature: 0.7,
                max_output_tokens: 8000,
                top_p: 0.95,
                top_k: 40
            };

            // 调用 Vertex AI API
            const response = await fetch('http://localhost:5000/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    contents: prompt,
                    config: config
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success || !data.text) {
                throw new Error(data.error || '生成失败');
            }

            // 提取HTML代码（可能包含markdown代码块）
            let htmlCode = data.text.trim();
            
            // 如果包含markdown代码块，提取其中的代码
            const codeBlockMatch = htmlCode.match(/```(?:html)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                htmlCode = codeBlockMatch[1].trim();
            }

            // 保存生成的HTML
            task.data.generatedHtml = htmlCode;
            task.data.updatedAt = Date.now();
            
            // 添加AI回复到聊天记录
            if (!task.data.conversationHistory) {
                task.data.conversationHistory = [];
            }
            task.data.conversationHistory.push({
                role: 'assistant',
                content: htmlCode,
                timestamp: Date.now()
            });
            
            this.saveTasks();

            // 渲染预览
            this.renderUIDesignPreview(task.id, htmlCode);

            this.showNotification('界面生成成功', 'success');

        } catch (error) {
            console.error('生成界面失败:', error);
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="ui-design-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>生成失败: ${error.message}</p>
                    </div>
                `;
            }
            this.showNotification('生成界面失败: ' + error.message, 'error');
        } finally {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalHtml || '<i class="fas fa-magic"></i> 生成界面';
            }
        }
    }

    /**
     * 初始化画布容器（渲染占位内容）
     * @param {string} taskId - 任务ID
     */
    initUIDesignCanvas(taskId) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) return;

        // 清空容器
        canvasContainer.innerHTML = '';

        // 初始化元素计数器（存储在任务数据中）
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (!task.data) task.data = {};
            task.data.elementCounter = 0;
        }

        // 创建标题块
        const titleElement = document.createElement('div');
        titleElement.className = 'canvas-item canvas-element canvas-title';
        titleElement.setAttribute('draggable', 'true');
        titleElement.draggable = true;
        titleElement.style.cursor = 'move';
        titleElement.style.left = '20px';
        titleElement.style.top = '20px';
        titleElement.style.width = '300px';
        titleElement.style.height = 'auto';
        titleElement.setAttribute('data-x', '20');
        titleElement.setAttribute('data-y', '20');
        titleElement.setAttribute('data-width', '300');
        titleElement.innerHTML = `
            <div class="element-content">
                <div class="editable-content" contenteditable="true" data-placeholder="点击编辑标题...">欢迎使用界面设计</div>
            </div>
        `;
        canvasContainer.appendChild(titleElement);
        const titleEditable = titleElement.querySelector('.editable-content');
        if (titleEditable) {
            this.setupEditableContent(titleEditable);
            // 标题默认大字号
            titleEditable.style.fontSize = '24px';
            titleElement.setAttribute('data-font-size', '24');
        }
        this.enableFreeDrag(taskId, titleElement);

        // 创建卡片块
        const cardElement = document.createElement('div');
        cardElement.className = 'canvas-item canvas-element canvas-card';
        cardElement.setAttribute('draggable', 'true');
        cardElement.draggable = true;
        cardElement.style.cursor = 'move';
        cardElement.style.left = '20px';
        cardElement.style.top = '100px';
        cardElement.style.width = '300px';
        cardElement.style.height = 'auto';
        cardElement.setAttribute('data-x', '20');
        cardElement.setAttribute('data-y', '100');
        cardElement.setAttribute('data-width', '300');
        cardElement.innerHTML = `
            <div class="element-content">
                <div class="editable-content" contenteditable="true" data-placeholder="点击编辑卡片内容...">示例卡片 - 这是一个示例卡片元素，您可以在这里添加内容</div>
            </div>
        `;
        canvasContainer.appendChild(cardElement);
        const cardEditable = cardElement.querySelector('.editable-content');
        if (cardEditable) {
            this.setupEditableContent(cardEditable);
            // 卡片默认字号
            cardEditable.style.fontSize = '14px';
            cardElement.setAttribute('data-font-size', '14');
        }
        this.enableFreeDrag(taskId, cardElement);
    }

    /**
     * 生成唯一的元素ID
     * @param {string} taskId - 任务ID
     * @returns {string} 元素ID
     */
    generateElementId(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return `element-${Date.now()}`;
        
        if (!task.data) task.data = {};
        if (!task.data.elementCounter) task.data.elementCounter = 0;
        
        task.data.elementCounter++;
        return `element-${taskId}-${task.data.elementCounter}`;
    }

    /**
     * 添加画布元素
     * @param {string} taskId - 任务ID
     * @param {string} elementType - 元素类型 ('card' | 'block' | 'circle' | 'text')
     */
    addCanvasElement(taskId, elementType) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) return;

        // 生成元素ID
        const elementId = this.generateElementId(taskId);

        // 创建元素
        const element = document.createElement('div');
        element.className = `canvas-item canvas-element canvas-element-${elementType}`;
        element.setAttribute('data-id', elementId);
        element.setAttribute('data-type', elementType);
        element.setAttribute('draggable', 'true');
        element.style.cursor = 'move';
        
        // 确保元素可以拖动（处理某些浏览器的兼容性）
        element.draggable = true;

        // 根据类型设置内容和样式
        switch (elementType) {
            case 'card':
                element.innerHTML = `
                    <div class="element-content">
                        <div class="editable-content" contenteditable="true" data-placeholder="点击编辑卡片内容...">卡片 ${elementId.split('-').pop()}</div>
                    </div>
                `;
                break;
            case 'block':
                element.innerHTML = `
                    <div class="element-content">
                        <div class="editable-content" contenteditable="true" data-placeholder="点击编辑文字...">方块元素 ${elementId.split('-').pop()}</div>
                    </div>
                `;
                break;
            case 'circle':
                element.innerHTML = `
                    <div class="element-content">
                        <div class="circle-shape"></div>
                        <div class="editable-content" contenteditable="true" data-placeholder="点击编辑文字...">文字</div>
                    </div>
                `;
                break;
            case 'text':
                element.innerHTML = `
                    <div class="element-content">
                        <div class="editable-content" contenteditable="true" data-placeholder="点击编辑文字...">文本元素 ${elementId.split('-').pop()}</div>
                    </div>
                `;
                break;
        }

        // 为可编辑内容添加占位符和事件处理
        const editableContents = element.querySelectorAll('.editable-content');
        editableContents.forEach(editable => {
            this.setupEditableContent(editable);
            
            // 恢复保存的字号（如果有）
            const savedFontSize = element.getAttribute('data-font-size');
            if (savedFontSize) {
                editable.style.fontSize = savedFontSize + 'px';
            }
        });

        // 设置初始位置和尺寸（随机或默认位置）
        const initialX = 20 + (Math.random() * 100);
        const initialY = 20 + (Math.random() * 100);
        const initialWidth = elementType === 'circle' ? 100 : (elementType === 'text' ? 200 : 250);
        const initialHeight = elementType === 'circle' ? 100 : (elementType === 'text' ? 60 : 120);
        
        element.style.left = initialX + 'px';
        element.style.top = initialY + 'px';
        element.style.width = initialWidth + 'px';
        element.style.height = initialHeight + 'px';

        // 保存位置和尺寸信息到data属性
        element.setAttribute('data-x', initialX);
        element.setAttribute('data-y', initialY);
        element.setAttribute('data-width', initialWidth);
        element.setAttribute('data-height', initialHeight);

        // 添加到画布
        canvasContainer.appendChild(element);

        // 自动选中新添加的元素
        this.selectCanvasElement(taskId, element);

        // 启用自由拖拽
        this.enableFreeDrag(taskId, element);
    }

    /**
     * 选中画布元素
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} element - 要选中的元素
     */
    selectCanvasElement(taskId, element) {
        // 先取消所有选中状态
        this.deselectCanvasElement(taskId);

        // 添加选中状态
        element.classList.add('canvas-element-selected');

        // 显示调整大小控制点
        this.showResizeHandles(taskId, element);

        // 保存当前选中的元素ID到任务数据
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (!task.data) task.data = {};
            task.data.selectedElementId = element.getAttribute('data-id');
        }
    }

    /**
     * 取消选中画布元素
     * @param {string} taskId - 任务ID
     */
    deselectCanvasElement(taskId) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) return;

        // 移除所有选中状态
        const selectedElements = canvasContainer.querySelectorAll('.canvas-element-selected');
        selectedElements.forEach(el => {
            el.classList.remove('canvas-element-selected');
        });

        // 隐藏所有调整大小控制点
        const resizeHandles = canvasContainer.querySelectorAll('.resize-handle-container');
        resizeHandles.forEach(handle => {
            handle.remove();
        });

        // 清除任务数据中的选中状态
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.data) {
            task.data.selectedElementId = null;
        }
    }

    /**
     * 显示调整大小控制点和删除按钮
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} element - 元素
     */
    showResizeHandles(taskId, element) {
        // 移除旧的控制点
        const oldHandles = element.parentElement.querySelector('.resize-handle-container');
        if (oldHandles) {
            oldHandles.remove();
        }

        // 创建控制点容器
        const handleContainer = document.createElement('div');
        handleContainer.className = 'resize-handle-container';
        
        // 8个控制点：4个角落 + 4个边缘中点
        const positions = [
            'nw', 'n', 'ne', // 上排
            'w', 'e',        // 中间
            'sw', 's', 'se'  // 下排
        ];

        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-handle-${pos}`;
            handle.setAttribute('data-direction', pos);
            handleContainer.appendChild(handle);
        });

        // 添加字号选择按钮（左上角）
        const fontSizeBtn = document.createElement('div');
        fontSizeBtn.className = 'font-size-btn';
        fontSizeBtn.innerHTML = '<i class="fas fa-text-height"></i>';
        fontSizeBtn.title = '选择字号';
        fontSizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showFontSizeSelector(taskId, element, fontSizeBtn);
        });
        handleContainer.appendChild(fontSizeBtn);

        // 添加删除按钮（右上角）
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-element-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.title = '删除元素';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteCanvasElement(taskId, element);
        });
        handleContainer.appendChild(deleteBtn);

        // 将控制点容器添加到画布（作为元素的兄弟元素）
        element.parentElement.appendChild(handleContainer);

        // 更新控制点位置
        this.updateResizeHandlesPosition(element, handleContainer);

        // 绑定调整大小事件
        this.setupResizeHandles(taskId, element, handleContainer);
    }

    /**
     * 删除画布元素
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} element - 要删除的元素
     */
    deleteCanvasElement(taskId, element) {
        if (!element) return;

        const elementId = element.getAttribute('data-id');
        
        // 移除元素
        element.remove();

        // 清除选中状态（如果删除的是选中的元素）
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.data && task.data.selectedElementId === elementId) {
            task.data.selectedElementId = null;
        }

        // 保存任务
        if (task) {
            task.data.updatedAt = Date.now();
            this.saveTasks();
        }

        this.showNotification('元素已删除', 'success');
    }

    /**
     * 更新调整大小控制点位置
     * @param {HTMLElement} element - 元素
     * @param {HTMLElement} handleContainer - 控制点容器
     */
    updateResizeHandlesPosition(element, handleContainer) {
        const rect = element.getBoundingClientRect();
        const canvasRect = element.parentElement.getBoundingClientRect();
        
        const left = rect.left - canvasRect.left;
        const top = rect.top - canvasRect.top;
        const width = rect.width;
        const height = rect.height;

        handleContainer.style.left = (left - 4) + 'px';
        handleContainer.style.top = (top - 4) + 'px';
        handleContainer.style.width = (width + 8) + 'px';
        handleContainer.style.height = (height + 8) + 'px';
    }

    /**
     * 设置调整大小控制点功能（优化版 - 丝滑缩放）
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} element - 元素
     * @param {HTMLElement} handleContainer - 控制点容器
     */
    setupResizeHandles(taskId, element, handleContainer) {
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        let startLeft = 0;
        let startTop = 0;
        let direction = '';
        let rafId = null;

        const handles = handleContainer.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                isResizing = true;
                direction = handle.getAttribute('data-direction');
                
                const rect = element.getBoundingClientRect();
                const canvasRect = element.parentElement.getBoundingClientRect();
                
                startX = e.clientX;
                startY = e.clientY;
                startWidth = rect.width;
                startHeight = rect.height;
                startLeft = rect.left - canvasRect.left;
                startTop = rect.top - canvasRect.top;

                element.classList.add('canvas-item-resizing');
                element.style.zIndex = '1000';
                document.body.style.cursor = this.getResizeCursor(direction);
                document.body.style.userSelect = 'none'; // 防止文字选择
            });
        });

        const handleMouseMove = (e) => {
            if (!isResizing) return;

            // 取消之前的动画帧
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                // 对于图像元素，允许更大规模的缩放
                const isImage = element.classList.contains('canvas-element-image');
                const minWidth = isImage ? 50 : 30;
                const minHeight = isImage ? 50 : 20;

                // 根据方向调整大小和位置（原地缩放，不改变中心点）
                if (direction.includes('e')) {
                    // 向右扩展：只改变宽度，位置不变
                    newWidth = Math.max(minWidth, startWidth + deltaX);
                }
                if (direction.includes('w')) {
                    // 向左扩展：改变宽度和左边位置
                    newWidth = Math.max(minWidth, startWidth - deltaX);
                    newLeft = startLeft + (startWidth - newWidth);
                }
                if (direction.includes('s')) {
                    // 向下扩展：只改变高度，位置不变
                    newHeight = Math.max(minHeight, startHeight + deltaY);
                }
                if (direction.includes('n')) {
                    // 向上扩展：改变高度和上边位置
                    newHeight = Math.max(minHeight, startHeight - deltaY);
                    newTop = startTop + (startHeight - newHeight);
                }

                // 应用新尺寸和位置（不进行边界限制，允许原地缩放）
                element.style.width = newWidth + 'px';
                element.style.height = newHeight + 'px';
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';

                // 更新控制点位置
                this.updateResizeHandlesPosition(element, handleContainer);
            });
        };

        const handleMouseUp = () => {
            if (!isResizing) return;

            // 取消动画帧
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            isResizing = false;
            element.classList.remove('canvas-item-resizing');
            element.style.zIndex = '';
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // 保存位置和尺寸
            const x = parseFloat(element.style.left) || 0;
            const y = parseFloat(element.style.top) || 0;
            const width = parseFloat(element.style.width) || element.offsetWidth;
            const height = parseFloat(element.style.height) || element.offsetHeight;

            element.setAttribute('data-x', x);
            element.setAttribute('data-y', y);
            element.setAttribute('data-width', width);
            element.setAttribute('data-height', height);

            // 保存任务
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.data.updatedAt = Date.now();
                this.saveTasks();
            }
        };

        // 使用全局事件监听（在mousedown时绑定）
        handles.forEach(handle => {
            handle.addEventListener('mousedown', () => {
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp, { once: true });
            });
        });
    }

    /**
     * 获取调整大小的光标样式
     * @param {string} direction - 方向
     * @returns {string} 光标样式
     */
    getResizeCursor(direction) {
        const cursors = {
            'nw': 'nw-resize',
            'n': 'n-resize',
            'ne': 'ne-resize',
            'w': 'w-resize',
            'e': 'e-resize',
            'sw': 'sw-resize',
            's': 's-resize',
            'se': 'se-resize'
        };
        return cursors[direction] || 'default';
    }

    /**
     * 启用元素的自由拖拽功能（优化版 - 丝滑拖动）
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} element - 元素
     */
    enableFreeDrag(taskId, element) {
        if (!element) return;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        // 使用鼠标相对元素左上角的偏移，保证“抓住哪里就拖哪里”，避免跳动
        let offsetX = 0;
        let offsetY = 0;
        let handleContainer = null;
        let rafId = null;

        // 鼠标按下
        const handleMouseDown = (e) => {
            // 如果点击的是控制点或删除按钮，不启动拖拽
            if (e.target.closest('.resize-handle') || e.target.closest('.delete-element-btn')) {
                return;
            }

            // 如果点击的是可编辑内容，不启动拖拽（允许编辑）
            if (e.target.closest('.editable-content')) {
                return;
            }

            // 如果点击的是输入框，不启动拖拽
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            isDragging = true;
            element.classList.add('canvas-item-dragging');
            
            // 提升层级
            element.style.zIndex = '1000';

            // 通过 getBoundingClientRect 精确获取当前视觉位置
            const rect = element.getBoundingClientRect();
            const canvasRect = element.parentElement.getBoundingClientRect();

            // 记录鼠标按下时，相对于元素左上角的偏移
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // 记录起始鼠标位置（用于计算 delta，仅作参考）
            startX = e.clientX;
            startY = e.clientY;

            // 获取控制点容器
            handleContainer = element.parentElement.querySelector('.resize-handle-container');

            // 阻止默认行为
            e.preventDefault();
            e.stopPropagation();
        };

        // 鼠标移动（使用 requestAnimationFrame 优化性能）
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            // 取消之前的动画帧
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                // 获取画布和元素尺寸（用于边界限制）
                const canvasRect = element.parentElement.getBoundingClientRect();
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;

                // 直接基于鼠标位置 + 偏移计算新位置，保证“原地拖动”，不出现先跳一下的问题
                let newX = e.clientX - canvasRect.left - offsetX;
                let newY = e.clientY - canvasRect.top - offsetY;

                // 限制在画布范围内（允许部分超出，但至少保留一部分在画布内）
                // 对于图像元素，允许更大范围的移动
                const isImage = element.classList.contains('canvas-element-image');
                const minOffset = isImage ? 100 : 50; // 图像元素允许更大的偏移
                
                const minX = -elementWidth + minOffset;
                const maxX = canvasRect.width - minOffset;
                const minY = -elementHeight + minOffset;
                const maxY = canvasRect.height - minOffset;
                
                newX = Math.max(minX, Math.min(newX, maxX));
                newY = Math.max(minY, Math.min(newY, maxY));

                // 更新位置（直接设置，不重新计算）
                element.style.left = newX + 'px';
                element.style.top = newY + 'px';
                
                // 更新控制点位置（如果存在）
                if (handleContainer) {
                    this.updateResizeHandlesPosition(element, handleContainer);
                }
            });
        };

        // 鼠标释放
        const handleMouseUp = () => {
            if (!isDragging) return;

            // 取消动画帧
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            isDragging = false;
            element.classList.remove('canvas-item-dragging');
            
            // 恢复层级
            element.style.zIndex = '';

            // 保存位置
            const x = parseFloat(element.style.left) || 0;
            const y = parseFloat(element.style.top) || 0;
            element.setAttribute('data-x', x);
            element.setAttribute('data-y', y);

            // 保存任务
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.data.updatedAt = Date.now();
                this.saveTasks();
            }
        };

        // 绑定事件
        element.addEventListener('mousedown', (e) => {
            handleMouseDown(e);
            if (isDragging) {
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp, { once: true });
            }
        });
    }

    /**
     * 设置画布拖动排序功能（保留用于HTML5拖拽API，但现在主要使用自由拖拽）
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} canvasContainer - 画布容器
     */
    setupCanvasDragAndDrop(taskId, canvasContainer) {
        let draggedElement = null;
        let placeholder = null;
        let isDragging = false;

        // HTML5拖拽API主要用于垃圾桶删除，自由拖拽使用mousedown/mousemove
        // 保留dragstart用于垃圾桶功能
        canvasContainer.addEventListener('dragstart', (e) => {
            const element = e.target.closest('.canvas-item');
            if (!element || !element.hasAttribute('draggable') || element.getAttribute('draggable') !== 'true') {
                return;
            }

            // 如果正在编辑，不启动拖拽
            if (element.querySelector('.editable-content:focus')) {
                e.preventDefault();
                return;
            }

            draggedElement = element;
            isDragging = true;

            // 设置拖动数据（用于垃圾桶删除）
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', element.outerHTML);
            e.dataTransfer.setData('text/plain', element.getAttribute('data-id') || '');

            // 添加拖动样式
            element.classList.add('canvas-item-dragging');
        }, true);

        // 拖动经过（主要用于垃圾桶功能，自由拖拽不需要）
        canvasContainer.addEventListener('dragover', (e) => {
            if (!draggedElement) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        // 拖动进入（防止默认行为）
        canvasContainer.addEventListener('dragenter', (e) => {
            if (draggedElement) {
                e.preventDefault();
            }
        });

        // 放置（主要用于垃圾桶功能，自由拖拽不需要）
        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            // 自由拖拽使用mousedown/mousemove，不需要drop处理
        });

        // 拖动结束
        canvasContainer.addEventListener('dragend', (e) => {
            if (draggedElement) {
                // 移除拖动样式
                draggedElement.classList.remove('canvas-item-dragging');
            }

            // 重置状态
            draggedElement = null;
            placeholder = null;
            isDragging = false;
        });

        // 拖动离开画布时清理
        canvasContainer.addEventListener('dragleave', (e) => {
            // 只有当真正离开画布容器时才清理
            if (!canvasContainer.contains(e.relatedTarget)) {
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
            }
        });
    }

    /**
     * 序列化画布内容为HTML（占位函数，未来实现）
     * @param {string} taskId - 任务ID
     * @returns {string} HTML字符串
     */
    serializeCanvas(taskId) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) return '';

        // 获取所有画布元素
        const items = canvasContainer.querySelectorAll('.canvas-item');
        if (items.length === 0) return '';

        // 构建完整的HTML文档
        let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>界面设计</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .ui-design-canvas {
            width: 375px;
            min-height: 600px;
            background: #f5f5f5;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 20px;
            position: relative;
            overflow: visible;
        }
        
        .canvas-item {
            position: absolute;
            min-width: 120px;
            max-width: calc(100% - 40px);
            z-index: 1;
        }
        
        .canvas-item.canvas-element-image {
            max-width: none;
            min-width: 50px;
        }
        
        .element-content {
            width: 100%;
        }
        
        .editable-content {
            word-wrap: break-word;
            white-space: pre-wrap;
            min-height: 1em;
        }
        
        .canvas-element-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            min-height: 80px;
        }
        
        .canvas-element-block {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 4px;
            padding: 16px;
            min-height: 60px;
        }
        
        .canvas-element-circle {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 50%;
            padding: 16px;
            width: 100px;
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
        }
        
        .canvas-element-circle .element-content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        
        .canvas-element-circle .circle-shape {
            width: 60px;
            height: 60px;
            background: #4f46e5;
            border-radius: 50%;
            margin-bottom: 4px;
        }
        
        .canvas-element-text {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px 16px;
            min-height: 40px;
            display: flex;
            align-items: center;
        }
        
        .canvas-element-image {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px;
            overflow: hidden;
            min-width: 50px;
            min-height: 50px;
        }
        
        .canvas-element-image .element-content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .canvas-element-image img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            border-radius: 4px;
        }
        
        .canvas-element.canvas-title {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .canvas-element.canvas-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div class="ui-design-canvas">
`;

        // 遍历所有元素，生成HTML
        items.forEach(item => {
            // 克隆元素以避免修改原始元素
            const clone = item.cloneNode(true);
            
            // 移除不需要的属性（如draggable、data-id等）
            clone.removeAttribute('draggable');
            clone.removeAttribute('data-id');
            clone.removeAttribute('data-type');
            
            // 移除控制点和删除按钮
            const resizeHandles = clone.querySelectorAll('.resize-handle-container, .delete-element-btn, .font-size-selector-btn, .font-size-dropdown');
            resizeHandles.forEach(handle => handle.remove());
            
            // 移除选中状态的类
            clone.classList.remove('canvas-element-selected', 'canvas-item-dragging', 'canvas-item-resizing');
            
            // 获取并应用所有内联样式（确保样式完整）
            const computedStyle = window.getComputedStyle(item);
            const left = item.style.left || item.getAttribute('data-x') || '0';
            const top = item.style.top || item.getAttribute('data-y') || '0';
            const width = item.style.width || item.getAttribute('data-width') || computedStyle.width || 'auto';
            const height = item.style.height || item.getAttribute('data-height') || computedStyle.height || 'auto';
            
            // 应用位置和尺寸
            clone.style.left = left;
            clone.style.top = top;
            clone.style.width = width;
            clone.style.height = height;
            
            // 确保元素类型样式类被保留（card, block, circle, text, image等）
            // 这些类在HTML的CSS中定义了样式
            
            // 处理可编辑内容，移除contenteditable属性，保留所有样式
            const editableContents = clone.querySelectorAll('.editable-content');
            editableContents.forEach(editable => {
                editable.removeAttribute('contenteditable');
                editable.removeAttribute('data-placeholder');
                
                // 获取原始元素的样式并应用到克隆元素
                const originalEditable = item.querySelector('.editable-content');
                if (originalEditable) {
                    const editableStyle = window.getComputedStyle(originalEditable);
                    // 保留字体大小
                    if (editableStyle.fontSize) {
                        editable.style.fontSize = editableStyle.fontSize;
                    }
                    // 保留字体颜色
                    if (editableStyle.color) {
                        editable.style.color = editableStyle.color;
                    }
                    // 保留字体粗细
                    if (editableStyle.fontWeight) {
                        editable.style.fontWeight = editableStyle.fontWeight;
                    }
                    // 保留文本对齐
                    if (editableStyle.textAlign) {
                        editable.style.textAlign = editableStyle.textAlign;
                    }
                }
            });
            
            // 处理图片元素，确保图片src正确
            const images = clone.querySelectorAll('img');
            images.forEach(img => {
                const originalImg = item.querySelector('img');
                if (originalImg && originalImg.src) {
                    img.src = originalImg.src;
                }
            });
            
            // 将克隆的元素转换为HTML字符串
            html += clone.outerHTML + '\n';
        });

        html += `    </div>
</body>
</html>`;

        return html;
    }

    /**
     * 保存画布为图片
     * @param {string} taskId - 任务ID
     */
    async saveCanvasAsImage(taskId) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) {
            this.showNotification('画布不存在', 'error');
            return;
        }

        // 检查是否有内容
        const items = canvasContainer.querySelectorAll('.canvas-item');
        if (items.length === 0) {
            this.showNotification('画布为空，无法保存', 'warning');
            return;
        }

        try {
            this.showNotification('正在生成图片...', 'info');

            // 检查html2canvas是否可用
            if (typeof html2canvas === 'undefined') {
                this.showNotification('html2canvas库未加载，请刷新页面重试', 'error');
                return;
            }

            // 使用html2canvas将画布转换为图片
            const canvas = await html2canvas(canvasContainer, {
                backgroundColor: '#f5f5f5',
                scale: 2, // 提高清晰度
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            // 转换为blob并下载
            canvas.toBlob((blob) => {
                if (!blob) {
                    this.showNotification('生成图片失败', 'error');
                    return;
                }

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // 生成文件名
                const task = this.tasks.find(t => t.id === taskId);
                const taskName = (task?.name || '界面设计').replace(/[^\w\s-]/g, '');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                a.download = `${taskName}_${timestamp}.png`;
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // 释放URL
                setTimeout(() => URL.revokeObjectURL(url), 100);
                
                this.showNotification('图片保存成功', 'success');
            }, 'image/png', 1.0);

        } catch (error) {
            console.error('保存画布为图片失败:', error);
            this.showNotification('保存失败: ' + error.message, 'error');
        }
    }

    /**
     * 设置可编辑内容的占位符和事件处理
     * @param {HTMLElement} editable - 可编辑元素
     */
    setupEditableContent(editable) {
        if (!editable) return;

        // 处理占位符
        const placeholder = editable.getAttribute('data-placeholder') || '';
        
        const updatePlaceholder = () => {
            if (editable.textContent.trim() === '') {
                editable.classList.add('empty');
            } else {
                editable.classList.remove('empty');
            }
        };

        // 初始化占位符状态
        updatePlaceholder();

        // 监听输入事件
        editable.addEventListener('input', updatePlaceholder);
        editable.addEventListener('blur', updatePlaceholder);
        editable.addEventListener('focus', () => {
            editable.classList.remove('empty');
        });

        // 确保可以直接编辑（移除所有阻止编辑的逻辑）
        editable.contentEditable = 'true';
        editable.style.cursor = 'text';
    }

    /**
     * 显示字号选择器
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} element - 元素
     * @param {HTMLElement} fontSizeBtn - 字号按钮
     */
    showFontSizeSelector(taskId, element, fontSizeBtn) {
        // 获取当前字号
        const editableContent = element.querySelector('.editable-content');
        if (!editableContent) return;

        const currentFontSize = editableContent.style.fontSize || '14px';
        const currentSize = parseInt(currentFontSize) || 14;

        // 创建字号选择菜单
        const menu = document.createElement('div');
        menu.className = 'font-size-menu';
        menu.innerHTML = `
            <div class="font-size-options">
                <div class="font-size-option" data-size="10">10px</div>
                <div class="font-size-option" data-size="12">12px</div>
                <div class="font-size-option" data-size="14">14px</div>
                <div class="font-size-option" data-size="16">16px</div>
                <div class="font-size-option" data-size="18">18px</div>
                <div class="font-size-option" data-size="20">20px</div>
                <div class="font-size-option" data-size="24">24px</div>
                <div class="font-size-option" data-size="28">28px</div>
                <div class="font-size-option" data-size="32">32px</div>
                <div class="font-size-option" data-size="36">36px</div>
                <div class="font-size-option" data-size="48">48px</div>
                <div class="font-size-option" data-size="64">64px</div>
            </div>
        `;

        // 高亮当前字号
        const currentOption = menu.querySelector(`[data-size="${currentSize}"]`);
        if (currentOption) {
            currentOption.classList.add('active');
        }

        // 定位菜单
        const btnRect = fontSizeBtn.getBoundingClientRect();
        const canvasRect = element.parentElement.getBoundingClientRect();
        menu.style.left = (btnRect.left - canvasRect.left) + 'px';
        menu.style.top = (btnRect.bottom - canvasRect.top + 4) + 'px';

        // 添加到画布
        element.parentElement.appendChild(menu);

        // 绑定选项点击事件
        menu.querySelectorAll('.font-size-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = parseInt(option.getAttribute('data-size'));
                this.setElementFontSize(taskId, element, size);
                menu.remove();
            });
        });

        // 点击外部关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== fontSizeBtn) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    /**
     * 设置元素字号
     * @param {string} taskId - 任务ID
     * @param {HTMLElement} element - 元素
     * @param {number} fontSize - 字号（px）
     */
    setElementFontSize(taskId, element, fontSize) {
        const editableContents = element.querySelectorAll('.editable-content');
        editableContents.forEach(editable => {
            editable.style.fontSize = fontSize + 'px';
        });

        // 保存字号到元素属性
        element.setAttribute('data-font-size', fontSize);

        // 保存任务
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.data.updatedAt = Date.now();
            this.saveTasks();
        }

        this.showNotification(`字号已设置为 ${fontSize}px`, 'success');
    }

    /**
     * 清空画布
     * @param {string} taskId - 任务ID
     */
    clearCanvas(taskId) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) return;

        // 清空所有元素
        canvasContainer.innerHTML = '';

        // 重置元素计数器
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (!task.data) task.data = {};
            task.data.elementCounter = 0;
            task.data.selectedElementId = null;
            task.data.updatedAt = Date.now();
            this.saveTasks();
        }

        // 重新初始化画布（显示占位内容）
        this.initUIDesignCanvas(taskId);

        this.showNotification('画布已清空', 'success');
    }


    /**
     * 上传图片作为画布元素
     * @param {string} taskId - 任务ID
     * @param {File} file - 图片文件
     */
    uploadImageAsElement(taskId, file) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) {
            this.showNotification('画布不存在', 'error');
            return;
        }

        // 检查文件大小（限制为10MB）
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showNotification('图片文件过大，请选择小于10MB的图片', 'warning');
            return;
        }

        // 创建FileReader读取图片
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const imageUrl = e.target.result;
                
                // 生成元素ID
                const elementId = this.generateElementId(taskId);
                
                // 创建图片元素
                const element = document.createElement('div');
                element.className = 'canvas-item canvas-element canvas-element-image';
                element.setAttribute('data-id', elementId);
                element.setAttribute('data-type', 'image');
                element.setAttribute('draggable', 'true');
                element.draggable = true;
                element.style.cursor = 'move';
                
                // 创建图片内容
                element.innerHTML = `
                    <div class="element-content">
                        <img src="${imageUrl}" alt="上传的图片" style="max-width: 100%; height: auto; display: block; border-radius: 4px;">
                    </div>
                `;
                
                // 设置初始位置和尺寸
                const initialX = 20 + (Math.random() * 100);
                const initialY = 20 + (Math.random() * 100);
                
                // 图像元素初始尺寸更大
                const initialWidth = 300;
                const initialHeight = 300;
                
                element.style.left = initialX + 'px';
                element.style.top = initialY + 'px';
                element.style.width = initialWidth + 'px';
                element.style.height = initialHeight + 'px';
                
                element.setAttribute('data-x', initialX);
                element.setAttribute('data-y', initialY);
                element.setAttribute('data-width', initialWidth);
                element.setAttribute('data-height', initialHeight);
                
                // 添加到画布
                canvasContainer.appendChild(element);
                
                // 自动选中新添加的元素
                this.selectCanvasElement(taskId, element);
                
                // 启用自由拖拽
                this.enableFreeDrag(taskId, element);
                
                // 保存任务
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    task.data.updatedAt = Date.now();
                    this.saveTasks();
                }
                
                this.showNotification('图片上传成功', 'success');
            } catch (error) {
                console.error('处理图片失败:', error);
                this.showNotification('处理图片失败: ' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification('读取图片文件失败', 'error');
        };
        
        // 读取文件为Data URL
        reader.readAsDataURL(file);
    }

    /**
     * 渲染界面预览（将HTML代码解析为DOM元素插入画布）
     * @param {string} taskId - 任务ID
     * @param {string} htmlCode - HTML代码
     */
    renderUIDesignPreview(taskId, htmlCode) {
        const canvasContainer = document.getElementById(`ui-design-preview-${taskId}`);
        if (!canvasContainer) return;

        // 清空画布
        canvasContainer.innerHTML = '';

        // 创建临时容器来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlCode;

        // 将解析后的元素移动到画布中，并为每个元素添加 canvas-item 和 canvas-element 类
        const moveElements = (source, target) => {
            Array.from(source.children).forEach(child => {
                // 为元素添加统一的 canvas-item 类（如果还没有）
                if (!child.classList.contains('canvas-item')) {
                    child.classList.add('canvas-item');
                }
                // 为元素添加 canvas-element 类（如果还没有）
                if (!child.classList.contains('canvas-element')) {
                    child.classList.add('canvas-element');
                }
                
                // 检测元素类型并添加对应的样式类（确保样式和下载的HTML一致）
                const classList = child.classList;
                if (!classList.contains('canvas-element-card') && 
                    !classList.contains('canvas-element-block') && 
                    !classList.contains('canvas-element-circle') && 
                    !classList.contains('canvas-element-text') && 
                    !classList.contains('canvas-element-image') &&
                    !classList.contains('canvas-title') &&
                    !classList.contains('canvas-card')) {
                    // 根据元素特征判断类型
                    if (child.querySelector('img')) {
                        child.classList.add('canvas-element-image');
                    } else if (classList.contains('circle-shape') || child.style.borderRadius === '50%') {
                        child.classList.add('canvas-element-circle');
                    } else if (child.tagName === 'H1' || child.tagName === 'H2' || child.tagName === 'H3') {
                        child.classList.add('canvas-title');
                    } else {
                        // 默认添加card样式
                        child.classList.add('canvas-element-card');
                    }
                }
                
                // 设置可拖动
                if (!child.hasAttribute('draggable')) {
                    child.setAttribute('draggable', 'true');
                    child.draggable = true;
                }
                
                // 为元素添加可编辑内容（如果没有）
                const elementContent = child.querySelector('.element-content');
                if (elementContent && !elementContent.querySelector('.editable-content')) {
                    // 如果元素有文本内容，将其转换为可编辑内容
                    const textContent = elementContent.textContent.trim();
                    if (textContent) {
                        const editable = document.createElement('div');
                        editable.className = 'editable-content';
                        editable.contentEditable = 'true';
                        editable.setAttribute('data-placeholder', '点击编辑...');
                        editable.textContent = textContent;
                        elementContent.innerHTML = '';
                        elementContent.appendChild(editable);
                        this.setupEditableContent(editable);
                        
                        // 恢复保存的字号（如果有）
                        const savedFontSize = child.getAttribute('data-font-size');
                        if (savedFontSize) {
                            editable.style.fontSize = savedFontSize + 'px';
                        } else {
                            editable.style.fontSize = '14px';
                            child.setAttribute('data-font-size', '14');
                        }
                    }
                }
                
                // 设置绝对定位和初始位置（如果没有）
                if (child.style.position !== 'absolute') {
                    child.style.position = 'absolute';
                    const x = child.getAttribute('data-x') || (20 + Math.random() * 100);
                    const y = child.getAttribute('data-y') || (20 + Math.random() * 100);
                    const width = child.getAttribute('data-width') || child.offsetWidth || 200;
                    const height = child.getAttribute('data-height') || child.offsetHeight || 100;
                    
                    child.style.left = x + 'px';
                    child.style.top = y + 'px';
                    child.style.width = width + 'px';
                    if (child.getAttribute('data-height')) {
                        child.style.height = height + 'px';
                    }
                    
                    child.setAttribute('data-x', x);
                    child.setAttribute('data-y', y);
                    child.setAttribute('data-width', width);
                    if (child.getAttribute('data-height')) {
                        child.setAttribute('data-height', height);
                    }
                }
                
                // 递归处理子元素
                if (child.children.length > 0) {
                    moveElements(child, child);
                }
                // 将元素移动到画布
                target.appendChild(child);
                
                // 启用自由拖拽
                this.enableFreeDrag(taskId, child);
            });
        };

        moveElements(tempDiv, canvasContainer);

        // 如果tempDiv中还有文本节点，也添加到画布
        if (tempDiv.textContent.trim() && tempDiv.children.length === 0) {
            const textElement = document.createElement('div');
            textElement.className = 'canvas-item canvas-element';
            textElement.setAttribute('draggable', 'true');
            textElement.innerHTML = htmlCode;
            canvasContainer.appendChild(textElement);
        }

        // 拖动事件已在初始化时绑定，无需重复绑定
    }

    /**
     * 显示系统提示词和参数设置
     * @param {Object} task - 任务对象
     */
    showUIDesignPromptSettings(task) {
        // 确保任务数据存在
        if (!task.data) {
            task.data = {
                systemPrompt: '你是一个专业的UI/UX设计师和前端开发专家。你的任务是根据用户的文字描述，生成完整的、可直接使用的HTML代码。',
                model: 'gemini-3-pro-preview',
                config: {
                    temperature: 0.7,
                    max_output_tokens: 8000,
                    top_p: 0.95,
                    top_k: 40
                }
            };
        }

        const modal = document.createElement('div');
        modal.className = 'ui-design-prompt-modal';
        modal.innerHTML = `
            <div class="ui-design-prompt-modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-cog"></i> 界面设计设置</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label for="ui-design-model-${task.id}">选择模型：</label>
                        <select id="ui-design-model-${task.id}" class="ui-design-model-select">
                            <option value="gemini-3-pro-preview" ${task.data.model === 'gemini-3-pro-preview' ? 'selected' : ''}>Gemini 3 Pro Preview</option>
                            <option value="gemini-3-flash-preview" ${task.data.model === 'gemini-3-flash-preview' ? 'selected' : ''}>Gemini 3 Flash Preview</option>
                            <option value="gemini-3-pro-image-preview" ${task.data.model === 'gemini-3-pro-image-preview' ? 'selected' : ''}>Gemini 3 Pro Image Preview</option>
                            <option value="gemini-2.5-pro" ${task.data.model === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
                            <option value="gemini-2.5-flash" ${task.data.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash</option>
                        </select>
                        <small>选择用于生成界面的模型</small>
                    </div>

                    <div class="setting-group">
                        <label for="ui-design-temperature-${task.id}">创造性 (Temperature):</label>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <input type="range" id="ui-design-temperature-${task.id}" min="0" max="2" step="0.1" value="${task.data.config?.temperature || 0.7}">
                            <span id="ui-design-temperature-value-${task.id}" style="min-width: 50px;">${task.data.config?.temperature || 0.7}</span>
                        </div>
                        <small>控制输出的随机性。0=确定性输出，2=最随机。推荐0.7-1.0</small>
                    </div>

                    <div class="setting-group">
                        <label for="ui-design-max-tokens-${task.id}">最大Token数 (Max Output Tokens):</label>
                        <input type="number" id="ui-design-max-tokens-${task.id}" min="100" max="32000" step="100" value="${task.data.config?.max_output_tokens || 8000}">
                        <small>限制AI回复的最大长度。HTML代码通常需要较多token</small>
                    </div>

                    <div class="setting-group">
                        <label for="ui-design-top-p-${task.id}">核采样 (Top-P):</label>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <input type="range" id="ui-design-top-p-${task.id}" min="0" max="1" step="0.05" value="${task.data.config?.top_p || 0.95}">
                            <span id="ui-design-top-p-value-${task.id}" style="min-width: 50px;">${task.data.config?.top_p || 0.95}</span>
                        </div>
                        <small>核采样参数，控制输出的多样性。0.95表示只考虑累积概率95%的token</small>
                    </div>

                    <div class="setting-group">
                        <label for="ui-design-top-k-${task.id}">Top-K采样:</label>
                        <input type="number" id="ui-design-top-k-${task.id}" min="1" max="100" value="${task.data.config?.top_k || 40}">
                        <small>限制每次只从概率最高的K个token中选择。值越小输出越保守，越大越多样</small>
                    </div>

                    <div class="setting-group">
                        <label for="ui-design-system-prompt-${task.id}">系统提示词：</label>
                        <textarea 
                            id="ui-design-system-prompt-${task.id}" 
                            rows="10" 
                            placeholder="输入系统提示词，用于指导AI如何生成界面..."
                        >${this.escapeHtml(task.data?.systemPrompt || '')}</textarea>
                        <small>系统提示词将指导AI如何理解和生成界面代码</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="save-ui-design-settings-${task.id}">保存</button>
                    <button class="btn btn-secondary modal-close">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定滑块值显示
        const temperatureSlider = document.getElementById(`ui-design-temperature-${task.id}`);
        const temperatureValue = document.getElementById(`ui-design-temperature-value-${task.id}`);
        if (temperatureSlider && temperatureValue) {
            temperatureSlider.addEventListener('input', (e) => {
                temperatureValue.textContent = e.target.value;
            });
        }

        const topPSlider = document.getElementById(`ui-design-top-p-${task.id}`);
        const topPValue = document.getElementById(`ui-design-top-p-value-${task.id}`);
        if (topPSlider && topPValue) {
            topPSlider.addEventListener('input', (e) => {
                topPValue.textContent = e.target.value;
            });
        }

        // 关闭事件
        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 保存事件
        const saveBtn = document.getElementById(`save-ui-design-settings-${task.id}`);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!task.data) task.data = {};

                // 保存系统提示词
                const promptInput = document.getElementById(`ui-design-system-prompt-${task.id}`);
                if (promptInput) {
                    task.data.systemPrompt = promptInput.value.trim();
                }

                // 保存模型
                const modelSelect = document.getElementById(`ui-design-model-${task.id}`);
                if (modelSelect) {
                    task.data.model = modelSelect.value;
                }

                // 保存配置参数
                task.data.config = {
                    temperature: parseFloat(document.getElementById(`ui-design-temperature-${task.id}`).value) || 0.7,
                    max_output_tokens: parseInt(document.getElementById(`ui-design-max-tokens-${task.id}`).value) || 8000,
                    top_p: parseFloat(document.getElementById(`ui-design-top-p-${task.id}`).value) || 0.95,
                    top_k: parseInt(document.getElementById(`ui-design-top-k-${task.id}`).value) || 40
                };

                this.saveTasks();
                this.showNotification('设置已保存', 'success');
                closeModal();
            });
        }

        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * 复制HTML代码
     * @param {Object} task - 任务对象
     */
    copyUIDesignHtml(task) {
        if (!task.data || !task.data.generatedHtml) {
            this.showNotification('没有可复制的HTML代码', 'warning');
            return;
        }

        navigator.clipboard.writeText(task.data.generatedHtml).then(() => {
            this.showNotification('HTML代码已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            this.showNotification('复制失败', 'error');
        });
    }

    /**
     * 下载HTML文件
     * @param {Object} task - 任务对象
     */
    downloadUIDesignHtml(task) {
        // 优先使用当前画布状态序列化的HTML
        const serializedHtml = this.serializeCanvas(task.id);
        
        if (!serializedHtml || serializedHtml.trim() === '') {
            // 如果没有画布内容，尝试使用保存的HTML
            if (task.data && task.data.generatedHtml) {
                this.showNotification('使用保存的HTML代码（画布为空）', 'info');
            } else {
                this.showNotification('没有可下载的HTML代码', 'warning');
                return;
            }
        }

        try {
            // 使用序列化的HTML（如果存在），否则使用保存的HTML
            const htmlContent = serializedHtml || task.data.generatedHtml;
            
            // 创建Blob对象
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // 生成文件名（使用任务名称和时间戳）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const taskName = (task.name || '界面设计').replace(/[^\w\s-]/g, '');
            a.download = `${taskName}_${timestamp}.html`;
            
            // 触发下载
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 释放URL对象
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.showNotification('HTML文件下载成功', 'success');
        } catch (error) {
            console.error('下载失败:', error);
            this.showNotification('下载失败: ' + error.message, 'error');
        }
    }

    /**
     * 切换全屏预览
     * @param {Object} task - 任务对象
     */
    toggleUIDesignFullscreen(task) {
        const previewContainer = document.getElementById(`ui-design-preview-${task.id}`);
        if (!previewContainer) return;

        const iframe = previewContainer.querySelector('iframe');
        if (!iframe) {
            this.showNotification('请先生成界面', 'warning');
            return;
        }

        // 创建全屏模态框
        const fullscreenModal = document.createElement('div');
        fullscreenModal.className = 'ui-design-fullscreen-modal';
        fullscreenModal.innerHTML = `
            <div class="fullscreen-header">
                <h3>${this.escapeHtml(task.name)} - 全屏预览</h3>
                <button class="fullscreen-close">
                    <i class="fas fa-times"></i> 关闭全屏
                </button>
            </div>
            <div class="fullscreen-preview" id="fullscreen-preview-${task.id}"></div>
        `;

        document.body.appendChild(fullscreenModal);

        // 复制iframe内容到全屏预览
        const fullscreenPreview = document.getElementById(`fullscreen-preview-${task.id}`);
        const fullscreenIframe = document.createElement('iframe');
        fullscreenIframe.style.width = '100%';
        fullscreenIframe.style.height = '100%';
        fullscreenIframe.style.border = 'none';
        fullscreenIframe.sandbox = 'allow-same-origin allow-scripts';
        
        fullscreenPreview.appendChild(fullscreenIframe);
        
        // 写入HTML内容
        const iframeDoc = fullscreenIframe.contentDocument || fullscreenIframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(task.data.generatedHtml);
        iframeDoc.close();

        // 关闭事件
        const closeBtn = fullscreenModal.querySelector('.fullscreen-close');
        const closeFullscreen = () => {
            document.body.removeChild(fullscreenModal);
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeFullscreen);
        }

        // ESC键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeFullscreen();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * 改变预览尺寸
     * @param {string} taskId - 任务ID
     * @param {string} size - 尺寸百分比
     */
    changeUIDesignPreviewSize(taskId, size) {
        const previewWrapper = document.getElementById(`ui-design-preview-wrapper-${taskId}`);
        if (previewWrapper) {
            previewWrapper.style.transform = `scale(${size / 100})`;
            previewWrapper.style.transformOrigin = 'top left';
        }
    }

    /**
     * 打开提示词对比器任务
     * @param {Object} task - 任务对象
     */
    openPromptComparatorTask(task) {
        // 初始化数据存储
        if (!task.data) {
            task.data = {
                prompts: [], // 存储每个提示词框的内容和结果
                config: {
                    model: 'gemini-3-pro-preview',
                    temperature: 0.7,
                    max_output_tokens: parseInt(this.maxTokens) || 44444,  // 使用全局默认值
                    top_p: 0.95,
                    top_k: 40
                }
            };
            this.saveTasks();
        }

        // 如果没有提示词框，初始化两个
        if (!task.data.prompts || task.data.prompts.length === 0) {
            task.data.prompts = [
                { id: 'prompt_1', userInfo: '', content: '', result: '' },
                { id: 'prompt_2', userInfo: '', content: '', result: '' }
            ];
            this.saveTasks();
        }

        // 确保已有提示词框都有userInfo字段
        task.data.prompts.forEach(p => {
            if (p.userInfo === undefined) {
                p.userInfo = '';
            }
        });
        this.saveTasks();

        const taskView = document.createElement('div');
        taskView.className = 'task-view';
        taskView.innerHTML = `
            <div class="task-view-header">
                <button class="task-view-back">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h2>${this.escapeHtml(task.name)}</h2>
                <button class="prompt-comparator-settings-btn" data-task-id="${task.id}">
                    <i class="fas fa-cog"></i> 设置
                </button>
            </div>
            <div class="prompt-comparator-workspace">
                <div class="prompt-comparator-container" id="prompt-comparator-container-${task.id}">
                    <!-- 提示词框将在这里动态生成 -->
                </div>
                <div class="prompt-comparator-actions" style="margin-top: 1rem; display: flex; gap: 1rem;">
                    <button class="add-prompt-box-btn" data-task-id="${task.id}" style="padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        <i class="fas fa-plus"></i> 添加提示词框
                    </button>
                    <button class="compare-prompts-btn" data-task-id="${task.id}" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        <i class="fas fa-balance-scale"></i> 对比
                    </button>
                    <button class="get-prompt-hint-btn" data-task-id="${task.id}" style="padding: 0.75rem 1.5rem; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        <i class="fas fa-lightbulb"></i> 获取提示词提示
                    </button>
                </div>
            </div>
        `;

        // 替换任务列表显示
        this.tasksList.innerHTML = '';
        this.tasksList.appendChild(taskView);

        // 添加类名以改变布局
        this.tasksList.classList.add('showing-task-view');

        // 初始化界面
        this.initPromptComparatorTask(task);

        // 返回按钮
        taskView.querySelector('.task-view-back').addEventListener('click', () => {
            this.tasksList.classList.remove('showing-task-view');
            this.updateTasksList();
        });

        // 设置按钮
        const settingsBtn = taskView.querySelector('.prompt-comparator-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPromptComparatorSettings(task);
            });
        }

        // 添加提示词框按钮
        taskView.querySelector('.add-prompt-box-btn').addEventListener('click', () => {
            this.addPromptBox(task);
        });

        // 对比按钮
        taskView.querySelector('.compare-prompts-btn').addEventListener('click', () => {
            this.showCompareDialog(task);
        });

        // 获取提示词提示按钮
        taskView.querySelector('.get-prompt-hint-btn').addEventListener('click', () => {
            this.showPromptHintDialog(task);
        });
    }

    /**
     * 初始化提示词对比器任务
     * @param {Object} task - 任务对象
     */
    initPromptComparatorTask(task) {
        const container = document.getElementById(`prompt-comparator-container-${task.id}`);
        if (!container) return;

        // 清空容器
        container.innerHTML = '';

        // 渲染所有提示词框
        task.data.prompts.forEach((prompt, index) => {
            this.renderPromptBox(task, prompt, index);
        });
    }

    /**
     * 渲染单个提示词框
     * @param {Object} task - 任务对象
     * @param {Object} prompt - 提示词对象
     * @param {number} index - 索引
     */
    renderPromptBox(task, prompt, index) {
        const container = document.getElementById(`prompt-comparator-container-${task.id}`);
        if (!container) return;

        const boxId = prompt.id || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!prompt.id) {
            prompt.id = boxId;
            this.saveTasks();
        }

        const boxDiv = document.createElement('div');
        boxDiv.className = 'prompt-box';
        boxDiv.dataset.promptId = boxId;
        boxDiv.innerHTML = `
            <div class="prompt-box-header">
                <h3>提示词 ${index + 1}</h3>
                <div class="prompt-box-actions">
                    <button class="clear-prompt-btn" data-task-id="${task.id}" data-prompt-id="${boxId}" title="清空提示词">
                        <i class="fas fa-eraser"></i> 清空
                    </button>
                    <button class="submit-prompt-btn" data-task-id="${task.id}" data-prompt-id="${boxId}" title="提交提示词">
                        <i class="fas fa-paper-plane"></i> 提交
                    </button>
                </div>
            </div>
            <div class="user-info-section" style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; font-size: 0.9rem;">
                    <i class="fas fa-user"></i> 用户信息（将作为上下文与提示词一起发送）
                </label>
                <textarea class="user-info-input" data-task-id="${task.id}" data-prompt-id="${boxId}" 
                    placeholder="输入用户信息，例如：用户年龄、职业、偏好等...">${this.escapeHtml(prompt.userInfo || '')}</textarea>
            </div>
            <div class="prompt-input-section">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; font-size: 0.9rem;">
                    <i class="fas fa-keyboard"></i> 提示词
                </label>
                <textarea class="prompt-input" data-task-id="${task.id}" data-prompt-id="${boxId}" 
                    placeholder="输入提示词...">${this.escapeHtml(prompt.content || '')}</textarea>
            </div>
            <div class="prompt-result" id="prompt-result-${boxId}">
                ${prompt.result ? `<div class="result-content">${this.formatMessage(prompt.result)}</div>` : '<div class="result-placeholder">提交后将在这里显示模型返回的结果</div>'}
            </div>
        `;

        container.appendChild(boxDiv);

        // 绑定事件
        const userInfoTextarea = boxDiv.querySelector('.user-info-input');
        userInfoTextarea.addEventListener('input', (e) => {
            prompt.userInfo = e.target.value;
            this.saveTasks();
        });

        const textarea = boxDiv.querySelector('.prompt-input');
        textarea.addEventListener('input', (e) => {
            prompt.content = e.target.value;
            this.saveTasks();
        });

        boxDiv.querySelector('.clear-prompt-btn').addEventListener('click', () => {
            prompt.userInfo = '';
            prompt.content = '';
            prompt.result = '';
            userInfoTextarea.value = '';
            textarea.value = '';
            const resultDiv = document.getElementById(`prompt-result-${boxId}`);
            if (resultDiv) {
                resultDiv.innerHTML = '<div class="result-placeholder">提交后将在这里显示模型返回的结果</div>';
            }
            this.saveTasks();
        });

        boxDiv.querySelector('.submit-prompt-btn').addEventListener('click', () => {
            this.submitPrompt(task, prompt);
        });
    }

    /**
     * 添加新的提示词框
     * @param {Object} task - 任务对象
     */
    addPromptBox(task) {
        if (!task.data.prompts) {
            task.data.prompts = [];
        }

        const newPrompt = {
            id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userInfo: '',
            content: '',
            result: ''
        };

        task.data.prompts.push(newPrompt);
        this.saveTasks();

        // 重新渲染
        this.renderPromptBox(task, newPrompt, task.data.prompts.length - 1);
    }

    /**
     * 提交提示词
     * @param {Object} task - 任务对象
     * @param {Object} prompt - 提示词对象
     */
    async submitPrompt(task, prompt) {
        if (!prompt.content || !prompt.content.trim()) {
            this.showNotification('请输入提示词', 'warning');
            return;
        }

        const resultDiv = document.getElementById(`prompt-result-${prompt.id}`);
        if (!resultDiv) return;

        // 显示加载状态
        resultDiv.innerHTML = '<div class="result-loading"><i class="fas fa-spinner fa-spin"></i> 正在生成...</div>';

        try {
            // 获取配置
            const config = task.data.config || {
                model: 'gemini-3-pro-preview',
                temperature: 0.7,
                max_output_tokens: parseInt(this.maxTokens) || 44444,  // 使用全局默认值
                top_p: 0.95,
                top_k: 40
            };

            // 构建完整的内容：用户信息 + 提示词
            let fullContent = '';
            if (prompt.userInfo && prompt.userInfo.trim()) {
                fullContent = `用户信息：\n${prompt.userInfo.trim()}\n\n提示词：\n${prompt.content.trim()}`;
            } else {
                fullContent = prompt.content.trim();
            }

            // 调用 Vertex AI API
            const response = await fetch('http://localhost:5000/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    contents: fullContent,
                    config: {
                        temperature: config.temperature,
                        max_output_tokens: config.max_output_tokens,
                        top_p: config.top_p,
                        top_k: config.top_k
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || '生成失败');
            }

            // 保存结果
            prompt.result = data.text || '';
            this.saveTasks();

            // 显示结果
            resultDiv.innerHTML = `<div class="result-content">${this.formatMessage(prompt.result)}</div>`;

            this.showNotification('生成成功', 'success');
        } catch (error) {
            console.error('提交提示词失败:', error);
            resultDiv.innerHTML = `<div class="result-error">错误: ${this.escapeHtml(error.message)}</div>`;
            this.showNotification('生成失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示提示词对比器设置
     * @param {Object} task - 任务对象
     */
    showPromptComparatorSettings(task) {
        const config = task.data.config || {
            model: 'gemini-3-pro-preview',
            temperature: 0.7,
            max_output_tokens: parseInt(this.maxTokens) || 44444,  // 使用全局默认值
            top_p: 0.95,
            top_k: 40
        };

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>提示词对比器设置</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <label for="comparator-model-${task.id}">模型:</label>
                    <select id="comparator-model-${task.id}" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;">
                        <option value="gemini-3-pro-preview" ${config.model === 'gemini-3-pro-preview' ? 'selected' : ''}>Gemini 3 Pro Preview</option>
                        <option value="gemini-3-flash-preview" ${config.model === 'gemini-3-flash-preview' ? 'selected' : ''}>Gemini 3 Flash Preview</option>
                        <option value="gemini-2.5-pro" ${config.model === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash" ${config.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash</option>
                        <option value="gemini-1.5-pro" ${config.model === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash" ${config.model === 'gemini-1.5-flash' ? 'selected' : ''}>Gemini 1.5 Flash</option>
                    </select>

                    <label for="comparator-temperature-${task.id}">Temperature (0.0 - 2.0):</label>
                    <input type="number" id="comparator-temperature-${task.id}" 
                        value="${config.temperature}" min="0" max="2" step="0.1" 
                        style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;">

                    <label for="comparator-max-tokens-${task.id}">Max Output Tokens:</label>
                    <input type="number" id="comparator-max-tokens-${task.id}" 
                        value="${config.max_output_tokens}" min="1" max="8192" step="1" 
                        style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;">

                    <label for="comparator-top-p-${task.id}">Top P (0.0 - 1.0):</label>
                    <input type="number" id="comparator-top-p-${task.id}" 
                        value="${config.top_p}" min="0" max="1" step="0.01" 
                        style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;">

                    <label for="comparator-top-k-${task.id}">Top K:</label>
                    <input type="number" id="comparator-top-k-${task.id}" 
                        value="${config.top_k}" min="1" max="100" step="1" 
                        style="width: 100%; padding: 0.5rem; margin-bottom: 1rem;">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="save-comparator-settings-${task.id}">保存</button>
                    <button class="btn btn-secondary modal-close">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 保存事件
        const saveBtn = document.getElementById(`save-comparator-settings-${task.id}`);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!task.data) task.data = {};

                task.data.config = {
                    model: document.getElementById(`comparator-model-${task.id}`).value,
                    temperature: parseFloat(document.getElementById(`comparator-temperature-${task.id}`).value) || 0.7,
                    max_output_tokens: parseInt(document.getElementById(`comparator-max-tokens-${task.id}`).value) || parseInt(this.maxTokens) || 44444,
                    top_p: parseFloat(document.getElementById(`comparator-top-p-${task.id}`).value) || 0.95,
                    top_k: parseInt(document.getElementById(`comparator-top-k-${task.id}`).value) || 40
                };

                this.saveTasks();
                this.showNotification('设置已保存', 'success');
                closeModal();
            });
        }

        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * 显示获取提示词提示对话框
     * @param {Object} task - 任务对象
     */
    showPromptHintDialog(task) {
        // 初始化期望输出存储
        if (!task.data.expectedOutput) {
            task.data.expectedOutput = '';
            this.saveTasks();
        }

        // 初始化提示词提示对比结果存储（模型输出的提示内容）
        if (task.data.promptHintCompareResult === undefined) {
            task.data.promptHintCompareResult = '';
            this.saveTasks();
        }

        // 获取所有有结果的提示词
        const promptsWithResults = task.data.prompts.filter(p => p.result && p.result.trim());

        if (promptsWithResults.length === 0) {
            this.showNotification('请先提交至少一个提示词并获取结果', 'warning');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 1400px; max-height: 95vh;">
                <div class="modal-header">
                    <h3>获取提示词提示</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y: auto; max-height: calc(95vh - 120px);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <!-- 左侧：选择模型输出 -->
                        <div>
                            <label for="select-model-output-${task.id}" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">
                                <i class="fas fa-list"></i> 选择模型输出：
                            </label>
                            <select id="select-model-output-${task.id}" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                                ${promptsWithResults.map((p, idx) => {
                                    const promptIndex = task.data.prompts.findIndex(pp => pp.id === p.id) + 1;
                                    return `<option value="${p.id}">提示词 ${promptIndex} 的输出${p.content ? ` (${p.content.substring(0, 30)}...)` : ''}</option>`;
                                }).join('')}
                            </select>
                            <div id="model-output-display-${task.id}" style="padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 300px; max-height: 500px; overflow-y: auto;">
                                ${this.formatMessage(promptsWithResults[0].result)}
                            </div>
                        </div>

                        <!-- 右侧：期望输出 -->
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <label for="expected-output-${task.id}" style="display: block; font-weight: 500; color: #374151;">
                                    <i class="fas fa-bullseye"></i> 期望输出：
                                </label>
                                <button id="save-expected-output-${task.id}" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                            </div>
                            <textarea id="expected-output-${task.id}" style="width: 100%; min-height: 300px; max-height: 500px; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; font-family: inherit; resize: vertical;">${this.escapeHtml(task.data.expectedOutput || '')}</textarea>
                        </div>
                    </div>

                    <!-- 对比结果区域 -->
                    <div style="margin-top: 2rem;">
                        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                            <button id="compare-btn-${task.id}" class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-size: 1rem;">
                                <i class="fas fa-balance-scale"></i> 对比
                            </button>
                            <button id="compare-settings-btn-${task.id}" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; font-size: 1rem;">
                                <i class="fas fa-cog"></i> 设置
                            </button>
                            <button id="clear-compare-result-${task.id}" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">
                                <i class="fas fa-trash-alt"></i> 清空结果
                            </button>
                        </div>
                        <div id="compare-result-${task.id}" style="padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 200px; max-height: none; overflow-y: visible; display: ${task.data.promptHintCompareResult ? 'block' : 'none'};">
                            ${task.data.promptHintCompareResult
                                ? this.formatMessage(task.data.promptHintCompareResult)
                                : '<div style="color: #94a3b8;">点击\"对比\"按钮开始对比分析</div>'}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 保存期望输出
        const saveBtn = document.getElementById(`save-expected-output-${task.id}`);
        const expectedOutputTextarea = document.getElementById(`expected-output-${task.id}`);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                task.data.expectedOutput = expectedOutputTextarea.value.trim();
                this.saveTasks();
                this.showNotification('期望输出已保存', 'success');
            });
        }

        // 选择模型输出变化时更新显示
        const selectOutput = document.getElementById(`select-model-output-${task.id}`);
        const outputDisplay = document.getElementById(`model-output-display-${task.id}`);
        
        const updateDisplay = () => {
            const selectedPromptId = selectOutput.value;
            const selectedPrompt = task.data.prompts.find(p => p.id === selectedPromptId);

            if (selectedPrompt && selectedPrompt.result) {
                // 更新左侧显示
                outputDisplay.innerHTML = this.formatMessage(selectedPrompt.result);
            }
        };

        selectOutput.addEventListener('change', updateDisplay);

        // 初始显示
        updateDisplay();

        // 初始化对比设置（存储在任务数据中）
        if (!task.data.compareSettings) {
            task.data.compareSettings = {
                model: 'gemini-2.5-flash',
                temperature: 0.7,
                max_output_tokens: 8192,
                top_p: 0.95,
                top_k: 40,
                systemPrompt: '请对比以下两个输出的差异，然后给出提示词改进建议。\n\n本次提示词：\n{本次提示词}\n\n本次输出：\n{本次输出}\n\n期待输出：\n{期待输出}\n\n请分析本次输出与期待输出的差异，并基于这些差异给出提示词改进建议。'
            };
            this.saveTasks();
        }

        // 对比按钮点击事件
        const compareBtn = document.getElementById(`compare-btn-${task.id}`);
        const compareResultDiv = document.getElementById(`compare-result-${task.id}`);
        if (compareBtn) {
            compareBtn.addEventListener('click', async () => {
                const selectedPromptId = selectOutput.value;
                const selectedPrompt = task.data.prompts.find(p => p.id === selectedPromptId);
                const expectedOutput = expectedOutputTextarea.value.trim();

                if (!selectedPrompt || !selectedPrompt.result) {
                    this.showNotification('请先选择一个模型输出', 'warning');
                    return;
                }

                if (!expectedOutput) {
                    this.showNotification('请输入期望输出', 'warning');
                    return;
                }

                // 构建完整的提示词（包含用户信息）
                const buildFullPrompt = (prompt) => {
                    if (prompt.userInfo && prompt.userInfo.trim()) {
                        return `用户信息：\n${prompt.userInfo.trim()}\n\n提示词：\n${prompt.content || ''}`;
                    }
                    return prompt.content || '';
                };

                const fullPrompt = buildFullPrompt(selectedPrompt);
                const modelOutput = selectedPrompt.result;

                // 构建对比提示词（替换占位符）
                let comparePrompt = task.data.compareSettings.systemPrompt
                    .replace('{本次提示词}', fullPrompt)
                    .replace('{本次输出}', modelOutput)
                    .replace('{期待输出}', expectedOutput);

                // 显示加载状态
                compareResultDiv.style.display = 'block';
                compareResultDiv.innerHTML = '<div style="color: #3b82f6;"><i class="fas fa-spinner fa-spin"></i> 正在对比分析中...</div>';

                try {
                    // 调用API
                    const config = {
                        temperature: task.data.compareSettings.temperature,
                        max_output_tokens: task.data.compareSettings.max_output_tokens,
                        top_p: task.data.compareSettings.top_p,
                        top_k: task.data.compareSettings.top_k
                    };

                    const payload = {
                        model: task.data.compareSettings.model,
                        contents: comparePrompt,
                        config: config
                    };

                    const response = await fetch('http://localhost:5000/api/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    
                    if (!data.success) {
                        throw new Error(data.error || '对比分析失败');
                    }

                    const compareText = data.text || '对比分析完成，但未返回内容';

                    // 显示结果
                    compareResultDiv.innerHTML = this.formatMessage(compareText);
                    compareResultDiv.style.display = 'block';

                    // 持久化保存本次模型输出结果，下次打开仍然存在
                    task.data.promptHintCompareResult = compareText;
                    this.saveTasks();
                } catch (error) {
                    console.error('对比分析失败:', error);
                    compareResultDiv.innerHTML = `<div style="color: #ef4444;"><i class="fas fa-exclamation-circle"></i> 对比分析失败: ${error.message}</div>`;
                    compareResultDiv.style.display = 'block';
                }
            });
        }

        // 设置按钮点击事件
        const settingsBtn = document.getElementById(`compare-settings-btn-${task.id}`);
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showCompareSettingsDialog(task);
            });
        }

        // 清空结果按钮点击事件（只在用户主动点击时才清空）
        const clearBtn = document.getElementById(`clear-compare-result-${task.id}`);
        if (clearBtn && compareResultDiv) {
            clearBtn.addEventListener('click', () => {
                task.data.promptHintCompareResult = '';
                this.saveTasks();
                compareResultDiv.style.display = 'none';
                compareResultDiv.innerHTML = '<div style="color: #94a3b8;">点击\"对比\"按钮开始对比分析</div>';
                this.showNotification('提示词提示结果已清空', 'success');
            });
        }

        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * 显示对比设置对话框
     * @param {Object} task - 任务对象
     */
    showCompareSettingsDialog(task) {
        // 确保设置存在
        if (!task.data.compareSettings) {
            task.data.compareSettings = {
                model: 'gemini-2.5-flash',
                temperature: 0.7,
                max_output_tokens: 8192,
                top_p: 0.95,
                top_k: 40,
                systemPrompt: '请对比以下两个输出的差异，然后给出提示词改进建议。\n\n本次提示词：\n{本次提示词}\n\n本次输出：\n{本次输出}\n\n期待输出：\n{期待输出}\n\n请分析本次输出与期待输出的差异，并基于这些差异给出提示词改进建议。'
            };
            this.saveTasks();
        }

        const settings = task.data.compareSettings;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh;">
                <div class="modal-header">
                    <h3>对比设置</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y: auto; max-height: calc(90vh - 120px);">
                    <div class="setting-group" style="margin-bottom: 1.5rem;">
                        <label for="compare-model-${task.id}" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">
                            模型：
                        </label>
                        <select id="compare-model-${task.id}" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                            <option value="gemini-3-pro-preview" ${settings.model === 'gemini-3-pro-preview' ? 'selected' : ''}>Gemini 3 Pro Preview</option>
                            <option value="gemini-3-flash-preview" ${settings.model === 'gemini-3-flash-preview' ? 'selected' : ''}>Gemini 3 Flash Preview</option>
                            <option value="gemini-3-pro-image-preview" ${settings.model === 'gemini-3-pro-image-preview' ? 'selected' : ''}>Gemini 3 Pro Image Preview</option>
                            <option value="gemini-2.5-pro" ${settings.model === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
                            <option value="gemini-2.5-flash" ${settings.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash</option>
                            <option value="gemini-1.5-pro" ${settings.model === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
                            <option value="gemini-1.5-flash" ${settings.model === 'gemini-1.5-flash' ? 'selected' : ''}>Gemini 1.5 Flash</option>
                        </select>
                    </div>

                    <div class="setting-group" style="margin-bottom: 1.5rem;">
                        <label for="compare-temperature-${task.id}" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">
                            创造性 (Temperature): <span id="compare-temperature-value-${task.id}">${settings.temperature}</span>
                        </label>
                        <input type="range" id="compare-temperature-${task.id}" min="0" max="2" step="0.1" value="${settings.temperature}" style="width: 100%;">
                        <small style="color: #6b7280; font-size: 0.85rem;">控制输出的随机性。0=确定性输出，2=最随机。推荐0.7-1.0</small>
                    </div>

                    <div class="setting-group" style="margin-bottom: 1.5rem;">
                        <label for="compare-max-tokens-${task.id}" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">
                            最大Token数 (Max Output Tokens):
                        </label>
                        <input type="number" id="compare-max-tokens-${task.id}" min="1" max="8192" value="${settings.max_output_tokens}" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                        <small style="color: #6b7280; font-size: 0.85rem;">限制AI回复的最大长度。1 token ≈ 0.75个英文单词或1个中文字符</small>
                    </div>

                    <div class="setting-group" style="margin-bottom: 1.5rem;">
                        <label for="compare-top-p-${task.id}" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">
                            核采样 (Top-P): <span id="compare-top-p-value-${task.id}">${settings.top_p}</span>
                        </label>
                        <input type="range" id="compare-top-p-${task.id}" min="0" max="1" step="0.05" value="${settings.top_p}" style="width: 100%;">
                        <small style="color: #6b7280; font-size: 0.85rem;">核采样参数，控制输出的多样性。0.95表示只考虑累积概率95%的token</small>
                    </div>

                    <div class="setting-group" style="margin-bottom: 1.5rem;">
                        <label for="compare-top-k-${task.id}" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">
                            Top-K采样:
                        </label>
                        <input type="number" id="compare-top-k-${task.id}" min="1" max="100" value="${settings.top_k}" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                        <small style="color: #6b7280; font-size: 0.85rem;">限制每次只从概率最高的K个token中选择。值越小输出越保守，越大越多样</small>
                    </div>

                    <div class="setting-group" style="margin-bottom: 1.5rem;">
                        <label for="compare-system-prompt-${task.id}" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151;">
                            系统提示词:
                        </label>
                        <textarea id="compare-system-prompt-${task.id}" rows="12" style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; font-family: inherit; resize: vertical;">${this.escapeHtml(settings.systemPrompt)}</textarea>
                        <small style="color: #6b7280; font-size: 0.85rem;">
                            可以使用占位符：{本次提示词}、{本次输出}、{期待输出}。这些占位符会在对比时被实际内容替换。
                        </small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="save-compare-settings-${task.id}" class="btn btn-primary">保存</button>
                    <button class="btn btn-secondary modal-close">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 温度滑块更新显示
        const temperatureSlider = document.getElementById(`compare-temperature-${task.id}`);
        const temperatureValue = document.getElementById(`compare-temperature-value-${task.id}`);
        if (temperatureSlider && temperatureValue) {
            temperatureSlider.addEventListener('input', (e) => {
                temperatureValue.textContent = e.target.value;
            });
        }

        // Top-P滑块更新显示
        const topPSlider = document.getElementById(`compare-top-p-${task.id}`);
        const topPValue = document.getElementById(`compare-top-p-value-${task.id}`);
        if (topPSlider && topPValue) {
            topPSlider.addEventListener('input', (e) => {
                topPValue.textContent = e.target.value;
            });
        }

        // 保存设置
        const saveBtn = document.getElementById(`save-compare-settings-${task.id}`);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                task.data.compareSettings = {
                    model: document.getElementById(`compare-model-${task.id}`).value,
                    temperature: parseFloat(document.getElementById(`compare-temperature-${task.id}`).value),
                    max_output_tokens: parseInt(document.getElementById(`compare-max-tokens-${task.id}`).value),
                    top_p: parseFloat(document.getElementById(`compare-top-p-${task.id}`).value),
                    top_k: parseInt(document.getElementById(`compare-top-k-${task.id}`).value),
                    systemPrompt: document.getElementById(`compare-system-prompt-${task.id}`).value.trim()
                };
                this.saveTasks();
                this.showNotification('设置已保存', 'success');
                closeModal();
            });
        }

        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * 显示对比对话框
     * @param {Object} task - 任务对象
     */
    showCompareDialog(task) {
        if (!task.data.prompts || task.data.prompts.length < 2) {
            this.showNotification('至少需要两个提示词框才能对比', 'warning');
            return;
        }

        // 检查是否有至少两个提示词有内容（提示词或结果都可以）
        const promptsWithContent = task.data.prompts.filter(p => 
            (p.content && p.content.trim()) || (p.result && p.result.trim())
        );
        if (promptsWithContent.length < 2) {
            this.showNotification('至少需要两个有内容的提示词框才能对比', 'warning');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>选择要对比的提示词</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label for="compare-prompt-a-${task.id}">提示词 A:</label>
                            <select id="compare-prompt-a-${task.id}" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
                                ${task.data.prompts.map((p, idx) => 
                                    `<option value="${p.id}" ${idx === 0 ? 'selected' : ''}>提示词 ${idx + 1}${p.result ? ' (已提交)' : ' (未提交)'}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="compare-prompt-b-${task.id}">提示词 B:</label>
                            <select id="compare-prompt-b-${task.id}" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;">
                                ${task.data.prompts.map((p, idx) => 
                                    `<option value="${p.id}" ${idx === 1 ? 'selected' : ''}>提示词 ${idx + 1}${p.result ? ' (已提交)' : ' (未提交)'}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="start-compare-${task.id}">开始对比</button>
                    <button class="btn btn-secondary modal-close">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 开始对比
        const compareBtn = document.getElementById(`start-compare-${task.id}`);
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                const promptAId = document.getElementById(`compare-prompt-a-${task.id}`).value;
                const promptBId = document.getElementById(`compare-prompt-b-${task.id}`).value;

                if (promptAId === promptBId) {
                    this.showNotification('请选择两个不同的提示词', 'warning');
                    return;
                }

                const promptA = task.data.prompts.find(p => p.id === promptAId);
                const promptB = task.data.prompts.find(p => p.id === promptBId);

                if (!promptA || !promptB) {
                    this.showNotification('未找到选中的提示词', 'error');
                    return;
                }

                // 检查是否有内容可以对比（包括用户信息和提示词）
                const hasPromptContent = (promptA.userInfo && promptA.userInfo.trim()) || 
                                        (promptA.content && promptA.content.trim()) || 
                                        (promptB.userInfo && promptB.userInfo.trim()) || 
                                        (promptB.content && promptB.content.trim());
                const hasResultContent = (promptA.result && promptA.result.trim()) || (promptB.result && promptB.result.trim());

                if (!hasPromptContent && !hasResultContent) {
                    this.showNotification('请确保至少有一个提示词有用户信息、输入内容或结果', 'warning');
                    return;
                }

                closeModal();
                this.showCompareResult(task, promptA, promptB);
            });
        }

        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * 显示对比结果
     * @param {Object} task - 任务对象
     * @param {Object} promptA - 提示词A
     * @param {Object} promptB - 提示词B
     */
    showCompareResult(task, promptA, promptB) {
        // 构建完整的提示词内容（包含用户信息）
        const buildFullPrompt = (prompt) => {
            if (prompt.userInfo && prompt.userInfo.trim()) {
                return `用户信息：\n${prompt.userInfo.trim()}\n\n提示词：\n${prompt.content || ''}`;
            }
            return prompt.content || '';
        };

        // 对比输入的提示词（包含用户信息）
        const fullPromptA = buildFullPrompt(promptA);
        const fullPromptB = buildFullPrompt(promptB);
        const promptDiff = this.compareTexts(fullPromptA, fullPromptB);
        
        // 对比输出的结果
        const resultDiff = this.compareTexts(promptA.result || '', promptB.result || '');

        // 检查是否有内容（包括用户信息）
        const hasPromptContent = (promptA.userInfo && promptA.userInfo.trim()) || 
                                (promptA.content && promptA.content.trim()) || 
                                (promptB.userInfo && promptB.userInfo.trim()) || 
                                (promptB.content && promptB.content.trim());
        const hasResultContent = (promptA.result && promptA.result.trim()) || (promptB.result && promptB.result.trim());

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 1400px; max-height: 90vh;">
                <div class="modal-header">
                    <h3>对比结果</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="overflow-y: auto; max-height: calc(90vh - 120px);">
                    <!-- 提示词对比区域 -->
                    ${hasPromptContent ? `
                    <div class="compare-section" style="margin-bottom: 2rem;">
                        <h4 style="margin-bottom: 1rem; color: #1e293b; font-size: 1.1rem; font-weight: 600;">
                            <i class="fas fa-keyboard"></i> 输入提示词对比（包含用户信息和提示词）
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div style="padding: 0.75rem; background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px;">
                                <strong style="color: #166534;">提示词 A (绿色标记 = A比B多的内容)</strong>
                            </div>
                            <div style="padding: 0.75rem; background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px;">
                                <strong style="color: #991b1b;">提示词 B (红色标记 = B比A多的内容)</strong>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="compare-result-a" style="padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 200px;">
                                ${promptDiff.htmlA || '<div style="color: #94a3b8;">提示词A为空</div>'}
                            </div>
                            <div class="compare-result-b" style="padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 200px;">
                                ${promptDiff.htmlB || '<div style="color: #94a3b8;">提示词B为空</div>'}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- 结果对比区域 -->
                    ${hasResultContent ? `
                    <div class="compare-section">
                        <h4 style="margin-bottom: 1rem; color: #1e293b; font-size: 1.1rem; font-weight: 600;">
                            <i class="fas fa-file-alt"></i> 输出结果对比
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div style="padding: 0.75rem; background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px;">
                                <strong style="color: #166534;">结果 A (绿色标记 = A比B多的内容)</strong>
                            </div>
                            <div style="padding: 0.75rem; background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px;">
                                <strong style="color: #991b1b;">结果 B (红色标记 = B比A多的内容)</strong>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="compare-result-a" style="padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 200px;">
                                ${resultDiff.htmlA || '<div style="color: #94a3b8;">结果A为空</div>'}
                            </div>
                            <div class="compare-result-b" style="padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 200px;">
                                ${resultDiff.htmlB || '<div style="color: #94a3b8;">结果B为空</div>'}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * 对比两个文本，返回带标记的HTML
     * @param {string} textA - 文本A
     * @param {string} textB - 文本B
     * @returns {Object} {htmlA, htmlB}
     */
    compareTexts(textA, textB) {
        // 简单的逐行对比算法
        const linesA = textA.split('\n');
        const linesB = textB.split('\n');
        
        // 使用最长公共子序列算法找出相同和不同的部分
        const diff = this.computeDiff(linesA, linesB);
        
        let htmlA = '';
        let htmlB = '';
        
        diff.forEach(change => {
            if (change.type === 'equal') {
                // 相同内容，直接显示
                htmlA += this.escapeHtml(change.text) + '\n';
                htmlB += this.escapeHtml(change.text) + '\n';
            } else if (change.type === 'delete') {
                // A有B没有，A显示绿色背景
                htmlA += `<span style="background: #86efac; color: #166534; padding: 2px 4px; border-radius: 3px;">${this.escapeHtml(change.text)}</span>\n`;
            } else if (change.type === 'insert') {
                // B有A没有，B显示红色背景
                htmlB += `<span style="background: #fca5a5; color: #991b1b; padding: 2px 4px; border-radius: 3px;">${this.escapeHtml(change.text)}</span>\n`;
            } else if (change.type === 'replace') {
                // 替换：A显示绿色，B显示红色
                htmlA += `<span style="background: #86efac; color: #166534; padding: 2px 4px; border-radius: 3px;">${this.escapeHtml(change.oldText)}</span>\n`;
                htmlB += `<span style="background: #fca5a5; color: #991b1b; padding: 2px 4px; border-radius: 3px;">${this.escapeHtml(change.newText)}</span>\n`;
            }
        });
        
        // 转换为HTML格式（保留换行）
        htmlA = htmlA.replace(/\n/g, '<br>');
        htmlB = htmlB.replace(/\n/g, '<br>');
        
        return { htmlA, htmlB };
    }

    /**
     * 计算两个文本数组的差异（简化版LCS算法）
     * @param {Array<string>} linesA - 文本A的行数组
     * @param {Array<string>} linesB - 文本B的行数组
     * @returns {Array} 差异数组
     */
    computeDiff(linesA, linesB) {
        const result = [];
        const maxLen = Math.max(linesA.length, linesB.length);
        
        let i = 0, j = 0;
        
        while (i < linesA.length || j < linesB.length) {
            if (i >= linesA.length) {
                // A已结束，B还有剩余
                result.push({ type: 'insert', text: linesB[j] });
                j++;
            } else if (j >= linesB.length) {
                // B已结束，A还有剩余
                result.push({ type: 'delete', text: linesA[i] });
                i++;
            } else if (linesA[i] === linesB[j]) {
                // 相同行
                result.push({ type: 'equal', text: linesA[i] });
                i++;
                j++;
            } else {
                // 不同行，尝试查找后续是否有匹配
                let foundMatch = false;
                let lookAhead = 1;
                
                // 向前查找最多5行
                while (lookAhead <= 5 && (i + lookAhead < linesA.length || j + lookAhead < linesB.length)) {
                    // 检查A的下几行是否匹配B的当前行
                    if (i + lookAhead < linesA.length && linesA[i + lookAhead] === linesB[j]) {
                        // A的前几行是删除
                        for (let k = 0; k < lookAhead; k++) {
                            result.push({ type: 'delete', text: linesA[i + k] });
                        }
                        i += lookAhead;
                        foundMatch = true;
                        break;
                    }
                    // 检查B的下几行是否匹配A的当前行
                    if (j + lookAhead < linesB.length && linesB[j + lookAhead] === linesA[i]) {
                        // B的前几行是插入
                        for (let k = 0; k < lookAhead; k++) {
                            result.push({ type: 'insert', text: linesB[j + k] });
                        }
                        j += lookAhead;
                        foundMatch = true;
                        break;
                    }
                    lookAhead++;
                }
                
                if (!foundMatch) {
                    // 没找到匹配，视为替换
                    result.push({ type: 'replace', oldText: linesA[i], newText: linesB[j] });
                    i++;
                    j++;
                }
            }
        }
        
        return result;
    }

    /**
     * 打开占位符文档整合任务
     * @param {Object} task - 任务对象
     */
    openPlaceholderMergeTask(task) {
        if (!task.data) {
            task.data = {
                promptFiles: [],
                placeholderFiles: [],
                results: []
            };
            this.saveTasks();
        }
        
        // 确保 results 数组存在
        if (!task.data.results) {
            task.data.results = [];
        }

        const taskView = document.createElement('div');
        taskView.className = 'task-view';
        taskView.innerHTML = `
            <div class="task-view-header">
                <button class="task-view-back">
                    <i class="fas fa-arrow-left"></i> 返回
                </button>
                <h2>${this.escapeHtml(task.name)}</h2>
            </div>
            <div class="placeholder-merge-workspace" style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
                <div style="background: #f9fafb; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem;"><i class="fas fa-file-code"></i> 占位符文档整合</h3>
                    <p style="color: #6b7280; margin: 0;">上传提示词文档和占位符文档，系统会自动扫描并替换占位符</p>
                </div>

                <!-- 文件上传区域 -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                    <!-- 提示词文档上传 -->
                    <div style="background: white; border: 2px dashed #d1d5db; border-radius: 8px; padding: 1.5rem; text-align: center;">
                        <h4 style="margin-top: 0; margin-bottom: 0.5rem;"><i class="fas fa-file-alt"></i> 提示词文档</h4>
                        <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem;">上传包含占位符的提示词文档（支持多选）</p>
                        <input type="file" id="prompt-files-${task.id}" accept=".md,.txt" multiple style="display: none;">
                        <button class="btn btn-primary" id="upload-prompt-files-${task.id}" style="margin-bottom: 0.5rem;">
                            <i class="fas fa-upload"></i> 选择文件
                        </button>
                        <div id="prompt-files-list-${task.id}" style="margin-top: 1rem; text-align: left; font-size: 0.9rem; color: #6b7280;">
                            <div>已选择: <span id="prompt-files-count-${task.id}">0</span> 个文件</div>
                        </div>
                    </div>

                    <!-- 占位符文档上传 -->
                    <div style="background: white; border: 2px dashed #d1d5db; border-radius: 8px; padding: 1.5rem; text-align: center;">
                        <h4 style="margin-top: 0; margin-bottom: 0.5rem;"><i class="fas fa-code"></i> 占位符文档</h4>
                        <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem;">上传占位符文档，文件名格式：placeholder_xxx.md</p>
                        <input type="file" id="placeholder-files-${task.id}" accept=".md,.txt" multiple style="display: none;">
                        <button class="btn btn-primary" id="upload-placeholder-files-${task.id}" style="margin-bottom: 0.5rem;">
                            <i class="fas fa-upload"></i> 选择文件
                        </button>
                        <div id="placeholder-files-list-${task.id}" style="margin-top: 1rem; text-align: left; font-size: 0.9rem; color: #6b7280;">
                            <div>已选择: <span id="placeholder-files-count-${task.id}">0</span> 个文件</div>
                        </div>
                    </div>
                </div>

                <!-- 提交按钮 -->
                <div style="text-align: center; margin-bottom: 2rem;">
                    <button class="btn btn-primary" id="submit-placeholder-merge-${task.id}" style="padding: 0.75rem 2rem; font-size: 1rem;">
                        <i class="fas fa-play"></i> 开始处理
                    </button>
                </div>

                <!-- 进度条 -->
                <div id="merge-progress-${task.id}" style="display: none; margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="font-weight: 500;">处理进度</span>
                        <span id="merge-progress-text-${task.id}">0/0</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                        <div id="merge-progress-bar-${task.id}" style="height: 100%; background: #4f46e5; width: 0%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <!-- 结果区域 -->
                <div id="merge-results-${task.id}" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;"><i class="fas fa-check-circle"></i> 处理结果</h3>
                        <button class="btn btn-secondary" id="download-all-${task.id}">
                            <i class="fas fa-download"></i> 一键下载全部
                        </button>
                    </div>
                    <div id="merge-results-content-${task.id}">
                        <!-- 结果将在这里动态生成 -->
                    </div>
                </div>
            </div>
        `;

        // 替换任务视图
        const tasksContainer = document.getElementById('view-tasks');
        if (tasksContainer) {
            tasksContainer.innerHTML = '';
            tasksContainer.appendChild(taskView);
        }

        // 绑定返回按钮
        taskView.querySelector('.task-view-back').addEventListener('click', () => {
            this.switchView('tasks');
        });

        // 绑定文件上传
        const promptFileInput = document.getElementById(`prompt-files-${task.id}`);
        const uploadPromptBtn = document.getElementById(`upload-prompt-files-${task.id}`);
        const promptFilesCount = document.getElementById(`prompt-files-count-${task.id}`);

        uploadPromptBtn.addEventListener('click', () => {
            promptFileInput.click();
        });

        promptFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            task.data.promptFiles = files;
            promptFilesCount.textContent = files.length;
            this.saveTasks();
        });

        const placeholderFileInput = document.getElementById(`placeholder-files-${task.id}`);
        const uploadPlaceholderBtn = document.getElementById(`upload-placeholder-files-${task.id}`);
        const placeholderFilesCount = document.getElementById(`placeholder-files-count-${task.id}`);

        uploadPlaceholderBtn.addEventListener('click', () => {
            placeholderFileInput.click();
        });

        placeholderFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            task.data.placeholderFiles = files;
            placeholderFilesCount.textContent = files.length;
            this.saveTasks();
        });

        // 绑定提交按钮
        const submitBtn = document.getElementById(`submit-placeholder-merge-${task.id}`);
        submitBtn.addEventListener('click', async () => {
            await this.processPlaceholderMerge(task);
        });

        // 绑定下载按钮
        const downloadBtn = document.getElementById(`download-all-${task.id}`);
        downloadBtn.addEventListener('click', () => {
            this.downloadAllMergedFiles(task);
        });
    }

    /**
     * 处理占位符文档整合
     * @param {Object} task - 任务对象
     */
    async processPlaceholderMerge(task) {
        if (!task.data.promptFiles || task.data.promptFiles.length === 0) {
            this.showNotification('请先上传提示词文档', 'error');
            return;
        }

        if (!task.data.placeholderFiles || task.data.placeholderFiles.length === 0) {
            this.showNotification('请先上传占位符文档', 'error');
            return;
        }

        const progressDiv = document.getElementById(`merge-progress-${task.id}`);
        const progressBar = document.getElementById(`merge-progress-bar-${task.id}`);
        const progressText = document.getElementById(`merge-progress-text-${task.id}`);
        const resultsDiv = document.getElementById(`merge-results-${task.id}`);
        const resultsContent = document.getElementById(`merge-results-content-${task.id}`);

        // 清空之前的结果
        task.data.results = [];
        this.saveTasks();

        progressDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        resultsContent.innerHTML = '';
        progressBar.style.width = '0%';
        progressText.textContent = '0/0';

        try {
            // 准备文件数据
            const formData = new FormData();
            task.data.promptFiles.forEach(file => {
                formData.append('prompt_files[]', file);
            });
            task.data.placeholderFiles.forEach(file => {
                formData.append('placeholder_files[]', file);
            });

            const response = await fetch('http://localhost:5000/api/placeholder-merge', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'progress') {
                                const { current, total } = data;
                                const percent = total > 0 ? (current / total) * 100 : 0;
                                progressBar.style.width = percent + '%';
                                progressText.textContent = `${current}/${total}`;
                            } else if (data.type === 'result') {
                                this.addMergeResult(task, data.filename, data.content);
                            } else if (data.type === 'error') {
                                console.error(`处理文件 ${data.filename} 失败:`, data.error);
                            }
                        } catch (e) {
                            console.error('解析进度数据失败:', e, line);
                        }
                    }
                }
            }

            progressDiv.style.display = 'none';
            resultsDiv.style.display = 'block';
            this.showNotification('处理完成', 'success');

        } catch (error) {
            console.error('处理失败:', error);
            this.showNotification('处理失败：' + error.message, 'error');
            progressDiv.style.display = 'none';
        }
    }

    /**
     * 添加合并结果
     * @param {Object} task - 任务对象
     * @param {string} filename - 文件名
     * @param {string} content - 内容
     */
    addMergeResult(task, filename, content) {
        if (!task.data.results) {
            task.data.results = [];
        }

        task.data.results.push({ filename, content });
        this.saveTasks();

        const resultsContent = document.getElementById(`merge-results-content-${task.id}`);
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = 'background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;';
        resultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0;"><i class="fas fa-file"></i> ${this.escapeHtml(filename)}</h4>
                <button class="btn btn-secondary download-single-file" data-filename="${this.escapeHtml(filename)}" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-download"></i> 下载
                </button>
            </div>
            <pre style="background: #f9fafb; padding: 1rem; border-radius: 4px; overflow-x: auto; max-height: 400px; overflow-y: auto; font-size: 0.9rem; line-height: 1.5;">${this.escapeHtml(content)}</pre>
        `;

        resultDiv.querySelector('.download-single-file').addEventListener('click', () => {
            this.downloadSingleFile(filename, content);
        });

        resultsContent.appendChild(resultDiv);
    }

    /**
     * 下载单个文件
     * @param {string} filename - 文件名
     * @param {string} content - 内容
     */
    downloadSingleFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 下载所有合并后的文件
     * @param {Object} task - 任务对象
     */
    downloadAllMergedFiles(task) {
        if (!task.data.results || task.data.results.length === 0) {
            this.showNotification('没有可下载的文件', 'warning');
            return;
        }

        task.data.results.forEach((result, index) => {
            setTimeout(() => {
                this.downloadSingleFile(result.filename, result.content);
            }, index * 200); // 延迟下载，避免浏览器阻止多个下载
        });

        this.showNotification(`开始下载 ${task.data.results.length} 个文件`, 'success');
    }
}

// 添加通知动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes fadeOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// 初始化应用
let geminiClient;
document.addEventListener('DOMContentLoaded', () => {
    geminiClient = new GeminiWebClient();
});
