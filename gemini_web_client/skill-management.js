/**
 * Skill 管理模块
 * 从 script.js 中提取的 Skill 相关方法
 * 这些方法将作为 GeminiWebClient 类的原型方法添加
 */

// 注意：这些方法依赖于 GeminiWebClient 类的实例（this），
// 因此需要在 script.js 中通过原型扩展的方式添加

(function() {
    'use strict';

    // 如果 GeminiWebClient 类还未定义，等待它定义
    if (typeof GeminiWebClient === 'undefined') {
        console.warn('GeminiWebClient 类未定义，skill-management.js 将在类定义后加载');
        return;
    }

    // 扩展 GeminiWebClient 原型，添加 Skill 管理方法
    Object.assign(GeminiWebClient.prototype, {
        /**
         * 上传 Skill 文件（支持多文件）
         */
        async uploadSkillFiles(files) {
            const statusEl = document.getElementById('skill-upload-status');
            if (!statusEl) return;
            
            statusEl.textContent = `正在上传并分析 ${files.length} 个文件...`;
            statusEl.style.color = '#6b7280';
            
            try {
                const formData = new FormData();
                files.forEach(file => {
                    formData.append('files[]', file);
                });
                
                const response = await fetch('http://localhost:5000/api/upload-skill', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                // 即使上传失败，也保持现有skill列表不变，只显示错误信息
                if (!response.ok) {
                    // HTTP错误，但不清空列表
                    let errorMsg = data.error || `HTTP ${response.status}`;
                    if (data.errors && data.errors.length > 0) {
                        errorMsg += '\n详细错误：\n' + data.errors.join('\n');
                    }
                    statusEl.textContent = `❌ ${errorMsg}（现有 Skill 保持不变）`;
                    statusEl.style.color = '#ef4444';
                    // 不清空列表，不刷新管理弹窗
                    return;
                }
                
                // 处理响应（无论成功或失败，都不清空现有skill）
                const successCount = data.total || 0;
                const failCount = data.failed || 0;
                
                if (successCount > 0) {
                    let message = `✅ 成功上传 ${successCount} 个 Skill`;
                    if (failCount > 0) {
                        message += `，失败 ${failCount} 个`;
                    }
                    statusEl.textContent = message;
                    statusEl.style.color = '#10b981';
                } else {
                    // 全部失败，但不清空列表
                    statusEl.textContent = `❌ 所有文件上传失败（现有 Skill 保持不变）`;
                    statusEl.style.color = '#ef4444';
                }
                
                // 显示详细信息
                if (data.results && data.results.length > 0) {
                    const details = data.results.map(r => `  • ${r.skill_name}: ${r.skill_desc}`).join('\n');
                    console.log('上传成功的 Skill:\n' + details);
                }
                if (data.errors && data.errors.length > 0) {
                    console.error('上传失败的文件:\n' + data.errors.join('\n'));
                }
                
                // 如果管理弹窗打开，刷新（但不会清空，只是更新显示）
                if (this.skillManagementModal && this.skillManagementModal.style.display !== 'none') {
                    await this.showSkillManagementModal();
                }
                // 清空文件选择
                if (this.skillFileInput) {
                    this.skillFileInput.value = '';
                }
            } catch (error) {
                console.error('上传 Skill 失败:', error);
                statusEl.textContent = `❌ 失败：${error.message}`;
                statusEl.style.color = '#ef4444';
            }
        },

        showWriteSkillModal() {
            if (!this.writeSkillModal) return;
            this.writeSkillModal.style.display = 'block';
            if (this.writeSkillNameInput) this.writeSkillNameInput.value = '';
            if (this.writeSkillContentInput) this.writeSkillContentInput.value = '';
            if (this.writeSkillStatusDiv) {
                this.writeSkillStatusDiv.textContent = '';
                this.writeSkillStatusDiv.style.color = '#6b7280';
            }
        },

        hideWriteSkillModal() {
            if (!this.writeSkillModal) return;
            this.writeSkillModal.style.display = 'none';
        },

        async submitWriteSkill() {
            if (!this.writeSkillContentInput || !this.writeSkillStatusDiv) return;
            
            const content = this.writeSkillContentInput.value.trim();
            const name = this.writeSkillNameInput ? this.writeSkillNameInput.value.trim() : '';
            
            if (!content) {
                this.writeSkillStatusDiv.textContent = '请输入 Skill 内容';
                this.writeSkillStatusDiv.style.color = '#ef4444';
                return;
            }
            
            if (!this.confirmWriteSkillBtn) return;
            this.confirmWriteSkillBtn.disabled = true;
            this.confirmWriteSkillBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';
            this.writeSkillStatusDiv.textContent = '正在创建 Skill...';
            this.writeSkillStatusDiv.style.color = '#6b7280';
            
            try {
                const response = await fetch('http://localhost:5000/api/write-skill', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: content,
                        name: name || undefined
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok || !data.success) {
                    throw new Error(data.error || `HTTP ${response.status}`);
                }
                
                this.writeSkillStatusDiv.textContent = `✅ 成功创建 Skill: ${data.skill_name} - ${data.skill_desc}`;
                this.writeSkillStatusDiv.style.color = '#10b981';
                
                // 清空输入框和草稿
                if (this.writeSkillContentInput) this.writeSkillContentInput.value = '';
                if (this.writeSkillNameInput) this.writeSkillNameInput.value = '';
                this.clearWriteSkillDraft();
                
                // 显示通知
                this.showNotification(`成功创建 Skill: ${data.skill_name}`, 'success');
                
                // 如果管理弹窗打开，刷新
                if (this.skillManagementModal && this.skillManagementModal.style.display !== 'none') {
                    await this.showSkillManagementModal();
                }
                
                // 3秒后自动关闭弹窗
                setTimeout(() => {
                    this.hideWriteSkillModal();
                }, 3000);
                
            } catch (error) {
                console.error('写入 Skill 失败:', error);
                this.writeSkillStatusDiv.textContent = `失败：${error.message}`;
                this.writeSkillStatusDiv.style.color = '#ef4444';
                this.showNotification('写入 Skill 失败：' + error.message, 'error');
            } finally {
                if (this.confirmWriteSkillBtn) {
                    this.confirmWriteSkillBtn.disabled = false;
                    this.confirmWriteSkillBtn.innerHTML = '<i class="fas fa-save"></i> 确认并创建 Skill';
                }
            }
        },

        /**
         * 加载并显示现有 Skill 列表
         */
        async loadSkillList() {
            if (!this.skillListContainer) return;
            
            try {
                const response = await fetch('http://localhost:5000/api/list-skills');
                const data = await response.json();
                
                if (!data.success) {
                    this.skillListContainer.innerHTML = '<p style="color: #ef4444;">加载失败</p>';
                    return;
                }
                
                const skills = data.skills || [];
                
                if (skills.length === 0) {
                    this.skillListContainer.innerHTML = '<p style="color: #6b7280;">暂无 Skill 文档</p>';
                    return;
                }
                
                const html = skills.map(skill => `
                    <div class="skill-item" style="padding: 1rem; margin-bottom: 0.5rem; background: #f3f4f6; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${skill.name}</strong>
                            <p style="margin: 0.25rem 0 0 0; color: #6b7280; font-size: 0.9rem;">${skill.desc || ''}</p>
                            <small style="color: #9ca3af;">路径: ${skill.path || ''}</small>
                        </div>
                        <button class="btn-delete-skill" data-skill-name="${skill.name}" style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                `).join('');
                
                this.skillListContainer.innerHTML = html;
                
                // 绑定删除按钮
                this.skillListContainer.querySelectorAll('.btn-delete-skill').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const skillName = btn.getAttribute('data-skill-name');
                        if (confirm(`确定要删除 Skill "${skillName}" 吗？`)) {
                            await this.deleteSkill(skillName);
                        }
                    });
                });
            } catch (error) {
                console.error('加载 Skill 列表失败:', error);
                this.skillListContainer.innerHTML = '<p style="color: #ef4444;">加载失败：' + error.message + '</p>';
            }
        },

        /**
         * 删除 Skill
         */
        async deleteSkill(skillName) {
            try {
                const response = await fetch('http://localhost:5000/api/delete-skill', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ skill_name: skillName })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showNotification(`已删除 Skill: ${skillName}`, 'success');
                    await this.loadSkillList();
                } else {
                    throw new Error(data.error || '删除失败');
                }
            } catch (error) {
                console.error('删除 Skill 失败:', error);
                this.showNotification('删除失败：' + error.message, 'error');
            }
        },

        /**
         * 处理 Skill 模式的流式读取
         */
        async handleSkillModeStream(payload, conversation, originalMessage) {
            // 处理 Skill 模式的流式读取，在输入框显示进度
            // 注意：此时输入框已经被 sendMessage 清空，所以恢复时应该是空字符串
            // 注意：用户消息已在 sendMessage 中添加到历史，这里不需要重复添加
            let finalResult = null;
            let skillsUsed = [];
            
            try {
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

                // 读取流式响应
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // 保留最后一个不完整的行

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (data.type === 'progress') {
                                    // 在输入框显示进度
                                    this.messageInput.value = `[${data.message}]`;
                                    this.messageInput.style.color = '#6b7280';
                                    this.messageInput.style.fontStyle = 'italic';
                                    this.autoResizeTextarea();
                                } else if (data.type === 'result') {
                                    // 收到最终结果
                                    if (data.success) {
                                        finalResult = {
                                            text: data.text || '',
                                            skills_used: data.skills_used || []
                                        };
                                        skillsUsed = data.skills_used || [];
                                    } else {
                                        throw new Error(data.error || 'Skill 模式处理失败');
                                    }
                                }
                            } catch (e) {
                                console.error('解析 SSE 数据失败:', e, line);
                            }
                        }
                    }
                }

                // 恢复输入框（清空并恢复样式）
                this.messageInput.value = '';
                this.messageInput.style.color = '';
                this.messageInput.style.fontStyle = '';
                this.autoResizeTextarea();

                if (!finalResult) {
                    throw new Error('未收到最终结果');
                }

                // 处理结果（与普通模式相同）
                const botMessage = finalResult.text || '(模型返回了空响应)';
                
                // 如果是"精炼总结助手"对话，恢复原始system prompt
                if (conversation.title === '精炼总结助手') {
                    conversation.systemPrompt = this.systemPromptInput.value.trim() || conversation.systemPrompt;
                }

                // 添加机器人回复到历史
                conversation.history.push({ role: 'assistant', content: botMessage });

                // 限制历史长度
                if (conversation.history.length > this.contextWindow) {
                    conversation.history = conversation.history.slice(-this.contextWindow);
                }
                
                // 更新对话预览
                conversation.lastMessage = originalMessage.substring(0, 50);
                conversation.updatedAt = Date.now();
                
                // 保存对话
                this.saveConversations();
                this.updateConversationsList();

                return { text: botMessage, skills_used: skillsUsed };
            } catch (error) {
                // 恢复输入框（清空并恢复样式）
                this.messageInput.value = '';
                this.messageInput.style.color = '';
                this.messageInput.style.fontStyle = '';
                this.autoResizeTextarea();
                throw error;
            }
        },

        /**
         * 显示 Skill 管理弹窗
         */
        async showSkillManagementModal() {
            if (!this.skillManagementModal || !this.skillManagementContent) return;
            
            this.skillManagementModal.style.display = 'block';
            this.skillManagementContent.innerHTML = '<p style="color: #6b7280;">加载中...</p>';
            
            try {
                const response = await fetch('http://localhost:5000/api/list-skills');
                const data = await response.json();
                
                if (!data.success) {
                    this.skillManagementContent.innerHTML = '<p style="color: #ef4444;">加载失败</p>';
                    return;
                }
                
                const skills = data.skills || [];
                
                // 添加顶部操作区域：全局系统提示词 + 操作按钮（即使 skills 为空也要显示）
                const defaultPrompt = `你现在是一个知识库文档摘要助手。
请阅读下面这个 Markdown 文档的完整内容，从「图书馆文献库」的视角，
用不超过 40 个中文字符，写出一句话，总结该文档的核心内容和用途。
只输出这一句话本身，不要输出 JSON、不要解释、不要前后缀。

文档文件名：{filename}

文档全文开始：
{content}
文档全文结束。`;
                
                // 获取第一个skill的prompt_used作为默认值（如果所有skill都用同一个，就显示它）
                const firstSkillPrompt = skills.length > 0 ? (skills[0].prompt_used || defaultPrompt) : defaultPrompt;
                
                const headerHtml = `
                    <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <h4 style="margin-bottom: 0.75rem; color: #4f46e5;">
                            <i class="fas fa-cog"></i> 全局系统提示词（占位符版本，应用到所有 Skill）
                        </h4>
                        <textarea id="global-prompt-input" rows="8" 
                            style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem; resize: vertical; font-family: monospace; margin-bottom: 0.75rem;">${this.escapeHtml(firstSkillPrompt)}</textarea>
                        <small style="display: block; color: #6b7280; margin-bottom: 0.75rem;">
                            支持占位符：<code>{filename}</code>（文件名）和 <code>{content}</code>（文档全文）
                        </small>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button id="btn-save-global-prompt" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-save"></i> 保存并应用到全部 Skill
                            </button>
                            <button id="btn-regenerate-all-desc" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-sync-alt"></i> 一键重新生成全部 Desc
                            </button>
                            <button id="btn-sync-skills" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-sync"></i> 同步 Skills 文件夹
                            </button>
                        </div>
                    </div>
                `;
                
                const html = skills.length === 0 ? 
                    '<p style="color: #6b7280; text-align: center; padding: 2rem;">暂无 Skill 文档，请使用上方"同步 Skills 文件夹"按钮扫描本地文件夹</p>' :
                    skills.map((skill, index) => {
                    const promptUsed = skill.prompt_used || '';
                    const defaultPrompt = `你现在是一个知识库文档摘要助手。
请阅读下面这个 Markdown 文档的完整内容，从「图书馆文献库」的视角，
用不超过 40 个中文字符，写出一句话，总结该文档的核心内容和用途。
只输出这一句话本身，不要输出 JSON、不要解释、不要前后缀。

文档文件名：{filename}

文档全文开始：
{content}
文档全文结束。`;
                    const currentPrompt = promptUsed || defaultPrompt;
                    return `
                    <div class="skill-management-item" data-skill-name="${skill.name}" style="padding: 1rem; margin-bottom: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div style="flex: 1;">
                                <div style="margin-bottom: 0.5rem;">
                                    <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Name:</label>
                                    <input type="text" class="skill-edit-name" value="${skill.name}" data-old-name="${skill.name}" 
                                        style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem;">
                                </div>
                                <div style="margin-bottom: 0.5rem;">
                                    <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">Desc:</label>
                                    <textarea class="skill-edit-desc" rows="2" 
                                        style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem; resize: vertical;">${(skill.desc || '').replace(/"/g, '&quot;')}</textarea>
                                </div>
                                <div style="margin-bottom: 0.5rem;">
                                    <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">
                                        生成状态:
                                        ${skill.generation_success === false ? 
                                            '<span style="color: #ef4444; font-weight: normal;">❌ 失败（使用降级处理）</span>' : 
                                            skill.generation_success === true ? 
                                                '<span style="color: #10b981; font-weight: normal;">✅ 成功</span>' : 
                                                '<span style="color: #6b7280; font-weight: normal;">⚠️ 未知</span>'}
                                    </label>
                                    ${skill.error_message ? 
                                        `<div style="padding: 0.5rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: 4px; color: #991b1b; font-size: 0.85rem; margin-top: 0.25rem;">
                                            <strong>错误信息:</strong> ${this.escapeHtml(skill.error_message)}
                                        </div>` : ''}
                                </div>
                                <div style="margin-bottom: 0.5rem;">
                                    <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">模型返回内容:</label>
                                    <textarea class="skill-model-response" rows="3" readonly
                                        style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.85rem; resize: vertical; font-family: monospace; background: #f3f4f6; color: #6b7280;">${this.escapeHtml(skill.raw_response || '暂无（未调用模型或调用失败）')}</textarea>
                                </div>
                                <div style="margin-bottom: 0.5rem;">
                                    <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">模型选择:</label>
                                    <select class="skill-edit-model" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem;">
                                        <option value="gemini-3-flash-preview" ${skill.model_used === 'gemini-3-flash-preview' ? 'selected' : ''}>Gemini 3 Flash Preview</option>
                                        <option value="gemini-2.5-flash" ${skill.model_used === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash</option>
                                        <option value="gemini-2.5-pro" ${skill.model_used === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
                                        <option value="gemini-3-pro-preview" ${skill.model_used === 'gemini-3-pro-preview' ? 'selected' : ''}>Gemini 3 Pro Preview</option>
                                    </select>
                                </div>
                                <div style="margin-bottom: 0.5rem;">
                                    <label style="display: block; font-weight: 600; margin-bottom: 0.25rem;">提示词（可使用 {filename} 和 {content} 占位符）:</label>
                                    <textarea class="skill-edit-prompt" rows="8" 
                                        style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.85rem; resize: vertical; font-family: monospace;">${this.escapeHtml(currentPrompt)}</textarea>
                                </div>
                                <small style="color: #9ca3af;">路径: ${skill.path || ''}</small>
                            </div>
                            <div style="margin-left: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                                <button class="btn-regenerate-desc" data-skill-name="${skill.name}" 
                                    style="padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                                    <i class="fas fa-sync"></i> 重新生成 Desc
                                </button>
                                <button class="btn-save-skill" data-skill-name="${skill.name}" 
                                    style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                                    <i class="fas fa-save"></i> 保存
                                </button>
                                <button class="btn-delete-skill-modal" data-skill-name="${skill.name}" 
                                    style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                }).join('');
                
                this.skillManagementContent.innerHTML = headerHtml + html;
                
                // 绑定保存全局提示词按钮
                const saveGlobalPromptBtn = this.skillManagementContent.querySelector('#btn-save-global-prompt');
                if (saveGlobalPromptBtn) {
                    saveGlobalPromptBtn.addEventListener('click', async () => {
                        const globalPromptInput = this.skillManagementContent.querySelector('#global-prompt-input');
                        const newPrompt = (globalPromptInput?.value || '').trim();
                        
                        if (!newPrompt) {
                            this.showNotification('提示词不能为空', 'error');
                            return;
                        }
                        
                        if (!confirm('确定要将此系统提示词应用到所有 Skill 吗？这将会更新所有 Skill 的提示词字段。')) {
                            return;
                        }
                        
                        saveGlobalPromptBtn.disabled = true;
                        saveGlobalPromptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
                        
                        try {
                            const response = await fetch('http://localhost:5000/api/update-skills-default-prompt', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt: newPrompt })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                this.showNotification(data.message, 'success');
                                await this.showSkillManagementModal(); // 刷新界面，显示更新后的提示词
                            } else {
                                throw new Error(data.error || '保存失败');
                            }
                        } catch (error) {
                            console.error('保存全局提示词失败:', error);
                            this.showNotification('保存失败：' + error.message, 'error');
                        } finally {
                            saveGlobalPromptBtn.disabled = false;
                            saveGlobalPromptBtn.innerHTML = '<i class="fas fa-save"></i> 保存并应用到全部 Skill';
                        }
                    });
                }
                
                // 绑定一键重新生成全部Desc按钮
                const regenerateAllBtn = this.skillManagementContent.querySelector('#btn-regenerate-all-desc');
                if (regenerateAllBtn) {
                    regenerateAllBtn.addEventListener('click', async () => {
                        if (!confirm('确定要重新生成所有 Skill 的 Desc 吗？这可能需要一些时间。')) {
                            return;
                        }
                        
                        regenerateAllBtn.disabled = true;
                        regenerateAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
                        
                        try {
                            const response = await fetch('http://localhost:5000/api/regenerate-all-desc', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    // 使用与普通文字创作相同的稳定模型
                                    model: 'gemini-2.5-flash'
                                })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                this.showNotification(`成功重新生成 ${data.regenerated_count} 个 Desc${data.errors ? `，${data.errors.length} 个失败` : ''}`, 'success');
                                await this.showSkillManagementModal(); // 刷新界面
                            } else {
                                throw new Error(data.error || '批量重新生成失败');
                            }
                        } catch (error) {
                            console.error('批量重新生成失败:', error);
                            this.showNotification('批量重新生成失败：' + error.message, 'error');
                        } finally {
                            regenerateAllBtn.disabled = false;
                            regenerateAllBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 一键重新生成全部 Desc';
                        }
                    });
                }
                
                // 绑定同步按钮
                const syncBtn = this.skillManagementContent.querySelector('#btn-sync-skills');
                if (syncBtn) {
                    syncBtn.addEventListener('click', async () => {
                        syncBtn.disabled = true;
                        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同步中（1/2 扫描增删 + 2/2 生成 desc）...';
                        
                        try {
                            const response = await fetch('http://localhost:5000/api/sync-skills', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                this.showNotification(data.message + (data.errors ? `，${data.errors.length} 个失败` : ''), 'success');
                                await this.showSkillManagementModal(); // 刷新界面
                            } else {
                                throw new Error(data.error || '同步失败');
                            }
                        } catch (error) {
                            console.error('同步失败:', error);
                            this.showNotification('同步失败：' + error.message, 'error');
                        } finally {
                            syncBtn.disabled = false;
                            syncBtn.innerHTML = '<i class="fas fa-sync"></i> 同步 Skills 文件夹';
                        }
                    });
                }
                
                // 绑定重新生成Desc按钮
                this.skillManagementContent.querySelectorAll('.btn-regenerate-desc').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const skillName = btn.getAttribute('data-skill-name');
                        const item = btn.closest('.skill-management-item');
                        const promptInput = item.querySelector('.skill-edit-prompt');
                        const modelSelect = item.querySelector('.skill-edit-model');
                        const descInput = item.querySelector('.skill-edit-desc');
                        
                        const customPrompt = promptInput.value.trim();
                        const model = modelSelect.value;
                        
                        if (!customPrompt) {
                            this.showNotification('提示词不能为空', 'error');
                            return;
                        }
                        
                        btn.disabled = true;
                        btn.textContent = '生成中...';
                        
                        try {
                            const response = await fetch('http://localhost:5000/api/regenerate-skill-desc', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    skill_name: skillName,
                                    custom_prompt: customPrompt,
                                    model: model
                                })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                // 立即更新desc和模型返回内容（不刷新整个界面）
                                descInput.value = data.skill.desc;
                                promptInput.value = data.skill.prompt_used;
                                const modelResponseInput = item.querySelector('.skill-model-response');
                                if (modelResponseInput) {
                                    modelResponseInput.value = data.raw_response || '暂无';
                                }
                                this.showNotification(`已重新生成 Desc: ${data.skill.desc}`, 'success');
                            } else {
                                throw new Error(data.error || '重新生成失败');
                            }
                        } catch (error) {
                            console.error('重新生成 Desc 失败:', error);
                            this.showNotification('重新生成失败：' + error.message, 'error');
                        } finally {
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fas fa-sync"></i> 重新生成 Desc';
                        }
                    });
                });
                
                // 绑定保存按钮
                this.skillManagementContent.querySelectorAll('.btn-save-skill').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const skillName = btn.getAttribute('data-skill-name');
                        const item = btn.closest('.skill-management-item');
                        const nameInput = item.querySelector('.skill-edit-name');
                        const descInput = item.querySelector('.skill-edit-desc');
                        const oldName = nameInput.getAttribute('data-old-name');
                        const newName = nameInput.value.trim();
                        const newDesc = descInput.value.trim();
                        
                        if (!newName) {
                            this.showNotification('Name 不能为空', 'error');
                            return;
                        }
                        
                        await this.updateSkill(oldName, newName, newDesc);
                    });
                });
                
                // 绑定删除按钮
                this.skillManagementContent.querySelectorAll('.btn-delete-skill-modal').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const skillName = btn.getAttribute('data-skill-name');
                        if (confirm(`确定要删除 Skill "${skillName}" 吗？`)) {
                            await this.deleteSkill(skillName);
                        }
                    });
                });
                
            } catch (error) {
                console.error('加载 Skill 列表失败:', error);
                this.skillManagementContent.innerHTML = '<p style="color: #ef4444;">加载失败：' + error.message + '</p>';
            }
        },

        /**
         * 更新 Skill 的 name 和 desc
         */
        async updateSkill(oldName, newName, newDesc) {
            try {
                const response = await fetch('http://localhost:5000/api/update-skill', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        old_name: oldName,
                        new_name: newName,
                        new_desc: newDesc
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showNotification(`已更新 Skill: ${oldName} -> ${newName}`, 'success');
                    await this.loadSkillList();
                    await this.showSkillManagementModal(); // 刷新管理界面
                } else {
                    throw new Error(data.error || '更新失败');
                }
            } catch (error) {
                console.error('更新 Skill 失败:', error);
                this.showNotification('更新失败：' + error.message, 'error');
            }
        },

        /**
         * 显示 skills 汇总列表
         */
        async openSkillsDirectory() {
            try {
                const response = await fetch('http://localhost:5000/api/list-skills');
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || '加载失败');
                }
                
                const skills = data.skills || [];
                
                // 创建汇总列表弹窗（即使 skills 为空也要显示，以便同步）
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.style.display = 'block';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3><i class="fas fa-list"></i> Skill 文档汇总列表</h3>
                            <button class="modal-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <button id="btn-sync-skills-dir" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                                <i class="fas fa-sync"></i> 同步 Skills 文件夹
                            </button>
                        </div>
                        <div class="modal-body">
                            ${skills.length === 0 ? 
                                '<p style="color: #6b7280; text-align: center; padding: 2rem;">暂无 Skill 文档，点击上方"同步 Skills 文件夹"按钮扫描本地文件夹</p>' :
                                `<table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">序号</th>
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Name</th>
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Desc</th>
                                            <th style="padding: 0.75rem; text-align: left; font-weight: 600;">路径</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${skills.map((skill, index) => `
                                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                                <td style="padding: 0.75rem;">${index + 1}</td>
                                                <td style="padding: 0.75rem; font-weight: 500;">${this.escapeHtml(skill.name)}</td>
                                                <td style="padding: 0.75rem; color: #6b7280;">${this.escapeHtml(skill.desc || '')}</td>
                                                <td style="padding: 0.75rem; color: #9ca3af; font-size: 0.9rem;">${this.escapeHtml(skill.path || '')}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>`
                            }
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // 绑定同步按钮
                const syncBtnDir = modal.querySelector('#btn-sync-skills-dir');
                if (syncBtnDir) {
                    syncBtnDir.addEventListener('click', async () => {
                        syncBtnDir.disabled = true;
                        syncBtnDir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 同步中（1/2 扫描增删 + 2/2 生成 desc）...';
                        
                        try {
                            const response = await fetch('http://localhost:5000/api/sync-skills', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                this.showNotification(data.message + (data.errors ? `，${data.errors.length} 个失败` : ''), 'success');
                                // 关闭当前弹窗，重新打开目录（刷新数据）
                                document.body.removeChild(modal);
                                await this.openSkillsDirectory();
                                // 刷新管理界面
                                await this.showSkillManagementModal();
                            } else {
                                throw new Error(data.error || '同步失败');
                            }
                        } catch (error) {
                            console.error('同步失败:', error);
                            this.showNotification('同步失败：' + error.message, 'error');
                        } finally {
                            syncBtnDir.disabled = false;
                            syncBtnDir.innerHTML = '<i class="fas fa-sync"></i> 同步 Skills 文件夹';
                        }
                    });
                }
                
                // 绑定关闭按钮
                modal.querySelector('.modal-close').addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
                
                // 点击外部关闭
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                    }
                });
                
            } catch (error) {
                console.error('加载 Skill 列表失败:', error);
                this.showNotification('加载失败：' + error.message, 'error');
            }
        },

        /**
         * 自动保存写入 Skill 草稿
         */
        autoSaveWriteSkillDraft() {
            if (!this.writeSkillContentInput) return;
            const content = this.writeSkillContentInput.value;
            this.safeSetItem('gemini-write-skill-draft', content);
        },

        /**
         * 加载写入 Skill 草稿
         */
        loadWriteSkillDraft() {
            if (!this.writeSkillContentInput) return;
            const draft = localStorage.getItem('gemini-write-skill-draft');
            if (draft) {
                this.writeSkillContentInput.value = draft;
            }
        },

        /**
         * 清空写入 Skill 草稿
         */
        clearWriteSkillDraft() {
            localStorage.removeItem('gemini-write-skill-draft');
        },

        /**
         * 显示编辑 Skill 弹窗
         */
        showEditSkillModal() {
            if (!this.editSkillModal) return;
            this.editSkillModal.style.display = 'block';
            this.loadSkillListForEdit();
        },

        /**
         * 隐藏编辑 Skill 弹窗
         */
        hideEditSkillModal() {
            if (!this.editSkillModal) return;
            this.editSkillModal.style.display = 'none';
        },

        /**
         * 加载 Skill 列表供编辑选择
         */
        async loadSkillListForEdit() {
            if (!this.editSkillSelect) return;
            
            try {
                const response = await fetch('http://localhost:5000/api/list-skills');
                const data = await response.json();
                
                if (!data.success) {
                    this.editSkillSelect.innerHTML = '<option value="">加载失败</option>';
                    return;
                }
                
                const skills = data.skills || [];
                this.editSkillSelect.innerHTML = '<option value="">-- 请选择 Skill --</option>' +
                    skills.map(skill => `<option value="${skill.name}">${skill.name} - ${skill.desc || ''}</option>`).join('');
            } catch (error) {
                console.error('加载 Skill 列表失败:', error);
                this.editSkillSelect.innerHTML = '<option value="">加载失败</option>';
            }
        },

        /**
         * 加载 Skill 内容
         */
        async loadSkillContent(skillName) {
            if (!this.editSkillContentInput || !this.saveEditSkillBtn) return;
            
            try {
                const response = await fetch('http://localhost:5000/api/read-skill-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ skill_name: skillName })
                });
                
                const data = await response.json();
                
                if (data.success && data.content) {
                    this.editSkillContentInput.value = data.content;
                    this.editSkillContentInput.readOnly = false;
                    this.saveEditSkillBtn.disabled = false;
                } else {
                    throw new Error(data.error || '加载失败');
                }
            } catch (error) {
                console.error('加载 Skill 内容失败:', error);
                this.showNotification('加载失败：' + error.message, 'error');
                this.editSkillContentInput.value = '';
                this.editSkillContentInput.readOnly = true;
                this.saveEditSkillBtn.disabled = true;
            }
        },

        /**
         * 提交编辑 Skill
         */
        async submitEditSkill() {
            if (!this.editSkillSelect || !this.editSkillContentInput || !this.editSkillStatusDiv) return;
            
            const skillName = this.editSkillSelect.value;
            const content = this.editSkillContentInput.value.trim();
            
            if (!skillName) {
                this.editSkillStatusDiv.textContent = '请先选择要编辑的 Skill';
                this.editSkillStatusDiv.style.color = '#ef4444';
                return;
            }
            
            if (!content) {
                this.editSkillStatusDiv.textContent = 'Skill 内容不能为空';
                this.editSkillStatusDiv.style.color = '#ef4444';
                return;
            }
            
            if (!this.saveEditSkillBtn) return;
            this.saveEditSkillBtn.disabled = true;
            this.saveEditSkillBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
            this.editSkillStatusDiv.textContent = '正在保存 Skill...';
            this.editSkillStatusDiv.style.color = '#6b7280';
            
            try {
                const response = await fetch('http://localhost:5000/api/edit-skill-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        skill_name: skillName,
                        content: content
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok || !data.success) {
                    throw new Error(data.error || `HTTP ${response.status}`);
                }
                
                this.editSkillStatusDiv.textContent = `✅ 成功更新 Skill: ${skillName}`;
                this.editSkillStatusDiv.style.color = '#10b981';
                
                // 显示通知
                this.showNotification(`成功更新 Skill: ${skillName}`, 'success');
                
                // 如果管理弹窗打开，刷新
                if (this.skillManagementModal && this.skillManagementModal.style.display !== 'none') {
                    await this.showSkillManagementModal();
                }
                
                // 3秒后自动关闭弹窗
                setTimeout(() => {
                    this.hideEditSkillModal();
                }, 3000);
                
            } catch (error) {
                console.error('编辑 Skill 失败:', error);
                this.editSkillStatusDiv.textContent = `失败：${error.message}`;
                this.editSkillStatusDiv.style.color = '#ef4444';
                this.showNotification('编辑 Skill 失败：' + error.message, 'error');
            } finally {
                if (this.saveEditSkillBtn) {
                    this.saveEditSkillBtn.disabled = false;
                    this.saveEditSkillBtn.innerHTML = '<i class="fas fa-save"></i> 保存并更新 Skill';
                }
            }
        }
    });

    console.log('Skill 管理模块已加载（完整方法）');
})();

