/**
 * UI 工具方法模块
 * 包含格式化、通知、消息显示等 UI 相关方法
 * 
 * 注意：这些方法通过原型扩展添加到 GeminiWebClient 类
 * 需要在 script.js 加载后执行
 */

// 等待 GeminiWebClient 类定义完成
if (typeof GeminiWebClient !== 'undefined') {
    // 扩展 GeminiWebClient 原型，添加 UI 工具方法
    Object.assign(GeminiWebClient.prototype, {
        /**
         * 格式化Markdown文本，支持完整的Markdown格式
         * @param {string} text - Markdown文本
         * @returns {string} HTML格式的文本
         */
        formatMarkdown(text) {
            if (!text) return '';
            
            let html = text;
            
            // 1. 先处理代码块（避免内部内容被其他规则处理）
            // 支持语言标识，如 ```javascript 或 ```python
            const codeBlocks = [];
            html = html.replace(/```(\w+)?\s*\n?([\s\S]*?)```/g, (match, language, code) => {
                const id = `CODEBLOCK_${codeBlocks.length}`;
                codeBlocks.push({ language: (language || '').trim(), code: code.trim() });
                return id;
            });
            
            // 2. 处理行内代码（在代码块之后，避免冲突）
            const inlineCodes = [];
            html = html.replace(/`([^`\n]+?)`/g, (match, code) => {
                const id = `INLINECODE_${inlineCodes.length}`;
                inlineCodes.push(this.escapeHtml(code));
                return id;
            });
            
            // 2.5. 处理下划线标签（在转义HTML之前保存）
            const underlineTags = [];
            html = html.replace(/<u>([^<]+?)<\/u>/g, (match, text) => {
                const id = `UNDERLINE_${underlineTags.length}`;
                underlineTags.push(text);
                return id;
            });
            
            // 3. 转义HTML（但保留代码块、行内代码和下划线的占位符）
            html = this.escapeHtml(html);
            
            // 4. 恢复行内代码
            inlineCodes.forEach((code, index) => {
                html = html.replace(`INLINECODE_${index}`, `<code>${code}</code>`);
            });
            
            // 4.5. 恢复下划线标签
            underlineTags.forEach((text, index) => {
                html = html.replace(`UNDERLINE_${index}`, `<u>${text}</u>`);
            });
            
            // 5. 处理标题 (# ## ### #### ##### ######)
            html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
            html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
            html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
            html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
            
            // 6. 处理水平线 (--- 或 ***)
            html = html.replace(/^---$/gm, '<hr>');
            html = html.replace(/^\*\*\*$/gm, '<hr>');
            
            // 7. 处理引用 (>)
            html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
            
            // 8. 先处理其他markdown格式（链接、粗体等），这样列表项中的内容也能被处理
            // 处理图片 ![alt](url)
            html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 0.5rem 0;">');
            
            // 处理超链接 [text](url)
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline;">$1</a>');
            
            // 处理粗体 **text** 或 __text__
            html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
            
            // 处理斜体 *text* 或 _text_（粗体已处理，现在处理单个*和_）
            // 确保不是粗体的一部分（前后都不是*或_）
            html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
            html = html.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em>$1</em>');
            
            // 处理删除线 ~~text~~
            html = html.replace(/~~([^~]+?)~~/g, '<del>$1</del>');
            
            // 9. 处理有序列表和无序列表（需要按行处理，此时列表项中的markdown已被处理）
            const lines = html.split('\n');
            const processedLines = [];
            let inOrderedList = false;
            let inUnorderedList = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const orderedMatch = line.match(/^(\d+)\. (.*)$/);
                const unorderedMatch = line.match(/^[-*+] (.*)$/);
                
                if (orderedMatch) {
                    if (!inOrderedList) {
                        if (inUnorderedList) {
                            processedLines.push('</ul>');
                            inUnorderedList = false;
                        }
                        processedLines.push('<ol>');
                        inOrderedList = true;
                    }
                    processedLines.push(`<li>${orderedMatch[2]}</li>`);
                } else if (unorderedMatch) {
                    if (!inUnorderedList) {
                        if (inOrderedList) {
                            processedLines.push('</ol>');
                            inOrderedList = false;
                        }
                        processedLines.push('<ul>');
                        inUnorderedList = true;
                    }
                    processedLines.push(`<li>${unorderedMatch[1]}</li>`);
                } else {
                    if (inOrderedList) {
                        processedLines.push('</ol>');
                        inOrderedList = false;
                    }
                    if (inUnorderedList) {
                        processedLines.push('</ul>');
                        inUnorderedList = false;
                    }
                    processedLines.push(line);
                }
            }
            
            // 关闭未关闭的列表
            if (inOrderedList) {
                processedLines.push('</ol>');
            }
            if (inUnorderedList) {
                processedLines.push('</ul>');
            }
            
            html = processedLines.join('\n');
            
            // 15. 处理换行（将两个换行符转换为段落，单个换行符转换为 <br>）
            // 先处理段落（两个或更多换行符）
            html = html.replace(/\n\n+/g, '</p><p>');
            // 然后处理单个换行符
            html = html.replace(/\n/g, '<br>');
            // 包裹在段落标签中
            if (!html.startsWith('<')) {
                html = '<p>' + html + '</p>';
            }
            
            // 16. 恢复代码块
            codeBlocks.forEach((block, index) => {
                const escapedCode = this.escapeHtml(block.code);
                const language = block.language ? ` class="language-${block.language}"` : '';
                html = html.replace(`CODEBLOCK_${index}`, `<pre><code${language}>${escapedCode}</code></pre>`);
            });
            
            // 17. 清理空的段落和多余的标签
            html = html.replace(/<p><\/p>/g, '');
            html = html.replace(/<p>(<h[1-6]>)/g, '$1');
            html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
            html = html.replace(/<p>(<ul>|<ol>|<blockquote>|<pre>)/g, '$1');
            html = html.replace(/(<\/ul>|<\/ol>|<\/blockquote>|<\/pre>)<\/p>/g, '$1');
            
            return html;
        },
        
        /**
         * 格式化Markdown文本，支持图片缩略图显示（用于排版生成）
         * @param {string} text - Markdown文本
         * @param {Array} images - 图片数据数组
         * @returns {string} HTML格式的文本
         */
        formatMarkdownWithImages(text, images = []) {
            if (!text) return '';
            
            let html = text;
            
            // 1. 先处理代码块（避免内部内容被其他规则处理）
            const codeBlocks = [];
            html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
                const id = `CODEBLOCK_${codeBlocks.length}`;
                codeBlocks.push(code);
                return id;
            });
            
            // 2. 先提取图片（包含base64 data URL），避免被转义破坏
            const imagePlaceholders = [];
            html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
                const id = `IMAGE_PLACEHOLDER_${imagePlaceholders.length}`;
                imagePlaceholders.push({ alt, url });
                return id;
            });
            
            // 3. 处理行内代码（在代码块之后，避免冲突）
            const inlineCodes = [];
            html = html.replace(/`([^`\n]+?)`/g, (match, code) => {
                const id = `INLINECODE_${inlineCodes.length}`;
                inlineCodes.push(this.escapeHtml(code));
                return id;
            });
            
            // 4. 转义HTML（但保留代码块、行内代码和图片的占位符）
            html = this.escapeHtml(html);
            
            // 5. 恢复行内代码
            inlineCodes.forEach((code, index) => {
                html = html.replace(`INLINECODE_${index}`, `<code>${code}</code>`);
            });
            
            // 6. 恢复图片占位符并处理（在转义之后，直接使用原始URL）
            imagePlaceholders.forEach((img, index) => {
                const placeholder = `IMAGE_PLACEHOLDER_${index}`;
                let imageSrc = img.url;
                
                // 如果已经是完整的 base64 data URL，直接使用
                if (img.url && img.url.startsWith('data:image/')) {
                    imageSrc = img.url;
                } else {
                    // 尝试从图片数组中找到匹配的图片
                    let foundImage = null;
                    
                    // 先尝试通过特殊标识符匹配（图片1、IMAGE_1等）
                    const imageIndexMatch = img.url.match(/图片(\d+)|IMAGE[_\s]*(\d+)|image[_\s]*(\d+)/i);
                    if (imageIndexMatch) {
                        const idx = parseInt(imageIndexMatch[1] || imageIndexMatch[2] || imageIndexMatch[3]) - 1;
                        if (idx >= 0 && idx < images.length) {
                            foundImage = images[idx];
                        }
                    }
                    
                    // 如果还没找到，尝试通过 URL 匹配
                    if (!foundImage) {
                        if (img.url && img.url.startsWith('http')) {
                            foundImage = images.find(im => im.imageUrl && im.imageUrl === img.url);
                        } else if (img.url && img.url.startsWith('data:')) {
                            foundImage = images.find(im => im.imageUrl && im.imageUrl === img.url);
                        } else {
                            // 尝试通过数字索引匹配
                            const indexMatch = img.url.match(/(\d+)/);
                            if (indexMatch) {
                                const idx = parseInt(indexMatch[1]) - 1;
                                if (idx >= 0 && idx < images.length) {
                                    foundImage = images[idx];
                                }
                            }
                        }
                    }
                    
                    // 如果找到图片，使用实际的图片数据
                    if (foundImage) {
                        if (foundImage.imageBase64 && foundImage.imageMimeType) {
                            // 优先使用 base64 数据
                            imageSrc = `data:${foundImage.imageMimeType};base64,${foundImage.imageBase64}`;
                        } else if (foundImage.imageUrl) {
                            imageSrc = foundImage.imageUrl;
                        }
                    }
                }
                
                // 替换占位符为实际的图片标签（注意：imageSrc 已经是原始字符串，需要转义引号）
                const escapedSrc = imageSrc.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                html = html.replace(placeholder, `<img src="${escapedSrc}" alt="${this.escapeHtml(img.alt || '图片')}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 0.5rem 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`);
            });
            
            // 7. 处理标题 (# ## ### #### ##### ######)
            html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
            html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
            html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
            html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
            
            // 8. 处理水平线 (--- 或 ***)
            html = html.replace(/^---$/gm, '<hr>');
            html = html.replace(/^\*\*\*$/gm, '<hr>');
            
            // 9. 处理引用 (>)
            html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
            
            // 10. 处理超链接 [text](url)
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline;">$1</a>');
            
            // 11. 处理粗体 **text** 或 __text__
            html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
            
            // 12. 处理斜体 *text* 或 _text_（但不在粗体中）
            html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
            html = html.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em>$1</em>');
            
            // 13. 处理删除线 ~~text~~
            html = html.replace(/~~([^~]+?)~~/g, '<del>$1</del>');
            
            // 14. 处理有序列表和无序列表（需要按行处理）
            const lines = html.split('\n');
            const processedLines = [];
            let inOrderedList = false;
            let inUnorderedList = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const orderedMatch = line.match(/^(\d+)\. (.*)$/);
                const unorderedMatch = line.match(/^[-*+] (.*)$/);
                
                if (orderedMatch) {
                    if (!inOrderedList) {
                        if (inUnorderedList) {
                            processedLines.push('</ul>');
                            inUnorderedList = false;
                        }
                        processedLines.push('<ol>');
                        inOrderedList = true;
                    }
                    processedLines.push(`<li>${orderedMatch[2]}</li>`);
                } else if (unorderedMatch) {
                    if (!inUnorderedList) {
                        if (inOrderedList) {
                            processedLines.push('</ol>');
                            inOrderedList = false;
                        }
                        processedLines.push('<ul>');
                        inUnorderedList = true;
                    }
                    processedLines.push(`<li>${unorderedMatch[1]}</li>`);
                } else {
                    if (inOrderedList) {
                        processedLines.push('</ol>');
                        inOrderedList = false;
                    }
                    if (inUnorderedList) {
                        processedLines.push('</ul>');
                        inUnorderedList = false;
                    }
                    processedLines.push(line);
                }
            }
            
            // 关闭未关闭的列表
            if (inOrderedList) {
                processedLines.push('</ol>');
            }
            if (inUnorderedList) {
                processedLines.push('</ul>');
            }
            
            html = processedLines.join('\n');
            
            // 15. 处理换行（将两个换行符转换为段落，单个换行符转换为 <br>）
            html = html.replace(/\n\n+/g, '</p><p>');
            html = html.replace(/\n/g, '<br>');
            if (!html.startsWith('<')) {
                html = '<p>' + html + '</p>';
            }
            
            // 16. 恢复代码块
            codeBlocks.forEach((code, index) => {
                const escapedCode = this.escapeHtml(code);
                html = html.replace(`CODEBLOCK_${index}`, `<pre><code>${escapedCode}</code></pre>`);
            });
            
            // 17. 清理空的段落和多余的标签
            html = html.replace(/<p><\/p>/g, '');
            html = html.replace(/<p>(<h[1-6]>)/g, '$1');
            html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
            html = html.replace(/<p>(<ul>|<ol>|<blockquote>|<pre>)/g, '$1');
            html = html.replace(/(<\/ul>|<\/ol>|<\/blockquote>|<\/pre>)<\/p>/g, '$1');
            
            return html;
        }
    });
}
